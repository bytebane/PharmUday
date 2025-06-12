'use client'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Edit, Trash2, MoreHorizontal, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DataTableActionsProps<T> {
	row: T | { original: T }
	onEdit?: (item: T) => void
	onDelete?: (id: string) => void
	isDeleting?: boolean
	deleteId?: string
	viewPath?: string
	customActions?: {
		label: string
		icon?: React.ReactNode
		onClick: (item: T) => void
		className?: string
	}[]
}

export function DataTableActions<T extends { id: string }>({ row, onEdit, onDelete, isDeleting, deleteId, viewPath, customActions }: DataTableActionsProps<T>) {
	const router = useRouter()
	const item = 'original' in row ? row.original : row

	return (
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
					{viewPath && (
						<DropdownMenuItem onClick={() => router.push(`${viewPath}/${item.id}`)}>
							<Eye className='mr-2 h-4 w-4' /> View
						</DropdownMenuItem>
					)}
					{onEdit && (
						<DropdownMenuItem onClick={() => onEdit(item)}>
							<Edit className='mr-2 h-4 w-4' /> Edit
						</DropdownMenuItem>
					)}
					{onDelete && (
						<DropdownMenuItem
							onClick={() => onDelete(item.id)}
							disabled={isDeleting && deleteId === item.id}
							className='text-red-600 focus:text-red-700 focus:bg-red-50'>
							<Trash2 className='mr-2 h-4 w-4' /> Delete
						</DropdownMenuItem>
					)}
					{customActions?.map((action, index) => (
						<DropdownMenuItem
							key={index}
							onClick={() => action.onClick(item)}
							className={action.className}>
							{action.icon && <span className='mr-2'>{action.icon}</span>}
							{action.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}
