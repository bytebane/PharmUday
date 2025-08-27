'use client'

import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Report as PrismaReport, ReportCategory as PrismaReportCategory, Customer as PrismaCustomer } from '@/generated/prisma'
import { reportCreateSchema, reportPatchSchema, reportBaseSchema } from '@/lib/validations/report' // Assuming base for form values
import { fetchCustomers_cli } from '@/services/customerService'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { CustomerForm } from '../customers/customer-form'

// Use the base schema for form values, file handled separately
type ReportFormValues = z.infer<typeof reportBaseSchema>

interface ReportFormProps {
	reportData?: PrismaReport | null
	onSuccess: () => void
}

// Utility: Render customer display name
function getCustomerDisplayName(customer: { name: string; phone?: string | null; email?: string | null }) {
	return `${customer.name} (${customer.phone || customer.email || 'N/A'})`
}

const reportQueryKeys = {
	all: ['reports'] as const,
	lists: () => [...reportQueryKeys.all, 'list'] as const,
	categories: ['reportCategories', 'list'] as const, // For fetching categories
}

// API function for saving (Create/Update) a report
async function saveReportAPI(payload: { formData: FormData; reportId?: string }): Promise<PrismaReport> {
	const { formData, reportId } = payload
	const isEditing = !!reportId
	const url = isEditing ? `/api/reports/${reportId}` : '/api/reports'
	// For PATCH, FormData might not be ideal if not changing file.
	// If editing and not changing file, send JSON. If changing file, send FormData.
	// This example assumes POST always sends FormData. PATCH would need more nuanced handling for file changes.
	const method = isEditing ? 'PATCH' : 'POST' // PATCH with FormData is possible but less common for metadata-only updates

	const response = await fetch(url, {
		method: method,
		body: formData, // Send FormData directly
	})

	const result = await response.json()
	if (!response.ok) {
		const errorMessage = result?.message || result?.error || `Failed to ${isEditing ? 'save' : 'create'} report`
		throw new Error(errorMessage)
	}
	return result
}

// API function to fetch report categories for the dropdown
async function fetchReportCategoriesForForm(): Promise<PrismaReportCategory[]> {
	const res = await fetch('/api/report-categories')
	if (!res.ok) throw new Error('Failed to fetch report categories')
	const result = await res.json()
	return result.categories || [] // Extract the categories array from the response
}

export function ReportForm({ reportData, onSuccess }: ReportFormProps) {
	const isEditing = !!reportData
	const queryClient = useQueryClient()
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [customerSearchTerm, setCustomerSearchTerm] = useState('')
	const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null)
	const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false)

	const form = useForm<ReportFormValues>({
		resolver: zodResolver(reportBaseSchema), // Use base schema for form fields
		defaultValues: {
			title: reportData?.title ?? '',
			patientName: reportData?.patientName ?? null,
			reportDate: reportData?.reportDate ? new Date(reportData.reportDate) : new Date(),
			notes: reportData?.notes ?? null,
			categoryId: reportData?.categoryId ?? '',
			customerId: null, // For now, always start with null until migration is complete
		},
	})

	useEffect(() => {
		form.reset({
			title: reportData?.title ?? '',
			patientName: reportData?.patientName ?? null,
			reportDate: reportData?.reportDate ? new Date(reportData.reportDate) : new Date(),
			notes: reportData?.notes ?? null,
			categoryId: reportData?.categoryId ?? '',
			customerId: null, // For now, always start with null until migration is complete
		})
		setSelectedFile(null) // Reset file on data change
		setSelectedCustomerName(null) // Reset customer selection
		setCustomerSearchTerm('')
	}, [reportData, form])

	const { data: liveCustomerResults = [], isLoading: customerSearchLoading } = useQuery({
		queryKey: ['report-customer-search', customerSearchTerm],
		queryFn: () => (customerSearchTerm ? fetchCustomers_cli(1, 10, customerSearchTerm).then(res => res.customers) : Promise.resolve([])),
		enabled: !!customerSearchTerm,
	})

	const { data: reportCategories, isLoading: isLoadingCategories } = useQuery<PrismaReportCategory[], Error>({
		queryKey: reportQueryKeys.categories,
		queryFn: fetchReportCategoriesForForm,
	})

	const handleSelectCustomer = useCallback(
		(customer: PrismaCustomer) => {
			form.setValue('customerId', customer.id)
			setSelectedCustomerName(getCustomerDisplayName(customer))
			setCustomerSearchTerm('')
		},
		[form],
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

	const reportMutation = useMutation({
		mutationFn: saveReportAPI,
		onSuccess: () => {
			toast.success(`Report ${isEditing ? 'updated' : 'created'} successfully!`)
			queryClient.invalidateQueries({ queryKey: reportQueryKeys.lists() })
			onSuccess()
		},
		onError: (error: Error) => {
			toast.error(error.message || 'An unknown error occurred.')
			console.error('Form submission error:', error)
		},
	})

	const onSubmit = async (values: ReportFormValues) => {
		const formData = new FormData()
		Object.entries(values).forEach(([key, value]) => {
			if (value instanceof Date) {
				formData.append(key, value.toISOString())
			} else if (value !== null && value !== undefined) {
				formData.append(key, String(value))
			}
		})

		// Append file if selected (for new or replacement)
		if (selectedFile) {
			formData.append('file', selectedFile)
		}

		if (!isEditing && !selectedFile) {
			toast.error('Please select a report file to upload.')
			return
		}

		reportMutation.mutate({ formData, reportId: reportData?.id })
	}

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files && event.target.files[0]) {
			setSelectedFile(event.target.files[0])
		} else {
			setSelectedFile(null)
		}
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className='space-y-6 p-1 pt-4'>
				<FormField
					control={form.control}
					name='title'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Title *</FormLabel>
							<FormControl>
								<Input
									placeholder='e.g., Annual Blood Work'
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Customer Search and Selection */}
				<div className='space-y-2'>
					<FormLabel>Customer (Optional)</FormLabel>
					{selectedCustomerName ? (
						<div className='flex items-center gap-2'>
							<Input
								readOnly
								value={selectedCustomerName}
								className='bg-muted'
							/>
							<Button
								type='button'
								variant='outline'
								onClick={() => {
									setSelectedCustomerName(null)
									form.setValue('customerId', null)
								}}>
								Clear
							</Button>
						</div>
					) : (
						<>
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
												<div className='text-sm text-muted-foreground p-2'>
													No customers found.
													<Sheet
														open={isCustomerSheetOpen}
														onOpenChange={setIsCustomerSheetOpen}>
														<SheetTrigger asChild>
															<Button
																variant='link'
																className='h-auto p-0 ml-1 text-primary underline'>
																Create new customer
															</Button>
														</SheetTrigger>
														<SheetContent>
															<SheetHeader>
																<SheetTitle>Add New Customer</SheetTitle>
															</SheetHeader>
															<CustomerForm
																onSuccess={handleNewCustomerSuccess}
																customerData={null}
															/>
														</SheetContent>
													</Sheet>
												</div>
											)}
								</div>
							)}
						</>
					)}
				</div>

				<FormField
					control={form.control}
					name='patientName'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Patient Name</FormLabel>
							<FormControl>
								<Input
									placeholder='Optional'
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
					name='categoryId'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Category *</FormLabel>
							<Select
								onValueChange={field.onChange}
								value={field.value}
								disabled={isLoadingCategories}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder={isLoadingCategories ? 'Loading categories...' : 'Select a category'} />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{reportCategories?.map(cat => (
										<SelectItem
											key={cat.id}
											value={cat.id}>
											{cat.name}
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
					name='reportDate'
					render={({ field }) => (
						<FormItem className='flex flex-col'>
							<FormLabel>Report Date *</FormLabel>
							<Popover>
								<PopoverTrigger asChild>
									<FormControl>
										<Button
											variant={'outline'}
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
										selected={field.value}
										onSelect={field.onChange}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* File Input - Always available */}
				<FormItem>
					<FormLabel>{isEditing && reportData?.fileUrl ? 'Replace Report File (Optional)' : 'Report File *'}</FormLabel>
					<FormControl>
						<Input
							type='file'
							accept='.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt' // Broader accept range
							onChange={handleFileChange}
						/>
					</FormControl>
					{selectedFile && <FormDescription>New file selected: {selectedFile.name}</FormDescription>}
					{!selectedFile && isEditing && reportData?.fileUrl && (
						<FormDescription>
							Currently uploaded:{' '}
							<Link
								href={reportData.fileUrl}
								target='_blank'
								rel='noopener noreferrer'
								className='text-blue-600 hover:underline'>
								View File
							</Link>
						</FormDescription>
					)}
					<FormMessage />
				</FormItem>

				{isEditing && reportData?.fileUrl && (
					<FormItem>
						<p className='text-sm'>
							<Link
								href={reportData.fileUrl}
								target='_blank'
								rel='noopener noreferrer'
								className='text-blue-600 hover:underline'></Link>
						</p>
					</FormItem>
				)}

				<FormField
					control={form.control}
					name='notes'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Notes</FormLabel>
							<FormControl>
								<Textarea
									placeholder='Optional notes about the report'
									{...field}
									value={field.value ?? ''}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className='flex justify-end pt-4'>
					<Button
						type='submit'
						disabled={reportMutation.isPending || isLoadingCategories}>
						{reportMutation.isPending ? 'Saving...' : isEditing ? 'Update Report' : 'Create Report'}
					</Button>
				</div>
			</form>
		</Form>
	)
}
