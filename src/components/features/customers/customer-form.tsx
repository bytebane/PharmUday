'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { customerSchema } from '@/lib/validations/customer'
import { Customer as PrismaCustomer } from '@/generated/prisma'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

interface CustomerFormProps {
	customerData?: PrismaCustomer | null
	onSuccess: (newCustomer: PrismaCustomer) => void // Expect the new customer data
}

type CustomerFormValues = z.infer<typeof customerSchema>

const customerQueryKeys = {
	all: ['customers'] as const,
	lists: () => [...customerQueryKeys.all, 'list'] as const,
}

export function CustomerForm({ customerData, onSuccess }: CustomerFormProps) {
	const isEditing = !!customerData
	const queryClient = useQueryClient()

	const [createUserAccount, setCreateUserAccount] = useState(false)
	const [defaultPassword, setDefaultPassword] = useState('changeme123')

	const form = useForm<CustomerFormValues>({
		resolver: zodResolver(customerSchema),
		defaultValues: getInitialFormValues(customerData),
	})

	useEffect(() => {
		form.reset(getInitialFormValues(customerData))
	}, [customerData, form])

	const customerMutation = useMutation({
		mutationFn: async ({ values, customerId }: { values: CustomerFormValues; customerId?: string }) => {
			const isEditing = !!customerId
			const url = isEditing ? `/api/customers/${customerId}` : '/api/customers'
			const method = isEditing ? 'PATCH' : 'POST'
			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...values,
					createUserAccount: !isEditing && createUserAccount, // Only allow on create
					defaultPassword: !isEditing && createUserAccount ? defaultPassword : undefined,
				}),
			})
			const result = await response.json()
			if (!response.ok) throw new Error(result?.message || result?.error || `Failed to ${isEditing ? 'update' : 'create'} customer`)
			return result as PrismaCustomer
		},
		onSuccess: data => {
			toast.success(`Customer ${isEditing ? 'updated' : 'created'} successfully!`)
			queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() })
			onSuccess(data)
		},
		onError: (error: Error) => {
			if (error.message.toLowerCase().includes('email already exists')) {
				form.setError('email', { type: 'manual', message: error.message })
			} else {
				toast.error(error.message || 'An unknown error occurred.')
			}
			console.error('Customer form submission error:', error)
		},
	})

	async function onSubmit(values: CustomerFormValues) {
		customerMutation.mutate({ values, customerId: customerData?.id })
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
									placeholder="Customer's full name"
									{...field}
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
									placeholder='customer@example.com'
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
									placeholder='Full address'
									{...field}
									value={field.value ?? ''}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{/* Add userId field if you want to link to an existing User account from this form */}

				{/* Create user account section */}
				{!isEditing && (
					<div className='space-y-2'>
						<label className='flex items-center gap-2'>
							<input
								type='checkbox'
								checked={createUserAccount}
								onChange={e => setCreateUserAccount(e.target.checked)}
							/>
							Create user account for login
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
						disabled={customerMutation.isPending}>
						{customerMutation.isPending ? 'Saving...' : isEditing ? 'Update Customer' : 'Create Customer'}
					</Button>
				</div>
			</form>
		</Form>
	)
}

function getInitialFormValues(customerData?: PrismaCustomer | null): CustomerFormValues {
	return {
		name: customerData?.name ?? '',
		email: customerData?.email ?? null,
		phone: customerData?.phone ?? null,
		address: customerData?.address ?? null,
		userId: customerData?.userId ?? null,
	}
}
