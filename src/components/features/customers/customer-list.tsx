'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Customer as PrismaCustomer, Role } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CustomerForm } from './customer-form'
import { PlusCircle, Edit, Trash2, MoreHorizontal, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, getSortedRowModel, SortingState } from '@tanstack/react-table'

async function fetchCustomersAPI(): Promise<PrismaCustomer[]> {
	const response = await fetch('/api/customers')
	if (!response.ok) {
		throw new Error('Failed to fetch customers from client')
	}
	return response.json()
}

async function deleteCustomerAPI(id: string): Promise<void> {
	const response = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
	if (!response.ok) {
		const errorData = await response.text()
		throw new Error(`Failed to delete customer: ${errorData || response.statusText}`)
	}
}

const customerQueryKeys = {
	all: ['customers'] as const,
	lists: () => [...customerQueryKeys.all, 'list'] as const,
}

interface CustomerListProps {
	initialCustomers: PrismaCustomer[]
}

export function CustomerList({ initialCustomers }: CustomerListProps) {
	const { data: session } = useSession()
	const [isSheetOpen, setIsSheetOpen] = useState(false)
	const [editingCustomer, setEditingCustomer] = useState<PrismaCustomer | null>(null)
	const queryClient = useQueryClient()
	const [sorting, setSorting] = React.useState<SortingState>([])

	const canModify = session?.user?.role === Role.ADMIN || session?.user?.role === Role.SUPER_ADMIN || session?.user?.role === Role.PHARMACIST || session?.user?.role === Role.SELLER

	const {
		data: customers,
		isLoading,
		error,
	} = useQuery<PrismaCustomer[], Error>({
		queryKey: customerQueryKeys.lists(),
		queryFn: fetchCustomersAPI,
		initialData: initialCustomers,
	})

	const deleteMutation = useMutation({
		mutationFn: deleteCustomerAPI,
		onSuccess: () => {
			toast.success('Customer deleted successfully.')
			queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() })
		},
		onError: (err: Error) => {
			toast.error(err.message || 'Failed to delete customer.')
		},
	})

	const handleEdit = (customer: PrismaCustomer) => {
		setEditingCustomer(customer)
		setIsSheetOpen(true)
	}

	const handleAddNew = () => {
		setEditingCustomer(null)
		setIsSheetOpen(true)
	}

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this customer? Associated sales records will have their customer link removed.')) return
		deleteMutation.mutate(id)
	}

	const handleFormSuccess = () => {
		setIsSheetOpen(false)
		setEditingCustomer(null)
	}

	const columns = React.useMemo<ColumnDef<PrismaCustomer>[]>(
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
							cell: ({ row }: { row: { original: PrismaCustomer } }) => (
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
						} as ColumnDef<PrismaCustomer>,
				  ]
				: []),
		],
		[canModify, deleteMutation.isPending, deleteMutation.variables, handleEdit, handleDelete]
	)

	const currentCustomers = customers || []

	const table = useReactTable({
		data: currentCustomers,
		columns,
		getCoreRowModel: getCoreRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		state: { sorting },
	})

	if (isLoading && !customers) return <div>Loading customers...</div>
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
								<PlusCircle className='mr-2 h-4 w-4' /> Add New Customer
							</Button>
						</SheetTrigger>
						<SheetContent className='w-full overflow-y-auto sm:max-w-md'>
							<SheetHeader>
								<SheetTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</SheetTitle>
							</SheetHeader>
							<CustomerForm
								customerData={editingCustomer}
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
