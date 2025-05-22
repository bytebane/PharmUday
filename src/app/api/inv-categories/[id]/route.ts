import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma'

import { db } from '@/lib/db'
import { categoryPatchSchema } from '@/lib/validations/category'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@/generated/prisma'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params

		const category = await db.category.findUnique({
			where: { id: id },
			include: {
				// items: true, // Include related items if needed
				// subCategories: true,
				// parentCategory: true,
			},
		})

		if (!category) {
			return new NextResponse('Category not found', { status: 404 })
		}

		return NextResponse.json(category)
	} catch (error) {
		console.error('[CATEGORY_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await getCurrentUser()

		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		const { id } = await params // Use 'id' instead of 'categoryId'
		const json = await req.json()
		const body = categoryPatchSchema.parse(json)

		// Add check: Prevent setting parentCategoryId to self or a descendant (more complex logic)

		const updatedCategory = await db.category.update({
			where: { id: id }, // Use the correct 'id' variable
			data: body,
		})

		return NextResponse.json(updatedCategory)
	} catch (error) {
		if (error instanceof z.ZodError) {
			return new NextResponse(JSON.stringify(error.issues), { status: 422 })
		}
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
			return new NextResponse('Category with this name already exists', { status: 409 })
		}
		console.error('[CATEGORY_PATCH]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await getCurrentUser()
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		const { id } = await params // Use 'id' instead of 'categoryId'

		// Note: Deleting a category might affect subcategories (SetNull) and items (many-to-many relation)
		await db.category.delete({ where: { id: id } })

		return new NextResponse(null, { status: 204 }) // No Content
	} catch (error) {
		console.error('[CATEGORY_DELETE]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}
