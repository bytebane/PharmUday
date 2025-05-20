'use client'

import * as React from 'react'
import { ColumnDef, SortingState, ColumnFiltersState, flexRender, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getFacetedRowModel, useReactTable, Table as TanstackTableType } from '@tanstack/react-table'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CustomDataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	isLoading?: boolean
	noResultsMessage?: string
	sorting?: SortingState
	onSortingChange?: (sorting: SortingState) => void
	columnFilters?: ColumnFiltersState
	onColumnFiltersChange?: (filters: ColumnFiltersState) => void
	globalFilter?: string
	onGlobalFilterChange?: (filter: string) => void
	globalFilterFn?: import('@tanstack/react-table').FilterFnOption<TData>
	pagination?: { pageIndex: number; pageSize: number }
	onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
	pageCount?: number
}

/**
 * CustomDataTable - Generic, paginated, filterable, and sortable table.
 */
export function CustomDataTable<TData, TValue>({ columns, data, isLoading = false, noResultsMessage = 'No results.', sorting: externalSorting, onSortingChange: externalOnSortingChange, columnFilters: externalColumnFilters, onColumnFiltersChange: externalOnColumnFiltersChange, globalFilter: externalGlobalFilter, onGlobalFilterChange: externalOnGlobalFilterChange, globalFilterFn, pagination: externalPagination, onPaginationChange: externalOnPaginationChange, pageCount: externalPageCount }: CustomDataTableProps<TData, TValue>) {
	const [internalSorting, setInternalSorting] = React.useState<SortingState>([])
	const sorting = externalSorting ?? internalSorting

	// Wrap handlers to match TanStack Table's OnChangeFn signature
	const handleSortingChange: Parameters<typeof useReactTable>[0]['onSortingChange'] = externalOnSortingChange
		? updaterOrValue => {
				if (typeof updaterOrValue === 'function') {
					const newSorting = updaterOrValue(externalSorting ?? internalSorting)
					externalOnSortingChange(newSorting)
				} else {
					externalOnSortingChange(updaterOrValue)
				}
		  }
		: setInternalSorting

	const handleColumnFiltersChange: Parameters<typeof useReactTable>[0]['onColumnFiltersChange'] = externalOnColumnFiltersChange
		? updaterOrValue => {
				if (typeof updaterOrValue === 'function') {
					const newFilters = updaterOrValue(externalColumnFilters ?? [])
					externalOnColumnFiltersChange(newFilters)
				} else {
					externalOnColumnFiltersChange(updaterOrValue)
				}
		  }
		: undefined

	const [internalPagination, setInternalPagination] = React.useState<{ pageIndex: number; pageSize: number }>({
		pageIndex: 0,
		pageSize: 10,
	})
	const pagination = externalPagination ?? internalPagination
	const handlePaginationChange: Parameters<typeof useReactTable>[0]['onPaginationChange'] = externalOnPaginationChange
		? updaterOrValue => {
				if (typeof updaterOrValue === 'function') {
					const newPagination = updaterOrValue(externalPagination ?? internalPagination)
					externalOnPaginationChange(newPagination)
				} else {
					externalOnPaginationChange(updaterOrValue)
				}
		  }
		: setInternalPagination

	const table: TanstackTableType<TData> = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		onSortingChange: handleSortingChange,
		onColumnFiltersChange: handleColumnFiltersChange,
		onGlobalFilterChange: externalOnGlobalFilterChange,
		globalFilterFn,
		state: {
			sorting,
			columnFilters: externalColumnFilters,
			globalFilter: externalGlobalFilter,
			pagination,
		},
		manualPagination: true,
		pageCount: externalPageCount,
		onPaginationChange: handlePaginationChange,
	})

	const pageSizes = [5, 10, 20, 50, 100]

	return (
		<div className='w-full'>
			{/* Responsive wrapper for horizontal scrolling */}
			<div className='overflow-x-auto rounded-md border'>
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
						{isLoading ? (
							<TableSkeleton
								columns={columns.length}
								rows={pagination.pageSize}
							/>
						) : table.getRowModel().rows?.length ? (
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
									{noResultsMessage}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			{/* Pagination Controls */}
			<div className='flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-4'>
				<div className='flex items-center gap-2'>
					<span>Rows per page:</span>
					<Select
						value={String(pagination.pageSize || 10)}
						onValueChange={value => {
							const newSize = Number(value)
							handlePaginationChange({
								pageIndex: 0,
								pageSize: newSize,
							})
						}}>
						<SelectTrigger className='w-[80px] h-8'>
							<SelectValue>{pagination.pageSize || 10}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{pageSizes.map(size => (
								<SelectItem
									key={size}
									value={String(size)}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className='flex items-center gap-2'>
					<Button
						variant='outline'
						size='sm'
						onClick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}>
						{'<<'}
					</Button>
					<Button
						variant='outline'
						size='sm'
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}>
						Previous
					</Button>
					<span>
						Page{' '}
						<strong>
							{table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
						</strong>
					</span>
					<Button
						variant='outline'
						size='sm'
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}>
						Next
					</Button>
					<Button
						variant='outline'
						size='sm'
						onClick={() => table.setPageIndex(table.getPageCount() - 1)}
						disabled={!table.getCanNextPage()}>
						{'>>'}
					</Button>
				</div>
				<div className='flex items-center gap-2'>
					<span>
						Go to page:
						<input
							type='number'
							min={1}
							max={table.getPageCount()}
							value={table.getState().pagination.pageIndex + 1}
							onChange={e => {
								const page = e.target.value ? Number(e.target.value) - 1 : 0
								handlePaginationChange({
									pageIndex: page,
									pageSize: pagination.pageSize,
								})
							}}
							className='ml-2 w-16 h-8 border rounded px-2'
						/>
					</span>
				</div>
			</div>
		</div>
	)
}

/**
 * TableSkeleton - Shows skeleton rows while loading.
 */
function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
	return (
		<>
			{Array.from({ length: rows }).map((_, i) => (
				<TableRow key={i}>
					{Array.from({ length: columns }).map((_, j) => (
						<TableCell key={j}>
							<div className='h-4 w-full bg-gray-200 rounded animate-pulse' />
						</TableCell>
					))}
				</TableRow>
			))}
		</>
	)
}
