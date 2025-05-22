'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { User as PrismaUser } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Edit, Trash2, MoreHorizontal, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ColumnDef, SortingState, PaginationState } from '@tanstack/react-table'
import { CustomDataTable } from '@/components/custom/custom-data-table'
import { Input } from '@/components/ui/input'
import { AddFAB } from '@/components/AddFAB'
import { fetchUsers_cli, createUser_cli, updateUser_cli, deleteUser_cli } from '@/services/userService'
import { UserForm } from '@/components/admin/user-form'

export function UsersList() {
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [editingUser, setEditingUser] = useState<PrismaUser | null>(null)
	const [userToDelete, setUserToDelete] = useState<PrismaUser | null>(null)
	const queryClient = useQueryClient()
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
	const [sorting, setSorting] = useState<SortingState>([])
	const [search, setSearch] = useState('')
	const [roleFilter, setRoleFilter] = useState<string>('all')

	const { data, isLoading, error } = useQuery<{ users: PrismaUser[]; total: number }, Error>({
		queryKey: ['users', 'list', pagination.pageIndex, pagination.pageSize, search, roleFilter],
		queryFn: () => fetchUsers_cli(pagination.pageIndex + 1, pagination.pageSize, search, roleFilter !== 'all' ? roleFilter : undefined),
	})

	const users = data?.users ?? []
	const total = data?.total ?? 0

	const createMutation = useMutation({ mutationFn: createUser_cli })
	const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => updateUser_cli(id, data) })
	const deleteMutation = useMutation({ mutationFn: deleteUser_cli })

	const handleEdit = useCallback((user: PrismaUser) => {
		setEditingUser(user)
		setIsDialogOpen(true)
	}, [])

	const handleAddNew = useCallback(() => {
		setEditingUser(null)
		setIsDialogOpen(true)
	}, [])

	const handleDelete = useCallback((user: PrismaUser) => {
		setUserToDelete(user)
	}, [])

	const handleFormSubmit = async (formData: any, userId?: string) => {
		try {
			if (userId) {
				await updateMutation.mutateAsync({ id: userId, data: formData })
				toast.success('User updated successfully.')
			} else {
				await createMutation.mutateAsync(formData)
				toast.success('User created successfully.')
			}
			setIsDialogOpen(false)
			setEditingUser(null)
			queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
		} catch (error: any) {
			toast.error(error.message || 'Failed to save user.')
		}
	}

	const handleConfirmDelete = async (user: PrismaUser) => {
		try {
			await deleteMutation.mutateAsync(user.id)
			toast.success('User deleted successfully.')
			queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
		} catch (error: any) {
			toast.error(error.message || 'Failed to delete user.')
		}
	}

	const columns = useMemo<ColumnDef<PrismaUser>[]>(
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
				cell: ({ row }) => row.getValue('email'),
			},
			{
				accessorKey: 'role',
				header: ({ column }) => (
					<Button
						variant='ghost'
						onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						Role <ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				),
				cell: ({ row }) => row.getValue('role'),
			},
			{
				id: 'actions',
				header: () => <div className='text-right'>Actions</div>,
				cell: ({ row }: { row: { original: PrismaUser } }) => (
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
									onClick={() => {
										if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
											handleConfirmDelete(row.original)
										}
									}}
									disabled={deleteMutation.isPending && deleteMutation.variables === row.original.id}
									className='text-red-600 focus:text-red-700 focus:bg-red-50'>
									<Trash2 className='mr-2 h-4 w-4' /> Delete
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				),
			},
		],
		[deleteMutation.isPending, deleteMutation.variables, handleEdit, handleDelete],
	)

	const isAnyFilterActive = !!search

	if (error) return <div className='text-red-600'>Error: {error.message}</div>

	return (
		<div className='w-full'>
			<div className='mb-4 flex flex-wrap items-center gap-2 rounded-md border p-4'>
				<Input
					placeholder='Search users...'
					value={search}
					onChange={event => {
						setSearch(event.target.value)
						setPagination(p => ({ ...p, pageIndex: 0 }))
					}}
					className='h-10 w-full sm:w-auto sm:flex-grow md:max-w-2xs'
				/>
				<div className='flex gap-2'>
					<select
						value={roleFilter}
						onChange={e => {
							setRoleFilter(e.target.value)
							setPagination(p => ({ ...p, pageIndex: 0 }))
						}}
						className='h-10 border rounded px-2'>
						<option value='all'>All Roles</option>
						<option value='ADMIN'>Admin</option>
						<option value='SUPER_ADMIN'>Super Admin</option>
						<option value='PHARMACIST'>Pharmacist</option>
						<option value='SELLER'>Seller</option>
						{/* Add more roles as needed */}
					</select>
				</div>
				{isAnyFilterActive && (
					<Button
						variant='ghost'
						onClick={() => {
							setSearch('')
							setRoleFilter('all')
							setPagination(p => ({ ...p, pageIndex: 0 }))
						}}
						className='h-10'>
						Reset
					</Button>
				)}
			</div>

			<CustomDataTable
				columns={columns}
				data={users}
				isLoading={isLoading}
				noResultsMessage='No users found.'
				sorting={sorting}
				onSortingChange={setSorting}
				pagination={pagination}
				onPaginationChange={setPagination}
				pageCount={Math.ceil(total / pagination.pageSize)}
			/>

			<AddFAB
				onClick={handleAddNew}
				ariaLabel='Add New User'
			/>

			<Dialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}>
				<UserForm
					user={editingUser}
					onSubmit={handleFormSubmit}
					onCancel={() => setIsDialogOpen(false)}
					isLoading={createMutation.isPending || updateMutation.isPending}
				/>
			</Dialog>
		</div>
	)
}
