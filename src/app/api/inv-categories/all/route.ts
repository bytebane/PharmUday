import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
	try {
		const categories = await db.category.findMany({
			select: {
				id: true,
				name: true,
			},
			orderBy: { name: 'asc' },
		})

		return NextResponse.json(categories)
	} catch (error) {
		console.error('[CATEGORIES_ALL_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}
