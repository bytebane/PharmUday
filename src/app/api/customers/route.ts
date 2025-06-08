import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { customerSchema } from '@/lib/validations/customer'
import { Role } from '@/generated/prisma'
import { authorize } from '@/lib/utils/auth-utils'
import * as argon2 from 'argon2'
import { esClient } from '@/lib/elastic'

const paginationSchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(10),
	search: z.string().optional(),
})

export async function GET(req: Request) {
	try {
		const url = new URL(req.url)
		const params = paginationSchema.parse(Object.fromEntries(url.searchParams))
		const { page, limit, search } = params

		let customers, total

		if (search) {
			// where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }, { phone: { contains: search, mode: 'insensitive' } }]
			const wildcardSearch = `*${search.toLowerCase()}*`
			const esResult = await esClient.search({
				index: 'customers',
				from: (page - 1) * limit,
				size: limit,
				query: {
					query_string: {
						query: [`name:${wildcardSearch}`, `email:${wildcardSearch}`, `phone:${wildcardSearch}`].join(' OR '),

						fields: ['name', 'email', 'phone'],
						analyze_wildcard: true,
						default_operator: 'OR',
					},
				},
			})
			const hits = esResult.hits.hits

			customers = hits.map(hit => hit._source)
			total = typeof esResult.hits.total === 'object' ? esResult.hits.total.value : esResult.hits.total
		} else {
			;[customers, total] = await Promise.all([
				db.customer.findMany({
					orderBy: { createdAt: 'desc' },
					skip: (page - 1) * limit,
					take: limit,
				}),
				db.customer.count(),
			])
		}

		return NextResponse.json({ customers, total })
	} catch (error) {
		console.error('[CUSTOMERS_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function POST(req: NextRequest) {
	try {
		const { response } = await authorize([Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN])
		if (response) return response

		const json = await req.json()
		const { createUserAccount, defaultPassword, ...body } = json

		const customerValidation = customerSchema.safeParse(body)
		if (!customerValidation.success) {
			return NextResponse.json({ issues: customerValidation.error.issues }, { status: 422 })
		}

		let userId: string | undefined = undefined

		if (createUserAccount) {
			// Create user account for customer
			const hashedPassword = await argon2.hash(defaultPassword || 'changeme123', {
				type: argon2.argon2id,
				memoryCost: 2 ** 16,
				timeCost: 3,
				parallelism: 1,
			})
			const user = await db.user.create({
				data: {
					email: body.email,
					name: body.name,
					firstName: body.firstName || '',
					lastName: body.lastName || '',
					phoneNumber: body.phone,
					address: body.address || '',
					passwordHash: hashedPassword,
					role: Role.CUSTOMER,
					isActive: true,
					emailVerified: new Date(),
				},
			})
			userId = user.id
		}

		const newCustomer = await db.customer.create({
			data: {
				...body,
				userId,
			},
		})

		// Index the item in Elasticsearch
		await esClient.index({
			index: 'items',
			id: newCustomer.id,
			document: {
				...newCustomer,
			},
		})

		return NextResponse.json(newCustomer, { status: 201 })
	} catch (error) {
		console.error('[CUSTOMERS_POST]', error)
		return NextResponse.json({ message: 'Internal Server Error', error: error instanceof Error ? error.message : String(error) }, { status: 500 })
	}
}
