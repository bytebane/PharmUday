'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
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
import { ReportForm } from './reports-form'
import { fetchReports_cli, deleteReport_cli, ReportWithRelations, fetchReportCategories_cli } from '@/services/reportService'
import { AddFAB } from '@/components/AddFAB'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTableActions } from '@/components/custom/data-table-actions'

const reportQueryKeys = {
	all: ['reports'] as const,
	lists: () => [...reportQueryKeys.all, 'list'] as const,
	detail: (id: string) => [...reportQueryKeys.all, 'detail', id] as const,
}

export function ReportList() {
	const { data: session } = useSession()
	const queryClient = useQueryClient()
	const [isSheetOpen, setIsSheetOpen] = useState(false)
	const [editingReport, setEditingReport] = useState<ReportWithRelations | null>(null)
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
	const [sorting, setSorting] = useState<SortingState>([])
	const [search, setSearch] = useState('')
	const [categoryFilter, setCategoryFilter] = useState<string>('all')
	const today = new Date().toISOString().slice(0, 10)
	const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({ to: today })

	const canModify = session?.user?.role === Role.ADMIN || session?.user?.role === Role.PHARMACIST

	const {
		data,
		isLoading,
		error: reportError,
	} = useQuery<{ reports: ReportWithRelations[]; total: number }, Error>({
		queryKey: ['reports', 'list', pagination.pageIndex, pagination.pageSize, search, categoryFilter, dateRange.from, dateRange.to],
		queryFn: () =>
			fetchReports_cli(pagination.pageIndex + 1, pagination.pageSize, {
				search,
				categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
				from: dateRange.from,
				to: dateRange.to,
			}),
	})

	const {
		data: categoryData,
		isLoading: isLoadingCategories,
		error: categoryError,
	} = useQuery({
		queryKey: ['report-categories', 'filter'],
		queryFn: () => fetchReportCategories_cli(1, 100),
	})

	const reports = data?.reports ?? []
	const total = data?.total ?? 0
	const categories = categoryData?.categories ?? []
	const error = reportError || categoryError

	const deleteMutation = useMutation({
		mutationFn: deleteReport_cli,
		onSuccess: () => {
			toast.success('Report deleted successfully.')
			queryClient.invalidateQueries({ queryKey: ['reports', 'list'] })
		},
		onError: (err: Error) => {
			toast.error(err.message || 'Failed to delete report.')
		},
	})

	const handleEdit = useCallback((report: ReportWithRelations) => {
		setEditingReport(report)
		setIsSheetOpen(true)
	}, [])

	const handleAddNew = useCallback(() => {
		setEditingReport(null)
		setIsSheetOpen(true)
	}, [])

	const handleDelete = useCallback(
		(id: string) => {
			if (!confirm('Are you sure you want to delete this report?')) return
			deleteMutation.mutate(id)
		},
		[deleteMutation],
	)

	const handleFormSuccess = useCallback(() => {
		setIsSheetOpen(false)
		setEditingReport(null)
	}, [])

	const columns = useMemo<ColumnDef<ReportWithRelations>[]>(
		() => [
			{
				accessorKey: 'title',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Title <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.getValue('title'),
			},
			{
				accessorKey: 'category.name',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Category <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.original.category?.name ?? 'N/A',
			},
			{
				accessorKey: 'patientName',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Patient <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.getValue('patientName') || 'N/A',
			},
			{
				accessorKey: 'reportDate',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Report Date <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => (row.getValue('reportDate') ? new Date(row.getValue('reportDate')).toLocaleDateString() : 'N/A'),
			},
			...(canModify
				? [
						{
							id: 'actions',
							header: () => <div className='text-right'>Actions</div>,
							cell: ({ row }: { row: { original: ReportWithRelations } }) => (
								<div className='text-right'>
									<DataTableActions<ReportWithRelations>
										row={row.original}
										onEdit={handleEdit}
										onDelete={id => {
											if (!confirm('Are you sure you want to delete this report?')) return
											handleDelete(id)
										}}
										isDeleting={deleteMutation.isPending && deleteMutation.variables === row.original.id}
									/>
								</div>
							),
						} as ColumnDef<ReportWithRelations>,
					]
				: []),
		],
		[canModify, deleteMutation.isPending, deleteMutation.variables, handleEdit, handleDelete],
	)

	const isAnyFilterActive = !!search || categoryFilter !== 'all' || !!dateRange.from || (dateRange.to && dateRange.to !== today)

	if (error) {
		return (
			<div className='w-full'>
				<p className='text-red-500'>Error: {error.message}</p>
			</div>
		)
	}

	return (
		<div className='w-full'>
			{/* Filter/search controls */}
			<div className='mb-4 flex flex-wrap items-center gap-2 rounded-md border p-4'>
				{/* Search input */}
				<Input
					placeholder='Search reports...'
					value={search}
					onChange={event => {
						setSearch(event.target.value)
						setPagination(p => ({ ...p, pageIndex: 0 }))
					}}
					className='h-10 w-full sm:w-auto sm:flex-grow md:max-w-2xs'
				/>

				{/* Category filter */}
				{isLoadingCategories ? (
					<Skeleton className='h-10 w-[180px]' />
				) : (
					<Select
						value={categoryFilter}
						onValueChange={value => {
							setCategoryFilter(value)
							setPagination(p => ({ ...p, pageIndex: 0 }))
						}}>
						<SelectTrigger className='h-10 w-full sm:w-auto min-w-[150px]'>
							<SelectValue placeholder='Filter by Category' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='all'>All Categories</SelectItem>
							{categories.map(cat => (
								<SelectItem
									key={cat.id}
									value={cat.id}>
									{cat.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}

				{/* Date range filter */}
				<Input
					type='date'
					value={dateRange.from || ''}
					onChange={e => {
						setDateRange(r => ({ ...r, from: e.target.value }))
						setPagination(p => ({ ...p, pageIndex: 0 }))
					}}
					className='h-10 w-[140px]'
					placeholder='From'
				/>
				<span>-</span>
				<Input
					type='date'
					value={dateRange.to || ''}
					onChange={e => {
						setDateRange(r => ({ ...r, to: e.target.value }))
						setPagination(p => ({ ...p, pageIndex: 0 }))
					}}
					className='h-10 w-[140px]'
					placeholder='To'
				/>

				{/* Reset button */}
				{isAnyFilterActive && (
					<Button
						variant='ghost'
						onClick={() => {
							setSearch('')
							setCategoryFilter('all')
							setDateRange({ to: today })
							setPagination(p => ({ ...p, pageIndex: 0 }))
						}}
						className='h-10'>
						Reset
					</Button>
				)}
			</div>

			<CustomDataTable
				columns={columns}
				data={reports}
				isLoading={isLoading}
				noResultsMessage='No reports found.'
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
						ariaLabel='Add New Report'
					/>
					<Sheet
						open={isSheetOpen}
						onOpenChange={setIsSheetOpen}>
						<SheetContent className='w-full overflow-y-auto sm:max-w-md'>
							<SheetHeader>
								<SheetTitle>{editingReport ? 'Edit Report' : 'Add New Report'}</SheetTitle>
							</SheetHeader>
							<ReportForm
								reportData={editingReport}
								onSuccess={handleFormSuccess}
							/>
						</SheetContent>
					</Sheet>
				</>
			)}
		</div>
	)
}
