import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { itemSchema } from '@/lib/validations/item'
import { esClient } from '@/lib/elastic'
import { ElasticIndex } from '@/types/common'

export async function GET() {
	const items = await db.item.findMany({
		include: {
			categories: true,
			supplier: true,
		},
	})
	return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
	try {
		const { items } = await req.json()
		if (!Array.isArray(items)) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

		// Validate and insert/update each item
		const results = []
		for (const rawItem of items) {
			try {
				const item = itemSchema.parse(rawItem)
				// Upsert logic: update if exists, else create
				const { categoryIds, ...itemData } = item

				const upserted = await db.item.upsert({
					where: { name: itemData.name },
					update: {
						...itemData,
						categories: categoryIds && categoryIds.length ? { set: categoryIds.map((id: string) => ({ id })) } : undefined,
					},
					create: {
						...itemData,
						categories: categoryIds && categoryIds.length ? { connect: categoryIds.map((id: string) => ({ id })) } : undefined,
					},
					include: {
						categories: true,
						supplier: true,
					},
				})

				// Index the upserted item in Elasticsearch
				await esClient.index({
					index: ElasticIndex.ITEMS,
					id: upserted.id,
					document: {
						...upserted,
					},
				})

				results.push({ success: true, item: upserted })
			} catch (err: any) {
				results.push({ success: false, error: err.message, item: rawItem })
			}
		}
		return NextResponse.json({ results })
	} catch (err: any) {
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
}
