import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { Role } from '@/generated/prisma'
import bcrypt from 'bcryptjs'
import { authorize } from '@/lib/utils/auth-utils'

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
			where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { contactPerson: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }, { phone: { contains: search, mode: 'insensitive' } }]
		}

		const [suppliers, total] = await Promise.all([
			db.supplier.findMany({
				where,
				orderBy: { name: 'asc' },
				skip: (page - 1) * limit,
				take: limit,
			}),
			db.supplier.count({ where }),
		])

		return NextResponse.json({ suppliers, total })
	} catch (error) {
		console.error('[SUPPLIERS_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function POST(req: Request) {
	try {
		const { response } = await authorize([Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN])
		if (response) return response

		const json = await req.json()
		const { createUserAccount, defaultPassword, ...body } = json

		let userId: string | undefined = undefined

		if (createUserAccount) {
			const hashedPassword = await bcrypt.hash(defaultPassword || 'changeme123', 10)
			const newUser = await db.user.create({
				data: {
					email: body.email,
					name: body.name,
					passwordHash: hashedPassword,
					role: Role.SELLER,
					isActive: true,
					emailVerified: new Date(),
				},
			})
			userId = newUser.id
		}

		const supplier = await db.supplier.create({
			data: {
				...body,
				userId,
			},
		})

		return NextResponse.json(supplier, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return new NextResponse(JSON.stringify(error.issues), { status: 422 })
		}
		// Handle potential unique constraint errors (e.g., email) if needed
		// if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
		//   return new NextResponse('Supplier with this email already exists', { status: 409 });
		// }
		console.error('[SUPPLIERS_POST]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}
