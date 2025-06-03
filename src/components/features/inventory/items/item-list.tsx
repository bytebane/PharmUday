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
import { ItemDetailsSheet } from './item-details-sheet'
import { useSearchParams } from 'next/navigation'
import * as XLSX from 'xlsx'
import { useColumnVisibility } from '@/hooks/useColumnVisibility'
import { ColumnVisibilityToggle } from '@/components/features/inventory/column-visibility-toggle'
import Image from 'next/image'

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

	// Get URL parameters for initial filters
	const urlStatus = searchParams.get('status')
	const urlCategoryId = searchParams.get('categoryId')
	const urlSupplierId = searchParams.get('supplierId')
	const urlSearch = searchParams.get('search')

	// Table state
	const [isSheetOpen, setIsSheetOpen] = useState(false)
	const [editingItem, setEditingItem] = useState<ItemWithRelations | null>(null)
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
		const filters: ColumnFiltersState = []
		if (urlStatus === 'expiring_soon') filters.push({ id: 'expiry_date', value: 'expiring_soon' })
		else if (urlStatus === 'expired') filters.push({ id: 'expiry_date', value: 'expired' })
		else if (urlStatus === 'out_of_stock') filters.push({ id: 'quantity_in_stock', value: 'out_of_stock' })
		if (urlCategoryId) filters.push({ id: 'categories', value: urlCategoryId })
		if (urlSupplierId) filters.push({ id: 'supplierId', value: urlSupplierId })
		return filters
	})
	const [globalFilter, setGlobalFilter] = useState(urlSearch || '')
	const [filters, setFilters] = useState<{ status?: string; categoryId?: string; supplierId?: string; search?: string }>(() => ({
		status: urlStatus ?? undefined,
		categoryId: urlCategoryId ?? undefined,
		supplierId: urlSupplierId ?? undefined,
		search: urlSearch ?? undefined,
	}))
	const [isImporting, setIsImporting] = useState(false)
	const [isExporting, setIsExporting] = useState(false)

	// Item details view state
	const [selectedItem, setSelectedItem] = useState<ItemWithRelations | null>(null)
	const [isDetailsViewOpen, setIsDetailsViewOpen] = useState(false)

	// Column visibility
	const { columnVisibility, toggleColumn, resetToDefaults, isColumnVisible, applyPreset, showAllColumns, hideAllColumns, isColumnRequired, isHydrated } = useColumnVisibility()

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

	// Item details handlers
	const handleItemClick = useCallback((item: ItemWithRelations) => {
		setSelectedItem(item)
		setIsDetailsViewOpen(true)
	}, [])

	const handleCloseDetailsView = useCallback(() => {
		setIsDetailsViewOpen(false)
		setSelectedItem(null)
	}, [])

	// Category/Supplier filter handlers
	const handleCategoryFilter = useCallback((categoryId: string) => {
		setFilters(f => ({ ...f, categoryId }))
		setColumnFilters(prev => {
			const filtered = prev.filter(f => f.id !== 'categories')
			return [...filtered, { id: 'categories', value: categoryId }]
		})
		setPagination(p => ({ ...p, pageIndex: 0 }))
	}, [])

	const handleSupplierFilter = useCallback((supplierId: string) => {
		setFilters(f => ({ ...f, supplierId }))
		setColumnFilters(prev => {
			const filtered = prev.filter(f => f.id !== 'supplierId')
			return [...filtered, { id: 'supplierId', value: supplierId }]
		})
		setPagination(p => ({ ...p, pageIndex: 0 }))
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
	const columns = useMemo<ColumnDef<ItemWithRelations>[]>(() => {
		const baseColumns: ColumnDef<ItemWithRelations>[] = [
			// Core identification fields
			{
				accessorKey: 'name',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Name <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => (
					<button
						onClick={() => handleItemClick(row.original)}
						className='font-medium hover:underline cursor-pointer text-left'>
						{row.getValue('name')}
					</button>
				),
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
				accessorKey: 'manufacturer',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Manufacturer <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
			},
			// Categories and supplier
			{
				accessorKey: 'categories',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Categories <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => {
					const categories = row.original.categories
					if (!categories || categories.length === 0) return 'N/A'

					return (
						<div className='flex flex-wrap gap-1'>
							{categories.map((cat, index) => (
								<span key={cat.id}>
									<button
										onClick={() => handleCategoryFilter(cat.id)}
										className='hover:underline cursor-pointer'>
										{cat.name}
									</button>
									{index < categories.length - 1 && ', '}
								</span>
							))}
						</div>
					)
				},
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
				cell: ({ row }) => {
					const supplier = row.original.supplier
					if (!supplier) return 'N/A'

					return (
						<button
							onClick={() => handleSupplierFilter(supplier.id)}
							className='hover:underline cursor-pointer'>
							{supplier.name}
						</button>
					)
				},
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
			// Physical properties
			{
				accessorKey: 'formulation',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Formulation <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
			},
			{
				accessorKey: 'strength',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Strength <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
			},
			{
				accessorKey: 'unit',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Unit <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
			},
			{
				accessorKey: 'units_per_pack',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Units per Pack <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
			},
			// Regulatory and description
			{
				accessorKey: 'schedule',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Schedule <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
			},
			{
				accessorKey: 'description',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Description <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
			},
			// Stock and inventory
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
				accessorKey: 'reorder_level',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Reorder Level <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
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
			// Pricing
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
				accessorKey: 'purchase_price',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Purchase Price <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => {
					const price = row.getValue('purchase_price') as number | null
					return price ? price.toFixed(2) : 'N/A'
				},
			},
			{
				accessorKey: 'tax_rate',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Tax Rate <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => {
					const rate = row.getValue('tax_rate') as number | null
					return rate ? `${(rate * 100).toFixed(1)}%` : 'N/A'
				},
			},
			{
				accessorKey: 'discount',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Discount <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => {
					const discount = row.getValue('discount') as number | null
					return discount ? `${(discount * 100).toFixed(1)}%` : 'N/A'
				},
			},
			// Purchase information
			{
				accessorKey: 'purchase_date',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Purchase Date <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => {
					const date = row.getValue('purchase_date') as string | null
					return date ? new Date(date).toLocaleDateString() : 'N/A'
				},
			},
			// Status flags
			{
				accessorKey: 'isActive',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Active <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => (row.getValue('isActive') ? 'Yes' : 'No'),
			},
			{
				accessorKey: 'isAvailable',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Available <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => (row.getValue('isAvailable') ? 'Yes' : 'No'),
			},
			// Media
			{
				accessorKey: 'image',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Image <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => {
					const imageUrl = row.getValue('image') as string | null
					return imageUrl ? (
						<Image
							src={imageUrl}
							alt='Item'
							className='w-10 h-10 object-cover rounded'
							width={40}
							height={40}
						/>
					) : (
						'N/A'
					)
				},
			},
			// Timestamps
			{
				accessorKey: 'createdAt',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Created <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => new Date(row.getValue('createdAt') as string).toLocaleDateString(),
			},
			{
				accessorKey: 'updatedAt',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Updated <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => new Date(row.getValue('updatedAt') as string).toLocaleDateString(),
			},
		]

		// Filter visible columns
		const visibleColumns = baseColumns.filter(column => {
			// For TanStack table, columns with accessorKey automatically get that as their id
			// If a column has an explicit id, use that, otherwise use accessorKey
			const columnId = column.id || (column as any).accessorKey
			return columnId && isColumnVisible(columnId)
		})

		// Add actions column for admin/pharmacist
		if (session?.user?.role === Role.ADMIN || session?.user?.role === Role.PHARMACIST) {
			visibleColumns.push({
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
			} as ColumnDef<ItemWithRelations>)
		}

		return visibleColumns
	}, [deleteMutation, handleEdit, handleDelete, handleItemClick, handleCategoryFilter, handleSupplierFilter, globalFilterFn, session?.user?.role, isColumnVisible])

	// Sync filters when URL parameters change
	useEffect(() => {
		const newStatus = searchParams.get('status')
		const newCategoryId = searchParams.get('categoryId')
		const newSupplierId = searchParams.get('supplierId')
		const newSearch = searchParams.get('search')

		// Update filters state
		setFilters({
			status: newStatus ?? undefined,
			categoryId: newCategoryId ?? undefined,
			supplierId: newSupplierId ?? undefined,
			search: newSearch ?? undefined,
		})

		// Update global filter
		setGlobalFilter(newSearch || '')

		// Update column filters
		setColumnFilters(() => {
			const newFilters: ColumnFiltersState = []

			// Handle status filters
			if (newStatus === 'expiring_soon') newFilters.push({ id: 'expiry_date', value: 'expiring_soon' })
			else if (newStatus === 'expired') newFilters.push({ id: 'expiry_date', value: 'expired' })
			else if (newStatus === 'out_of_stock') newFilters.push({ id: 'quantity_in_stock', value: 'out_of_stock' })

			// Handle category filter
			if (newCategoryId) newFilters.push({ id: 'categories', value: newCategoryId })

			// Handle supplier filter
			if (newSupplierId) newFilters.push({ id: 'supplierId', value: newSupplierId })

			return newFilters
		})

		// Reset pagination when filters change
		setPagination(p => ({ ...p, pageIndex: 0 }))
	}, [searchParams])

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
							const categoryId = value === 'all' ? undefined : value
							setFilters(f => ({ ...f, categoryId }))
							setColumnFilters(prev => {
								const filtered = prev.filter(f => f.id !== 'categories')
								return categoryId ? [...filtered, { id: 'categories', value: categoryId }] : filtered
							})
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
							const supplierId = value === 'all' ? undefined : value
							setFilters(f => ({ ...f, supplierId }))
							setColumnFilters(prev => {
								const filtered = prev.filter(f => f.id !== 'supplierId')
								return supplierId ? [...filtered, { id: 'supplierId', value: supplierId }] : filtered
							})
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
							const status = value === 'all' ? undefined : value
							setFilters(f => ({ ...f, status }))
							setColumnFilters(prev => {
								const filtered = prev.filter(f => f.id !== 'expiry_date' && f.id !== 'quantity_in_stock')
								if (status === 'expiring_soon') return [...filtered, { id: 'expiry_date', value: 'expiring_soon' }]
								if (status === 'expired') return [...filtered, { id: 'expiry_date', value: 'expired' }]
								if (status === 'out_of_stock') return [...filtered, { id: 'quantity_in_stock', value: 'out_of_stock' }]
								return filtered
							})
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

				{/* Column visibility toggle */}
				<ColumnVisibilityToggle
					columnVisibility={columnVisibility}
					onToggleColumn={toggleColumn}
					onResetToDefaults={resetToDefaults}
					onApplyPreset={applyPreset}
					onShowAllColumns={showAllColumns}
					onHideAllColumns={hideAllColumns}
					isColumnRequired={isColumnRequired}
					isHydrated={isHydrated}
				/>
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

			{/* Item Details View */}
			<ItemDetailsSheet
				item={selectedItem}
				isOpen={isDetailsViewOpen}
				onOpenChange={setIsDetailsViewOpen}
				onCategoryFilter={handleCategoryFilter}
				onSupplierFilter={handleSupplierFilter}
			/>
		</div>
	)
}
