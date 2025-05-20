import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { supplierSchema } from '@/lib/validations/supplier'
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
		const user = await getCurrentUser()

		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		const json = await req.json()
		const body = supplierSchema.parse(json)

		// Check if supplier name already exists (optional, based on requirements)
		// const existingSupplier = await db.supplier.findFirst({ where: { name: body.name } });
		// if (existingSupplier) {
		//   return new NextResponse("Supplier with this name already exists", { status: 409 }); // Conflict
		// }

		const supplier = await db.supplier.create({
			data: body,
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
