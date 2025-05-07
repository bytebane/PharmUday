import { Suspense } from 'react'
import { headers } from 'next/headers'
import { Sale } from '@/generated/prisma' // Import Sale and related types
import { InvoiceView } from '@/components/features/sales/invoice-view'

// Define a more detailed type for a single sale to include all necessary relations for an invoice
export type SaleWithFullDetails = Sale & {
	staff: { email: string; profile?: { firstName?: string | null; lastName?: string | null } | null }
	customer: { name: string; email?: string | null; phone?: string | null; address?: string | null } | null
	saleItems: ({ item: { name: string; strength?: string | null; formulation?: string | null } } & { quantitySold: number; priceAtSale: number; discountOnItem: number; taxOnItem: number; totalPrice: number })[]
	invoice: { invoiceNumber: string; issuedDate: Date; status: string } | null
}

async function getSaleDetails(saleId: string): Promise<SaleWithFullDetails | null> {
	const cookie = (await headers()).get('cookie')
	const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sales/${saleId}`, {
		headers: { ...(cookie ? { cookie } : {}) },
		cache: 'no-store',
	})
	if (!response.ok) {
		if (response.status === 404) return null
		throw new Error('Failed to fetch sale details')
	}
	return response.json()
}

export default async function SaleDetailPage({ params }: { params: { id: string } }) {
	const saleDetails = await getSaleDetails(params.id)

	if (!saleDetails) return <div className='container mx-auto py-10 text-center'>Sale not found.</div>

	return (
		<div className='container mx-auto py-10'>
			{/* <h1 className='mb-6 text-3xl font-bold'>Sale Invoice: {saleDetails.invoice?.invoiceNumber}</h1> */}
			<Suspense fallback={<div>Loading invoice...</div>}>
				<InvoiceView saleDetails={saleDetails} />
			</Suspense>
		</div>
	)
}
