import { Suspense } from 'react'
import { headers } from 'next/headers'
import { Sale, User, Customer, Invoice } from '@/generated/prisma'
import { SalesHistoryList } from '@/components/features/sales/sales-list'

// Define a more detailed type for sales history entries
export type SaleWithBasicRelations = Sale & {
	staff: Pick<User, 'id' | 'email'>
	customer: Pick<Customer, 'id' | 'name'> | null
	invoice: Pick<Invoice, 'id' | 'invoiceNumber'> | null
	_count?: {
		// If you want to show number of items without fetching all
		saleItems: number
	}
}

async function getSalesHistory(): Promise<SaleWithBasicRelations[]> {
	const cookie = (await headers()).get('cookie')
	// The existing /api/sales GET endpoint should provide enough data.
	// We might refine it later for pagination or specific history views.
	const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sales`, {
		headers: { ...(cookie ? { cookie } : {}) },
		cache: 'no-store',
	})
	if (!response.ok) throw new Error('Failed to fetch sales history')
	return response.json()
}

export default async function SalesHistoryPage() {
	const initialSalesHistory = await getSalesHistory()
	return (
		<div className='container mx-auto py-10'>
			<h1 className='mb-6 text-3xl font-bold'>Sales History</h1>
			<Suspense fallback={<div>Loading sales history...</div>}>
				<SalesHistoryList initialSalesHistory={initialSalesHistory} />
			</Suspense>
		</div>
	)
}
