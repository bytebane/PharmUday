import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
	try {
		const customers = await db.customer.findMany({
			select: {
				id: true,
				name: true,
				phone: true,
				email: true,
			},
			orderBy: { name: 'asc' },
		})
		return NextResponse.json(customers)
	} catch (error) {
		console.error('[CUSTOMER_NAMES_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}
