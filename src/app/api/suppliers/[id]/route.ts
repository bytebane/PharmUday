import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { supplierPatchSchema } from '@/lib/validations/supplier'
import { Role } from '@/generated/prisma'
import { authorize } from '@/lib/utils/auth-utils'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params

		const supplier = await db.supplier.findUnique({
			where: { id: id },
			// include: { Item: true } // Include related items if needed
		})

		if (!supplier) {
			return new NextResponse('Supplier not found', { status: 404 })
		}

		return NextResponse.json(supplier)
	} catch (error) {
		console.error('[SUPPLIER_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { response } = await authorize([Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN])
		if (response) return response

		const { id } = await params
		const json = await req.json()
		const { createUserAccount, defaultPassword, ...body } = json
		const supplierData = supplierPatchSchema.parse(body)

		let userId: string | undefined = undefined

		// Handle user account creation if requested and supplier doesn't already have one
		if (createUserAccount) {
			// Check if supplier already has a user account
			const existingSupplier = await db.supplier.findUnique({
				where: { id },
				select: { userId: true },
			})

			if (!existingSupplier?.userId) {
				// Create user account for supplier
				const hashedPassword = await bcrypt.hash(defaultPassword || 'changeme123', 10)

				// Split name into first and last name if available
				const nameParts = (supplierData.name || '').split(' ')
				const firstName = nameParts[0] || ''
				const lastName = nameParts.slice(1).join(' ') || ''

				const user = await db.user.create({
					data: {
						email: supplierData.email || '',
						name: supplierData.name || '',
						firstName,
						lastName,
						phoneNumber: supplierData.phone || '',
						address: supplierData.address || '',
						passwordHash: hashedPassword,
						role: Role.SELLER,
						isActive: true,
						emailVerified: new Date(),
					},
				})
				userId = user.id
			}
		}

		const updatedSupplier = await db.supplier.update({
			where: { id: id },
			data: {
				...supplierData,
				...(userId && { userId }),
			},
		})

		return NextResponse.json(updatedSupplier)
	} catch (error) {
		if (error instanceof z.ZodError) {
			return new NextResponse(JSON.stringify(error.issues), { status: 422 })
		}
		console.error('[SUPPLIER_PATCH]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { response } = await authorize([Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN])
		if (response) return response

		const { id } = await params

		// Note: Deleting a supplier might fail if Items are linked and onDelete is RESTRICT (default)
		// Your schema uses SetNull for Item.id, so this should be okay.
		await db.supplier.delete({
			where: { id: id },
		})

		return new NextResponse(null, { status: 204 }) // No Content
	} catch (error) {
		console.error('[SUPPLIER_DELETE]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}
