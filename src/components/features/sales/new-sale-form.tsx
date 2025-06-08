// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
'use client'

import { useState, useMemo, useCallback } from 'react'
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { ItemWithRelations } from '@/types/inventory'
import { Customer as PrismaCustomer, PaymentMethod } from '@/generated/prisma'
import { saleCreateSchema, SaleCreateFormValues, SaleItemFormValues } from '@/lib/validations/sale'

import { fetchCustomers_cli } from '@/services/customerService'
import { fetchItems_cli } from '@/services/inventoryService'
import { createSaleAPI } from '@/services/saleService'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2, Search } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { CustomerForm } from '../customers/customer-form'
import { useRouter } from 'next/navigation'

const saleQueryKeys = {
	allSales: ['sales'] as const,
	customersList: ['customers', 'list'] as const,
}

// Utility: Calculate total for a sale item (after per-item discount and tax)
function calcItemTotal(itemPrice: number, quantity: number, discountPercent: number, taxPercent: number) {
	const gross = itemPrice * quantity
	const itemDiscount = gross * discountPercent
	const netAfterItemDiscount = gross - itemDiscount
	const tax = netAfterItemDiscount * taxPercent
	return netAfterItemDiscount + tax
}

// Utility: Calculate per-item discount amount (per-item only)
function calcItemDiscount(itemPrice: number, quantity: number, discountPercent: number) {
	const gross = itemPrice * quantity
	return gross * discountPercent
}

// Utility: Calculate per-item tax amount (after per-item discount)
function calcItemTax(itemPrice: number, quantity: number, discountPercent: number, taxPercent: number) {
	const gross = itemPrice * quantity
	const itemDiscount = gross * discountPercent
	const netAfterItemDiscount = gross - itemDiscount
	return netAfterItemDiscount * taxPercent
}

// Utility: Render customer display name
function getCustomerDisplayName(customer: { name: string; phone?: string | null; email?: string | null }) {
	return `${customer.name} (${customer.phone || customer.email || 'N/A'})`
}

// Utility: Render item display name
function getItemDisplayName(item: { name: string; price: number; expiry_date?: Date | null }) {
	return `${item.name} - ₹${item.price.toFixed(2)} ${item.expiry_date ? `(Exp: ${new Date(item.expiry_date).toLocaleDateString()})` : ''}`
}

export function NewSaleForm() {
	const router = useRouter()
	const queryClient = useQueryClient()
	const [searchTerm, setSearchTerm] = useState('')
	const [customerSearchTerm, setCustomerSearchTerm] = useState('')
	const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null)
	const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false)
	const [redirectToInvoice, setRedirectToInvoice] = useState(false)

	const form = useForm<SaleCreateFormValues>({
		resolver: zodResolver(saleCreateSchema),
		defaultValues: {
			customerId: null,
			saleItems: [],
			paymentMethod: PaymentMethod.CASH,
			totalDiscount: 0, // This will now be extra discount percentage (e.g. 0.05 for 5%)
			notes: '',
		},
	})

	const { data: liveCustomerResults = [], isLoading: customerSearchLoading } = useQuery({
		queryKey: ['sale-customer-search', customerSearchTerm],
		queryFn: () => (customerSearchTerm ? fetchCustomers_cli(1, 10, customerSearchTerm).then(res => res.customers) : Promise.resolve([])),
		enabled: !!customerSearchTerm,
	})

	const { data: liveItems = [], isLoading: itemsLoading } = useQuery({
		queryKey: ['sale-items', searchTerm],
		queryFn: () => (searchTerm ? fetchItems_cli(1, 10, { search: searchTerm }).then(res => res.items) : Promise.resolve([])),
		enabled: !!searchTerm,
	})

	const { fields, append, remove, update } = useFieldArray({
		control: form.control,
		name: 'saleItems',
		keyName: 'fieldId',
	})

	// Watch extra discount as whole number (1-100), but use decimal in calculations
	const extraDiscountPercentRaw = useWatch({ control: form.control, name: 'totalDiscount' }) || 0
	const extraDiscountPercent = extraDiscountPercentRaw / 100

	const saleItemsWatch = useWatch({ control: form.control, name: 'saleItems' })

	// Subtotal: sum of (item price * quantity) for all items
	const totalPriceBeforeDiscounts = useMemo(
		() =>
			(saleItemsWatch || []).reduce((acc, currentItem) => {
				const itemPrice = currentItem.priceAtSale || 0
				const quantity = currentItem.quantitySold || 0
				return acc + itemPrice * quantity
			}, 0),
		[saleItemsWatch],
	)

	// Total product discount: sum of all per-item discounts
	const totalProductDiscount = useMemo(
		() =>
			(saleItemsWatch || []).reduce((acc, currentItem) => {
				const itemPrice = currentItem.priceAtSale || 0
				const quantity = currentItem.quantitySold || 0
				const discountPercent = currentItem.discountOnItem || 0
				return acc + calcItemDiscount(itemPrice, quantity, discountPercent)
			}, 0),
		[saleItemsWatch],
	)

	// Subtotal after per-item discounts (before extra discount)
	const subTotalAfterProductDiscount = useMemo(() => totalPriceBeforeDiscounts - totalProductDiscount, [totalPriceBeforeDiscounts, totalProductDiscount])

	// Extra discount amount (applied only to subtotal after per-item discounts)
	const extraDiscountAmount = useMemo(() => subTotalAfterProductDiscount * extraDiscountPercent, [subTotalAfterProductDiscount, extraDiscountPercent])

	// Subtotal after all discounts (per-item + extra)
	const subTotal = useMemo(() => subTotalAfterProductDiscount - extraDiscountAmount, [subTotalAfterProductDiscount, extraDiscountAmount])

	// Total tax: sum of all per-item tax (after per-item discount, before extra discount)
	const totalTax = useMemo(
		() =>
			(saleItemsWatch || []).reduce((acc, currentItem) => {
				const itemPrice = currentItem.priceAtSale || 0
				const quantity = currentItem.quantitySold || 0
				const discountPercent = currentItem.discountOnItem || 0
				const taxPercent = currentItem.taxOnItem || 0
				return acc + calcItemTax(itemPrice, quantity, discountPercent, taxPercent)
			}, 0),
		[saleItemsWatch],
	)

	// Grand total: subtotal after all discounts + total tax
	const grandTotal = useMemo(() => subTotal + totalTax, [subTotal, totalTax])

	const createSaleMutation = useMutation({
		mutationFn: createSaleAPI,
		onSuccess: createdSale => {
			toast.success('Sale created successfully!')
			queryClient.invalidateQueries({ queryKey: saleQueryKeys.allSales })
			queryClient.invalidateQueries({ queryKey: ['items', 'list'] })
			form.reset()
			setSelectedCustomerName(null)
			setCustomerSearchTerm('')
			setIsCustomerSheetOpen(false)
			if (redirectToInvoice && createdSale?.id) {
				router.push(`/sales/${createdSale.id}`)
			}
			setRedirectToInvoice(false)
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to create sale.')
			setRedirectToInvoice(false)
		},
	})

	const onSubmit = useCallback(
		(values: SaleCreateFormValues) => {
			if (values.saleItems.length === 0) {
				toast.error('Please add at least one item to the sale.')
				return
			}
			createSaleMutation.mutate(values)
		},
		[createSaleMutation],
	)

	const addItemToSale = useCallback(
		(item: ItemWithRelations) => {
			const existingItemIndex = fields.findIndex(field => field.itemId === item.id)
			if (existingItemIndex > -1) {
				const existingItem = fields[existingItemIndex]
				if (existingItem.quantitySold < item.quantity_in_stock) {
					update(existingItemIndex, {
						...existingItem,
						quantitySold: existingItem.quantitySold + 1,
					})
				} else {
					toast.warning(`Max stock (${item.quantity_in_stock}) reached for ${item.name}.`)
				}
			} else {
				if (item.quantity_in_stock > 0) {
					append({
						itemId: item.id,
						quantitySold: 1,
						priceAtSale: item.price,
						discountOnItem: item.discount,
						taxOnItem: item.tax_rate,
						itemName: item.name,
						itemGenericName: item.generic_name,
						itemStock: item.quantity_in_stock,
					} as SaleItemFormValues & { itemName: string; itemGenericName?: string; itemStock: number })
				} else {
					toast.error(`${item.name} is out of stock.`)
				}
			}
			setSearchTerm('')
		},
		[fields, append, update],
	)

	const handleSelectCustomer = useCallback(
		(customer: PrismaCustomer) => {
			form.setValue('customerId', customer.id)
			setSelectedCustomerName(getCustomerDisplayName(customer))
			setCustomerSearchTerm('')
		},
		[form],
	)

	const handleSelectItem = useCallback(
		(item: ItemWithRelations) => {
			addItemToSale(item)
			setSearchTerm('')
		},
		[addItemToSale],
	)

	const handleNewCustomerSuccess = useCallback(
		(newCustomer: PrismaCustomer) => {
			queryClient.invalidateQueries({ queryKey: ['all-customer-names'] })
			setIsCustomerSheetOpen(false)
			setSelectedCustomerName(getCustomerDisplayName(newCustomer))
			form.setValue('customerId', newCustomer.id)
			setCustomerSearchTerm('')
		},
		[form, queryClient],
	)

	const handleCompleteOnly = useCallback(() => {
		setRedirectToInvoice(false)
		form.handleSubmit(onSubmit)()
	}, [form, onSubmit])

	const handleCompleteAndView = useCallback(() => {
		setRedirectToInvoice(true)
		form.handleSubmit(onSubmit)()
	}, [form, onSubmit])

	return (
		<Form {...form}>
			<form
				onSubmit={e => e.preventDefault()}
				className='space-y-8'
				autoComplete='off'>
				{/* Customer Search and Selection */}
				<div className='space-y-2'>
					<FormLabel>Customer (Optional)</FormLabel>
					<Input
						placeholder='Search customer by name, phone, or email...'
						value={customerSearchTerm}
						onChange={e => {
							setCustomerSearchTerm(e.target.value)
							setSelectedCustomerName(null)
							form.setValue('customerId', null)
						}}
					/>
					{customerSearchTerm && (
						<div className='border rounded-md max-h-40 overflow-y-auto bg-background z-10'>
							{customerSearchLoading && <div className='p-2 text-muted-foreground'>Searching...</div>}
							{liveCustomerResults.length > 0
								? liveCustomerResults.map(customer => (
										<div
											key={customer.id}
											className='p-2 hover:bg-accent cursor-pointer'
											onClick={() => handleSelectCustomer(customer)}>
											{getCustomerDisplayName(customer)}
										</div>
									))
								: !customerSearchLoading && (
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
						</div>
					)}
					{selectedCustomerName && (
						<div className='mt-1 text-sm text-green-700'>
							Selected: {selectedCustomerName}{' '}
							<Button
								type='button'
								variant='link'
								size='sm'
								onClick={() => {
									setSelectedCustomerName(null)
									form.setValue('customerId', null)
								}}>
								Clear
							</Button>
						</div>
					)}
					<FormField
						control={form.control}
						name='customerId'
						render={() => <FormMessage />}
					/>
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
					{searchTerm && (
						<div className='border rounded-md max-h-60 overflow-y-auto'>
							{itemsLoading && <div className='p-2 text-muted-foreground'>Searching...</div>}
							{liveItems.length > 0
								? liveItems.map(item => (
										<div
											key={item.id}
											className='p-2 hover:bg-accent cursor-pointer'
											onClick={() => handleSelectItem(item)}>
											{getItemDisplayName(item)}
										</div>
									))
								: !itemsLoading && <p className='text-sm text-muted-foreground'>No items found.</p>}
						</div>
					)}
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
								const name = field.itemName || 'Unknown Item'
								const price = field.priceAtSale
								const stock = field.itemStock ?? 99
								const quantity = field.quantitySold || 0
								const discountPercent = field.discountOnItem || 0
								const taxPercent = field.taxOnItem || 0
								const total = calcItemTotal(price, quantity, discountPercent, taxPercent)
								return (
									<TableRow key={field.fieldId}>
										<TableCell>{name}</TableCell>
										<TableCell>
											<Controller
												control={form.control}
												name={`saleItems.${index}.quantitySold`}
												render={({ field: qtyField }) => (
													<Input
														type='number'
														min='1'
														max={stock}
														{...qtyField}
														onChange={e => {
															const val = parseInt(e.target.value, 10)
															if (val > stock) {
																toast.warning(`Max stock (${stock}) reached for ${name}.`)
																qtyField.onChange(stock)
															} else {
																qtyField.onChange(val)
															}
														}}
														className='w-full'
													/>
												)}
											/>
										</TableCell>
										<TableCell>₹{price.toFixed(2)}</TableCell>
										<TableCell>₹{total.toFixed(2)}</TableCell>
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
							<span>Total Price (Before Discounts):</span>
							<span>₹{totalPriceBeforeDiscounts.toFixed(2)}</span>
						</div>
						<div className='flex justify-between items-center'>
							<span>Total Product Discount:</span>
							<span>-₹{totalProductDiscount.toFixed(2)}</span>
						</div>
						<div className='flex justify-between items-center'>
							<span>Extra Discount (%):</span>
							<span>
								<FormField
									control={form.control}
									name='totalDiscount'
									render={({ field }) => (
										<FormItem className='inline-flex items-center gap-1'>
											<FormControl>
												<Input
													type='number'
													step='1'
													min='0'
													max='100'
													className='w-16 text-right'
													placeholder='0'
													{...field}
													onChange={e => {
														let val = parseInt(e.target.value, 10)
														if (isNaN(val) || val < 0) val = 0
														if (val > 100) val = 100
														field.onChange(val)
													}}
													value={field.value ?? ''}
												/>
											</FormControl>
											<span className='ml-1'>%</span>
										</FormItem>
									)}
								/>
							</span>
						</div>
						<div className='flex justify-between items-center'>
							<span>Extra Discount Amount:</span>
							<span>-₹{extraDiscountAmount.toFixed(2)}</span>
						</div>
						<div className='flex justify-between items-center'>
							<span>Subtotal (After All Discounts):</span>
							<span>₹{subTotal.toFixed(2)}</span>
						</div>
						<div className='flex justify-between items-center'>
							<span>Total Tax:</span>
							<span>+₹{totalTax.toFixed(2)}</span>
						</div>
						<div className='text-xl font-bold flex justify-between items-center'>
							<span>Grand Total:</span>
							<span>₹{grandTotal.toFixed(2)}</span>
						</div>
					</div>
				</div>

				<div className='flex justify-end pt-6 gap-2'>
					<Button
						type='button'
						size='lg'
						disabled={createSaleMutation.isPending || fields.length === 0}
						onClick={handleCompleteOnly}>
						{createSaleMutation.isPending && !redirectToInvoice ? 'Processing Sale...' : 'Complete Sale'}
					</Button>
					<Button
						type='button'
						size='lg'
						variant='secondary'
						disabled={createSaleMutation.isPending || fields.length === 0}
						onClick={handleCompleteAndView}>
						{createSaleMutation.isPending && redirectToInvoice ? 'Processing & Redirecting...' : 'Complete Sale & View Invoice'}
					</Button>
				</div>
			</form>
		</Form>
	)
}
