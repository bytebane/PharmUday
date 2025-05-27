'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ItemWithRelations, BasicCategory, BasicSupplier } from '@/types/inventory'
import { Role } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Edit, Trash2, MoreHorizontal, ArrowUpDown, Loader2 } from 'lucide-react' // Spinner icon
import { toast } from 'sonner'
import { ItemForm } from './item-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ColumnDef, FilterFn, SortingState, ColumnFiltersState, PaginationState } from '@tanstack/react-table'
import { DialogTitle } from '@/components/ui/dialog'
import { CustomDataTable } from '@/components/custom/custom-data-table'
import { fetchItems_cli, fetchRelatedInventoryData_cli, deleteItem_cli } from '@/services/inventoryService'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AddFAB } from '@/components/AddFAB'
import { useSearchParams } from 'next/navigation'
import * as XLSX from 'xlsx'

const itemQueryKeys = {
	all: ['items'] as const,
	lists: () => [...itemQueryKeys.all, 'list'] as const,
	detail: (id: string) => [...itemQueryKeys.all, 'detail', id] as const,
	relatedData: () => ['relatedData'] as const,
}

export function ItemList() {
	// Session and state
	const { data: session } = useSession()
	const queryClient = useQueryClient()

	const searchParams = useSearchParams()

	const urlFilter = searchParams.get('status')

	// Table state
	const [isSheetOpen, setIsSheetOpen] = useState(false)
	const [editingItem, setEditingItem] = useState<ItemWithRelations | null>(null)
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
		const filters: ColumnFiltersState = []
		if (urlFilter === 'expiring_soon') filters.push({ id: 'expiry_date', value: 'expiring_soon' })
		else if (urlFilter === 'out_of_stock') filters.push({ id: 'quantity_in_stock', value: 'out_of_stock' })
		return filters
	})
	const [globalFilter, setGlobalFilter] = useState('')
	const [filters, setFilters] = useState<{ status?: string; categoryId?: string; supplierId?: string; search?: string }>(() => ({
		status: urlFilter ?? undefined,
	}))
	const [isImporting, setIsImporting] = useState(false)
	const [isExporting, setIsExporting] = useState(false)

	// Data fetching
	const {
		data,
		isLoading: isLoadingItems,
		error: itemsError,
	} = useQuery<{ items: ItemWithRelations[]; total: number }, Error>({
		queryKey: ['items', 'list', pagination.pageIndex, pagination.pageSize, filters],
		queryFn: () => fetchItems_cli(pagination.pageIndex + 1, pagination.pageSize, filters),
	})

	const items = data?.items ?? []
	const total = data?.total ?? 0

	const {
		data: relatedData,
		isLoading: isLoadingRelated,
		error: relatedError,
	} = useQuery<{ categories: BasicCategory[]; suppliers: BasicSupplier[] }, Error>({
		queryKey: itemQueryKeys.relatedData(),
		queryFn: fetchRelatedInventoryData_cli,
	})

	const currentCategories = relatedData?.categories || []
	const currentSuppliers = relatedData?.suppliers || []

	// Mutations
	const deleteMutation = useMutation({
		mutationFn: deleteItem_cli,
		onSuccess: () => {
			toast.success('Item deleted successfully.')
			queryClient.invalidateQueries({ queryKey: ['items', 'list'] })
		},
		onError: (err: Error) => {
			toast.error(err.message || 'Failed to delete item.')
		},
	})

	// Handlers
	const handleEdit = useCallback((item: ItemWithRelations) => {
		setEditingItem(item)
		setIsSheetOpen(true)
	}, [])

	const handleAddNew = useCallback(() => {
		setEditingItem(null)
		setIsSheetOpen(true)
	}, [])

	const handleDelete = useCallback(
		(id: string) => {
			if (!confirm('Are you sure you want to delete this item?')) return
			deleteMutation.mutate(id)
		},
		[deleteMutation],
	)

	const handleFormSuccess = useCallback(() => {
		setIsSheetOpen(false)
		setEditingItem(null)
	}, [])

	const handleExport = async () => {
		setIsExporting(true)
		try {
			const res = await fetch('/api/inv-items/xlsx', {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})
			const data = await res.json()
			const allItems = data.items ?? []

			// Optionally, map/flatten relations for Excel
			const exportData = allItems.map((item: any) => ({
				...item,
				categories: item.categories?.map((c: any) => c.name).join(', '),
				supplier: item.supplier?.name || '',
			}))

			const ws = XLSX.utils.json_to_sheet(exportData)
			const wb = XLSX.utils.book_new()
			const filename = `meds_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}_${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '-')}.xlsx`
			XLSX.utils.book_append_sheet(wb, ws, 'Items')
			XLSX.writeFile(wb, filename)
		} finally {
			setIsExporting(false)
		}
	}

	const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		setIsImporting(true)
		try {
			const data = await file.arrayBuffer()
			const workbook = XLSX.read(data)
			const sheet = workbook.Sheets[workbook.SheetNames[0]]
			const json: any[] = XLSX.utils.sheet_to_json(sheet)
			await fetch('/api/inv-items/xlsx', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ items: json }),
			})
			// Optionally: refresh items list
			queryClient.invalidateQueries({ queryKey: ['items', 'list'] })
		} finally {
			setIsImporting(false)
		}
	}

	// Table columns
	const globalFilterFn: FilterFn<ItemWithRelations> = useCallback((row, _columnId, filterValue) => {
		const searchTerm = String(filterValue).toLowerCase()
		if (!searchTerm) return true
		const { name, generic_name, manufacturer, description } = row.original
		return name.toLowerCase().includes(searchTerm) || (generic_name || '').toLowerCase().includes(searchTerm) || (manufacturer || '').toLowerCase().includes(searchTerm) || (description || '').toLowerCase().includes(searchTerm)
	}, [])

	const columns = useMemo<ColumnDef<ItemWithRelations>[]>(
		() => [
			{
				accessorKey: 'name',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Name <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => <div className='font-medium'>{row.getValue('name')}</div>,
			},
			{
				accessorKey: 'generic_name',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Generic Name <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
			},
			{
				accessorKey: 'categories',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Categories <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.original.categories.map(cat => cat.name).join(', ') || 'N/A',
				sortingFn: (rowA, rowB) => {
					const valA = rowA.original.categories
						.map(cat => cat.name)
						.join(', ')
						.toLowerCase()
					const valB = rowB.original.categories
						.map(cat => cat.name)
						.join(', ')
						.toLowerCase()
					return valA.localeCompare(valB)
				},
				filterFn: (row, _columnId, filterValue) => {
					if (!filterValue) return true
					return row.original.categories.some(cat => cat.id === filterValue)
				},
			},
			{
				accessorKey: 'supplierId',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Supplier <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.original.supplier?.name || 'N/A',
				sortingFn: (rowA, rowB) => {
					const valA = (rowA.original.supplier?.name || '').toLowerCase()
					const valB = (rowB.original.supplier?.name || '').toLowerCase()
					return valA.localeCompare(valB)
				},
				filterFn: (row, _columnId, filterValue) => {
					if (!filterValue) return true
					return row.original.supplierId === filterValue
				},
			},
			{
				accessorKey: 'quantity_in_stock',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Stock <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
			},
			{
				accessorKey: 'price',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Price <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => (row.getValue('price') as number).toFixed(2),
			},
			{
				accessorKey: 'expiry_date',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Expiry Date <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => (row.getValue('expiry_date') ? new Date(row.getValue('expiry_date') as string).toLocaleDateString() : 'N/A'),
				filterFn: (row, _columnId, filterValue) => {
					const expiryDate = row.original.expiry_date ? new Date(row.original.expiry_date) : null
					if (!filterValue || filterValue === 'all') return true
					if (!expiryDate && (filterValue === 'expired' || filterValue === 'expiring_soon')) return false
					const today = new Date()
					today.setHours(0, 0, 0, 0)
					if (filterValue === 'expired' && expiryDate) return expiryDate < today
					if (filterValue === 'expiring_soon' && expiryDate) {
						const thirtyDaysFromNow = new Date(today)
						thirtyDaysFromNow.setDate(today.getDate() + 30)
						return expiryDate >= today && expiryDate <= thirtyDaysFromNow
					}
					return true
				},
			},
			// Actions column for admin/pharmacist
			...(session?.user?.role === Role.ADMIN || session?.user?.role === Role.PHARMACIST
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
						} as ColumnDef<ItemWithRelations>,
					]
				: []),
		],
		[deleteMutation, handleEdit, handleDelete, globalFilterFn, session?.user?.role],
	)

	// Sync column filters with urlFilter prop
	useEffect(() => {
		setColumnFilters(prevFilters => {
			const updatedFilters = prevFilters.filter(f => f.id !== 'expiry_date' && f.id !== 'quantity_in_stock')
			if (urlFilter === 'expiring_soon') updatedFilters.push({ id: 'expiry_date', value: 'expiring_soon' })
			else if (urlFilter === 'out_of_stock') updatedFilters.push({ id: 'quantity_in_stock', value: 'out_of_stock' })
			const prev = JSON.stringify([...prevFilters].sort((a, b) => String(a.id).localeCompare(String(b.id))))
			const next = JSON.stringify([...updatedFilters].sort((a, b) => String(a.id).localeCompare(String(b.id))))
			return prev !== next ? updatedFilters : prevFilters
		})
	}, [urlFilter])

	// Sync filters and pagination with urlFilter prop
	useEffect(() => {
		setFilters(f => ({ ...f, status: urlFilter ?? undefined }))
		setPagination(p => ({ ...p, pageIndex: 0 }))
	}, [urlFilter])

	const isLoading = isLoadingItems || isLoadingRelated
	const error = itemsError || relatedError
	const isAnyFilterActive = columnFilters.length > 0 || !!globalFilter || !!filters.status || !!filters.categoryId || !!filters.supplierId

	if (isLoading && !items && !relatedData) return <div>Loading initial data...</div>
	if (error) return <div className='text-red-600'>Error: {error.message}</div>

	return (
		<div className='w-full'>
			{/* Filter/search controls */}
			<div className='mb-4 flex flex-wrap items-center gap-2 rounded-md border p-4'>
				<Button
					asChild
					className='ml-2'
					disabled={isImporting}>
					<label>
						{isImporting ? (
							<>
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								Importing...
							</>
						) : (
							<>Import from Excel</>
						)}
						<input
							type='file'
							accept='.xlsx,.xls'
							onChange={handleImport}
							style={{ display: 'none' }}
							disabled={isImporting}
						/>
					</label>
				</Button>
				<Button
					onClick={handleExport}
					className='ml-2'
					disabled={isExporting}>
					{isExporting ? (
						<>
							<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							Exporting...
						</>
					) : (
						<>Export to Excel</>
					)}
				</Button>
				<Button
					onClick={() => {
						// Define the columns you want in the template
						const templateData = [
							{
								name: '',
								manufacturer: '',
								generic_name: '',
								formulation: '',
								strength: '',
								unit: '',
								schedule: '',
								description: '',
								units_per_pack: '',
								price: '',
								tax_rate: '',
								discount: '',
								reorder_level: '',
								isActive: '',
								isAvailable: '',
								quantity_in_stock: '',
								expiry_date: '',
								purchase_date: '',
								supplierId: '',
								// Add/remove fields as needed
							},
						]
						const ws = XLSX.utils.json_to_sheet(templateData)
						const wb = XLSX.utils.book_new()
						XLSX.utils.book_append_sheet(wb, ws, 'Template')
						XLSX.writeFile(wb, 'meds-import-template.xlsx')
					}}
					className='ml-2'
					variant='outline'>
					Download Excel Template
				</Button>
				{/* Search input */}
				{isLoadingRelated ? (
					<Skeleton className='h-10 w-[180px]' />
				) : (
					<Input
						placeholder='Search (name, desc, generic, mfg)...'
						value={globalFilter}
						onChange={event => {
							const value = event.target.value
							setGlobalFilter(value)
							setFilters(f => ({ ...f, search: value || undefined }))
							setPagination(p => ({ ...p, pageIndex: 0 }))
						}}
						className='h-10 w-full sm:w-auto sm:flex-grow md:max-w-2xs'
					/>
				)}

				{/* Category filter */}
				{isLoadingRelated ? (
					<Skeleton className='h-10 w-[180px]' />
				) : (
					<Select
						value={filters.categoryId ?? 'all'}
						onValueChange={value => {
							setFilters(f => ({ ...f, categoryId: value === 'all' ? undefined : value }))
							setPagination(p => ({ ...p, pageIndex: 0 }))
						}}>
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
				)}

				{/* Supplier filter */}
				{isLoadingRelated ? (
					<Skeleton className='h-10 w-[180px]' />
				) : (
					<Select
						value={filters.supplierId ?? 'all'}
						onValueChange={value => {
							setFilters(f => ({ ...f, supplierId: value === 'all' ? undefined : value }))
							setPagination(p => ({ ...p, pageIndex: 0 }))
						}}>
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
				)}

				{/* Status filter */}
				{isLoadingRelated ? (
					<Skeleton className='h-10 w-[180px]' />
				) : (
					<Select
						value={filters.status ?? 'all'}
						onValueChange={value => {
							setFilters(f => ({ ...f, status: value === 'all' ? undefined : value }))
							setPagination(p => ({ ...p, pageIndex: 0 }))
						}}>
						<SelectTrigger className='h-10 w-full sm:w-auto min-w-[150px]'>
							<SelectValue placeholder='Stock/Expiry Status' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='all'>All Status</SelectItem>
							<SelectItem value='out_of_stock'>Out of Stock</SelectItem>
							<SelectItem value='expiring_soon'>Expiring Soon (30d)</SelectItem>
							<SelectItem value='expired'>Expired</SelectItem>
						</SelectContent>
					</Select>
				)}

				{/* Reset button */}
				{isAnyFilterActive && (
					<Button
						variant='ghost'
						onClick={() => {
							setColumnFilters([])
							setGlobalFilter('')
							setFilters({})
							setPagination(p => ({ ...p, pageIndex: 0 }))
						}}
						className='h-10'>
						Reset
					</Button>
				)}
			</div>

			{/* Data Table */}
			<CustomDataTable
				columns={columns}
				data={items}
				isLoading={isLoading}
				noResultsMessage='No items found.'
				sorting={sorting}
				onSortingChange={setSorting}
				columnFilters={columnFilters}
				onColumnFiltersChange={setColumnFilters}
				globalFilter={globalFilter}
				onGlobalFilterChange={setGlobalFilter}
				pagination={pagination}
				onPaginationChange={setPagination}
				pageCount={Math.ceil(total / pagination.pageSize)}
			/>

			{/* Floating Action Button (FAB) for Add New Item */}
			{(session?.user?.role === Role.ADMIN || session?.user?.role === Role.PHARMACIST) && (
				<AddFAB
					onClick={handleAddNew}
					ariaLabel='Add New Item'
				/>
			)}

			{/* Sheet for Add/Edit */}
			<Sheet
				open={isSheetOpen}
				onOpenChange={setIsSheetOpen}>
				<SheetContent className='w-full overflow-y-auto sm:max-w-xl md:max-w-2xl lg:max-w-3xl'>
					<SheetHeader className='mb-4'>
						<DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
					</SheetHeader>
					<ItemForm
						itemData={editingItem}
						categories={currentCategories}
						suppliers={currentSuppliers}
						onSuccess={handleFormSuccess}
					/>
				</SheetContent>
			</Sheet>
		</div>
	)
}
