import { ItemList } from '@/components/features/inventory/items/item-list'
import { Suspense } from 'react'
import { ItemWithRelations, BasicCategory, BasicSupplier } from '@/types/inventory'

// These functions would ideally be in a service file, e.g., src/services/inventoryService.ts
// For brevity, keeping them here. Ensure they are server-side compatible if called directly in Server Components.
// In a real app, these would fetch from your database or actual API endpoints.
// The fetch calls here are illustrative for server-side data fetching.
async function getItems(): Promise<ItemWithRelations[]> {
	// Replace with your actual server-side data fetching logic
	// Example: const items = await db.item.findMany({ include: { categories: true, supplier: true } });
	const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/inv-items`, { cache: 'no-store' }) // Ensure fresh data for SSR/ISR
	if (!res.ok) throw new Error('Failed to fetch items')
	return res.json()
}

async function getRelatedData(): Promise<{ categories: BasicCategory[]; suppliers: BasicSupplier[] }> {
	const [catRes, supRes] = await Promise.all([fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/inv-categories`, { cache: 'no-store' }), fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/suppliers`, { cache: 'no-store' })])
	if (!catRes.ok || !supRes.ok) throw new Error('Failed to fetch related data')
	return { categories: await catRes.json(), suppliers: await supRes.json() }
}

export default async function InventoryItemsPage() {
	// Fetch initial data on the server
	const initialItems = await getItems()
	const initialRelatedData = await getRelatedData()

	return (
		<div className='container mx-auto py-10'>
			<h1 className='mb-6 text-3xl font-bold'>Inventory Items</h1>
			<Suspense fallback={<div>Loading items...</div>}>
				<ItemList
					initialItems={initialItems}
					initialCategories={initialRelatedData.categories}
					initialSuppliers={initialRelatedData.suppliers}
				/>
			</Suspense>
		</div>
	)
}
