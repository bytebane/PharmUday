'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Customer as PrismaCustomer, Role } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CustomerForm } from './customer-form'
import { PlusCircle, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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

	if (isLoading && !customers) return <div>Loading customers...</div>
	if (error) return <div className='text-red-600'>Error: {error.message}</div>

	const currentCustomers = customers || []

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
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Phone</TableHead>
						{canModify && <TableHead>Actions</TableHead>}
					</TableRow>
				</TableHeader>
				<TableBody>
					{currentCustomers.map(customer => (
						<TableRow key={customer.id}>
							<TableCell>{customer.name}</TableCell>
							<TableCell>{customer.email ?? 'N/A'}</TableCell>
							<TableCell>{customer.phone ?? 'N/A'}</TableCell>
							{canModify && (
								<TableCell>
									<Button
										variant='ghost'
										size='sm'
										onClick={() => handleEdit(customer)}>
										<Edit className='mr-2 h-4 w-4' /> Edit
									</Button>
									<Button
										variant='ghost'
										size='sm'
										className='text-red-600 hover:text-red-700'
										onClick={() => handleDelete(customer.id)}
										disabled={deleteMutation.isPending && deleteMutation.variables === customer.id}>
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
