'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Supplier as PrismaSupplier } from '@/generated/prisma'
import { Role } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SupplierForm } from './supplier-form'
import { PlusCircle, Edit, Trash2, MoreHorizontal, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, getSortedRowModel, SortingState } from '@tanstack/react-table'

async function fetchSuppliersAPI(): Promise<PrismaSupplier[]> {
	const response = await fetch('/api/suppliers')
	if (!response.ok) {
		throw new Error('Failed to fetch suppliers from client')
	}
	return response.json()
}

async function deleteSupplierAPI(id: string): Promise<void> {
	const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
	if (!response.ok) {
		const errorData = await response.text()
		throw new Error(`Failed to delete supplier: ${errorData || response.statusText}`)
	}
}

const supplierQueryKeys = {
	all: ['suppliers'] as const,
	lists: () => [...supplierQueryKeys.all, 'list'] as const,
	detail: (id: string) => [...supplierQueryKeys.all, 'detail', id] as const,
}

interface SupplierListProps {
	initialSuppliers: PrismaSupplier[]
}

export function SupplierList({ initialSuppliers }: SupplierListProps) {
	const { data: session } = useSession()
	const [isSheetOpen, setIsSheetOpen] = useState(false)
	const [editingSupplier, setEditingSupplier] = useState<PrismaSupplier | null>(null)
	const queryClient = useQueryClient()
	const [sorting, setSorting] = React.useState<SortingState>([])

	const canModify = session?.user?.role === Role.ADMIN || session?.user?.role === Role.PHARMACIST || session?.user?.role === Role.SUPER_ADMIN

	const {
		data: suppliers,
		isLoading,
		error,
	} = useQuery<PrismaSupplier[], Error>({
		queryKey: supplierQueryKeys.lists(),
		queryFn: fetchSuppliersAPI,
		initialData: initialSuppliers,
	})

	const deleteMutation = useMutation({
		mutationFn: deleteSupplierAPI,
		onSuccess: () => {
			toast.success('Supplier deleted successfully.')
			queryClient.invalidateQueries({ queryKey: supplierQueryKeys.lists() })
		},
		onError: (err: Error) => {
			toast.error(err.message || 'Failed to delete supplier.')
		},
	})

	const handleEdit = (supplier: PrismaSupplier) => {
		setEditingSupplier(supplier)
		setIsSheetOpen(true)
	}

	const handleAddNew = () => {
		setEditingSupplier(null)
		setIsSheetOpen(true)
	}

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this supplier? This might affect associated items.')) return
		deleteMutation.mutate(id)
	}

	const handleFormSuccess = () => {
		setIsSheetOpen(false)
		setEditingSupplier(null)
	}

	const columns = React.useMemo<ColumnDef<PrismaSupplier>[]>(
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

	const currentSuppliers = suppliers || []

	const table = useReactTable({
		data: currentSuppliers,
		columns,
		getCoreRowModel: getCoreRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		state: { sorting },
	})

	if (isLoading && !suppliers) return <div>Loading initial suppliers...</div>
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
								<PlusCircle className='mr-2 h-4 w-4' /> Add New Supplier
							</Button>
						</SheetTrigger>
						<SheetContent className='w-full overflow-y-auto sm:max-w-md md:max-w-lg'>
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
