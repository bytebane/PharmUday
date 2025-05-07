'use client'

import { useState, useMemo, useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query' // Added useQuery
import { ItemWithRelations } from '@/types/inventory' // Use your existing item type
import { Customer as PrismaCustomer, PaymentMethod } from '@/generated/prisma'
import { saleCreateSchema, SaleCreateFormValues, SaleItemFormValues } from '@/lib/validations/sale'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2, Search } from 'lucide-react' // Sheet removed from here
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet' // Sheet added here
import { CustomerForm } from '../customers/customer-form'
// import { Combobox } from '@/components/ui/combobox' // Combobox is not a standard Shadcn UI component

interface NewSaleFormProps {
	initialItems: ItemWithRelations[] // For item selection
	initialCustomers: PrismaCustomer[] // Initial customers from server
}

const saleQueryKeys = {
	allSales: ['sales'] as const,
	itemsForSale: ['itemsForSale'] as const, // If fetching items client-side
	// Key for fetching customers client-side if needed, or for invalidation
	customersList: ['customers', 'list'] as const,
}

async function createSaleAPI(payload: SaleCreateFormValues): Promise<{ id: string; message: string }> {
	// Define return type based on API response
	const response = await fetch('/api/sales', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	})
	const result = await response.json()
	if (!response.ok) {
		throw new Error(result.message || result.error || 'Failed to create sale.')
	}
	return result
}

// API function to fetch customers (if you want to refresh client-side)
async function fetchCustomersAPI(): Promise<PrismaCustomer[]> {
	const response = await fetch('/api/customers')
	if (!response.ok) {
		throw new Error('Failed to fetch customers')
	}
	return response.json()
}

export function NewSaleForm({ initialItems, initialCustomers }: NewSaleFormProps) {
	const queryClient = useQueryClient()
	const [searchTerm, setSearchTerm] = useState('')
	const [customerSearchTerm, setCustomerSearchTerm] = useState('')
	const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null)
	const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false)

	const form = useForm<SaleCreateFormValues>({
		resolver: zodResolver(saleCreateSchema),
		defaultValues: {
			customerId: null,
			saleItems: [],
			paymentMethod: PaymentMethod.CASH,
			totalDiscount: 0,
			totalTax: 0,
			notes: '',
		},
	})

	// Use TanStack Query to manage customers list client-side for dynamic updates
	const { data: customersData, refetch: refetchCustomers } = useQuery<PrismaCustomer[], Error>({
		queryKey: saleQueryKeys.customersList,
		queryFn: fetchCustomersAPI,
		initialData: initialCustomers, // Use initial data from server
	})

	const currentCustomers = customersData || initialCustomers

	const { fields, append, remove, update } = useFieldArray({
		control: form.control,
		name: 'saleItems',
		keyName: 'fieldId', // Important for unique keys
	})

	const saleItemsWatch = form.watch('saleItems') // Watch saleItems for dynamic calculations

	const subTotal = useMemo(() => {
		return saleItemsWatch.reduce((acc, currentItem) => {
			const itemPrice = currentItem.priceAtSale || 0
			const quantity = currentItem.quantitySold || 0
			const discount = currentItem.discountOnItem || 0
			const tax = currentItem.taxOnItem || 0
			return acc + (itemPrice * quantity - discount + tax)
		}, 0)
	}, [saleItemsWatch])

	const totalDiscountWatch = form.watch('totalDiscount')
	const totalTaxWatch = form.watch('totalTax')

	const grandTotal = useMemo(() => {
		return subTotal - (totalDiscountWatch || 0) + (totalTaxWatch || 0)
	}, [subTotal, totalDiscountWatch, totalTaxWatch])

	const createSaleMutation = useMutation({
		mutationFn: createSaleAPI,
		onSuccess: () => {
			toast.success('Sale created successfully!')
			queryClient.invalidateQueries({ queryKey: saleQueryKeys.allSales })
			queryClient.invalidateQueries({ queryKey: ['items', 'list'] }) // Invalidate inventory items list
			form.reset()
			// Optionally redirect to the created sale/invoice page: router.push(`/sales/${data.id}`)
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to create sale.')
		},
	})

	const onSubmit = (values: SaleCreateFormValues) => {
		if (values.saleItems.length === 0) {
			toast.error('Please add at least one item to the sale.')
			return
		}
		createSaleMutation.mutate(values)
	}

	const addItemToSale = (item: ItemWithRelations) => {
		const existingItemIndex = fields.findIndex(field => field.itemId === item.id)
		if (existingItemIndex > -1) {
			// If item exists, update its quantity
			const existingItem = fields[existingItemIndex]
			if (existingItem.quantitySold < item.quantity_in_stock) {
				update(existingItemIndex, { ...existingItem, quantitySold: existingItem.quantitySold + 1 })
			} else {
				toast.warning(`Max stock (${item.quantity_in_stock}) reached for ${item.name}.`)
			}
		} else {
			// Add new item
			if (item.quantity_in_stock > 0) {
				append({
					itemId: item.id,
					quantitySold: 1,
					priceAtSale: item.price, // Capture current price
					discountOnItem: 0,
					taxOnItem: 0,
				} as SaleItemFormValues) // Cast to ensure type compatibility
			} else {
				toast.error(`${item.name} is out of stock.`)
			}
		}
		setSearchTerm('') // Clear search after adding
	}

	const handleCustomerSelect = (customer: PrismaCustomer) => {
		form.setValue('customerId', customer.id)
		setSelectedCustomerName(`${customer.name} (${customer.phone || customer.email || 'N/A'})`)
		setCustomerSearchTerm('') // Clear search
	}

	const handleNewCustomerSuccess = (newCustomer: PrismaCustomer) => {
		setIsCustomerSheetOpen(false)
		// Invalidate and refetch customers list to include the new one
		queryClient.invalidateQueries({ queryKey: saleQueryKeys.customersList }).then(() => {
			refetchCustomers().then(queryResult => {
				const updatedCustomers = queryResult.data || currentCustomers
				const newlyAddedCustomer = updatedCustomers.find(c => c.id === newCustomer.id)
				if (newlyAddedCustomer) {
					handleCustomerSelect(newlyAddedCustomer) // Auto-select the new customer
				}
			})
		})
		toast.success(`Customer "${newCustomer.name}" added and selected.`)
	}

	const filteredItems = useMemo(() => {
		if (!searchTerm) return [] // Don't show all items initially or make it a prop
		return initialItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.generic_name?.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10) // Limit results for performance
	}, [searchTerm, initialItems])

	const filteredCustomers = useMemo(() => {
		if (!customerSearchTerm) return [] // Only filter when there's a search term
		return currentCustomers.filter(customer => customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || customer.phone?.includes(customerSearchTerm) || customer.email?.toLowerCase().includes(customerSearchTerm.toLowerCase())).slice(0, 5) // Limit results
	}, [customerSearchTerm, currentCustomers])

	// Effect to update selectedCustomerName when customerId changes (e.g., on form reset)
	useEffect(() => {
		const currentCustomerId = form.getValues('customerId')
		if (currentCustomerId) {
			const cust = initialCustomers.find(c => c.id === currentCustomerId)
			if (cust) {
				setSelectedCustomerName(`${cust.name} (${cust.phone || cust.email || 'ID: ' + cust.id.substring(0, 6)})`)
			}
		} else {
			setSelectedCustomerName(null)
		}
	}, [form.watch('customerId'), currentCustomers, form]) // Use currentCustomers

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className='space-y-8'>
				{/* Customer Search and Selection */}
				<div className='space-y-2'>
					<FormLabel>Customer (Optional)</FormLabel>
					<Input
						placeholder='Search customer by name, phone, or email...'
						value={selectedCustomerName || customerSearchTerm} // Show selected name or search term
						onChange={e => {
							setCustomerSearchTerm(e.target.value)
							setSelectedCustomerName(null) // Clear selected name when typing
							form.setValue('customerId', null) // Clear customerId when typing new search
						}}
					/>
					{customerSearchTerm && filteredCustomers.length > 0 && (
						<div className='border rounded-md max-h-40 overflow-y-auto'>
							{filteredCustomers.map(customer => (
								<div
									key={customer.id}
									className='p-2 hover:bg-accent cursor-pointer'
									onClick={() => handleCustomerSelect(customer)}>
									{customer.name} ({customer.phone || customer.email || 'N/A'})
								</div>
							))}
						</div>
					)}
					{customerSearchTerm && filteredCustomers.length === 0 && !selectedCustomerName && (
						<div className='text-sm text-muted-foreground'>
							No customers found.
							<Sheet
								open={isCustomerSheetOpen}
								onOpenChange={setIsCustomerSheetOpen}>
								<SheetTrigger asChild>
									<Button
										type='button'
										variant='link'
										size='sm'
										className='p-1'>
										Add New?
									</Button>
								</SheetTrigger>
								<SheetContent className='w-full overflow-y-auto sm:max-w-md'>
									<SheetHeader>
										<SheetTitle>Add New Customer</SheetTitle>
									</SheetHeader>
									<CustomerForm onSuccess={handleNewCustomerSuccess} />
								</SheetContent>
							</Sheet>
						</div>
					)}
					<FormField
						control={form.control}
						name='customerId'
						render={({ field }) => <FormMessage />}
					/>{' '}
					{/* To show validation errors for customerId if any */}
				</div>

				{/* Item Search and Add */}
				<div className='space-y-2'>
					<FormLabel>Add Items</FormLabel>
					<div className='flex items-center gap-2'>
						<Search className='h-5 w-5 text-muted-foreground' />
						<Input
							placeholder='Search items by name or generic name...'
							value={searchTerm}
							onChange={e => setSearchTerm(e.target.value)}
							className='flex-grow'
						/>
					</div>
					{searchTerm && filteredItems.length > 0 && (
						<div className='border rounded-md max-h-60 overflow-y-auto'>
							{filteredItems.map(item => (
								<div
									key={item.id}
									className='p-2 hover:bg-accent cursor-pointer'
									onClick={() => addItemToSale(item)}>
									{item.name} (Stock: {item.quantity_in_stock}, Price: {item.price.toFixed(2)})
								</div>
							))}
						</div>
					)}
					{searchTerm && filteredItems.length === 0 && <p className='text-sm text-muted-foreground'>No items found.</p>}
				</div>

				{/* Sale Items Table */}
				{fields.length > 0 && (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Item</TableHead>
								<TableHead className='w-[100px]'>Quantity</TableHead>
								<TableHead className='w-[120px]'>Price/Unit</TableHead>
								<TableHead className='w-[120px]'>Total</TableHead>
								<TableHead className='w-[50px]'>Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{fields.map((field, index) => {
								const itemDetails = initialItems.find(i => i.id === field.itemId)
								return (
									<TableRow key={field.fieldId}>
										<TableCell>{itemDetails?.name || 'Unknown Item'}</TableCell>
										<TableCell>
											<Controller
												control={form.control}
												name={`saleItems.${index}.quantitySold`}
												render={({ field: qtyField }) => (
													<Input
														type='number'
														min='1'
														max={itemDetails?.quantity_in_stock || 1}
														{...qtyField}
														onChange={e => qtyField.onChange(parseInt(e.target.value, 10))}
														className='w-full'
													/>
												)}
											/>
										</TableCell>
										<TableCell>{field.priceAtSale.toFixed(2)}</TableCell>
										<TableCell>{(field.priceAtSale * field.quantitySold).toFixed(2)}</TableCell>
										<TableCell>
											<Button
												type='button'
												variant='ghost'
												size='icon'
												onClick={() => remove(index)}>
												<Trash2 className='h-4 w-4 text-destructive' />
											</Button>
										</TableCell>
									</TableRow>
								)
							})}
						</TableBody>
					</Table>
				)}

				{/* Totals and Payment */}
				<div className='grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t'>
					<div className='space-y-4'>
						<FormField
							control={form.control}
							name='paymentMethod'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Payment Method</FormLabel>
									<Select
										onValueChange={field.onChange}
										value={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder='Select payment method' />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{Object.values(PaymentMethod).map(method => (
												<SelectItem
													key={method}
													value={method}>
													{method.replace('_', ' ')}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name='notes'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Notes (Optional)</FormLabel>
									<FormControl>
										<Textarea
											placeholder='Any notes for this sale...'
											{...field}
											value={field.value ?? ''}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
					<div className='space-y-2 text-right'>
						<div className='flex justify-between items-center'>
							<span>Subtotal:</span> <span>{subTotal.toFixed(2)}</span>
						</div>
						<FormField
							control={form.control}
							name='totalDiscount'
							render={({ field }) => (
								<FormItem className='flex justify-between items-center'>
									<FormLabel className='mr-2'>Overall Discount:</FormLabel>
									<FormControl>
										<Input
											type='number'
											step='0.01'
											className='w-24 text-right'
											placeholder='0.00'
											{...field}
											onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
											value={field.value ?? ''}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name='totalTax'
							render={({ field }) => (
								<FormItem className='flex justify-between items-center'>
									<FormLabel className='mr-2'>Overall Tax:</FormLabel>
									<FormControl>
										<Input
											type='number'
											step='0.01'
											className='w-24 text-right'
											placeholder='0.00'
											{...field}
											onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
											value={field.value ?? ''}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
						<div className='text-xl font-bold flex justify-between items-center'>
							<span>Grand Total:</span> <span>{grandTotal.toFixed(2)}</span>
						</div>
					</div>
				</div>

				<div className='flex justify-end pt-6'>
					<Button
						type='submit'
						size='lg'
						disabled={createSaleMutation.isPending || fields.length === 0}>
						{createSaleMutation.isPending ? 'Processing Sale...' : 'Complete Sale & Generate Bill'}
					</Button>
				</div>
			</form>
		</Form>
	)
}
