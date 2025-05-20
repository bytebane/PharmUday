'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Supplier as PrismaSupplier } from '@/generated/prisma'
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
import { SupplierForm } from './supplier-form'
import { fetchSuppliers_cli, deleteSupplier_cli } from '@/services/inventoryService'
import { AddFAB } from '@/components/AddFAB'

const supplierQueryKeys = {
	all: ['suppliers'] as const,
	lists: () => [...supplierQueryKeys.all, 'list'] as const,
	detail: (id: string) => [...supplierQueryKeys.all, 'detail', id] as const,
}

export function SupplierList() {
	const { data: session } = useSession()
	const queryClient = useQueryClient()
	const [isSheetOpen, setIsSheetOpen] = useState(false)
	const [editingSupplier, setEditingSupplier] = useState<PrismaSupplier | null>(null)
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
	const [sorting, setSorting] = useState<SortingState>([])
	const [search, setSearch] = useState('')

	const canModify = session?.user?.role === Role.ADMIN || session?.user?.role === Role.PHARMACIST

	const { data, isLoading, error } = useQuery<{ suppliers: PrismaSupplier[]; total: number }, Error>({
		queryKey: ['suppliers', 'list', pagination.pageIndex, pagination.pageSize, search],
		queryFn: () => fetchSuppliers_cli(pagination.pageIndex + 1, pagination.pageSize, search),
	})

	const suppliers = data?.suppliers ?? []
	const total = data?.total ?? 0

	const deleteMutation = useMutation({
		mutationFn: deleteSupplier_cli,
		onSuccess: () => {
			toast.success('Supplier deleted successfully.')
			queryClient.invalidateQueries({ queryKey: ['suppliers', 'list'] })
		},
		onError: (err: Error) => {
			toast.error(err.message || 'Failed to delete supplier.')
		},
	})

	const handleEdit = useCallback((supplier: PrismaSupplier) => {
		setEditingSupplier(supplier)
		setIsSheetOpen(true)
	}, [])

	const handleAddNew = useCallback(() => {
		setEditingSupplier(null)
		setIsSheetOpen(true)
	}, [])

	const handleDelete = useCallback(
		(id: string) => {
			if (!confirm('Are you sure you want to delete this supplier? This might affect associated items.')) return
			deleteMutation.mutate(id)
		},
		[deleteMutation]
	)

	const handleFormSuccess = useCallback(() => {
		setIsSheetOpen(false)
		setEditingSupplier(null)
	}, [])

	const columns = useMemo<ColumnDef<PrismaSupplier>[]>(
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
				accessorKey: 'contactPerson',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Contact Person <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.getValue('contactPerson') || 'N/A',
			},
			{
				accessorKey: 'email',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Email <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.getValue('email') || 'N/A',
			},
			{
				accessorKey: 'phone',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Phone <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.getValue('phone') || 'N/A',
			},
			...(canModify
				? [
						{
							id: 'actions',
							header: () => <div className='text-right'>Actions</div>,
							cell: ({ row }: { row: { original: PrismaSupplier } }) => (
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
						} as ColumnDef<PrismaSupplier>,
				  ]
				: []),
		],
		[canModify, deleteMutation.isPending, deleteMutation.variables, handleEdit, handleDelete]
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
						placeholder='Search suppliers...'
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
				data={suppliers}
				isLoading={isLoading}
				noResultsMessage='No suppliers found.'
				sorting={sorting}
				onSortingChange={setSorting}
				pagination={pagination}
				onPaginationChange={setPagination}
				pageCount={Math.ceil(total / pagination.pageSize)}
			/>

			{/* Floating Action Button (FAB) for Add New Supplier */}
			{canModify && (
				<AddFAB
					onClick={handleAddNew}
					ariaLabel='Add New Supplier'
				/>
			)}

			{/* Sheet for Add/Edit */}
			<Sheet
				open={isSheetOpen}
				onOpenChange={setIsSheetOpen}>
				<SheetContent className='w-full overflow-y-auto sm:max-w-md'>
					<SheetHeader>
						<SheetTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</SheetTitle>
					</SheetHeader>
					<SupplierForm
						supplierData={editingSupplier}
						onSuccess={handleFormSuccess}
					/>
				</SheetContent>
			</Sheet>
		</div>
	)
}
