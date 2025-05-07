import { Suspense } from 'react'
import { headers } from 'next/headers'
import { ItemWithRelations } from '@/types/inventory' // Assuming ItemWithRelations is suitable
import { NewSaleForm } from '@/components/features/sales/new-sale-form'

// Fetch initial data needed for the NewSaleForm (e.g., items for search)
async function getInitialSaleData(): Promise<{ items: ItemWithRelations[]; customers: any[] /* Define Customer type */ }> {
	const cookie = (await headers()).get('cookie')
	const [itemsRes, customersRes] = await Promise.all([
		fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/inv-items?active=true`, {
			// Fetch only active items
			headers: { ...(cookie ? { cookie } : {}) },
			cache: 'no-store',
		}),
		fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/customers`, {
			// Assuming a /api/customers endpoint
			headers: { ...(cookie ? { cookie } : {}) },
			cache: 'no-store',
		}),
	])
	if (!itemsRes.ok) throw new Error('Failed to fetch items for sale')
	// if (!customersRes.ok) console.warn('Failed to fetch customers, proceeding without.'); // Handle customer fetch failure gracefully

	return { items: await itemsRes.json(), customers: customersRes.ok ? await customersRes.json() : [] }
}

export default async function SalesPage() {
	const { items, customers } = await getInitialSaleData()
	return (
		<div className='container mx-auto py-10'>
			<h1 className='mb-6 text-3xl font-bold'>Create New Sale</h1>
			<Suspense fallback={<div>Loading sale form...</div>}>
				<NewSaleForm
					initialItems={items}
					initialCustomers={customers}
				/>
			</Suspense>
		</div>
	)
}
