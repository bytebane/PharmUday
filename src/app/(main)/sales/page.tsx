import GlobalLoading from '@/app/loading'
import { NewSaleForm } from '@/components/features/sales/new-sale-form'
import { Suspense } from 'react'

export default async function SalesPage() {
	return (
		<div className='container mx-auto'>
			<Suspense fallback={<GlobalLoading />}>
				<NewSaleForm />
			</Suspense>
		</div>
	)
}
