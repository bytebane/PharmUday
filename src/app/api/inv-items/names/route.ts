import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
	try {
		const items = await db.item.findMany({
			select: {
				id: true,
				name: true,
				generic_name: true,
			},
			orderBy: { name: 'asc' },
		})
		return NextResponse.json(items)
	} catch (error) {
		console.error('[ITEM_NAMES_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}
