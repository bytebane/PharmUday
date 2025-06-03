import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
	try {
		const suppliers = await db.supplier.findMany({
			select: {
				id: true,
				name: true,
			},
			orderBy: { name: 'asc' },
		})

		return NextResponse.json(suppliers)
	} catch (error) {
		console.error('[SUPPLIERS_ALL_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}
