import { SupplierList } from '@/components/features/inventory/suppliers/supplier-list'

export default function InventorySuppliersPage() {
	return (
		<div className='container mx-auto py-10'>
			<h1 className='mb-6 text-3xl font-bold'>Suppliers</h1>
			<SupplierList />
		</div>
	)
}
