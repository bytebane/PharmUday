import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma' // Import Prisma types if needed for error handling

import { db } from '@/lib/db'
import { categorySchema } from '@/lib/validations/category'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@/generated/prisma'

export async function GET() {
	try {
		// Fetch categories, potentially including hierarchy
		const categories = await db.category.findMany({
			orderBy: {
				name: 'asc',
			},
			include: {
				// Include subcategories or parent category if needed for display
				// subCategories: true,
				// parentCategory: true,
			},
		})

		// You might want to process the flat list into a hierarchical structure here if needed

		return NextResponse.json(categories)
	} catch (error) {
		console.error('[CATEGORIES_GET]', error)
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
		const body = categorySchema.parse(json)

		// Check if parent category exists if provided
		if (body.parentCategoryId) {
			const parentExists = await db.category.findUnique({ where: { id: body.parentCategoryId } })
			if (!parentExists) {
				return new NextResponse('Parent category not found', { status: 404 })
			}
		}

		const category = await db.category.create({
			data: body,
		})

		return NextResponse.json(category, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return new NextResponse(JSON.stringify(error.issues), { status: 422 })
		}
		// Handle unique constraint error for category name
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
			return new NextResponse('Category with this name already exists', { status: 409 })
		}
		console.error('[CATEGORIES_POST]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}
