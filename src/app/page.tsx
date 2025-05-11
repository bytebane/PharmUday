import { Suspense } from 'react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { AlertTriangle, ArchiveX, DollarSign, ShoppingCart, TrendingUp, Package, type LucideIcon, CalendarClock, CalendarDays, CalendarRange } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface StatCardProps {
	title: string
	value: string | number
	icon: LucideIcon
	description?: string
	link?: string
	linkText?: string
	isLoading?: boolean
}

function StatCard({ title, value, icon: Icon, description, link, linkText, isLoading }: StatCardProps) {
	if (isLoading) {
		return (
			<Card>
				<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
					<Skeleton className='h-6 w-3/4' />
					<Skeleton className='h-6 w-6 rounded-full' />
				</CardHeader>
				<CardContent>
					<Skeleton className='h-8 w-1/2' />
					{description && <Skeleton className='mt-1 h-4 w-full' />}
					{link && <Skeleton className='mt-2 h-4 w-1/4' />}
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
				<CardTitle className='text-sm font-medium'>{title}</CardTitle>
				<Icon className='h-5 w-5 text-muted-foreground' />
			</CardHeader>
			<CardContent>
				<div className='text-2xl font-bold'>{value}</div>
				{description && <p className='text-xs text-muted-foreground'>{description}</p>}
				{link && linkText && (
					<Link
						href={link}
						className='mt-2 inline-block text-sm text-primary hover:underline'>
						{linkText}
					</Link>
				)}
			</CardContent>
		</Card>
	)
}

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
			<h1 className='mb-6 text-3xl font-bold'>Dashboard</h1>
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
				{/* Item Stats */}
				<StatCard
					title='Expiring Soon'
					value={itemStats.expiringSoonCount}
					icon={AlertTriangle}
					description='Items expiring in next 30 days'
					link='/inventory/items?status=expiring_soon'
					linkText='View Items'
				/>
				<StatCard
					title='Out of Stock'
					value={itemStats.outOfStockCount}
					icon={ArchiveX}
					description='Items with zero quantity'
					link='/inventory/items?status=out_of_stock'
					linkText='View Items'
				/>
				<StatCard
					title='Total Items'
					value={itemStats.totalItemCount}
					icon={Package}
					description='Overall item count'
				/>

				{/* Sales Stats */}
				<StatCard
					title="Today's Sales"
					value={`$${salesStats.today.totalAmount.toFixed(2)}`}
					icon={DollarSign}
					description={`${salesStats.today.transactionCount} transactions`}
				/>
				<StatCard
					title="This Month's Sales"
					value={`$${salesStats.thisMonth.totalAmount.toFixed(2)}`}
					icon={CalendarDays}
					description={`${salesStats.thisMonth.transactionCount} transactions`}
				/>
				<StatCard
					title="This Year's Sales"
					value={`$${salesStats.thisYear.totalAmount.toFixed(2)}`}
					icon={CalendarRange}
					description={`${salesStats.thisYear.transactionCount} transactions`}
				/>
				<StatCard
					title='All-Time Sales'
					value={`$${allTimeSales.totalAmount.toFixed(2)}`}
					icon={TrendingUp}
					description={`${allTimeSales.transactionCount} transactions`}
				/>
				<StatCard
					title='Total Customers'
					value={totalCustomerCount}
					icon={ShoppingCart}
					description='Registered customers'
				/>
			</div>
		</div>
	)
}
