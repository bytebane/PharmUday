'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { supplierSchema } from '@/lib/validations/supplier' // Adjust path as needed
import { Supplier as PrismaSupplier } from '@/generated/prisma'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea' // If using address field
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

interface SupplierFormProps {
	supplierData?: PrismaSupplier | null
	onSuccess: () => void
}

type SupplierFormValues = z.infer<typeof supplierSchema>

const supplierQueryKeys = {
	all: ['suppliers'] as const,
	lists: () => [...supplierQueryKeys.all, 'list'] as const,
}

async function saveSupplierAPI(payload: { values: SupplierFormValues; supplierId?: string }): Promise<PrismaSupplier> {
	const { values, supplierId } = payload
	const isEditing = !!supplierId
	const url = isEditing ? `/api/suppliers/${supplierId}` : '/api/suppliers'
	const method = isEditing ? 'PATCH' : 'POST'

	// The `values` should already match the supplierSchema structure
	const response = await fetch(url, {
		method: method,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(values),
	})

	const result = await response.json()

	if (!response.ok) {
		const errorMessage = result?.message || result?.error || `Failed to ${isEditing ? 'update' : 'create'} supplier`
		throw new Error(errorMessage)
	}
	return result as PrismaSupplier
}

export function SupplierForm({ supplierData, onSuccess }: SupplierFormProps) {
	const isEditing = !!supplierData
	const queryClient = useQueryClient()

	const form = useForm<SupplierFormValues>({
		resolver: zodResolver(supplierSchema),
		defaultValues: getInitialFormValues(supplierData),
	})

	useEffect(() => {
		form.reset(getInitialFormValues(supplierData))
	}, [supplierData, form])

	const supplierMutation = useMutation({
		mutationFn: saveSupplierAPI,
		onSuccess: () => {
			toast.success(`Supplier ${isEditing ? 'updated' : 'created'} successfully!`)
			queryClient.invalidateQueries({ queryKey: supplierQueryKeys.lists() })
			onSuccess()
		},
		onError: (error: Error) => {
			// Example: Check for unique constraint on name or email if your API returns a specific error
			if (error.message.toLowerCase().includes('unique constraint') && error.message.toLowerCase().includes('name')) {
				form.setError('name', { type: 'manual', message: 'A supplier with this name already exists.' })
			} else if (error.message.toLowerCase().includes('unique constraint') && error.message.toLowerCase().includes('email')) {
				form.setError('email', { type: 'manual', message: 'A supplier with this email already exists.' })
			} else {
				toast.error(error instanceof Error ? error.message : 'An unknown error occurred.')
			}
			console.error('Form submission error:', error)
		},
	})

	async function onSubmit(values: SupplierFormValues) {
		supplierMutation.mutate({ values, supplierId: supplierData?.id })
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
									placeholder='e.g., MediSupply Inc.'
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name='contactPerson'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Contact Person</FormLabel>
							<FormControl>
								<Input
									placeholder='e.g., Jane Doe'
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
					name='email'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email</FormLabel>
							<FormControl>
								<Input
									type='email'
									placeholder='supplier@example.com'
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
					name='phone'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Phone</FormLabel>
							<FormControl>
								<Input
									type='tel'
									placeholder='e.g., 555-123-4567'
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
					name='address'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Address</FormLabel>
							<FormControl>
								<Textarea
									placeholder='e.g., 123 Supplier St, City, Country'
									rows={3}
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
						disabled={supplierMutation.isPending}>
						{supplierMutation.isPending ? 'Saving...' : isEditing ? 'Update Supplier' : 'Create Supplier'}
					</Button>
				</div>
			</form>
		</Form>
	)
}

function getInitialFormValues(supplierData?: PrismaSupplier | null): SupplierFormValues {
	return {
		name: supplierData?.name ?? '',
		// Map from Prisma's camelCase to schema's snake_case if they differ
		contactPerson: supplierData?.contactPerson ?? null,
		email: supplierData?.email ?? null,
		phone: supplierData?.phone ?? null,
		address: supplierData?.address ?? null,
	}
}
