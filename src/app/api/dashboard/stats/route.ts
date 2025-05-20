import { NextResponse } from 'next/server'
import { db } from '@/lib/db' // Your Prisma client
import { getCurrentUser } from '@/lib/auth' // Your authentication helper
import { Role } from '@/generated/prisma' // Your Role enum
import { getTodayRange, getThisMonthRange, getThisYearRange } from '@/lib/utils/date-utils' // Import date utils

// Define the expected structure for the stats, matching your frontend DashboardStats interface
interface DashboardStats {
	itemStats: {
		expiringSoonCount: number
		outOfStockCount: number
		totalItemCount: number
	}
	salesStats: {
		today: { totalAmount: number; transactionCount: number }
		thisMonth: { totalAmount: number; transactionCount: number }
		thisYear: { totalAmount: number; transactionCount: number }
	}
	totalCustomerCount: number
	allTimeSales: { totalAmount: number; transactionCount: number }
}

export async function GET() {
	try {
		const user = await getCurrentUser()
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		const todayRange = getTodayRange()
		const thisMonthRange = getThisMonthRange()
		const thisYearRange = getThisYearRange()

		// --- Calculate All Time Sales ---
		const allTimeSalesData = await db.sale.aggregate({
			_sum: {
				grandTotal: true,
			},
			_count: {
				id: true, // Counting by 'id' or any non-null field like _all: true
			},
		})

		const allTimeSalesStats = {
			totalAmount: allTimeSalesData._sum.grandTotal || 0,
			transactionCount: allTimeSalesData._count.id || 0,
		}

		// --- Calculate Item Stats ---
		const totalItemCount = await db.item.count()

		const thirtyDaysFromNow = new Date()
		thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
		const expiringSoonCount = await db.item.count({
			where: {
				expiry_date: {
					gte: new Date(), // Items expiring from today onwards
					lte: thirtyDaysFromNow, // Up to 30 days from now
				},
				quantity_in_stock: {
					gt: 0, // Only count if in stock
				},
			},
		})

		const outOfStockCount = await db.item.count({
			where: {
				quantity_in_stock: 0,
			},
		})

		const expiredCount = await db.item.count({
			where: {
				expiry_date: { lt: new Date() },
			},
		})

		const itemStats = {
			expiringSoonCount: expiringSoonCount,
			outOfStockCount: outOfStockCount,
			totalItemCount: totalItemCount,
			expiredCount: expiredCount, // Include expired count if needed
		}

		// --- Calculate Periodic Sales Stats ---
		const calculateSalesForPeriod = async (startDate: Date, endDate: Date) => {
			const salesData = await db.sale.aggregate({
				where: {
					saleDate: {
						gte: startDate,
						lt: endDate,
					},
				},
				_sum: { grandTotal: true },
				_count: { id: true },
			})
			return {
				totalAmount: salesData._sum.grandTotal || 0,
				transactionCount: salesData._count.id || 0,
			}
		}

		const salesToday = await calculateSalesForPeriod(todayRange.start, todayRange.end)
		const salesThisMonth = await calculateSalesForPeriod(thisMonthRange.start, thisMonthRange.end)
		const salesThisYear = await calculateSalesForPeriod(thisYearRange.start, thisYearRange.end)

		const salesStats = {
			today: salesToday,
			thisMonth: salesThisMonth,
			thisYear: salesThisYear,
		}

		const totalCustomerCount = await db.customer.count()

		const stats: DashboardStats = {
			itemStats: itemStats,
			salesStats: salesStats,
			totalCustomerCount: totalCustomerCount,
			allTimeSales: allTimeSalesStats, // Include the calculated all-time sales
		}

		return NextResponse.json(stats)
	} catch (error) {
		console.error('[API_DASHBOARD_STATS_ERROR]', error)
		return NextResponse.json({ message: 'Internal Server Error', error: error instanceof Error ? error.message : String(error) }, { status: 500 })
	}
}
