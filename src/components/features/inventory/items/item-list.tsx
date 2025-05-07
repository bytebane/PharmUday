'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { ItemWithRelations, BasicCategory, BasicSupplier } from '@/types/inventory' // Adjust path as needed
import { Role } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from '@/components/ui/sheet' // Import Sheet components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { PlusCircle, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner' // Assuming you use sonner for toasts
import { ItemForm } from './item-form' // Import the new form component
import { DialogTitle } from '@radix-ui/react-dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// API interaction functions (could be moved to a service file)
const fetchItemsAPI = async (): Promise<ItemWithRelations[]> => {
	const response = await fetch('/api/inv-items')
	if (!response.ok) {
		throw new Error('Failed to fetch items')
	}
	return response.json()
}

async function fetchRelatedDataAPI(): Promise<{ categories: BasicCategory[]; suppliers: BasicSupplier[] }> {
	const [catRes, supRes] = await Promise.all([fetch('/api/inv-categories'), fetch('/api/suppliers')])
	if (!catRes.ok || !supRes.ok) {
		// Added check for supRes.ok
		throw new Error('Failed to fetch related data')
	}
	const categories = await catRes.json()
	const suppliers = await supRes.json()
	return { categories, suppliers }
}

async function deleteItemAPI(id: string): Promise<void> {
	const response = await fetch(`/api/inv-items/${id}`, { method: 'DELETE' })
	if (!response.ok) {
		const errorData = await response.text()
		throw new Error(`Failed to delete item: ${errorData || response.statusText}`)
	}
}

// Define query keys
const itemQueryKeys = {
	all: ['items'] as const,
	lists: () => [...itemQueryKeys.all, 'list'] as const,
	detail: (id: string) => [...itemQueryKeys.all, 'detail', id] as const,
	relatedData: () => ['relatedData'] as const,
}

interface ItemListProps {
	initialItems: ItemWithRelations[]
	initialCategories: BasicCategory[]
	initialSuppliers: BasicSupplier[]
}

export function ItemList({ initialItems, initialCategories, initialSuppliers }: ItemListProps) {
	const { data: session } = useSession()
	const [isSheetOpen, setIsSheetOpen] = useState(false) // State for Sheet visibility
	const [editingItem, setEditingItem] = useState<ItemWithRelations | null>(null)
	const queryClient = useQueryClient()

	const canModify = session?.user?.role === Role.ADMIN || session?.user?.role === Role.PHARMACIST

	const {
		data: items,
		isLoading: isLoadingItems,
		error: itemsError,
	} = useQuery<ItemWithRelations[], Error>({
		queryKey: itemQueryKeys.lists(),
		queryFn: fetchItemsAPI,
		initialData: initialItems, // Hydrate with server-fetched data
	})

	const {
		data: relatedData,
		isLoading: isLoadingRelated,
		error: relatedError,
	} = useQuery<{ categories: BasicCategory[]; suppliers: BasicSupplier[] }, Error>({
		queryKey: itemQueryKeys.relatedData(),
		queryFn: fetchRelatedDataAPI,
		initialData: { categories: initialCategories, suppliers: initialSuppliers }, // Hydrate
	})

	const deleteMutation = useMutation({
		mutationFn: deleteItemAPI,
		onSuccess: () => {
			toast.success('Item deleted successfully.')
			queryClient.invalidateQueries({ queryKey: itemQueryKeys.lists() })
		},
		onError: (err: Error) => {
			toast.error(err.message || 'Failed to delete item.')
		},
	})

	const handleEdit = (item: ItemWithRelations) => {
		setEditingItem(item)
		setIsSheetOpen(true) // Open sheet for editing
	}

	const handleAddNew = () => {
		setEditingItem(null)
		setIsSheetOpen(true) // Open sheet for adding
	}

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this item?')) return
		deleteMutation.mutate(id)
	}

	// This function will be called by ItemForm on successful submission
	const handleFormSuccess = () => {
		setIsSheetOpen(false) // Close sheet on success
		setEditingItem(null) // Reset editing item
		// Queries will be invalidated by the ItemForm's mutation
	}

	const isLoading = isLoadingItems || isLoadingRelated
	const error = itemsError || relatedError

	if (isLoading && !items && !relatedData) return <div>Loading initial data...</div> // Show loading only if no initial data
	if (error) return <div className='text-red-600'>Error: {error.message}</div>

	const currentItems = items || []
	const currentCategories = relatedData?.categories || []
	const currentSuppliers = relatedData?.suppliers || []

	return (
		<div>
			{canModify && (
				<div className='mb-4 flex justify-end'>
					{/* Replace Dialog with Sheet */}
					<Sheet
						open={isSheetOpen}
						onOpenChange={setIsSheetOpen}>
						<SheetTrigger asChild>
							<Button onClick={handleAddNew}>
								<PlusCircle className='mr-2 h-4 w-4' /> Add New Item
							</Button>
						</SheetTrigger>
						<SheetContent className='w-full overflow-y-auto sm:max-w-xl md:max-w-2xl lg:max-w-3xl'>
							{' '}
							{/* Adjust width as needed */}
							<SheetHeader>
								<DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
							</SheetHeader>
							<ItemForm
								itemData={editingItem}
								categories={currentCategories} // Pass current categories
								suppliers={currentSuppliers} // Pass current suppliers
								onSuccess={handleFormSuccess}
							/>
						</SheetContent>
					</Sheet>
				</div>
			)}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Manufacturer</TableHead>
						<TableHead>Stock</TableHead>
						<TableHead>Price</TableHead>
						<TableHead>Supplier</TableHead>
						{canModify && <TableHead>Actions</TableHead>}
					</TableRow>
				</TableHeader>
				<TableBody>
					{currentItems.map(item => (
						<TableRow key={item.id}>
							<TableCell>{item.name}</TableCell>
							<TableCell>{item.manufacturer ?? 'N/A'}</TableCell>
							<TableCell>{item.quantity_in_stock}</TableCell>
							<TableCell>{item.price.toFixed(2)}</TableCell>
							<TableCell>{item.supplier?.name ?? 'N/A'}</TableCell>
							{canModify && (
								<TableCell>
									<Button
										variant='ghost'
										size='sm'
										onClick={() => handleEdit(item)}>
										<Edit className='mr-2 h-4 w-4' /> Edit
									</Button>
									<Button
										variant='ghost'
										size='sm'
										className='text-red-600 hover:text-red-700'
										onClick={() => handleDelete(item.id)}
										disabled={deleteMutation.isPending && deleteMutation.variables === item.id}>
										<Trash2 className='mr-2 h-4 w-4' /> Delete
									</Button>
								</TableCell>
							)}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	)
}
