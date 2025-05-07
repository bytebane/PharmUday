'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Report as PrismaReport, ReportCategory as PrismaReportCategory } from '@/generated/prisma'
import { reportCreateSchema, reportPatchSchema, reportBaseSchema } from '@/lib/validations/report' // Assuming base for form values

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

// Use the base schema for form values, file handled separately
type ReportFormValues = z.infer<typeof reportBaseSchema>

interface ReportFormProps {
	reportData?: PrismaReport | null
	onSuccess: () => void
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
	return res.json()
}

export function ReportForm({ reportData, onSuccess }: ReportFormProps) {
	const isEditing = !!reportData
	const queryClient = useQueryClient()
	const [selectedFile, setSelectedFile] = useState<File | null>(null)

	const form = useForm<ReportFormValues>({
		resolver: zodResolver(reportBaseSchema), // Use base schema for form fields
		defaultValues: {
			title: reportData?.title ?? '',
			patientName: reportData?.patientName ?? null,
			reportDate: reportData?.reportDate ? new Date(reportData.reportDate) : new Date(),
			notes: reportData?.notes ?? null,
			categoryId: reportData?.categoryId ?? '',
		},
	})

	useEffect(() => {
		form.reset({
			title: reportData?.title ?? '',
			patientName: reportData?.patientName ?? null,
			reportDate: reportData?.reportDate ? new Date(reportData.reportDate) : new Date(),
			notes: reportData?.notes ?? null,
			categoryId: reportData?.categoryId ?? '',
		})
		setSelectedFile(null) // Reset file on data change
	}, [reportData, form])

	const { data: reportCategories, isLoading: isLoadingCategories } = useQuery<PrismaReportCategory[], Error>({
		queryKey: reportQueryKeys.categories,
		queryFn: fetchReportCategoriesForForm,
	})

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
							<a
								href={reportData.fileUrl}
								target='_blank'
								rel='noopener noreferrer'
								className='text-blue-600 hover:underline'>
								View File
							</a>
						</FormDescription>
					)}
					<FormMessage />
				</FormItem>

				{isEditing && reportData?.fileUrl && (
					<FormItem>
						<p className='text-sm'>
							<a
								href={reportData.fileUrl}
								target='_blank'
								rel='noopener noreferrer'
								className='text-blue-600 hover:underline'></a>
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
