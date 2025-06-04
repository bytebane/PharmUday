import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Role } from '@/generated/prisma'
import { authorize } from '@/lib/utils/auth-utils'

export async function GET(req: NextRequest) {
	try {
		const { user, response } = await authorize([Role.CUSTOMER])
		if (response) return response

		// Find the Customer record for this user
		const customer = await db.customer.findUnique({ where: { userId: user!.id } })
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
					staff: { 
						select: { 
							email: true, 
							firstName: true, 
							lastName: true, 
							name: true,
							phoneNumber: true 
						} 
					},
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
