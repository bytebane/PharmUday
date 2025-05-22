'use client'

import { useEffect } from 'react' // For form reset
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { categorySchema } from '@/lib/validations/category' // Adjust path as needed
import { Category as PrismaCategory } from '@/generated/prisma'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CategoryFormProps {
	categoryData?: PrismaCategory | null
	allCategories: PrismaCategory[] // Needed for parent category dropdown
	onSuccess: () => void
}

type CategoryFormValues = z.infer<typeof categorySchema>

// Define query keys (can be imported from a central place if shared)
const categoryQueryKeys = {
	all: ['categories'] as const,
	lists: () => [...categoryQueryKeys.all, 'list'] as const,
}

async function saveCategoryAPI(payload: { values: CategoryFormValues; categoryId?: string }): Promise<PrismaCategory> {
	const { values, categoryId } = payload
	const isEditing = !!categoryId
	const url = isEditing ? `/api/inv-categories/${categoryId}` : '/api/inv-categories'
	const method = isEditing ? 'PATCH' : 'POST'

	const apiPayload = {
		...values,
		parentCategoryId: values.parentCategoryId || null, // Ensure null if empty
	}

	const response = await fetch(url, {
		method: method,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(apiPayload),
	})

	const result = await response.json()

	if (!response.ok) {
		const errorMessage = result?.message || result?.error || `Failed to ${isEditing ? 'update' : 'create'} category`
		throw new Error(errorMessage)
	}
	return result as PrismaCategory
}

export function CategoryForm({ categoryData, allCategories, onSuccess }: CategoryFormProps) {
	const isEditing = !!categoryData
	const queryClient = useQueryClient()

	const form = useForm<CategoryFormValues>({
		resolver: zodResolver(categorySchema),
		defaultValues: getInitialFormValues(categoryData),
	})

	useEffect(() => {
		form.reset(getInitialFormValues(categoryData))
	}, [categoryData, form])

	const categoryMutation = useMutation({
		mutationFn: saveCategoryAPI,
		onSuccess: () => {
			toast.success(`Category ${isEditing ? 'updated' : 'created'} successfully!`)
			queryClient.invalidateQueries({ queryKey: categoryQueryKeys.lists() })
			onSuccess()
		},
		onError: error => {
			if (error instanceof Error && error.message.toLowerCase().includes('unique constraint') && error.message.toLowerCase().includes('name')) {
				form.setError('name', { type: 'manual', message: 'A category with this name already exists.' })
			} else {
				toast.error(error instanceof Error ? error.message : 'An unknown error occurred.')
			}
			console.error('Form submission error:', error)
		},
	})

	async function onSubmit(values: CategoryFormValues) {
		categoryMutation.mutate({ values, categoryId: categoryData?.id })
	}

	// Filter out the current category and its descendants for the parent dropdown
	const availableParentCategories = allCategories.filter(cat => cat.id !== categoryData?.id /* Add descendant check if needed */)

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
									placeholder='e.g., Pain Relief'
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
									placeholder='Optional description...'
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
					name='parentCategoryId'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Parent Category</FormLabel>
							<Select
								onValueChange={value => field.onChange(value === 'none' ? null : value)}
								value={field.value ?? 'none'}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Select a parent category (optional)' />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value='none'>-- None --</SelectItem>
									{availableParentCategories.map(category => (
										<SelectItem
											key={category.id}
											value={category.id}>
											{category.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
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

function getInitialFormValues(categoryData?: PrismaCategory | null): CategoryFormValues {
	return {
		name: categoryData?.name ?? '',
		description: categoryData?.description ?? null,
		parentCategoryId: categoryData?.parentCategoryId ?? null,
	}
}
