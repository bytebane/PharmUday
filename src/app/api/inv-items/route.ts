import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db' // Assuming you have db setup like this
import { itemSchema } from '@/lib/validations/item' // Assuming this exists
import { Role } from '@/generated/prisma' // Import Role enum
import { getCurrentUser } from '@/lib/auth' // Import from auth.ts

export async function GET() {
	try {
		// Optional: Add pagination, filtering, sorting later
		// const url = new URL(req.url)
		// const { limit, page, nameFilter, categoryFilter } = z.object({...}).parse(Object.fromEntries(url.searchParams))

		const items = await db.item.findMany({
			// Add includes for relations if needed on the list view
			include: {
				categories: { select: { id: true, name: true } },
				supplier: { select: { id: true, name: true } },
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		return NextResponse.json(items)
	} catch (error) {
		console.error('[ITEMS_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function POST(req: Request) {
	try {
		const user = await getCurrentUser() // Get current user session/info

		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		const json = await req.json()
		const body = itemSchema.parse(json)

		const { categoryIds, supplierId, ...itemData } = body

		const item = await db.item.create({
			data: {
				...itemData,
				// Connect to existing categories
				categories: categoryIds
					? {
							connect: categoryIds.map(id => ({ id })),
					  }
					: undefined,
				// Connect to existing supplier if ID is provided
				supplier: supplierId
					? {
							connect: { id: supplierId },
					  }
					: undefined,
			},
			include: {
				// Include relations in the response if needed
				categories: true,
				supplier: true,
			},
		})

		return NextResponse.json(item, { status: 201 }) // 201 Created
	} catch (error) {
		if (error instanceof z.ZodError) {
			return new NextResponse(JSON.stringify(error.issues), { status: 422 }) // Unprocessable Entity
		}
		console.error('[ITEMS_POST]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}
