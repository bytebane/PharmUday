'use client'

import { useEffect } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { itemSchema } from '@/lib/validations/item'
import { ItemWithRelations, BasicCategory, BasicSupplier } from '@/types/inventory'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

// --- Types and Props ---

interface ItemFormProps {
	itemData?: ItemWithRelations | null
	categories: BasicCategory[]
	suppliers: BasicSupplier[]
	onSuccess: () => void
}

type ItemFormValues = z.infer<typeof itemSchema>

// --- Query Keys ---

const itemQueryKeys = {
	all: ['items'] as const,
	lists: () => [...itemQueryKeys.all, 'list'] as const,
}

// --- API Call ---

async function saveItemAPI(payload: { values: ItemFormValues; itemId?: string }): Promise<ItemWithRelations> {
	const { values, itemId } = payload
	const isEditing = !!itemId
	const url = isEditing ? `/api/inv-items/${itemId}` : '/api/inv-items'
	const method = isEditing ? 'PATCH' : 'POST'

	const apiPayload = {
		...values,
		expiry_date: values.expiry_date ? values.expiry_date.toISOString() : null,
		purchase_date: values.purchase_date ? values.purchase_date.toISOString() : null,
	}

	const response = await fetch(url, {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(apiPayload),
	})
	const result = await response.json()
	if (!response.ok) {
		const errorMessage = result?.message || result?.error || `Failed to ${isEditing ? 'update' : 'create'} item`
		throw new Error(errorMessage)
	}
	return result as ItemWithRelations
}

// --- Main Form Component ---

export function ItemForm({ itemData, categories, suppliers, onSuccess }: ItemFormProps) {
	const isEditing = !!itemData
	const queryClient = useQueryClient()

	const form = useForm<ItemFormValues>({
		resolver: zodResolver(itemSchema),
		defaultValues: {
			name: itemData?.name ?? '',
			manufacturer: itemData?.manufacturer ?? undefined,
			generic_name: itemData?.generic_name ?? undefined,
			formulation: itemData?.formulation ?? undefined,
			strength: itemData?.strength ?? undefined,
			unit: itemData?.unit ?? undefined,
			schedule: itemData?.schedule ?? undefined,
			description: itemData?.description ?? undefined,
			image: itemData?.image ?? '',
			thumbnailUrls: itemData?.thumbnailUrls ?? [],
			units_per_pack: itemData?.units_per_pack ?? null,
			price: itemData?.price ?? undefined,
			tax_rate: itemData?.tax_rate ?? null,
			discount: itemData?.discount ?? null,
			reorder_level: itemData?.reorder_level ?? null,
			isActive: itemData?.isActive ?? true,
			isAvailable: itemData?.isAvailable ?? true,
			quantity_in_stock: itemData?.quantity_in_stock ?? 0,
			expiry_date: itemData?.expiry_date ? new Date(itemData.expiry_date) : null,
			purchase_price: itemData?.purchase_price ?? null,
			purchase_date: itemData?.purchase_date ? new Date(itemData.purchase_date) : null,
			categoryIds: itemData?.categories?.map(cat => cat.id) ?? [],
			supplierId: itemData?.supplierId ?? null,
		},
	})

	// Reset form when editing a different item or switching to add mode
	useEffect(() => {
		form.reset({
			name: itemData?.name ?? '',
			manufacturer: itemData?.manufacturer ?? undefined,
			generic_name: itemData?.generic_name ?? undefined,
			formulation: itemData?.formulation ?? undefined,
			strength: itemData?.strength ?? undefined,
			unit: itemData?.unit ?? undefined,
			schedule: itemData?.schedule ?? undefined,
			description: itemData?.description ?? undefined,
			image: itemData?.image ?? '',
			thumbnailUrls: itemData?.thumbnailUrls ?? [],
			units_per_pack: itemData?.units_per_pack ?? null,
			price: itemData?.price ?? undefined,
			tax_rate: itemData?.tax_rate ?? null,
			discount: itemData?.discount ?? null,
			reorder_level: itemData?.reorder_level ?? null,
			isActive: itemData?.isActive ?? true,
			isAvailable: itemData?.isAvailable ?? true,
			quantity_in_stock: itemData?.quantity_in_stock ?? 0,
			expiry_date: itemData?.expiry_date ? new Date(itemData.expiry_date) : null,
			purchase_price: itemData?.purchase_price ?? null,
			purchase_date: itemData?.purchase_date ? new Date(itemData.purchase_date) : null,
			categoryIds: itemData?.categories?.map(cat => cat.id) ?? [],
			supplierId: itemData?.supplierId ?? null,
		})
	}, [itemData, form])

	const itemMutation = useMutation({
		mutationFn: saveItemAPI,
		onSuccess: () => {
			toast.success(`Item ${isEditing ? 'updated' : 'created'} successfully!`)
			// Invalidate all queries whose key starts with ['items', 'list']
			queryClient.invalidateQueries({ queryKey: ['items', 'list'] })
			onSuccess()
		},
		onError: (error: Error) => {
			toast.error(error instanceof Error ? error.message : 'An unknown error occurred during submission.')
			console.error('Form submission error:', error)
		},
	})

	const onSubmit: SubmitHandler<ItemFormValues> = values => {
		itemMutation.mutate({ values, itemId: itemData?.id })
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit) as (e?: React.BaseSyntheticEvent) => Promise<void>}
				className='space-y-6 p-4 md:p-6'>
				{/* --- Required Fields --- */}
				<div className='grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2'>
					<FormField<ItemFormValues>
						control={form.control}
						name='name'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Name *</FormLabel>
								<FormControl>
									<Input
										placeholder='e.g., Paracetamol 500mg Tablets'
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='price'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Selling Price *</FormLabel>
								<FormControl>
									<Input
										type='number'
										step='0.01'
										placeholder='0.00'
										{...field}
										onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
										value={field.value ?? ''}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				{/* --- Optional Text Fields --- */}
				<div className='grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-3'>
					{[
						{ name: 'manufacturer', label: 'Manufacturer', placeholder: 'e.g., Pharma Inc.' },
						{ name: 'generic_name', label: 'Generic Name', placeholder: 'e.g., Acetaminophen' },
						{ name: 'formulation', label: 'Formulation', placeholder: 'e.g., Tablet, Syrup' },
						{ name: 'strength', label: 'Strength', placeholder: 'e.g., 500mg, 10mg/5ml' },
						{ name: 'unit', label: 'Unit', placeholder: 'e.g., mg, ml, pcs' },
						{ name: 'schedule', label: 'Schedule', placeholder: 'e.g., H, G' },
					].map(({ name, label, placeholder }) => (
						<FormField
							key={name}
							control={form.control}
							name={name as keyof ItemFormValues}
							render={({ field }) => (
								<FormItem>
									<FormLabel>{label}</FormLabel>
									<FormControl>
										<Input
											placeholder={placeholder}
											{...field}
											value={field.value ?? ''}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					))}
				</div>

				{/* --- Optional Number Fields --- */}
				<div className='grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-3'>
					<FormField
						control={form.control}
						name='quantity_in_stock'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Quantity In Stock</FormLabel>
								<FormControl>
									<Input
										type='number'
										step='1'
										placeholder='0'
										{...field}
										onChange={e => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
										value={field.value ?? 0}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='units_per_pack'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Units Per Pack</FormLabel>
								<FormControl>
									<Input
										type='number'
										step='1'
										placeholder='e.g., 10'
										{...field}
										onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
										value={field.value ?? ''}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='reorder_level'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Reorder Level</FormLabel>
								<FormControl>
									<Input
										type='number'
										step='1'
										placeholder='e.g., 20'
										{...field}
										onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
										value={field.value ?? ''}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='purchase_price'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Purchase Price</FormLabel>
								<FormControl>
									<Input
										type='number'
										step='0.01'
										placeholder='0.00'
										{...field}
										onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
										value={field.value ?? ''}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='tax_rate'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Tax Rate (%)</FormLabel>
								<FormControl>
									<Input
										type='number'
										step='0.01'
										placeholder='e.g., 5 for 5%'
										{...field}
										onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value) / 100)}
										value={field.value != null ? field.value * 100 : ''}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='discount'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Discount (%)</FormLabel>
								<FormControl>
									<Input
										type='number'
										step='0.01'
										placeholder='e.g., 10 for 10%'
										{...field}
										onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value) / 100)}
										value={field.value != null ? field.value * 100 : ''}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				{/* --- Description & URLs --- */}
				<FormField
					control={form.control}
					name='description'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Textarea
									placeholder='Detailed description of the item...'
									rows={4}
									{...field}
									value={field.value ?? ''}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className='grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2'>
					<FormField
						control={form.control}
						name='image'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Main Image URL</FormLabel>
								<FormControl>
									<Input
										type='url'
										placeholder='https://example.com/image.jpg'
										{...field}
										value={field.value ?? ''}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='thumbnailUrls'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Thumbnail URLs (one per line)</FormLabel>
								<FormControl>
									<Textarea
										placeholder='https://example.com/thumb1.jpg&#10;https://example.com/thumb2.jpg'
										rows={3}
										value={Array.isArray(field.value) ? field.value.join('\n') : ''}
										onChange={e => field.onChange(e.target.value.split('\n').filter(url => url.trim() !== ''))}
									/>
								</FormControl>
								<FormDescription>Enter each URL on a new line.</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				{/* --- Relations --- */}
				<div className='grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2'>
					<FormField
						control={form.control}
						name='supplierId'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Supplier</FormLabel>
								<Select
									onValueChange={value => field.onChange(value === 'none' ? null : value)}
									value={field.value ?? 'none'}>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder='Select a supplier' />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value='none'>-- None --</SelectItem>
										{suppliers.map(supplier => (
											<SelectItem
												key={supplier.id}
												value={supplier.id}>
												{supplier.name}
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
						name='categoryIds'
						render={({}) => (
							<FormItem>
								<FormLabel>Categories</FormLabel>
								<FormDescription>Select one or more relevant categories.</FormDescription>
								<div className='max-h-40 overflow-y-auto rounded-md border p-2'>
									{categories.map(category => (
										<FormField
											key={category.id}
											control={form.control}
											name='categoryIds'
											render={({ field: subField }) => (
												<FormItem
													key={category.id}
													className='flex flex-row items-start space-x-3 space-y-0 py-1'>
													<FormControl>
														<Checkbox
															checked={subField.value?.includes(category.id)}
															onCheckedChange={checked => (checked ? subField.onChange([...(subField.value ?? []), category.id]) : subField.onChange(subField.value?.filter(value => value !== category.id)))}
														/>
													</FormControl>
													<FormLabel className='text-sm font-normal'>{category.name}</FormLabel>
												</FormItem>
											)}
										/>
									))}
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				{/* --- Dates --- */}
				<div className='grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2'>
					<FormField
						control={form.control}
						name='expiry_date'
						render={({ field }) => (
							<FormItem className='flex flex-col'>
								<FormLabel>Expiry Date</FormLabel>
								<Popover>
									<PopoverTrigger asChild>
										<FormControl>
											<Button
												variant='outline'
												className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
												{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
												<CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
											</Button>
										</FormControl>
									</PopoverTrigger>
									<PopoverContent
										className='w-auto p-0'
										align='start'>
										<Calendar
											mode='single'
											selected={field.value ?? undefined}
											onSelect={date => field.onChange(date ?? null)}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='purchase_date'
						render={({ field }) => (
							<FormItem className='flex flex-col'>
								<FormLabel>Purchase Date</FormLabel>
								<Popover>
									<PopoverTrigger asChild>
										<FormControl>
											<Button
												variant='outline'
												className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
												{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
												<CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
											</Button>
										</FormControl>
									</PopoverTrigger>
									<PopoverContent
										className='w-auto p-0'
										align='start'>
										<Calendar
											mode='single'
											selected={field.value ?? undefined}
											onSelect={date => field.onChange(date ?? null)}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				{/* --- Status Flags --- */}
				<div className='flex items-center space-x-6 pt-2'>
					<FormField
						control={form.control}
						name='isActive'
						render={({ field }) => (
							<FormItem className='flex flex-row items-center space-x-2'>
								<FormControl>
									<Checkbox
										checked={field.value}
										onCheckedChange={field.onChange}
										id='isActive'
									/>
								</FormControl>
								<FormLabel
									htmlFor='isActive'
									className='cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
									Is Active
								</FormLabel>
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='isAvailable'
						render={({ field }) => (
							<FormItem className='flex flex-row items-center space-x-2'>
								<FormControl>
									<Checkbox
										checked={field.value}
										onCheckedChange={field.onChange}
										id='isAvailable'
									/>
								</FormControl>
								<FormLabel
									htmlFor='isAvailable'
									className='cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
									Is Available
								</FormLabel>
							</FormItem>
						)}
					/>
				</div>

				{/* --- Submission Button --- */}
				<div className='flex justify-end pt-4'>
					<Button
						type='submit'
						disabled={itemMutation.isPending}
						className='w-full md:w-auto'>
						{itemMutation.isPending ? 'Saving...' : isEditing ? 'Update Item' : 'Create Item'}
					</Button>
				</div>
			</form>
		</Form>
	)
}
