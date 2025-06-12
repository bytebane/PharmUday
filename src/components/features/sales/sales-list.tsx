'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { SaleWithBasicRelations } from '@/types/sale'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Eye, MoreHorizontal, ArrowUpDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { ColumnDef, SortingState, PaginationState } from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import { fetchSalesHistory_cli } from '@/services/saleService'
import { CustomDataTable } from '@/components/custom/custom-data-table'
import { DataTableActions } from '@/components/custom/data-table-actions'

export function SalesHistoryList() {
	const router = useRouter()
	const [sorting, setSorting] = useState<SortingState>([])
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
	const [search, setSearch] = useState('')

	const searchParams = useSearchParams()

	const urlFilter = searchParams.get('period')
	// Use the prop as initial state, fallback to 'all_time'
	const [period, setPeriod] = useState(urlFilter || 'all_time')

	const { data, isLoading, error } = useQuery<{ sales: SaleWithBasicRelations[]; total: number }, Error>({
		queryKey: ['salesHistory', 'list', pagination.pageIndex, pagination.pageSize, search, period],
		queryFn: () => fetchSalesHistory_cli(pagination.pageIndex + 1, pagination.pageSize, { search, period }),
	})

	const sales = data?.sales ?? []
	const total = data?.total ?? 0

	const columns = useMemo<ColumnDef<SaleWithBasicRelations>[]>(
		() => [
			{
				accessorKey: 'invoice.id',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Invoice # <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.original.invoice?.id || row.original.id.substring(0, 8),
			},
			{
				accessorKey: 'saleDate',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Date <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => new Date(row.original.saleDate).toLocaleString(),
			},
			{
				accessorKey: 'customer.name',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Customer <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.original.customer?.name || 'Walk-in',
			},
			{
				accessorKey: 'staff.email',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Staff <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.original.staff.email,
			},
			{
				accessorKey: 'grandTotal',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Total <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => (row.original.grandTotal as number).toFixed(2),
			},
			{
				accessorKey: 'paymentStatus',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Payment Status <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.original.paymentStatus,
			},
			{
				id: 'actions',
				header: () => <div className='text-right'>Actions</div>,
				cell: ({ row }: { row: { original: SaleWithBasicRelations } }) => (
					<div className='text-right'>
						<DataTableActions<SaleWithBasicRelations>
							row={row.original}
							viewPath={`/sales/${row.original.id}`}
							customActions={[
								{
									label: 'View Invoice',
									icon: <Eye className='h-4 w-4' />,
									onClick: () => router.push(`/sales/${row.original.id}`),
								},
							]}
						/>
					</div>
				),
			},
		],
		[router],
	)

	useEffect(() => {
		if (urlFilter && urlFilter !== period) setPeriod(urlFilter)
		// Optionally reset pagination or search here if needed
	}, [urlFilter])

	if (error) return <div className='text-red-600'>Error: {error.message}</div>

	const isAnyFilterActive = !!search || period !== 'all_time'

	return (
		<div className='w-full'>
			<div className='mb-4 flex flex-wrap items-center gap-2 rounded-md border p-4'>
				<Input
					placeholder='Search invoice #, customer, staff...'
					value={search}
					onChange={event => {
						setSearch(event.target.value)
						setPagination(p => ({ ...p, pageIndex: 0 }))
					}}
					className='h-10 w-full sm:w-auto sm:flex-grow md:max-w-sm'
				/>

				<div className='flex gap-2'>
					<Button
						variant={period === 'today' ? 'default' : 'outline'}
						onClick={() => {
							setPeriod('today')
							setPagination(p => ({ ...p, pageIndex: 0 }))
						}}
						size='sm'>
						Today
					</Button>
					<Button
						variant={period === 'this_month' ? 'default' : 'outline'}
						onClick={() => {
							setPeriod('this_month')
							setPagination(p => ({ ...p, pageIndex: 0 }))
						}}
						size='sm'>
						This Month
					</Button>
					<Button
						variant={period === 'this_year' ? 'default' : 'outline'}
						onClick={() => {
							setPeriod('this_year')
							setPagination(p => ({ ...p, pageIndex: 0 }))
						}}
						size='sm'>
						This Year
					</Button>
					<Button
						variant={period === 'all_time' ? 'default' : 'outline'}
						onClick={() => {
							setPeriod('all_time')
							setPagination(p => ({ ...p, pageIndex: 0 }))
						}}
						size='sm'>
						All Time
					</Button>
				</div>
				{isAnyFilterActive && (
					<Button
						variant='ghost'
						onClick={() => {
							setSearch('')
							setPeriod('all_time')
							setPagination(p => ({ ...p, pageIndex: 0 }))
						}}
						className='h-10'>
						Reset
					</Button>
				)}
			</div>

			<CustomDataTable
				columns={columns}
				data={sales}
				isLoading={isLoading}
				noResultsMessage='No results.'
				sorting={sorting}
				onSortingChange={setSorting}
				pagination={pagination}
				onPaginationChange={setPagination}
				pageCount={Math.ceil(total / pagination.pageSize)}
			/>
		</div>
	)
}
