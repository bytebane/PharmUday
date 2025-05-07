'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Supplier as PrismaSupplier } from '@/generated/prisma'
import { Role } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SupplierForm } from './supplier-form'
import { PlusCircle, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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

	if (isLoading && !suppliers) return <div>Loading initial suppliers...</div>
	if (error) return <div className='text-red-600'>Error: {error.message}</div>

	const currentSuppliers = suppliers || []

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
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Contact Person</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Phone</TableHead>
						{canModify && <TableHead>Actions</TableHead>}
					</TableRow>
				</TableHeader>
				<TableBody>
					{currentSuppliers.map(supplier => (
						<TableRow key={supplier.id}>
							<TableCell>{supplier.name}</TableCell>
							<TableCell>{supplier.contactPerson ?? 'N/A'}</TableCell>
							<TableCell>{supplier.email ?? 'N/A'}</TableCell>
							<TableCell>{supplier.phone ?? 'N/A'}</TableCell>
							{canModify && (
								<TableCell>
									<Button
										variant='ghost'
										size='sm'
										onClick={() => handleEdit(supplier)}>
										<Edit className='mr-2 h-4 w-4' /> Edit
									</Button>
									<Button
										variant='ghost'
										size='sm'
										className='text-red-600 hover:text-red-700'
										onClick={() => handleDelete(supplier.id)}
										disabled={deleteMutation.isPending && deleteMutation.variables === supplier.id}>
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
