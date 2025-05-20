import { headers } from 'next/headers'
import { getCurrentUser } from '@/lib/auth' // To get the current user's role
import { Role } from '@/generated/prisma' // Import Role enum
import { StatCard } from '@/components/custom/stat-card'
interface DashboardStats {
	itemStats: {
		expiringSoonCount: number
		outOfStockCount: number
		totalItemCount: number // <-- Add this line
	}
	salesStats: {
		today: { totalAmount: number; transactionCount: number }
		thisMonth: { totalAmount: number; transactionCount: number }
		thisYear: { totalAmount: number; transactionCount: number }
	}
	totalCustomerCount: number // <-- Add this line
	allTimeSales: { totalAmount: number; transactionCount: number } // <-- Add this line
}

async function getDashboardStats(): Promise<DashboardStats | null> {
	try {
		// Construct the full URL for server-side fetch
		const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'
		const response = await fetch(`${baseUrl}/api/dashboard/stats`, {
			method: 'GET',
			headers: {
				cookie: (await headers()).get('cookie') || '', // Pass along cookies for authentication
				'Content-Type': 'application/json',
			},
			cache: 'no-store', // Ensure fresh data for dashboard
		})

		if (!response.ok) {
			console.error('Failed to fetch dashboard stats, status:', response.status)
			return null
		}
		return response.json()
	} catch (error) {
		console.error('Error fetching dashboard stats:', error)
		return null
	}
}

export default async function DashboardPage() {
	const currentUser = await getCurrentUser()
	const userRole = currentUser?.role as Role // Cast to your Role enum

	// Admins, Pharmacists, Super Admins see the full stats dashboard
	if (userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN || userRole === Role.PHARMACIST) {
		const stats = await getDashboardStats()

		if (!stats) {
			return (
				<div className='container mx-auto p-4 md:p-8'>
					<h1 className='mb-6 text-3xl font-bold'>Dashboard</h1>
					<p className='text-destructive'>Could not load dashboard statistics. Please try again later.</p>
				</div>
			)
		}

		const { itemStats, salesStats, totalCustomerCount, allTimeSales } = stats

		return (
			<div className='container mx-auto p-4 md:p-8'>
				<h1 className='mb-6 text-3xl font-bold'>Pharmacy Dashboard</h1>
				<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
					{/* Item Stats */}
					<StatCard
						title='Expiring Soon'
						value={itemStats.expiringSoonCount}
						iconName='AlertTriangle'
						description='Items expiring in next 30 days'
						link='/inventory/items?status=expiring_soon'
						linkText='View Items'
					/>
					<StatCard
						title='Out of Stock'
						value={itemStats.outOfStockCount}
						iconName='ArchiveX'
						description='Items with zero quantity'
						link='/inventory/items?status=out_of_stock'
						linkText='View Items'
					/>
					<StatCard
						title='Total Items'
						value={itemStats.totalItemCount}
						iconName='Package'
						description='Overall item count'
						link='/inventory/items'
						linkText='View Items'
					/>

					{/* Sales Stats */}
					<StatCard
						title="Today's Sales"
						value={`$${salesStats.today.totalAmount.toFixed(2)}`}
						iconName='DollarSign'
						description={`${salesStats.today.transactionCount} transactions`}
						link='/sales/history?period=today'
						linkText='View Sales'
					/>
					<StatCard
						title="This Month's Sales"
						value={`$${salesStats.thisMonth.totalAmount.toFixed(2)}`}
						iconName='CalendarDays'
						description={`${salesStats.thisMonth.transactionCount} transactions`}
						link='/sales/history?period=this_month'
						linkText='View Sales'
					/>
					<StatCard
						title="This Year's Sales"
						value={`$${salesStats.thisYear.totalAmount.toFixed(2)}`}
						iconName='CalendarRange'
						description={`${salesStats.thisYear.transactionCount} transactions`}
						link='/sales/history?period=this_year'
						linkText='View Sales'
					/>
					<StatCard
						title='All-Time Sales'
						value={`$${allTimeSales.totalAmount.toFixed(2)}`}
						iconName='TrendingUp'
						description={`${allTimeSales.transactionCount} transactions`}
						link='/sales/history?period=all_time' // Or simply /sales/history if 'all_time' is default
						linkText='View Sales'
					/>
					<StatCard
						title='Total Customers'
						value={totalCustomerCount}
						iconName='ShoppingCart'
						description='Registered customers'
					/>
				</div>
			</div>
		)
	}

	// CUSTOMER Dashboard
	if (userRole === Role.CUSTOMER) {
		return (
			<div className='container mx-auto p-4 md:p-8'>
				<h1 className='mb-6 text-3xl font-bold'>Welcome, {currentUser?.name || 'Customer'}!</h1>
				<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
					{/* Customer-specific cards */}
					<StatCard
						title='My Orders'
						value={'View'} // You might fetch a count of their orders
						iconName='Package' // Example icon
						link='/sales/history?user=me' // Example link, adjust API to filter by current user
						linkText='View Order History'
					/>
					<StatCard
						title='My Reports'
						value={'View'} // You might fetch a count of their reports
						iconName='Package' // Example icon
						link='/reports' // Reports page should already filter by user
						linkText='View My Reports'
					/>
					<StatCard
						title='Account Details'
						value={'Manage'}
						iconName='Package' // Using UsersIcon as a placeholder for an account icon
						link='/account'
						linkText='Update Profile'
					/>
					{/* Add more customer-relevant cards here */}
				</div>
			</div>
		)
	}

	// SELLER Dashboard (can be similar to customer or have specific seller tools)
	if (userRole === Role.SELLER) {
		// Sellers might see a simplified version of the admin dashboard or specific tools
		// For now, let's give them a welcome message and a link to create sales.
		// You could also fetch seller-specific stats if available.
		return (
			<div className='container mx-auto p-4 md:p-8'>
				<h1 className='mb-6 text-3xl font-bold'>Seller Dashboard</h1>
				<p className='mb-4'>Welcome, {currentUser?.name || 'Seller'}! Manage your sales and inventory.</p>
				<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
					<StatCard
						title='Create New Sale'
						value={'Start'}
						iconName='DollarSign'
						link='/sales'
						linkText='Go to Sales Page'
					/>
					<StatCard
						title='View Inventory'
						value={'Browse'}
						iconName='Package'
						link='/inventory/items'
						linkText='Check Stock'
					/>
					{/* Add more seller-relevant cards here */}
				</div>
			</div>
		)
	}

	// Fallback for any other roles or if role is not defined (should ideally not happen if auth is set up)
	return (
		<div className='container mx-auto p-4 md:p-8'>
			<h1 className='mb-6 text-3xl font-bold'>Welcome</h1>
			<p>Your dashboard is being prepared. Please check back later or contact support if you believe this is an error.</p>
		</div>
	)
}
