import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { itemSchema } from '@/lib/validations/item'
import { Role } from '@/generated/prisma'
import { getCurrentUser } from '@/lib/auth'

const paginationSchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(10),
	status: z.string().optional(),
	categoryId: z.string().optional(),
	supplierId: z.string().optional(),
	search: z.string().optional(),
})

/**
 * GET: Paginated, filtered items
 */
export async function GET(req: Request) {
	try {
		const url = new URL(req.url)
		const params = paginationSchema.parse(Object.fromEntries(url.searchParams))
		const { page, limit, status, categoryId, supplierId, search } = params

		const where: any = {}

		// Status filters
		if (status === 'out_of_stock') where.quantity_in_stock = { lte: 0 }
		if (status === 'expiring_soon') {
			const today = new Date()
			const soon = new Date()
			soon.setDate(today.getDate() + 30)
			where.expiry_date = { gte: today, lte: soon }
		}
		if (status === 'expired') {
			const today = new Date()
			where.expiry_date = { lt: today }
		}
		// Category filter
		if (categoryId && categoryId !== 'all') {
			where.categories = { some: { id: categoryId } }
		}
		// Supplier filter
		if (supplierId && supplierId !== 'all') {
			where.supplierId = supplierId
		}
		// Search filter
		if (search) {
			where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { generic_name: { contains: search, mode: 'insensitive' } }, { manufacturer: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }]
		}

		const [items, total] = await Promise.all([
			db.item.findMany({
				where,
				include: {
					categories: { select: { id: true, name: true } },
					supplier: { select: { id: true, name: true } },
				},
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * limit,
				take: limit,
			}),
			db.item.count({ where }),
		])

		return NextResponse.json({ items, total })
	} catch (error) {
		console.error('[ITEMS_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

/**
 * POST: Create a new item
 */
export async function POST(req: Request) {
	try {
		const user = await getCurrentUser()
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		const json = await req.json()
		const body = itemSchema.parse(json)
		const { categoryIds, supplierId, ...itemData } = body

		const item = await db.item.create({
			data: {
				...itemData,
				categories: categoryIds ? { connect: categoryIds.map(id => ({ id })) } : undefined,
				supplier: supplierId ? { connect: { id: supplierId } } : undefined,
			},
			include: {
				categories: true,
				supplier: true,
			},
		})

		return NextResponse.json(item, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return new NextResponse(JSON.stringify(error.issues), { status: 422 })
		}
		console.error('[ITEMS_POST]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}
