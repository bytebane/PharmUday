import { SalesHistoryList } from '@/components/features/sales/sales-list'

// Define a more detailed type for sales history entries

export default async function SalesHistoryPage() {
	return (
		<div className='container mx-auto'>
			<SalesHistoryList />
		</div>
	)
}
