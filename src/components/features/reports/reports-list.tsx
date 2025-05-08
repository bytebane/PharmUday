'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Report as PrismaReport, ReportCategory as PrismaReportCategory, User as PrismaUser, Role } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ReportForm } from './reports-form' // Assuming this is the correct path to your ReportForm
import { PlusCircle, Edit, Trash2, FileText, MoreHorizontal, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, getSortedRowModel, SortingState } from '@tanstack/react-table'
import React from 'react'

// Type from app/reports/page.tsx
type ReportWithRelations = PrismaReport & {
	category: PrismaReportCategory
	uploadedBy: Pick<PrismaUser, 'id' | 'email'>
}

async function fetchReportsAPI(): Promise<ReportWithRelations[]> {
	const response = await fetch('/api/reports')
	if (!response.ok) {
		throw new Error('Failed to fetch reports from client')
	}
	return response.json()
}

async function deleteReportAPI(id: string): Promise<void> {
	const response = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
	if (!response.ok) {
		const errorData = await response.text()
		throw new Error(`Failed to delete report: ${errorData || response.statusText}`)
	}
}

const reportQueryKeys = {
	all: ['reports'] as const,
	lists: () => [...reportQueryKeys.all, 'list'] as const,
}

interface ReportListProps {
	initialReports: ReportWithRelations[]
}

export function ReportList({ initialReports }: ReportListProps) {
	const { data: session } = useSession()
	const [isSheetOpen, setIsSheetOpen] = useState(false)
	const [editingReport, setEditingReport] = useState<PrismaReport | null>(null) // Use PrismaReport for editing form
	const queryClient = useQueryClient()
	const [sorting, setSorting] = React.useState<SortingState>([])

	// Users can manage their own reports. Admins/Pharmacists can manage all.
	const canManageAll = session?.user?.role === Role.ADMIN || session?.user?.role === Role.SUPER_ADMIN || session?.user?.role === Role.PHARMACIST

	const {
		data: reports,
		isLoading,
		error,
	} = useQuery<ReportWithRelations[], Error>({
		queryKey: reportQueryKeys.lists(),
		queryFn: fetchReportsAPI,
		initialData: initialReports,
	})

	const deleteMutation = useMutation({
		mutationFn: deleteReportAPI,
		onSuccess: () => {
			toast.success('Report deleted successfully.')
			queryClient.invalidateQueries({ queryKey: reportQueryKeys.lists() })
		},
		onError: (err: Error) => {
			toast.error(err.message || 'Failed to delete report.')
		},
	})

	const handleEdit = (report: PrismaReport) => {
		setEditingReport(report)
		setIsSheetOpen(true)
	}

	const handleAddNew = () => {
		setEditingReport(null)
		setIsSheetOpen(true)
	}

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this report? The associated file will also be removed.')) return
		deleteMutation.mutate(id)
	}

	const handleFormSuccess = () => {
		setIsSheetOpen(false)
		setEditingReport(null)
	}

	const columns = React.useMemo<ColumnDef<ReportWithRelations>[]>(
		() => [
			{
				accessorKey: 'title',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Title
						<ArrowUpDown className='ml-2 h-4 w-4' />
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
						Category
						<ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.original.category.name,
			},
			{
				accessorKey: 'reportDate',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Report Date
						<ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => format(new Date(row.getValue('reportDate') as string), 'PPP'),
			},
			{
				accessorKey: 'patientName',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Patient
						<ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.getValue('patientName') || 'N/A',
			},
			...(canManageAll
				? [
						{
							accessorKey: 'uploadedBy.email',
							header: 'Uploaded By', // Not making this sortable for brevity, can be added
							cell: ({ row }: { row: { original: ReportWithRelations } }) => row.original.uploadedBy.email,
						} as ColumnDef<ReportWithRelations>,
				  ]
				: []),
			{
				accessorKey: 'fileUrl',
				header: 'File',
				cell: ({ row }) => (
					<a
						href={row.getValue('fileUrl') as string}
						target='_blank'
						rel='noopener noreferrer'
						className='text-blue-600 hover:underline'>
						<FileText className='mr-1 inline h-5 w-5' /> View
					</a>
				),
			},
			{
				id: 'actions',
				header: () => <div className='text-right'>Actions</div>,
				cell: ({ row }: { row: { original: ReportWithRelations } }) => {
					const canCurrentUserModify = canManageAll || session?.user?.id === row.original.uploadedById
					return canCurrentUserModify ? (
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
					) : null
				},
			},
		],
		[canManageAll, session?.user?.id, deleteMutation.isPending, deleteMutation.variables, handleEdit, handleDelete]
	)

	if (isLoading && !reports) return <div>Loading reports...</div>
	if (error) return <div className='text-red-600'>Error: {error.message}</div>

	const currentReports = reports || []

	return (
		<div>
			<div className='mb-4 flex justify-end'>
				<Sheet
					open={isSheetOpen}
					onOpenChange={setIsSheetOpen}>
					<SheetTrigger asChild>
						<Button onClick={handleAddNew}>
							<PlusCircle className='mr-2 h-4 w-4' /> Add New Report
						</Button>
					</SheetTrigger>
					<SheetContent className='w-full overflow-y-auto sm:max-w-lg md:max-w-xl'>
						<SheetHeader>
							<SheetTitle>{editingReport ? 'Edit Report' : 'Add New Report'}</SheetTitle>
						</SheetHeader>
						<ReportForm
							reportData={editingReport}
							onSuccess={handleFormSuccess}
						/>
					</SheetContent>
				</Sheet>
			</div>
			<ReportTable
				data={currentReports}
				columns={columns}
				sorting={sorting}
				onSortingChange={setSorting}
			/>
		</div>
	)
}

interface ReportTableProps {
	data: ReportWithRelations[]
	columns: ColumnDef<ReportWithRelations>[]
	sorting: SortingState
	onSortingChange: (sorting: SortingState) => void
}

const ReportTable: React.FC<ReportTableProps> = ({ data, columns, sorting, onSortingChange }) => {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		onSortingChange,
		getSortedRowModel: getSortedRowModel(),
		state: { sorting },
	})
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
