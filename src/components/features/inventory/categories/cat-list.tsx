'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Category as PrismaCategory } from '@/generated/prisma' // Use Prisma type
import { Role } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CategoryForm } from './cat-form' // Import the category form
import { PlusCircle, Edit, Trash2, MoreHorizontal, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, getSortedRowModel, SortingState } from '@tanstack/react-table'

// Define a type that includes potential parent category info if fetched
type CategoryWithParent = PrismaCategory & {
	parentCategory?: { id: string; name: string } | null
}

async function fetchCategoriesAPI(): Promise<CategoryWithParent[]> {
	// Adjust include based on what you want to display (e.g., parentCategory name)
	const response = await fetch('/api/inv-categories?includeParent=true') // Example: Add query param if API supports it
	if (!response.ok) {
		throw new Error('Failed to fetch categories from client')
	}
	return response.json()
}

async function deleteCategoryAPI(id: string): Promise<void> {
	const response = await fetch(`/api/inv-categories/${id}`, { method: 'DELETE' })
	if (!response.ok) {
		const errorData = await response.text()
		throw new Error(`Failed to delete category: ${errorData || response.statusText}`)
	}
}

const categoryQueryKeys = {
	all: ['categories'] as const,
	lists: () => [...categoryQueryKeys.all, 'list'] as const,
	detail: (id: string) => [...categoryQueryKeys.all, 'detail', id] as const,
}

interface CategoryListProps {
	initialCategories: CategoryWithParent[]
}

export function CategoryList({ initialCategories }: CategoryListProps) {
	const { data: session } = useSession()
	const [isSheetOpen, setIsSheetOpen] = useState(false)
	const [editingCategory, setEditingCategory] = useState<CategoryWithParent | null>(null)
	const queryClient = useQueryClient()
	const [sorting, setSorting] = React.useState<SortingState>([])

	const canModify = session?.user?.role === Role.ADMIN || session?.user?.role === Role.PHARMACIST

	const {
		data: categories,
		isLoading,
		error,
	} = useQuery<CategoryWithParent[], Error>({
		queryKey: categoryQueryKeys.lists(),
		queryFn: fetchCategoriesAPI,
		initialData: initialCategories,
	})

	const deleteMutation = useMutation({
		mutationFn: deleteCategoryAPI,
		onSuccess: () => {
			toast.success('Category deleted successfully.')
			queryClient.invalidateQueries({ queryKey: categoryQueryKeys.lists() })
		},
		onError: (err: Error) => {
			toast.error(err.message || 'Failed to delete category.')
		},
	})

	const handleEdit = (category: CategoryWithParent) => {
		setEditingCategory(category)
		setIsSheetOpen(true)
	}

	const handleAddNew = () => {
		setEditingCategory(null)
		setIsSheetOpen(true)
	}

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this category? This might affect subcategories and items.')) return
		deleteMutation.mutate(id)
	}

	const handleFormSuccess = () => {
		setIsSheetOpen(false)
		setEditingCategory(null)
		// Data will be refetched by query invalidation in CategoryForm
	}

	const columns = React.useMemo<ColumnDef<CategoryWithParent>[]>(
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
				cell: ({ row }) => row.getValue('name'),
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
				cell: ({ row }) => row.getValue('description') || 'N/A',
			},
			{
				accessorKey: 'parentCategory.name',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Parent Category <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.original.parentCategory?.name || '--',
			},
			...(canModify
				? [
						{
							id: 'actions',
							header: () => <div className='text-right'>Actions</div>,
							cell: ({ row }: { row: { original: CategoryWithParent } }) => (
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
						} as ColumnDef<CategoryWithParent>,
				  ]
				: []),
		],
		[canModify, deleteMutation.isPending, deleteMutation.variables, handleEdit, handleDelete] // Added handleEdit
	)

	const currentCategories = categories || []

	const table = useReactTable({
		data: currentCategories,
		columns,
		getCoreRowModel: getCoreRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		state: { sorting },
	})

	if (isLoading && !categories) return <div>Loading initial categories...</div>
	if (error) return <div className='text-red-600'>Error: {error.message}</div>

	return (
		<div>
			{canModify && (
				<div className='mb-4 flex justify-end'>
					<Sheet
						open={isSheetOpen}
						onOpenChange={setIsSheetOpen}>
						<SheetTrigger asChild>
							<Button onClick={handleAddNew}>
								<PlusCircle className='mr-2 h-4 w-4' /> Add New Category
							</Button>
						</SheetTrigger>
						<SheetContent className='w-full overflow-y-auto sm:max-w-md'>
							<SheetHeader>
								<SheetTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</SheetTitle>
							</SheetHeader>
							<CategoryForm
								categoryData={editingCategory}
								allCategories={currentCategories} // Pass current categories for parent selection
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
		</div>
	)
}
