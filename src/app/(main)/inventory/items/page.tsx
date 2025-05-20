import { ItemList } from '@/components/features/inventory/items/item-list'
import { Suspense } from 'react'
import GlobalLoading from '@/app/loading'

/**
 * Inventory Items Page
 * - Passes status filter from URL query to ItemList
 * - Uses Suspense for loading state
 */
export default function InventoryItemsPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
	const statusFilter = typeof searchParams?.status === 'string' ? searchParams.status : undefined

	return (
		<div className='container mx-auto'>
			<Suspense fallback={<GlobalLoading />}>
				<ItemList statusFilter={statusFilter} />
			</Suspense>
		</div>
	)
}
