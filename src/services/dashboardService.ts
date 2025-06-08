import { db } from '@/lib/db'
import { getTodayRange, getThisMonthRange, getThisYearRange } from '@/lib/utils/date-utils'

export interface DashboardStats {
	itemStats: {
		expiringSoonCount: number
		outOfStockCount: number
		totalItemCount: number
		expiredCount: number
	}
	salesStats: {
		today: { totalAmount: number; transactionCount: number }
		thisMonth: { totalAmount: number; transactionCount: number }
		thisYear: { totalAmount: number; transactionCount: number }
	}
	totalCustomerCount: number
	allTimeSales: { totalAmount: number; transactionCount: number }
	chartData: { date: string; amount: number }[]
}

export async function getDashboardStatsFromDb(): Promise<DashboardStats> {
	const todayRange = getTodayRange()
	const thisMonthRange = getThisMonthRange()
	const thisYearRange = getThisYearRange()

	// All Time Sales
	const allTimeSalesData = await db.sale.aggregate({
		_sum: { grandTotal: true },
		_count: { id: true },
	})
	const allTimeSalesStats = {
		totalAmount: allTimeSalesData._sum.grandTotal || 0,
		transactionCount: allTimeSalesData._count.id || 0,
	}

	// Item Stats
	const totalItemCount = await db.item.count()
	const thirtyDaysFromNow = new Date()
	thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
	const expiringSoonCount = await db.item.count({
		where: {
			expiry_date: { gte: new Date(), lte: thirtyDaysFromNow },
			quantity_in_stock: { gt: 0 },
		},
	})
	const outOfStockCount = await db.item.count({ where: { quantity_in_stock: 0 } })
	const expiredCount = await db.item.count({ where: { expiry_date: { lt: new Date() } } })

	const itemStats = {
		expiringSoonCount,
		outOfStockCount,
		totalItemCount,
		expiredCount,
	}

	// Sales Stats
	const calculateSalesForPeriod = async (startDate: Date, endDate: Date) => {
		const salesData = await db.sale.aggregate({
			where: { saleDate: { gte: startDate, lt: endDate } },
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

	// Get daily sales data for the last year
	const oneYearAgo = new Date()
	oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
	oneYearAgo.setHours(0, 0, 0, 0)

	const dailySales = await db.sale.groupBy({
		by: ['saleDate'],
		where: {
			saleDate: {
				gte: oneYearAgo,
				lt: new Date(),
			},
		},
		_sum: {
			grandTotal: true,
		},
		orderBy: {
			saleDate: 'asc',
		},
	})

	// Format the data for the chart
	const chartData = dailySales.map(sale => ({
		date: sale.saleDate.toISOString(),
		amount: sale._sum.grandTotal || 0,
	}))

	return {
		itemStats,
		salesStats,
		totalCustomerCount,
		allTimeSales: allTimeSalesStats,
		chartData,
	}
}
