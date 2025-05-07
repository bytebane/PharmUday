import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { reportCategorySchema } from '@/lib/validations/report-category'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@/generated/prisma'

export async function GET() {
	try {
		const categories = await db.reportCategory.findMany({
			orderBy: { name: 'asc' },
		})
		return NextResponse.json(categories)
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
