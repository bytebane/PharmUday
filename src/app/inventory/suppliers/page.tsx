import { SupplierList } from '@/components/features/inventory/suppliers/supplier-list'
import { Suspense } from 'react'
import { Supplier as PrismaSupplier } from '@/generated/prisma' // Assuming this is your Prisma Supplier type

async function getSuppliers(): Promise<PrismaSupplier[]> {
	// Using NEXT_PUBLIC_APP_URL for server-side fetch to own API route
	const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/suppliers`, { cache: 'no-store' })
	if (!response.ok) {
		throw new Error('Failed to fetch suppliers on server')
	}
	return response.json()
}

export default async function InventorySuppliersPage() {
	const initialSuppliers = await getSuppliers()
	return (
		<div className='container mx-auto py-10'>
			<h1 className='mb-6 text-3xl font-bold'>Suppliers</h1>
			<Suspense fallback={<div>Loading suppliers...</div>}>
				<SupplierList initialSuppliers={initialSuppliers} />
			</Suspense>
		</div>
	)
}
