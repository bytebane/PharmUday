'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Category as PrismaCategory } from '@/generated/prisma'
import { Role } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Edit, Trash2, MoreHorizontal, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ColumnDef, SortingState, PaginationState } from '@tanstack/react-table'
import { CustomDataTable } from '@/components/custom/custom-data-table'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CategoryForm } from './cat-form'
import { fetchCategories_cli, deleteCategory_cli } from '@/services/inventoryService'
import { AddFAB } from '@/components/AddFAB'

type CategoryWithParent = PrismaCategory & {
	parentCategory?: { id: string; name: string } | null
}

const categoryQueryKeys = {
	all: ['categories'] as const,
	lists: () => [...categoryQueryKeys.all, 'list'] as const,
	detail: (id: string) => [...categoryQueryKeys.all, 'detail', id] as const,
}

export function CategoryList() {
	const { data: session } = useSession()
	const queryClient = useQueryClient()
	const router = useRouter()
	const [isSheetOpen, setIsSheetOpen] = useState(false)
	const [editingCategory, setEditingCategory] = useState<CategoryWithParent | null>(null)
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
	const [sorting, setSorting] = useState<SortingState>([])
	const [search, setSearch] = useState('')

	const canModify = session?.user?.role === Role.ADMIN || session?.user?.role === Role.PHARMACIST

	const { data, isLoading, error } = useQuery<{ categories: CategoryWithParent[]; total: number }, Error>({
		queryKey: ['categories', 'list', pagination.pageIndex, pagination.pageSize, search],
		queryFn: () => fetchCategories_cli(pagination.pageIndex + 1, pagination.pageSize, search),
	})

	const categories = data?.categories ?? []
	const total = data?.total ?? 0

	const deleteMutation = useMutation({
		mutationFn: deleteCategory_cli,
		onSuccess: () => {
			toast.success('Category deleted successfully.')
			queryClient.invalidateQueries({ queryKey: ['categories', 'list'] })
		},
		onError: (err: Error) => {
			toast.error(err.message || 'Failed to delete category.')
		},
	})

	// Handlers
	const handleEdit = useCallback((category: CategoryWithParent) => {
		setEditingCategory(category)
		setIsSheetOpen(true)
	}, [])

	const handleAddNew = useCallback(() => {
		setEditingCategory(null)
		setIsSheetOpen(true)
	}, [])

	const handleDelete = useCallback(
		(id: string) => {
			if (!confirm('Are you sure you want to delete this category? This might affect subcategories and items.')) return
			deleteMutation.mutate(id)
		},
		[deleteMutation],
	)

	const handleFormSuccess = useCallback(() => {
		setIsSheetOpen(false)
		setEditingCategory(null)
	}, [])

	// Navigate to items page with category filter
	const handleCategoryClick = useCallback(
		(categoryId: string) => {
			router.push(`/inventory/items?categoryId=${categoryId}`)
		},
		[router],
	)

	const columns = useMemo<ColumnDef<CategoryWithParent>[]>(
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
				cell: ({ row }) => (
					<button
						onClick={() => handleCategoryClick(row.original.id)}
						className='font-medium hover:underline cursor-pointer text-left'>
						{row.getValue('name')}
					</button>
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
		[canModify, deleteMutation.isPending, deleteMutation.variables, handleEdit, handleDelete, handleCategoryClick],
	)

	const isAnyFilterActive = !!search

	if (error) return <div className='text-red-600'>Error: {error.message}</div>
	return (
		<div className='w-full'>
			{/* Filter/search controls */}
			<div className='mb-4 flex flex-wrap items-center gap-2 rounded-md border p-4'>
				{isLoading ? (
					<Skeleton className='h-10 w-full sm:w-auto sm:flex-grow md:max-w-2xs' />
				) : (
					<Input
						placeholder='Search categories...'
						value={search}
						onChange={event => {
							setSearch(event.target.value)
							setPagination(p => ({ ...p, pageIndex: 0 }))
						}}
						className='h-10 w-full sm:w-auto sm:flex-grow md:max-w-2xs'
					/>
				)}
				{isAnyFilterActive && (
					<Button
						variant='ghost'
						onClick={() => {
							setSearch('')
							setPagination(p => ({ ...p, pageIndex: 0 }))
						}}
						className='h-10'>
						Reset
					</Button>
				)}
			</div>

			<CustomDataTable
				columns={columns}
				data={categories}
				isLoading={isLoading}
				noResultsMessage='No categories found.'
				sorting={sorting}
				onSortingChange={setSorting}
				pagination={pagination}
				onPaginationChange={setPagination}
				pageCount={Math.ceil(total / pagination.pageSize)}
			/>

			{/* Floating Action Button (FAB) for Add New Category */}
			{canModify && (
				<AddFAB
					onClick={handleAddNew}
					ariaLabel='Add New Category'
				/>
			)}

			{/* Sheet for Add/Edit */}
			<Sheet
				open={isSheetOpen}
				onOpenChange={setIsSheetOpen}>
				<SheetContent className='w-full overflow-y-auto sm:max-w-md'>
					<SheetHeader>
						<SheetTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</SheetTitle>
					</SheetHeader>
					<CategoryForm
						categoryData={editingCategory}
						allCategories={categories}
						onSuccess={handleFormSuccess}
					/>
				</SheetContent>
			</Sheet>
		</div>
	)
}
