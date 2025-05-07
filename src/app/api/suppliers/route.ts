import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { supplierSchema } from '@/lib/validations/supplier'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@/generated/prisma'

export async function GET() {
	try {
		// Optional: Add pagination, filtering, sorting later
		const suppliers = await db.supplier.findMany({
			orderBy: {
				name: 'asc',
			},
		})

		return NextResponse.json(suppliers)
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
