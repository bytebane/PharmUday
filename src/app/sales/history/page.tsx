import { headers } from 'next/headers'
import { Metadata, Viewport } from 'next'
import { Sale, User, Customer, Invoice } from '@/generated/prisma'
import { SalesHistoryList } from '@/components/features/sales/sales-list'
import React from 'react'

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

// Metadata and Viewport configuration
export const metadata: Metadata = {
	title: 'Sales History',
	description: 'View detailed sales history records.',
}

export const generateViewport = (): Viewport => {
	return {
		width: 'device-width',
		initialScale: 1,
		// You can add themeColor here if needed, e.g.:
		// themeColor: [{ media: '(prefers-color-scheme: light)', color: 'white' }, { media: '(prefers-color-scheme: dark)', color: 'black' }],
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
	if (!response.ok) {
		// Attempt to get more details from the error response
		let errorDetails = `API responded with status ${response.status}`
		try {
			const errorBody = await response.json()
			errorDetails += ` - Message: ${errorBody.message || JSON.stringify(errorBody)}`
		} catch (e) {
			// If parsing as JSON fails, try to get plain text
			const errorText = await response.text()
			errorDetails += ` - Body: ${errorText || 'No additional error body.'}`
		}
		console.error('Failed to fetch sales history from API:', errorDetails)
		throw new Error(`Failed to fetch sales history. ${errorDetails}`)
	}
	return response.json()
}

// New async component to handle data fetching and display
async function SalesHistoryData() {
	const salesHistory = await getSalesHistory()
	return <SalesHistoryList initialSalesHistory={salesHistory} />
}

export default async function SalesHistoryPage() {
	return (
		<div className='container mx-auto py-10'>
			<h1 className='mb-6 text-3xl font-bold'>Sales History</h1>
			{/* Suspense will show the fallback while SalesHistoryData is fetching */}
			{/* Note: Next.js 13+ automatically wraps async components in Suspense boundaries if not explicitly done by a parent.
			    However, for clarity and explicit fallback UI, using <Suspense> is good practice.
			    If you have a global Suspense boundary in your layout, this might be handled there too.
			    For this specific page, an explicit Suspense boundary is clear. */}
			<React.Suspense fallback={<div className='text-center p-4'>Loading sales history...</div>}>
				<SalesHistoryData />
			</React.Suspense>
		</div>
	)
}
