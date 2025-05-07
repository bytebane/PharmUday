'use client'

import { useSession } from 'next-auth/react'
import { SaleWithBasicRelations } from '@/app/sales/history/page' // Import the type
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Eye } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import Link from 'next/link'
import { Role } from '@/generated/prisma'

async function fetchSalesHistoryAPI(): Promise<SaleWithBasicRelations[]> {
	const response = await fetch('/api/sales')
	if (!response.ok) {
		throw new Error('Failed to fetch sales history from client')
	}
	return response.json()
}

const salesHistoryQueryKeys = {
	all: ['salesHistory'] as const,
	lists: () => [...salesHistoryQueryKeys.all, 'list'] as const,
}

interface SalesHistoryListProps {
	initialSalesHistory: SaleWithBasicRelations[]
}

export function SalesHistoryList({ initialSalesHistory }: SalesHistoryListProps) {
	const { data: session } = useSession()

	const {
		data: salesHistory,
		isLoading,
		error,
	} = useQuery<SaleWithBasicRelations[], Error>({
		queryKey: salesHistoryQueryKeys.lists(),
		queryFn: fetchSalesHistoryAPI,
		initialData: initialSalesHistory,
	})

	// Determine if the user has permission to view all details or take actions
	const canViewAllDetails = session?.user?.role === Role.ADMIN || session?.user?.role === Role.SUPER_ADMIN || session?.user?.role === Role.PHARMACIST

	if (isLoading && !salesHistory) return <div>Loading sales history...</div>
	if (error) return <div className='text-red-600'>Error: {error.message}</div>

	const currentSalesHistory = salesHistory || []

	if (currentSalesHistory.length === 0) {
		return <p>No sales records found.</p>
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Invoice #</TableHead>
					<TableHead>Date</TableHead>
					<TableHead>Customer</TableHead>
					<TableHead>Staff</TableHead>
					<TableHead className='text-right'>Total Amount</TableHead>
					<TableHead>Payment Status</TableHead>
					<TableHead>Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{currentSalesHistory.map(sale => (
					<TableRow key={sale.id}>
						<TableCell>{sale.invoice?.invoiceNumber || sale.id.substring(0, 8)}</TableCell>
						<TableCell>{format(new Date(sale.saleDate), 'PPP p')}</TableCell>
						<TableCell>{sale.customer?.name || 'Walk-in'}</TableCell>
						<TableCell>{sale.staff.email}</TableCell>
						<TableCell className='text-right'>{sale.grandTotal.toFixed(2)}</TableCell>
						<TableCell>{sale.paymentStatus}</TableCell>
						<TableCell>
							<Button
								variant='ghost'
								size='sm'
								asChild>
								<Link href={`/sales/${sale.id}`}>
									<Eye className='mr-2 h-4 w-4' /> View Invoice
								</Link>
							</Button>
							{/* Add other actions like 'Refund' or 'Cancel' if applicable and authorized */}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
