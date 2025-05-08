'use client'

import { useSession } from 'next-auth/react'
import { SaleWithBasicRelations } from '@/app/sales/history/page' // Import the type
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Eye, MoreHorizontal, ArrowUpDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Role } from '@/generated/prisma'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, getSortedRowModel, SortingState } from '@tanstack/react-table'
import { FormattedDateCell } from '@/components/formatted-date-cell' // Adjust path if needed
import React from 'react'

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
	const [sorting, setSorting] = React.useState<SortingState>([])

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

	const columns = React.useMemo<ColumnDef<SaleWithBasicRelations>[]>(
		() => [
			{
				accessorKey: 'invoice.invoiceNumber',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Invoice # <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.original.invoice?.invoiceNumber || row.original.id.substring(0, 8),
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
				cell: ({ row }) => (
					<FormattedDateCell
						dateValue={row.getValue('saleDate') as string | Date}
						formatString='PPP p'
					/>
				),
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
				accessorKey: 'staff.email', // Assuming staff is an object with an email property
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
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
						className='text-right w-full justify-end'>
						Total <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => <div className='text-right'>{(row.getValue('grandTotal') as number).toFixed(2)}</div>,
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
				cell: ({ row }) => row.getValue('paymentStatus'),
			},
			{
				id: 'actions',
				header: () => <div className='text-right'>Actions</div>,
				cell: ({ row }: { row: { original: SaleWithBasicRelations } }) => (
					<div className='text-right'>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant='ghost'
									className='h-8 w-8 p-0'>
									<span className='sr-only'>Open menu</span>
									<MoreHorizontal className='h-4 w-4' />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align='end'>
								<DropdownMenuItem asChild>
									<Link href={`/sales/${row.original.id}`}>
										<Eye className='mr-2 h-4 w-4' /> View Invoice
									</Link>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				),
			},
		],
		[] // No external dependencies for these columns currently, but add if any arise
	)

	const currentSalesHistory = salesHistory || []

	const table = useReactTable({
		data: currentSalesHistory,
		columns,
		getCoreRowModel: getCoreRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		state: { sorting },
	})

	if (isLoading && !salesHistory) return <div>Loading sales history...</div>
	if (error) return <div className='text-red-600'>Error: {error.message}</div>

	if (currentSalesHistory.length === 0) {
		return <p>No sales records found.</p>
	}

	return (
		<div className='rounded-md border'>
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map(headerGroup => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map(header => (
								<TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map(row => (
							<TableRow
								key={row.id}
								data-state={row.getIsSelected() && 'selected'}>
								{row.getVisibleCells().map(cell => (
									<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell
								colSpan={columns.length}
								className='h-24 text-center'>
								No results.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	)
}
