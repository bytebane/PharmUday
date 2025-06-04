'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { supplierSchema } from '@/lib/validations/supplier' // Adjust path as needed
import { Supplier as PrismaSupplier } from '@/generated/prisma'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
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

export function SupplierForm({ supplierData, onSuccess }: SupplierFormProps) {
	const isEditing = !!supplierData
	const queryClient = useQueryClient()

	const [createUserAccount, setCreateUserAccount] = useState(false)
	const [defaultPassword, setDefaultPassword] = useState('changeme123')

	const form = useForm<SupplierFormValues>({
		resolver: zodResolver(supplierSchema),
		defaultValues: getInitialFormValues(supplierData),
	})

	useEffect(() => {
		form.reset(getInitialFormValues(supplierData))
	}, [supplierData, form])

	const supplierMutation = useMutation({
		mutationFn: async ({ values, supplierId }: { values: SupplierFormValues; supplierId?: string }) => {
			const isEditing = !!supplierId
			const url = isEditing ? `/api/suppliers/${supplierId}` : '/api/suppliers'
			const method = isEditing ? 'PATCH' : 'POST'
			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...values,
					createUserAccount: createUserAccount,
					defaultPassword: createUserAccount ? defaultPassword : undefined,
				}),
			})
			const result = await response.json()
			if (!response.ok) throw new Error(result?.message || result?.error || `Failed to ${isEditing ? 'update' : 'create'} supplier`)
			return result as PrismaSupplier
		},
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
								<PhoneInput
									placeholder='Enter 10-digit mobile number'
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

				{/* User account creation section - for new suppliers or existing suppliers without user account */}
				{(!isEditing || (isEditing && !supplierData?.userId)) && (
					<div className='space-y-2'>
						<label className='flex items-center gap-2'>
							<input
								type='checkbox'
								checked={createUserAccount}
								onChange={e => setCreateUserAccount(e.target.checked)}
							/>
							{isEditing ? 'Create user account for login' : 'Create user account for login'}
						</label>
						{createUserAccount && (
							<div>
								<label className='block text-sm font-medium'>
									Default Password:
									<input
										type='text'
										className='ml-2 border rounded px-2 py-1'
										value={defaultPassword}
										onChange={e => setDefaultPassword(e.target.value)}
									/>
								</label>
							</div>
						)}
					</div>
				)}

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
