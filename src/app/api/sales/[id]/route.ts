import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@/generated/prisma'

interface RouteContext {
	params: {
		id: string // Sale ID
	}
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await getCurrentUser()
		if (!user) return new NextResponse('Unauthorized', { status: 401 })

		// Add role-based access control if needed
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		const { id } = await params
		const sale = await db.sale.findUnique({
			where: { id },
			include: {
				staff: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
				customer: true,
				saleItems: {
					include: {
						item: { select: { id: true, name: true, strength: true, formulation: true } },
					},
					orderBy: { createdAt: 'asc' },
				},
				invoice: true,
			},
		})

		if (!sale) {
			return new NextResponse('Sale not found', { status: 404 })
		}
		return NextResponse.json(sale)
	} catch (error) {
		console.error('[SALE_GET_SINGLE]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}
// PATCH and DELETE for sales can be added here if needed (e.g., for cancellations, refunds, updating payment status)
