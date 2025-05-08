import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays } from 'date-fns'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@/generated/prisma'

export async function GET(req: Request) {
	const session = await getServerSession(authOptions)

	if (!session?.user?.id || !session.user.role) {
		return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
	}

	// Define roles that can access dashboard stats
	const allowedRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.PHARMACIST, Role.SELLER]
	if (!allowedRoles.includes(session.user.role as Role)) {
		return NextResponse.json({ message: 'Forbidden: Insufficient privileges' }, { status: 403 })
	}

	try {
		const now = new Date()

		// --- Item Statistics ---
		const thirtyDaysFromNow = addDays(now, 30)
		const expiringSoonCount = await db.item.count({
			where: {
				isActive: true,
				expiry_date: {
					gte: now, // Still valid
					lte: thirtyDaysFromNow, // Expiring within 30 days
				},
				quantity_in_stock: {
					gt: 0, // Only count if in stock
				},
			},
		})

		const outOfStockCount = await db.item.count({
			where: {
				isActive: true,
				quantity_in_stock: {
					lte: 0,
				},
			},
		})

		// --- Sales Statistics ---
		// Today's Sales
		const todayStart = startOfDay(now)
		const todayEnd = endOfDay(now)
		const salesToday = await db.sale.aggregate({
			_sum: { grandTotal: true },
			_count: { id: true },
			where: {
				saleDate: {
					gte: todayStart,
					lte: todayEnd,
				},
				paymentStatus: 'PAID', // Consider only paid sales for revenue
			},
		})

		// This Month's Sales
		const monthStart = startOfMonth(now)
		const monthEnd = endOfMonth(now)
		const salesThisMonth = await db.sale.aggregate({
			_sum: { grandTotal: true },
			_count: { id: true },
			where: {
				saleDate: {
					gte: monthStart,
					lte: monthEnd,
				},
				paymentStatus: 'PAID',
			},
		})

		// This Year's Sales
		const yearStart = startOfYear(now)
		const yearEnd = endOfYear(now)
		const salesThisYear = await db.sale.aggregate({
			_sum: { grandTotal: true },
			_count: { id: true },
			where: {
				saleDate: {
					gte: yearStart,
					lte: yearEnd,
				},
				paymentStatus: 'PAID',
			},
		})

		return NextResponse.json({
			itemStats: {
				expiringSoonCount,
				outOfStockCount,
			},
			salesStats: {
				today: {
					totalAmount: salesToday._sum.grandTotal || 0,
					transactionCount: salesToday._count.id || 0,
				},
				thisMonth: {
					totalAmount: salesThisMonth._sum.grandTotal || 0,
					transactionCount: salesThisMonth._count.id || 0,
				},
				thisYear: {
					totalAmount: salesThisYear._sum.grandTotal || 0,
					transactionCount: salesThisYear._count.id || 0,
				},
			},
		})
	} catch (error) {
		console.error('Failed to fetch dashboard stats:', error)
		return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
	}
}
