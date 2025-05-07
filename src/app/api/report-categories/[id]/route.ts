import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { reportCategorySchema } from '@/lib/validations/report-category'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@/generated/prisma'

interface RouteContext {
	params: {
		id: string
	}
}

export async function GET(req: Request, { params }: RouteContext) {
	try {
		const { id } = await params
		const category = await db.reportCategory.findUnique({
			where: { id },
		})

		if (!category) {
			return new NextResponse('Report category not found', { status: 404 })
		}
		return NextResponse.json(category)
	} catch (error) {
		console.error('[REPORT_CATEGORY_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function PATCH(req: Request, { params }: RouteContext) {
	try {
		const user = await getCurrentUser()
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		const { id } = await params
		const json = await req.json()
		const body = reportCategorySchema.parse(json)

		// Check if another category with the new name already exists (excluding the current one)
		if (body.name) {
			const existingCategory = await db.reportCategory.findFirst({
				where: { name: body.name, NOT: { id } },
			})
			if (existingCategory) {
				return NextResponse.json({ message: 'Another report category with this name already exists.' }, { status: 409 })
			}
		}

		const updatedCategory = await db.reportCategory.update({
			where: { id },
			data: body,
		})
		return NextResponse.json(updatedCategory)
	} catch (error) {
		if (error instanceof z.ZodError) {
			return new NextResponse(JSON.stringify(error.issues), { status: 422 })
		}
		console.error('[REPORT_CATEGORY_PATCH]', error)
		return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
	}
}

export async function DELETE(req: Request, { params }: RouteContext) {
	try {
		const user = await getCurrentUser()
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}
		const { id } = await params
		await db.reportCategory.delete({ where: { id } })
		return new NextResponse(null, { status: 204 })
	} catch (error) {
		console.error('[REPORT_CATEGORY_DELETE]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}
