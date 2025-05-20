import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { customerSchema } from '@/lib/validations/customer'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@/generated/prisma'

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

		const where: any = {}
		if (search) {
			where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }, { phone: { contains: search, mode: 'insensitive' } }]
		}

		const [customers, total] = await Promise.all([
			db.customer.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * limit,
				take: limit,
			}),
			db.customer.count({ where }),
		])

		return NextResponse.json({ customers, total })
	} catch (error) {
		console.error('[CUSTOMERS_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function POST(req: NextRequest) {
	try {
		const user = await getCurrentUser()
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		const json = await req.json()
		const body = customerSchema.parse(json)

		if (body.email) {
			const existingCustomerByEmail = await db.customer.findUnique({ where: { email: body.email } })
			if (existingCustomerByEmail) {
				return NextResponse.json({ message: 'A customer with this email already exists.' }, { status: 409 })
			}
		}

		const newCustomer = await db.customer.create({
			data: body,
		})

		return NextResponse.json(newCustomer, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ issues: error.issues }, { status: 422 })
		}
		console.error('[CUSTOMERS_POST]', error)
		return NextResponse.json({ message: 'Internal Server Error', error: error instanceof Error ? error.message : String(error) }, { status: 500 })
	}
}
