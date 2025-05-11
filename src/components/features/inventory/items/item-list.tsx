'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { ItemWithRelations, BasicCategory, BasicSupplier } from '@/types/inventory' // Adjust path as needed
import { Role } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from '@/components/ui/sheet' // Import Sheet components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PlusCircle, Edit, Trash2, MoreHorizontal, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner' // Assuming you use sonner for toasts
import { ItemForm } from './item-form' // Import the new form component
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
	// To add more features later:
	FilterFn,
	getSortedRowModel,
	SortingState,
	getFilteredRowModel,
	ColumnFiltersState,
	getFacetedRowModel, // Useful for some filter scenarios
	// getFacetedRowModel,
	// getPaginationRowModel,
} from '@tanstack/react-table'
import React from 'react'
import { DialogTitle } from '@/components/ui/dialog'

// API interaction functions (could be moved to a service file)
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
const fetchItemsAPI = async (): Promise<ItemWithRelations[]> => {
	const response = await fetch('/api/inv-items')
	if (!response.ok) {
		throw new Error('Failed to fetch items')
	}
	return response.json()
}

async function fetchRelatedDataAPI(): Promise<{ categories: BasicCategory[]; suppliers: BasicSupplier[] }> {
	const [catRes, supRes] = await Promise.all([fetch('/api/inv-categories'), fetch('/api/suppliers')])
	if (!catRes.ok || !supRes.ok) {
		// Added check for supRes.ok
		throw new Error('Failed to fetch related data')
	}
	const categories = await catRes.json()
	const suppliers = await supRes.json()
	return { categories, suppliers }
}

async function deleteItemAPI(id: string): Promise<void> {
	const response = await fetch(`/api/inv-items/${id}`, { method: 'DELETE' })
	if (!response.ok) {
		const errorData = await response.text()
		throw new Error(`Failed to delete item: ${errorData || response.statusText}`)
	}
}

// Define query keys
const itemQueryKeys = {
	all: ['items'] as const,
	lists: () => [...itemQueryKeys.all, 'list'] as const,
	detail: (id: string) => [...itemQueryKeys.all, 'detail', id] as const,
	relatedData: () => ['relatedData'] as const,
}

interface ItemListProps {
	initialItems: ItemWithRelations[]
	initialCategories: BasicCategory[]
	initialSuppliers: BasicSupplier[]
}

export function ItemList({ initialItems, initialCategories, initialSuppliers }: ItemListProps) {
	const { data: session } = useSession()
	const [isSheetOpen, setIsSheetOpen] = useState(false) // State for Sheet visibility
	const [editingItem, setEditingItem] = useState<ItemWithRelations | null>(null)
	const queryClient = useQueryClient()
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [globalFilter, setGlobalFilter] = React.useState('')
	const [sorting, setSorting] = React.useState<SortingState>([])

	const canModify = session?.user?.role === Role.ADMIN || session?.user?.role === Role.PHARMACIST

	const {
		data: items,
		isLoading: isLoadingItems,
		error: itemsError,
	} = useQuery<ItemWithRelations[], Error>({
		queryKey: itemQueryKeys.lists(),
		queryFn: fetchItemsAPI,
		initialData: initialItems, // Hydrate with server-fetched data
	})

	const {
		data: relatedData,
		isLoading: isLoadingRelated,
		error: relatedError,
	} = useQuery<{ categories: BasicCategory[]; suppliers: BasicSupplier[] }, Error>({
		queryKey: itemQueryKeys.relatedData(),
		queryFn: fetchRelatedDataAPI,
		initialData: { categories: initialCategories, suppliers: initialSuppliers }, // Hydrate
	})

	const deleteMutation = useMutation({
		mutationFn: deleteItemAPI,
		onSuccess: () => {
			toast.success('Item deleted successfully.')
			queryClient.invalidateQueries({ queryKey: itemQueryKeys.lists() })
		},
		onError: (err: Error) => {
			toast.error(err.message || 'Failed to delete item.')
		},
	})

	const handleEdit = React.useCallback((item: ItemWithRelations) => {
		setEditingItem(item)
		setIsSheetOpen(true)
	}, [])

	const handleAddNew = React.useCallback(() => {
		setEditingItem(null)
		setIsSheetOpen(true)
	}, [])

	const handleDelete = React.useCallback(
		(id: string) => {
			if (!confirm('Are you sure you want to delete this item?')) return
			deleteMutation.mutate(id)
		},
		[deleteMutation]
	)

	// This function will be called by ItemForm on successful submission
	const handleFormSuccess = React.useCallback(() => {
		setIsSheetOpen(false) // Close sheet on success
		setEditingItem(null) // Reset editing item
		// Queries will be invalidated by the ItemForm's mutation
	}, [])

	const globalFilterFn: FilterFn<ItemWithRelations> = React.useCallback((row, columnId, filterValue) => {
		const searchTerm = String(filterValue).toLowerCase()
		if (!searchTerm) return true

		const name = String(row.original.name).toLowerCase()
		const genericName = String(row.original.generic_name || '').toLowerCase()
		const manufacturer = String(row.original.manufacturer || '').toLowerCase()
		const description = String(row.original.description || '').toLowerCase()

		return name.includes(searchTerm) || genericName.includes(searchTerm) || manufacturer.includes(searchTerm) || description.includes(searchTerm)
	}, [])
	const columns = React.useMemo<ColumnDef<ItemWithRelations>[]>(
		() => [
			{
				accessorKey: 'name',
				header: ({ column }) => {
					return (
						<Button
							variant='ghost'
							onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
							Name
							<ArrowUpDown className='ml-2 h-4 w-4' />
						</Button>
					)
				},
				cell: ({ row }) => <div className='font-medium'>{row.getValue('name')}</div>,
			},
			{
				accessorKey: 'generic_name',
				header: 'Generic Name',
			},
			{
				accessorKey: 'categories',
				header: 'Categories',
				cell: ({ row }) => row.original.categories.map(cat => cat.name).join(', ') || 'N/A',
				filterFn: (row, columnId, filterValue) => {
					if (!filterValue) return true
					return row.original.categories.some(cat => cat.id === filterValue)
				},
				enableSorting: false,
			},
			{
				accessorKey: 'supplierId', // Used for filtering
				header: 'Supplier',
				cell: ({ row }) => row.original.supplier?.name || 'N/A',
				filterFn: (row, columnId, filterValue) => {
					if (!filterValue) return true
					return row.original.supplierId === filterValue
				},
				enableSorting: false,
			},
			{
				accessorKey: 'quantity_in_stock',
				header: 'Stock',
				filterFn: (row, columnId, filterValue) => {
					if (filterValue === 'out_of_stock') {
						return row.original.quantity_in_stock <= 0
					}
					return true
				},
			},
			{
				accessorKey: 'price',
				header: ({ column }) => {
					return (
						<Button
							variant='outline'
							onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
							Price
							<ArrowUpDown className='ml-2 h-4 w-4' />
						</Button>
					)
				},
				cell: ({ row }) => (row.getValue('price') as number).toFixed(2),
			},
			{
				accessorKey: 'expiry_date',
				header: ({ column }) => {
					return (
						<Button
							variant='outline'
							onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
							Expiry Date
							<ArrowUpDown className='ml-2 h-4 w-4' />
						</Button>
					)
				},
				cell: ({ row }) => (row.getValue('expiry_date') ? new Date(row.getValue('expiry_date') as string).toLocaleDateString() : 'N/A'),
				filterFn: (row, columnId, filterValue) => {
					const expiryDate = row.original.expiry_date ? new Date(row.original.expiry_date) : null
					if (!filterValue || filterValue === 'all') return true
					if (!expiryDate && (filterValue === 'expired' || filterValue === 'expiring_soon')) return false

					const today = new Date()
					today.setHours(0, 0, 0, 0)

					if (filterValue === 'expired' && expiryDate) {
						return expiryDate < today
					}
					if (filterValue === 'expiring_soon' && expiryDate) {
						const thirtyDaysFromNow = new Date(today)
						thirtyDaysFromNow.setDate(today.getDate() + 30)
						return expiryDate >= today && expiryDate <= thirtyDaysFromNow
					}
					return true
				},
			},
			...(canModify
				? [
						{
							id: 'actions',
							header: () => <div className='text-right'>Actions</div>,
							cell: ({ row }: { row: { original: ItemWithRelations } }) => (
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
											<DropdownMenuItem onClick={() => handleEdit(row.original)}>
												<Edit className='mr-2 h-4 w-4' /> Edit
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => handleDelete(row.original.id)}
												disabled={deleteMutation.isPending && deleteMutation.variables === row.original.id}
												className='text-red-600 focus:text-red-700 focus:bg-red-50'>
												<Trash2 className='mr-2 h-4 w-4' /> Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							),
						} as ColumnDef<ItemWithRelations>, // Type assertion
				  ]
				: []),
		],
		[canModify, deleteMutation, handleEdit, handleDelete] // Add dependencies
	)

	const table = useReactTable({
		data: items || [],
		columns,
		getCoreRowModel: getCoreRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		globalFilterFn: globalFilterFn,
		state: {
			sorting,
			columnFilters,
			globalFilter,
		},
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
	})

	const isFiltered = React.useMemo(() => table.getState().columnFilters.length > 0 || !!table.getState().globalFilter, [table.getState().columnFilters, table.getState().globalFilter])
	// To get the count of visible columns, use getVisibleLeafColumns()
	// const visibleColumnCount = table.getVisibleLeafColumns().length
	// console.log('Visible column count:', visibleColumnCount)

	const isLoading = isLoadingItems || isLoadingRelated
	const error = itemsError || relatedError

	if (isLoading && !items && !relatedData) return <div>Loading initial data...</div> // Show loading only if no initial data
	if (error) return <div className='text-red-600'>Error: {error.message}</div>

	// const currentItems = items || []
	const currentCategories = relatedData?.categories || []
	const currentSuppliers = relatedData?.suppliers || []

	return (
		<div>
			{/* Filters Toolbar */}
			<div className='mb-4 flex flex-wrap items-center gap-2 rounded-md border p-4'>
				<Input
					placeholder='Search (name, desc, generic, mfg)...'
					value={globalFilter ?? ''}
					onChange={event => setGlobalFilter(event.target.value)}
					className='h-10 w-full sm:w-auto sm:flex-grow md:max-w-xs'
				/>
				<Select
					value={(table.getColumn('categories')?.getFilterValue() as string) ?? 'all'}
					onValueChange={value => table.getColumn('categories')?.setFilterValue(value === 'all' ? undefined : value)}>
					<SelectTrigger className='h-10 w-full sm:w-auto min-w-[150px]'>
						<SelectValue placeholder='Filter by Category' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='all'>All Categories</SelectItem>
						{currentCategories.map(category => (
							<SelectItem
								key={category.id}
								value={category.id}>
								{category.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={(table.getColumn('supplierId')?.getFilterValue() as string) ?? 'all'}
					onValueChange={value => table.getColumn('supplierId')?.setFilterValue(value === 'all' ? undefined : value)}>
					<SelectTrigger className='h-10 w-full sm:w-auto min-w-[150px]'>
						<SelectValue placeholder='Filter by Supplier' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='all'>All Suppliers</SelectItem>
						{currentSuppliers.map(supplier => (
							<SelectItem
								key={supplier.id}
								value={supplier.id}>
								{supplier.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={(table.getColumn('quantity_in_stock')?.getFilterValue() as string) ?? 'all'}
					onValueChange={value => table.getColumn('quantity_in_stock')?.setFilterValue(value === 'all' ? undefined : value)}>
					<SelectTrigger className='h-10 w-full sm:w-auto min-w-[150px]'>
						<SelectValue placeholder='Stock Status' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='all'>All Stock Status</SelectItem>
						<SelectItem value='out_of_stock'>Out of Stock</SelectItem>
						{/* Add "Low Stock" if reorder_level is consistently used */}
					</SelectContent>
				</Select>

				<Select
					value={(table.getColumn('expiry_date')?.getFilterValue() as string) ?? 'all'}
					onValueChange={value => table.getColumn('expiry_date')?.setFilterValue(value === 'all' ? undefined : value)}>
					<SelectTrigger className='h-10 w-full sm:w-auto min-w-[150px]'>
						<SelectValue placeholder='Expiry Status' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='all'>All Expiry Status</SelectItem>
						<SelectItem value='expiring_soon'>Expiring Soon (30d)</SelectItem>
						<SelectItem value='expired'>Expired</SelectItem>
					</SelectContent>
				</Select>

				{isFiltered && (
					<Button
						variant='ghost'
						onClick={() => {
							table.resetColumnFilters()
							setGlobalFilter('')
						}}
						className='h-10'>
						Reset
					</Button>
				)}
			</div>
			{canModify && (
				<div className='mb-4 flex justify-end'>
					{/* Replace Dialog with Sheet */}
					<Sheet
						open={isSheetOpen}
						onOpenChange={setIsSheetOpen}>
						<SheetTrigger asChild>
							<Button onClick={handleAddNew}>
								<PlusCircle className='mr-2 h-4 w-4' /> Add New Item
							</Button>
						</SheetTrigger>
						<SheetContent className='w-full overflow-y-auto sm:max-w-xl md:max-w-2xl lg:max-w-3xl'>
							{' '}
							{/* Adjust width as needed */}
							<SheetHeader className='mb-4'>
								<DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
							</SheetHeader>
							<ItemForm
								itemData={editingItem}
								categories={currentCategories} // Pass current categories
								suppliers={currentSuppliers} // Pass current suppliers
								onSuccess={handleFormSuccess}
							/>
						</SheetContent>
					</Sheet>
				</div>
			)}
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
			{/* TODO: Add pagination controls here if needed */}
		</div>
	)
}
