'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { ReportCategory as PrismaReportCategory, Role } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ReportCategoryForm } from './cat-form'
import { PlusCircle, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

async function fetchReportCategoriesAPI(): Promise<PrismaReportCategory[]> {
	const response = await fetch('/api/report-categories') // Ensure this API endpoint exists
	if (!response.ok) {
		throw new Error('Failed to fetch report categories from client')
	}
	return response.json()
}

async function deleteReportCategoryAPI(id: string): Promise<void> {
	const response = await fetch(`/api/report-categories/${id}`, { method: 'DELETE' }) // Ensure this API endpoint exists
	if (!response.ok) {
		const errorData = await response.text()
		throw new Error(`Failed to delete report category: ${errorData || response.statusText}`)
	}
}

const reportCategoryQueryKeys = {
	all: ['reportCategories'] as const,
	lists: () => [...reportCategoryQueryKeys.all, 'list'] as const,
}

interface ReportCategoryListProps {
	initialReportCategories: PrismaReportCategory[]
}

export function ReportCategoryList({ initialReportCategories }: ReportCategoryListProps) {
	const { data: session } = useSession()
	const [isSheetOpen, setIsSheetOpen] = useState(false)
	const [editingCategory, setEditingCategory] = useState<PrismaReportCategory | null>(null)
	const queryClient = useQueryClient()

	// Adjust roles as needed for who can manage report categories
	const canModify = session?.user?.role === Role.ADMIN || session?.user?.role === Role.SUPER_ADMIN || session?.user?.role === Role.PHARMACIST

	const {
		data: reportCategories,
		isLoading,
		error,
	} = useQuery<PrismaReportCategory[], Error>({
		queryKey: reportCategoryQueryKeys.lists(),
		queryFn: fetchReportCategoriesAPI,
		initialData: initialReportCategories,
	})

	const deleteMutation = useMutation({
		mutationFn: deleteReportCategoryAPI,
		onSuccess: () => {
			toast.success('Report category deleted successfully.')
			queryClient.invalidateQueries({ queryKey: reportCategoryQueryKeys.lists() })
		},
		onError: (err: Error) => {
			toast.error(err.message || 'Failed to delete report category.')
		},
	})

	const handleEdit = (category: PrismaReportCategory) => {
		setEditingCategory(category)
		setIsSheetOpen(true)
	}

	const handleAddNew = () => {
		setEditingCategory(null)
		setIsSheetOpen(true)
	}

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this report category? This might affect associated reports.')) return
		deleteMutation.mutate(id)
	}

	const handleFormSuccess = () => {
		setIsSheetOpen(false)
		setEditingCategory(null)
	}

	if (isLoading && !reportCategories) return <div>Loading initial report categories...</div>
	if (error) return <div className='text-red-600'>Error: {error.message}</div>

	const currentReportCategories = reportCategories || []

	return (
		<div>
			{canModify && (
				<div className='mb-4 flex justify-end'>
					<Sheet
						open={isSheetOpen}
						onOpenChange={setIsSheetOpen}>
						<SheetTrigger asChild>
							<Button onClick={handleAddNew}>
								<PlusCircle className='mr-2 h-4 w-4' /> Add New Report Category
							</Button>
						</SheetTrigger>
						<SheetContent className='w-full overflow-y-auto sm:max-w-md'>
							<SheetHeader>
								<SheetTitle>{editingCategory ? 'Edit Report Category' : 'Add New Report Category'}</SheetTitle>
							</SheetHeader>
							<ReportCategoryForm
								categoryData={editingCategory}
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
						{canModify && <TableHead>Actions</TableHead>}
					</TableRow>
				</TableHeader>
				<TableBody>
					{currentReportCategories.map(category => (
						<TableRow key={category.id}>
							<TableCell>{category.name}</TableCell>
							<TableCell>{category.description ?? 'N/A'}</TableCell>
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
