import { InvoiceView } from '@/components/features/sales/invoice-view'

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
	// Await the params promise to get the actual id
	const resolvedParams = await params
	const saleId = resolvedParams.id
	return (
		<div className='container mx-auto'>
			<InvoiceView saleId={saleId} />
		</div>
	)
}
