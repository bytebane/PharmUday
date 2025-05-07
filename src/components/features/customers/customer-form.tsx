'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { customerSchema } from '@/lib/validations/customer'
import { Customer as PrismaCustomer } from '@/generated/prisma'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

async function saveCustomerAPI(payload: { values: CustomerFormValues; customerId?: string }): Promise<PrismaCustomer> {
	const { values, customerId } = payload
	const isEditing = !!customerId
	const url = isEditing ? `/api/customers/${customerId}` : '/api/customers'
	const method = isEditing ? 'PATCH' : 'POST'

	const response = await fetch(url, {
		method: method,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(values),
	})

	const result = await response.json()

	if (!response.ok) {
		const errorMessage = result?.message || result?.error || `Failed to ${isEditing ? 'update' : 'create'} customer`
		throw new Error(errorMessage)
	}
	return result as PrismaCustomer
}

export function CustomerForm({ customerData, onSuccess }: CustomerFormProps) {
	const isEditing = !!customerData
	const queryClient = useQueryClient()

	const form = useForm<CustomerFormValues>({
		resolver: zodResolver(customerSchema),
		defaultValues: getInitialFormValues(customerData),
	})

	useEffect(() => {
		form.reset(getInitialFormValues(customerData))
	}, [customerData, form])

	const customerMutation = useMutation({
		mutationFn: saveCustomerAPI,
		onSuccess: data => {
			// 'data' here is the newly created/updated customer
			toast.success(`Customer ${isEditing ? 'updated' : 'created'} successfully!`)
			queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() })
			// queryClient.invalidateQueries({ queryKey: ['sales', 'newSaleFormCustomers'] }) // This specific key might not be needed if NewSaleForm refetches
			onSuccess(data) // Pass the new customer data back
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
								<Input
									type='tel'
									placeholder='(555) 123-4567'
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
