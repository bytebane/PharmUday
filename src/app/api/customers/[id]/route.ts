import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { customerSchema } from '@/lib/validations/customer'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@/generated/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await getCurrentUser()
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}
		const { id } = await params
		const customer = await db.customer.findUnique({ where: { id } })
		if (!customer) return new NextResponse('Customer not found', { status: 404 })
		return NextResponse.json(customer)
	} catch (error) {
		console.error('[CUSTOMER_GET_SINGLE]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await getCurrentUser()
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		const { id } = await params
		const json = await req.json()
		const body = customerSchema.partial().parse(json) // Use partial for PATCH

		if (body.email) {
			const existingCustomerByEmail = await db.customer.findFirst({
				where: { email: body.email, NOT: { id } },
			})
			if (existingCustomerByEmail) {
				return NextResponse.json({ message: 'Another customer with this email already exists.' }, { status: 409 })
			}
		}

		const updatedCustomer = await db.customer.update({
			where: { id },
			data: body,
		})
		return NextResponse.json(updatedCustomer)
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ issues: error.issues }, { status: 422 })
		}
		console.error('[CUSTOMER_PATCH]', error)
		return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
	}
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await getCurrentUser()
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}
		const { id } = await params
		// Consider implications: what if customer has sales? Prisma schema has onDelete:SetNull for sales.
		await db.customer.delete({ where: { id } })
		return new NextResponse(null, { status: 204 })
	} catch (error) {
		console.error('[CUSTOMER_DELETE]', error)
		// Handle potential foreign key constraint errors if onDelete behavior is different
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}
