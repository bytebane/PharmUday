'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ReportCategory as PrismaReportCategory } from '@/generated/prisma'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { reportCategorySchema } from '@/lib/validations/report-category'

interface ReportCategoryFormProps {
	categoryData?: PrismaReportCategory | null
	onSuccess: () => void
}

type ReportCategoryFormValues = z.infer<typeof reportCategorySchema>

const reportCategoryQueryKeys = {
	all: ['reportCategories'] as const,
	lists: () => [...reportCategoryQueryKeys.all, 'list'] as const,
}

async function saveReportCategoryAPI(payload: { values: ReportCategoryFormValues; categoryId?: string }): Promise<PrismaReportCategory> {
	const { values, categoryId } = payload
	const isEditing = !!categoryId
	const url = isEditing ? `/api/report-categories/${categoryId}` : '/api/report-categories' // Ensure this API endpoint exists
	const method = isEditing ? 'PATCH' : 'POST'

	const response = await fetch(url, {
		method: method,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(values),
	})

	const result = await response.json()

	if (!response.ok) {
		const errorMessage = result?.message || result?.error || `Failed to ${isEditing ? 'update' : 'create'} report category`
		throw new Error(errorMessage)
	}
	return result as PrismaReportCategory
}

export function ReportCategoryForm({ categoryData, onSuccess }: ReportCategoryFormProps) {
	const isEditing = !!categoryData
	const queryClient = useQueryClient()

	const form = useForm<ReportCategoryFormValues>({
		resolver: zodResolver(reportCategorySchema),
		defaultValues: getInitialFormValues(categoryData),
	})

	useEffect(() => {
		form.reset(getInitialFormValues(categoryData))
	}, [categoryData, form])

	const categoryMutation = useMutation({
		mutationFn: saveReportCategoryAPI,
		onSuccess: () => {
			toast.success(`Report category ${isEditing ? 'updated' : 'created'} successfully!`)
			queryClient.invalidateQueries({ queryKey: reportCategoryQueryKeys.lists() })
			onSuccess()
		},
		onError: (error: Error) => {
			if (error.message.toLowerCase().includes('unique constraint') && error.message.toLowerCase().includes('name')) {
				form.setError('name', { type: 'manual', message: 'A report category with this name already exists.' })
			} else {
				toast.error(error.message || 'An unknown error occurred.')
			}
			console.error('Form submission error:', error)
		},
	})

	async function onSubmit(values: ReportCategoryFormValues) {
		categoryMutation.mutate({ values, categoryId: categoryData?.id })
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className='space-y-6 p-1 pt-4'>
				<FormField
					control={form.control}
					name='name'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Name *</FormLabel>
							<FormControl>
								<Input
									placeholder='e.g., Blood Tests, Imaging'
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name='description'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Textarea
									placeholder='Optional description for the report category'
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
						disabled={categoryMutation.isPending}>
						{categoryMutation.isPending ? 'Saving...' : isEditing ? 'Update Category' : 'Create Category'}
					</Button>
				</div>
			</form>
		</Form>
	)
}

function getInitialFormValues(categoryData?: PrismaReportCategory | null): ReportCategoryFormValues {
	return {
		name: categoryData?.name ?? '',
		description: categoryData?.description ?? null,
	}
}
