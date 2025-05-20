import { Sale, User, Customer, Invoice } from '@/generated/prisma'
import { SalesHistoryList } from '@/components/features/sales/sales-list'
import { Suspense } from 'react'
import GlobalLoading from '@/app/loading'

// Define a more detailed type for sales history entries
export type SaleWithBasicRelations = Sale & {
	staff: Pick<User, 'id' | 'email'>
	customer: Pick<Customer, 'id' | 'name'> | null
	invoice: Pick<Invoice, 'id'> | null
	_count?: {
		// If you want to show number of items without fetching all
		saleItems: number
	}
}

export default async function SalesHistoryPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } | Promise<{ [key: string]: string | string[] | undefined }> }) {
	const resolvedSearchParams = typeof searchParams?.then === 'function' ? await searchParams : searchParams

	// Add this type assertion:
	const params = resolvedSearchParams as { [key: string]: string | string[] | undefined } | undefined

	const periodFilter = params && typeof params.period === 'string' ? params.period : undefined

	return (
		<div className='container mx-auto'>
			<Suspense fallback={<GlobalLoading />}>
				<SalesHistoryList periodFilter={periodFilter} />
			</Suspense>
		</div>
	)
}
