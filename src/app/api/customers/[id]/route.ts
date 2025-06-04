import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { customerSchema } from '@/lib/validations/customer'
import { Role } from '@/generated/prisma'
import { authorize } from '@/lib/utils/auth-utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { response } = await authorize([Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN])
		if (response) return response
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
		const { response } = await authorize([Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN])
		if (response) return response

		const { id } = await params
		const json = await req.json()
		const { createUserAccount, defaultPassword, ...body } = json
		const customerData = customerSchema.partial().parse(body) // Use partial for PATCH

		if (customerData.email) {
			const existingCustomerByEmail = await db.customer.findFirst({
				where: { email: customerData.email, NOT: { id } },
			})
			if (existingCustomerByEmail) {
				return NextResponse.json({ message: 'Another customer with this email already exists.' }, { status: 409 })
			}
		}

		let userId: string | undefined = undefined

		// Handle user account creation if requested and customer doesn't already have one
		if (createUserAccount) {
			// Check if customer already has a user account
			const existingCustomer = await db.customer.findUnique({
				where: { id },
				select: { userId: true },
			})

			if (!existingCustomer?.userId) {
				// Create user account for customer
				const hashedPassword = await bcrypt.hash(defaultPassword || 'changeme123', 10)

				// Split name into first and last name if available
				const nameParts = (customerData.name || '').split(' ')
				const firstName = nameParts[0] || ''
				const lastName = nameParts.slice(1).join(' ') || ''

				const user = await db.user.create({
					data: {
						email: customerData.email || '',
						name: customerData.name || '',
						firstName,
						lastName,
						phoneNumber: customerData.phone || '',
						address: customerData.address || '',
						passwordHash: hashedPassword,
						role: Role.CUSTOMER,
						isActive: true,
						emailVerified: new Date(),
					},
				})
				userId = user.id
			}
		}

		const updatedCustomer = await db.customer.update({
			where: { id },
			data: {
				...customerData,
				...(userId && { userId }),
			},
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
		const { response } = await authorize([Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN])
		if (response) return response
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
