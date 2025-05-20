import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma' // Import Prisma types if needed for error handling

import { db } from '@/lib/db'
import { categorySchema } from '@/lib/validations/category'
import { Role } from '@/generated/prisma'
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
			where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }]
		}

		const [categories, total] = await Promise.all([
			db.category.findMany({
				where,
				include: { parentCategory: { select: { id: true, name: true } } },
				orderBy: { name: 'asc' },
				skip: (page - 1) * limit,
				take: limit,
			}),
			db.category.count({ where }),
		])

		return NextResponse.json({ categories, total })
	} catch (error) {
		console.error('[CATEGORIES_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function POST(req: Request) {
	try {
		const authResult = await authorize([Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN])
		if (authResult.response) {
			return authResult.response
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
