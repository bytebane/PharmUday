import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { itemPatchSchema } from '@/lib/validations/item'
import { getCurrentUser } from '@/lib/auth' // Replace with your session logic
import { Role } from '@/generated/prisma' // Import Role enum

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params // Use id

		const item = await db.item.findUnique({
			where: { id: id }, // Use id
			include: {
				categories: true, // Include related data
				supplier: true,
			},
		})

		if (!item) {
			return new NextResponse('Item not found', { status: 404 })
		}

		return NextResponse.json(item)
	} catch (error) {
		console.error('[ITEM_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await getCurrentUser()
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		const { id } = await params // Use id
		const json = await req.json()
		const body = itemPatchSchema.parse(json)

		const { categoryIds, supplierId, ...itemData } = body

		const updatedItem = await db.item.update({
			where: { id: id }, // Use id
			data: {
				...itemData,
				// Handle updating relations: disconnect old, connect new if provided
				categories: categoryIds
					? {
							set: categoryIds.map(id => ({ id })), // Use set to replace existing connections
						}
					: undefined, // Don't update if not provided
				supplier:
					supplierId !== undefined // Check if supplierId was explicitly passed (even if null)
						? supplierId === null
							? { disconnect: true } // Disconnect if null
							: { connect: { id: supplierId } } // Connect if ID provided
						: undefined, // Don't update if not provided
			},
			include: {
				categories: true,
				supplier: true,
			},
		})

		return NextResponse.json(updatedItem)
	} catch (error) {
		if (error instanceof z.ZodError) {
			return new NextResponse(JSON.stringify(error.issues), { status: 422 })
		}
		console.error('[ITEM_PATCH]', error)
		// Return a JSON response even for generic errors
		return NextResponse.json({ message: 'Internal Server Error', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
	}
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await getCurrentUser()
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		const { id } = await params // Use id

		await db.item.delete({
			where: { id: id }, // Use id
		})

		return new NextResponse(null, { status: 204 }) // No Content
	} catch (error) {
		console.error('[ITEM_DELETE]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}
