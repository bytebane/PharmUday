'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { ReportCategory as PrismaReportCategory, Role } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ReportCategoryForm } from './cat-form'
import { PlusCircle, Edit, Trash2, MoreHorizontal, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, getSortedRowModel, SortingState } from '@tanstack/react-table'
import React from 'react'

async function fetchReportCategoriesAPI(): Promise<PrismaReportCategory[]> {
	const response = await fetch('/api/report-categories') // Ensure this API endpoint exists
	if (!response.ok) {
		throw new Error('Failed to fetch report categories from client')
	}
	return response.json()
}

async function deleteReportCategoryAPI(id: string): Promise<void> {
	const response = await fetch(`/api/report-categories/${id}`, { method: 'DELETE' }) // Ensure this API endpoint exists
	if (!response.ok) {
		const errorData = await response.text()
		throw new Error(`Failed to delete report category: ${errorData || response.statusText}`)
	}
}

const reportCategoryQueryKeys = {
	all: ['reportCategories'] as const,
	lists: () => [...reportCategoryQueryKeys.all, 'list'] as const,
}

interface ReportCategoryListProps {
	initialReportCategories: PrismaReportCategory[]
}

export function ReportCategoryList({ initialReportCategories }: ReportCategoryListProps) {
	const { data: session } = useSession()
	const [isSheetOpen, setIsSheetOpen] = useState(false)
	const [editingCategory, setEditingCategory] = useState<PrismaReportCategory | null>(null)
	const queryClient = useQueryClient()
	const [sorting, setSorting] = React.useState<SortingState>([])

	// Adjust roles as needed for who can manage report categories
	const canModify = session?.user?.role === Role.ADMIN || session?.user?.role === Role.SUPER_ADMIN || session?.user?.role === Role.PHARMACIST

	const {
		data: reportCategories,
		isLoading,
		error,
	} = useQuery<PrismaReportCategory[], Error>({
		queryKey: reportCategoryQueryKeys.lists(),
		queryFn: fetchReportCategoriesAPI,
		initialData: initialReportCategories,
	})

	const deleteMutation = useMutation({
		mutationFn: deleteReportCategoryAPI,
		onSuccess: () => {
			toast.success('Report category deleted successfully.')
			queryClient.invalidateQueries({ queryKey: reportCategoryQueryKeys.lists() })
		},
		onError: (err: Error) => {
			toast.error(err.message || 'Failed to delete report category.')
		},
	})

	const handleEdit = (category: PrismaReportCategory) => {
		setEditingCategory(category)
		setIsSheetOpen(true)
	}

	const handleAddNew = () => {
		setEditingCategory(null)
		setIsSheetOpen(true)
	}

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this report category? This might affect associated reports.')) return
		deleteMutation.mutate(id)
	}

	const handleFormSuccess = () => {
		setIsSheetOpen(false)
		setEditingCategory(null)
	}

	const columns = React.useMemo<ColumnDef<PrismaReportCategory>[]>(
		() => [
			{
				accessorKey: 'name',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Name
						<ArrowUpDown className='ml-2 h-4 w-4' />
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
						Description
						<ArrowUpDown className='ml-2 h-4 w-4' />
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
		[canModify, deleteMutation.isPending, deleteMutation.variables, handleEdit, handleDelete]
	)

	const currentReportCategories = reportCategories || []

	const table = useReactTable({
		data: currentReportCategories,
		columns,
		getCoreRowModel: getCoreRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		state: { sorting },
	})

	if (isLoading && !reportCategories) return <div>Loading initial report categories...</div>
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
								<PlusCircle className='mr-2 h-4 w-4' /> Add New Report Category
							</Button>
						</SheetTrigger>
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
