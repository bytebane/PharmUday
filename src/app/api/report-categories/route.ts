import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { reportCategorySchema } from '@/lib/validations/report-category'
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
			where.name = { contains: search, mode: 'insensitive' }
		}

		const [categories, total] = await Promise.all([
			db.reportCategory.findMany({
				where,
				orderBy: { name: 'asc' },
				skip: (page - 1) * limit,
				take: limit,
			}),
			db.reportCategory.count({ where }),
		])

		return NextResponse.json({ categories, total })
	} catch (error) {
		console.error('[REPORT_CATEGORIES_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function POST(req: Request) {
	try {
		const user = await getCurrentUser()
		// Adjust roles as necessary for who can create report categories
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		const json = await req.json()
		const body = reportCategorySchema.parse(json)

		const existingCategory = await db.reportCategory.findUnique({
			where: { name: body.name },
		})

		if (existingCategory) {
			return NextResponse.json({ message: 'A report category with this name already exists.' }, { status: 409 }) // Conflict
		}

		const category = await db.reportCategory.create({
			data: {
				name: body.name,
				description: body.description,
			},
		})

		return NextResponse.json(category, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return new NextResponse(JSON.stringify(error.issues), { status: 422 })
		}
		console.error('[REPORT_CATEGORIES_POST]', error)
		return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
	}
}
