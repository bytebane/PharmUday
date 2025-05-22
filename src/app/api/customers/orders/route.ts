import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@/generated/prisma'

export async function GET(req: NextRequest) {
	try {
		const user = await getCurrentUser()
		if (!user || user.role !== Role.CUSTOMER) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
		}

		// Find the Customer record for this user
		const customer = await db.customer.findUnique({ where: { userId: user.id } })
		if (!customer) {
			return NextResponse.json({ sales: [], total: 0 })
		}

		const url = new URL(req.url)
		const page = Number(url.searchParams.get('page') || 1)
		const limit = Number(url.searchParams.get('limit') || 10)

		const [sales, total] = await Promise.all([
			db.sale.findMany({
				where: { customerId: customer.id },
				include: {
					invoice: true,
					saleItems: { include: { item: true } },
					staff: { select: { email: true, profile: true } },
				},
				orderBy: { saleDate: 'desc' },
				skip: (page - 1) * limit,
				take: limit,
			}),
			db.sale.count({ where: { customerId: customer.id } }),
		])

		return NextResponse.json({ sales, total })
	} catch (error) {
		console.error('[CUSTOMER_MY_ORDERS_GET]', error)
		return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
	}
}
