'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { ReportCategory as PrismaReportCategory, Role } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PlusCircle, Edit, Trash2, MoreHorizontal, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ColumnDef, SortingState, PaginationState } from '@tanstack/react-table'
import { CustomDataTable } from '@/components/custom/custom-data-table'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchReportCategories_cli, deleteReportCategory_cli } from '@/services/reportService'
import { AddFAB } from '@/components/AddFAB'
import { ReportCategoryForm } from './cat-form'

const reportCategoryQueryKeys = {
	all: ['report-categories'] as const,
	lists: () => [...reportCategoryQueryKeys.all, 'list'] as const,
	detail: (id: string) => [...reportCategoryQueryKeys.all, 'detail', id] as const,
}

export function ReportCategoryList() {
	const { data: session } = useSession()
	const queryClient = useQueryClient()
	const [isSheetOpen, setIsSheetOpen] = useState(false)
	const [editingCategory, setEditingCategory] = useState<PrismaReportCategory | null>(null)
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
	const [sorting, setSorting] = useState<SortingState>([])
	const [search, setSearch] = useState('')

	const canModify = session?.user?.role === Role.ADMIN || session?.user?.role === Role.PHARMACIST

	const { data, isLoading, error } = useQuery<{ categories: PrismaReportCategory[]; total: number }, Error>({
		queryKey: ['report-categories', 'list', pagination.pageIndex, pagination.pageSize, search],
		queryFn: () => fetchReportCategories_cli(pagination.pageIndex + 1, pagination.pageSize, search),
	})

	const categories = data?.categories ?? []
	const total = data?.total ?? 0

	const deleteMutation = useMutation({
		mutationFn: deleteReportCategory_cli,
		onSuccess: () => {
			toast.success('Report category deleted successfully.')
			queryClient.invalidateQueries({ queryKey: ['report-categories', 'list'] })
		},
		onError: (err: Error) => {
			toast.error(err.message || 'Failed to delete report category.')
		},
	})

	const handleEdit = useCallback((category: PrismaReportCategory) => {
		setEditingCategory(category)
		setIsSheetOpen(true)
	}, [])

	const handleAddNew = useCallback(() => {
		setEditingCategory(null)
		setIsSheetOpen(true)
	}, [])

	const handleDelete = useCallback(
		(id: string) => {
			if (!confirm('Are you sure you want to delete this report category?')) return
			deleteMutation.mutate(id)
		},
		[deleteMutation],
	)

	const handleFormSuccess = useCallback(() => {
		setIsSheetOpen(false)
		setEditingCategory(null)
	}, [])

	const columns = useMemo<ColumnDef<PrismaReportCategory>[]>(
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
			...(canModify
				? [
						{
							id: 'actions',
							header: () => <div className='text-right'>Actions</div>,
							cell: ({ row }: { row: { original: PrismaReportCategory } }) => (
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
						} as ColumnDef<PrismaReportCategory>,
					]
				: []),
		],
		[canModify, deleteMutation.isPending, deleteMutation.variables, handleEdit, handleDelete],
	)

	const isAnyFilterActive = !!search

	if (error) return <div className='text-red-600'>Error: {error.message}</div>

	return (
		<div className='w-full'>
			{/* Filter/search controls */}
			<div className='mb-4 flex flex-wrap items-center gap-2 rounded-md border p-4'>
				<Input
					placeholder='Search report categories...'
					value={search}
					onChange={event => {
						setSearch(event.target.value)
						setPagination(p => ({ ...p, pageIndex: 0 }))
					}}
					className='h-10 w-full sm:w-auto sm:flex-grow md:max-w-2xs'
				/>
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
				noResultsMessage='No report categories found.'
				sorting={sorting}
				onSortingChange={setSorting}
				pagination={pagination}
				onPaginationChange={setPagination}
				pageCount={Math.ceil(total / pagination.pageSize)}
			/>

			{canModify && (
				<>
					<AddFAB
						onClick={handleAddNew}
						ariaLabel='Add New Report Category'
					/>
					<Sheet
						open={isSheetOpen}
						onOpenChange={setIsSheetOpen}>
						<SheetContent className='w-full overflow-y-auto sm:max-w-md'>
							<SheetHeader>
								<SheetTitle>{editingCategory ? 'Edit Report Category' : 'Add New Report Category'}</SheetTitle>
							</SheetHeader>
							<ReportCategoryForm
								categoryData={editingCategory}
								onSuccess={handleFormSuccess}
							/>
						</SheetContent>
					</Sheet>
				</>
			)}
		</div>
	)
}
