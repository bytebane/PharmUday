import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { itemSchema } from '@/lib/validations/item'
import { Role } from '@/generated/prisma'
import { esClient } from '@/lib/elastic'
import { authorize } from '@/lib/utils/auth-utils'

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

		// Determine if this is a plain 'all items' query (no filters, no search)
		const isAllItems = !search && !status && (!categoryId || categoryId === 'all') && (!supplierId || supplierId === 'all')

		let items, total

		if (!isAllItems) {
			// Use Elasticsearch for any filter or search
			const must: object[] = []
			const filter: object[] = []

			// Text search
			if (search) {
				const wildcardSearch = `*${search.toLowerCase()}*`
				must.push({
					query_string: {
						query: `name:${wildcardSearch} OR generic_name:${wildcardSearch} OR manufacturer:${wildcardSearch} OR description:${wildcardSearch}`,
						fields: ['name', 'generic_name', 'manufacturer', 'description'],
						analyze_wildcard: true,
						default_operator: 'OR',
					},
				})
			}

			// Status filters (assumes these fields are denormalized in ES)
			if (status === 'out_of_stock') {
				filter.push({ range: { quantity_in_stock: { lte: 0 } } })
			}
			if (status === 'expiring_soon') {
				const today = new Date().toISOString()
				const soon = new Date()
				soon.setDate(new Date().getDate() + 30)
				filter.push({ range: { expiry_date: { gte: today, lte: soon.toISOString() } } })
			}
			if (status === 'expired') {
				const today = new Date().toISOString()
				filter.push({ range: { expiry_date: { lt: today } } })
			}

			// Category filter (denormalized: categories is array of objects with id)
			if (categoryId && categoryId !== 'all') {
				filter.push({ term: { 'categories.id': categoryId } })
			}
			// Supplier filter (denormalized: supplier is object with id)
			if (supplierId && supplierId !== 'all') {
				filter.push({ term: { 'supplier.id': supplierId } })
			}

			const esQuery: any = {
				bool: {},
			}
			if (must.length > 0) esQuery.bool.must = must
			if (filter.length > 0) esQuery.bool.filter = filter

			const esResult = await esClient.search({
				index: 'items',
				from: (page - 1) * limit,
				size: limit,
				query: esQuery,
			})

			const hits = esResult.hits.hits
			items = hits.map(hit => hit._source)
			total = typeof esResult.hits.total === 'object' ? esResult.hits.total.value : esResult.hits.total
		} else {
			// Use DB for all items (no filters, no search)
			;[items, total] = await Promise.all([
				db.item.findMany({
					include: {
						categories: { select: { id: true, name: true } },
						supplier: { select: { id: true, name: true } },
					},
					orderBy: { createdAt: 'desc' },
					skip: (page - 1) * limit,
					take: limit,
				}),
				db.item.count(),
			])
		}
		// show all fields of an item
		console.log(
			'Demo items:',
			items.slice(0, 5).map(item => ({ item })),
		)

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
		const { response } = await authorize([Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN])
		if (response) return response

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

		// Index the item in Elasticsearch
		await esClient.index({
			index: 'items',
			id: item.id,
			document: {
				...item,
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
