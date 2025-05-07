'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Category as PrismaCategory } from '@/generated/prisma' // Use Prisma type
import { Role } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CategoryForm } from './cat-form' // Import the category form
import { PlusCircle, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Define a type that includes potential parent category info if fetched
type CategoryWithParent = PrismaCategory & {
	parentCategory?: { id: string; name: string } | null
}

async function fetchCategoriesAPI(): Promise<CategoryWithParent[]> {
	// Adjust include based on what you want to display (e.g., parentCategory name)
	const response = await fetch('/api/inv-categories?includeParent=true') // Example: Add query param if API supports it
	if (!response.ok) {
		throw new Error('Failed to fetch categories from client')
	}
	return response.json()
}

async function deleteCategoryAPI(id: string): Promise<void> {
	const response = await fetch(`/api/inv-categories/${id}`, { method: 'DELETE' })
	if (!response.ok) {
		const errorData = await response.text()
		throw new Error(`Failed to delete category: ${errorData || response.statusText}`)
	}
}

const categoryQueryKeys = {
	all: ['categories'] as const,
	lists: () => [...categoryQueryKeys.all, 'list'] as const,
	detail: (id: string) => [...categoryQueryKeys.all, 'detail', id] as const,
}

interface CategoryListProps {
	initialCategories: CategoryWithParent[]
}

export function CategoryList({ initialCategories }: CategoryListProps) {
	const { data: session } = useSession()
	const [isSheetOpen, setIsSheetOpen] = useState(false)
	const [editingCategory, setEditingCategory] = useState<CategoryWithParent | null>(null)
	const queryClient = useQueryClient()

	const canModify = session?.user?.role === Role.ADMIN || session?.user?.role === Role.PHARMACIST

	const {
		data: categories,
		isLoading,
		error,
	} = useQuery<CategoryWithParent[], Error>({
		queryKey: categoryQueryKeys.lists(),
		queryFn: fetchCategoriesAPI,
		initialData: initialCategories,
	})

	const deleteMutation = useMutation({
		mutationFn: deleteCategoryAPI,
		onSuccess: () => {
			toast.success('Category deleted successfully.')
			queryClient.invalidateQueries({ queryKey: categoryQueryKeys.lists() })
		},
		onError: (err: Error) => {
			toast.error(err.message || 'Failed to delete category.')
		},
	})

	const handleEdit = (category: CategoryWithParent) => {
		setEditingCategory(category)
		setIsSheetOpen(true)
	}

	const handleAddNew = () => {
		setEditingCategory(null)
		setIsSheetOpen(true)
	}

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this category? This might affect subcategories and items.')) return
		deleteMutation.mutate(id)
	}

	const handleFormSuccess = () => {
		setIsSheetOpen(false)
		setEditingCategory(null)
		// Data will be refetched by query invalidation in CategoryForm
	}

	if (isLoading && !categories) return <div>Loading initial categories...</div>
	if (error) return <div className='text-red-600'>Error: {error.message}</div>

	const currentCategories = categories || []

	return (
		<div>
			{canModify && (
				<div className='mb-4 flex justify-end'>
					<Sheet
						open={isSheetOpen}
						onOpenChange={setIsSheetOpen}>
						<SheetTrigger asChild>
							<Button onClick={handleAddNew}>
								<PlusCircle className='mr-2 h-4 w-4' /> Add New Category
							</Button>
						</SheetTrigger>
						<SheetContent className='w-full overflow-y-auto sm:max-w-md'>
							<SheetHeader>
								<SheetTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</SheetTitle>
							</SheetHeader>
							<CategoryForm
								categoryData={editingCategory}
								allCategories={currentCategories} // Pass current categories for parent selection
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
						<TableHead>Description</TableHead>
						{/* Add Parent Category column if needed */}
						{/* <TableHead>Parent Category</TableHead> */}
						{canModify && <TableHead>Actions</TableHead>}
					</TableRow>
				</TableHeader>
				<TableBody>
					{currentCategories.map(category => (
						<TableRow key={category.id}>
							<TableCell>{category.name}</TableCell>
							<TableCell>{category.description ?? 'N/A'}</TableCell>
							{/* <TableCell>{category.parentCategory?.name ?? '--'}</TableCell> */}
							{canModify && (
								<TableCell>
									<Button
										variant='ghost'
										size='sm'
										onClick={() => handleEdit(category)}>
										<Edit className='mr-2 h-4 w-4' /> Edit
									</Button>
									<Button
										variant='ghost'
										size='sm'
										className='text-red-600 hover:text-red-700'
										onClick={() => handleDelete(category.id)}
										disabled={deleteMutation.isPending && deleteMutation.variables === category.id}>
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
