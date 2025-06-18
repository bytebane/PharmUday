'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchMyOrders_cli } from '@/services/customerService'
import { Order } from '@/types'
import { CustomDataTable } from '@/components/custom/custom-data-table'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'
import { useMemo, useState } from 'react'

interface Pagination {
	pageIndex: number
	pageSize: number
}

// --- Helper Functions ---
function transformSalesToOrders(sales: any[]): Order[] {
	return (sales ?? []).map((sale: any) => ({
		id: sale.id,
		userId: sale.userId ?? '',
		user: sale.user ?? null,
		items: sale.items ?? [],
		total: sale.total ?? sale.grandTotal ?? 0,
		status: sale.status ?? sale.invoice?.status ?? 'completed',
		invoice: sale.invoice,
		saleDate: sale.saleDate,
		grandTotal: sale.grandTotal,
		createdAt: sale.createdAt ?? sale.saleDate ?? new Date().toISOString(),
		updatedAt: sale.updatedAt ?? sale.saleDate ?? new Date().toISOString(),
	}))
}

function getOrderColumns(router: ReturnType<typeof useRouter>) {
	return [
		{
			accessorKey: 'invoice.invoiceNumber',
			header: 'Invoice #',
			cell: ({ row }: { row: { original: Order } }) => row.original.invoice?.invoiceNumber || row.original.id.substring(0, 8),
		},
		{
			accessorKey: 'saleDate',
			header: 'Date',
			cell: ({ row }: { row: { original: Order } }) => new Date(row.original.saleDate).toLocaleString(),
		},
		{
			accessorKey: 'grandTotal',
			header: 'Total',
			cell: ({ row }: { row: { original: Order } }) => `₹${row.original.grandTotal?.toFixed(2) ?? '-'}`,
		},
		{
			accessorKey: 'invoice.status',
			header: 'Status',
			cell: ({ row }: { row: { original: Order } }) => (row.original.invoice?.status ? row.original.invoice.status.charAt(0).toUpperCase() + row.original.invoice.status.slice(1) : 'Completed'),
		},
		{
			id: 'actions',
			header: 'Actions',
			cell: ({ row }: { row: { original: Order } }) => (
				<OrderViewButton
					orderId={row.original.id}
					router={router}
				/>
			),
		},
	]
}

function OrderViewButton({ orderId, router }: { orderId: string; router: ReturnType<typeof useRouter> }) {
	return (
		<Button
			size='sm'
			variant='outline'
			onClick={() => {
				router.push(`/sales/${orderId}`)
			}}>
			<Eye className='w-4 h-4 mr-1' />
			View
		</Button>
	)
}

function OrdersTableContent({ pagination, setPagination }: { pagination: Pagination; setPagination: (p: Pagination) => void }) {
	const router = useRouter()

	const { data, isLoading, error } = useQuery({
		queryKey: ['orders', pagination.pageIndex, pagination.pageSize],
		queryFn: () => fetchMyOrders_cli(pagination.pageIndex + 1, pagination.pageSize),
		staleTime: 1000 * 60 * 2, // 2 minutes
	})

	const orders: Order[] = useMemo(() => transformSalesToOrders(data?.sales ?? []), [data])
	const total = data?.total ?? 0

	const columns = useMemo(() => getOrderColumns(router), [router])

	if (error) return <div className='container mx-auto p-8 text-red-600'>{(error as Error).message}</div>

	return (
		<CustomDataTable
			columns={columns}
			data={orders}
			isLoading={isLoading}
			noResultsMessage='No orders found.'
			pagination={pagination}
			onPaginationChange={setPagination}
			pageCount={Math.ceil(total / pagination.pageSize)}
		/>
	)
}

export default function MyOrdersPage() {
	const [pagination, setPagination] = useState<Pagination>({ pageIndex: 0, pageSize: 10 })

	return (
		<div className='container mx-auto p-8'>
			<OrdersTableContent
				pagination={pagination}
				setPagination={setPagination}
			/>
		</div>
	)
}
