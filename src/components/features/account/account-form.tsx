'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { User } from '@/generated/prisma' // Assuming Role is part of User type
import { useState } from 'react'

const accountFormSchema = z
	.object({
		name: z.string().min(2, {
			message: 'Name must be at least 2 characters.',
		}),
		firstName: z.string().min(1, {
			message: 'First name is required.',
		}),
		lastName: z.string().optional(),
		phoneNumber: z.string().optional(),
		address: z.string().optional(),
		email: z.string().email().optional(), // Email will be read-only
		currentPassword: z.string().optional(),
		newPassword: z.string().optional(),
		confirmNewPassword: z.string().optional(),
	})
	.refine(
		data => {
			if (data.newPassword || data.confirmNewPassword || data.currentPassword) {
				// If any password field is filled, all password fields related to change are required
				return !!data.newPassword && !!data.confirmNewPassword && !!data.currentPassword
			}
			return true // No password change attempted
		},
		{
			message: 'To change password, please fill Current Password, New Password, and Confirm New Password.',
			path: ['currentPassword'], // General path, or specific to one of them
		},
	)
	.refine(
		data => {
			if (data.newPassword) {
				return data.newPassword.length >= 6
			}
			return true
		},
		{
			message: 'New password must be at least 6 characters.',
			path: ['newPassword'],
		},
	)
	.refine(data => data.newPassword === data.confirmNewPassword, {
		message: "New passwords don't match.",
		path: ['confirmNewPassword'],
	})

type AccountFormValues = z.infer<typeof accountFormSchema>

interface AccountFormProps {
	userData: Pick<User, 'id' | 'name' | 'email' | 'role' | 'firstName' | 'lastName' | 'phoneNumber' | 'address'>
}

export function AccountForm({ userData }: AccountFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)
	const form = useForm<AccountFormValues>({
		resolver: zodResolver(accountFormSchema),
		defaultValues: {
			name: userData.name || '',
			firstName: userData.firstName || '',
			lastName: userData.lastName || '',
			phoneNumber: userData.phoneNumber || '',
			address: userData.address || '',
			email: userData.email || '', // Email is for display
			currentPassword: '',
			newPassword: '',
			confirmNewPassword: '',
		},
		mode: 'onChange',
	})
	async function onSubmit(data: AccountFormValues) {
		setIsSubmitting(true)
		const payload: any = {
			name: data.name,
			firstName: data.firstName,
			lastName: data.lastName,
			phoneNumber: data.phoneNumber,
			address: data.address,
		}
		if (data.newPassword && data.currentPassword) {
			payload.currentPassword = data.currentPassword
			payload.newPassword = data.newPassword
			payload.confirmNewPassword = data.confirmNewPassword
		}

		try {
			const response = await fetch('/api/account', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Failed to update account.')
			}

			toast.success('Account updated successfully!')
			form.reset({
				...data, // Keep all form data
				currentPassword: '', // Clear password fields
				newPassword: '',
				confirmNewPassword: '',
			})
		} catch (error: any) {
			toast.error(error.message)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className='space-y-8'>
				<Card>
					<CardHeader>
						<CardTitle>Profile Information</CardTitle>
						<CardDescription>Update your personal details.</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<FormField
							control={form.control}
							name='name'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input
											placeholder='Your name'
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name='firstName'
							render={({ field }) => (
								<FormItem>
									<FormLabel>First Name</FormLabel>
									<FormControl>
										<Input
											placeholder='Your first name'
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name='lastName'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Last Name</FormLabel>
									<FormControl>
										<Input
											placeholder='Your last name'
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name='phoneNumber'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Phone Number</FormLabel>
									<FormControl>
										<Input
											placeholder='Your phone number'
											{...field}
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
										<Input
											placeholder='Your address'
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
											placeholder='Your email'
											{...field}
											readOnly
											className='cursor-not-allowed bg-muted'
										/>
									</FormControl>
									<FormDescription>Email address cannot be changed here.</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormItem>
							<FormLabel>Role</FormLabel>
							<Input
								value={userData.role}
								readOnly
								className='cursor-not-allowed bg-muted'
							/>
						</FormItem>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Change Password</CardTitle>
						<CardDescription>Leave blank if you do not want to change your password.</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<FormField
							control={form.control}
							name='currentPassword'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Current Password</FormLabel>
									<FormControl>
										<Input
											type='password'
											placeholder='Current Password'
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name='newPassword'
							render={({ field }) => (
								<FormItem>
									<FormLabel>New Password</FormLabel>
									<FormControl>
										<Input
											type='password'
											placeholder='New Password'
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name='confirmNewPassword'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Confirm New Password</FormLabel>
									<FormControl>
										<Input
											type='password'
											placeholder='Confirm New Password'
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</CardContent>
					<CardFooter>
						<Button
							type='submit'
							disabled={isSubmitting || !form.formState.isDirty}>
							{isSubmitting ? 'Saving...' : 'Save Changes'}
						</Button>
					</CardFooter>
				</Card>
			</form>
		</Form>
	)
}
