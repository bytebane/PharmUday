'use client'

import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { User } from '@/generated/prisma' // Adjust if your Prisma types are elsewhere

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type UserRow = Pick<User, 'id' | 'name' | 'email' | 'role' | 'isActive' | 'createdAt'> & {
	// any additional formatted fields if needed
}

interface UserActionsProps {
	user: UserRow
	onEdit: (user: UserRow) => void
	onDelete: (userId: string) => void
}

const UserActions: React.FC<UserActionsProps> = ({ user, onEdit, onDelete }) => {
	return (
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
				<DropdownMenuLabel>Actions</DropdownMenuLabel>
				<DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>Copy user ID</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => onEdit(user)}>Edit User</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => onDelete(user.id)}
					className='text-red-600'>
					Delete User
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

export const getColumns = (onEdit: (user: UserRow) => void, onDelete: (userId: string) => void): ColumnDef<UserRow>[] => [
	{
		accessorKey: 'name',
		header: ({ column }) => {
			return (
				<Button
					variant='ghost'
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
					Name
					<ArrowUpDown className='ml-2 h-4 w-4' />
				</Button>
			)
		},
	},
	{
		accessorKey: 'email',
		header: 'Email',
	},
	{
		accessorKey: 'role',
		header: 'Role',
		cell: ({ row }) => <Badge variant='outline'>{row.original.role}</Badge>,
	},
	{
		accessorKey: 'isActive',
		header: 'Status',
		cell: ({ row }) => {
			return <Badge variant={row.original.isActive ? 'default' : 'destructive'}>{row.original.isActive ? 'Active' : 'Inactive'}</Badge>
		},
	},
	{
		accessorKey: 'createdAt',
		header: 'Created At',
		cell: ({ row }) => {
			return new Date(row.original.createdAt).toLocaleDateString()
		},
	},
	{
		id: 'actions',
		cell: ({ row }) => {
			const user = row.original
			return (
				<UserActions
					user={user}
					onEdit={onEdit}
					onDelete={onDelete}
				/>
			)
		},
	},
]
