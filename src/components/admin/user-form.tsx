'use client'

import { useEffect } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogContent } from '@/components/ui/dialog' // Assuming you use Dialog
import { Role } from '@/generated/prisma' // Adjust path
import { User } from '@/generated/prisma'

const userFormSchema = z.object({
	name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
	email: z.string().email({ message: 'Invalid email address.' }),
	password: z.string().optional(), // Optional for edit, required for create if not provided
	role: z.nativeEnum(Role),
	isActive: z.boolean(),
})

export type UserFormData = z.infer<typeof userFormSchema>

interface UserFormProps {
	user?: User | null // User data for editing, null for creating
	onSubmit: (data: UserFormData, userId?: string) => Promise<void>
	onCancel: () => void
	isLoading: boolean
}

export const UserForm: React.FC<UserFormProps> = ({ user, onSubmit, onCancel, isLoading }) => {
	const {
		register,
		handleSubmit,
		reset,
		control,
		setValue,
		formState: { errors },
	} = useForm<UserFormData>({
		resolver: zodResolver(userFormSchema),
		defaultValues: {
			name: user?.name || '',
			email: user?.email || '',
			password: '',
			role: user?.role || Role.CUSTOMER,
			isActive: user?.isActive === undefined ? true : user.isActive,
		},
	})

	useEffect(() => {
		if (user) {
			reset({
				name: user.name || '',
				email: user.email || '',
				password: '', // Password should not be pre-filled for edit
				role: user.role,
				isActive: user.isActive,
			})
		} else {
			reset({
				name: '',
				email: '',
				password: '',
				role: Role.CUSTOMER,
				isActive: true,
			})
		}
	}, [user, reset])

	const handleFormSubmit: SubmitHandler<UserFormData> = async data => {
		// For create, password is required if not provided in schema (though schema makes it optional)
		if (!user && !data.password) {
			// This should ideally be caught by a refined Zod schema for create vs edit
			alert('Password is required for new users.')
			return
		}
		await onSubmit(data, user?.id)
	}

	return (
		<DialogContent className='sm:max-w-[425px]'>
			<DialogHeader>
				<DialogTitle>{user ? 'Edit User' : 'Create New User'}</DialogTitle>
				<DialogDescription>{user ? 'Update the details of the existing user.' : 'Fill in the details to create a new user.'}</DialogDescription>
			</DialogHeader>
			<form
				onSubmit={handleSubmit(handleFormSubmit)}
				className='space-y-4 py-4'>
				<div>
					<Label htmlFor='name'>Name</Label>
					<Input
						id='name'
						{...register('name')}
					/>
					{errors.name && <p className='text-sm text-red-500'>{errors.name.message}</p>}
				</div>
				<div>
					<Label htmlFor='email'>Email</Label>
					<Input
						id='email'
						type='email'
						{...register('email')}
					/>
					{errors.email && <p className='text-sm text-red-500'>{errors.email.message}</p>}
				</div>
				<div>
					<Label htmlFor='password'>Password</Label>
					<Input
						id='password'
						type='password'
						{...register('password')}
						placeholder={user ? 'Leave blank to keep current password' : 'Enter password'}
					/>
					{errors.password && <p className='text-sm text-red-500'>{errors.password.message}</p>}
				</div>
				<div>
					<Label htmlFor='role'>Role</Label>
					<Select
						onValueChange={value => setValue('role', value as Role)}
						defaultValue={user?.role || Role.CUSTOMER}>
						<SelectTrigger id='role'>
							<SelectValue placeholder='Select a role' />
						</SelectTrigger>
						<SelectContent>
							{Object.values(Role).map(roleValue => (
								<SelectItem
									key={roleValue}
									value={roleValue}>
									{roleValue.charAt(0).toUpperCase() + roleValue.slice(1).toLowerCase().replace('_', ' ')}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errors.role && <p className='text-sm text-red-500'>{errors.role.message}</p>}
				</div>
				<div className='flex items-center space-x-2'>
					<Switch
						id='isActive'
						checked={control._defaultValues.isActive} // Use control for Switch's checked state
						onCheckedChange={checked => setValue('isActive', checked)}
					/>
					<Label htmlFor='isActive'>Active</Label>
				</div>
				<DialogFooter>
					<Button
						type='button'
						variant='outline'
						onClick={onCancel}
						disabled={isLoading}>
						Cancel
					</Button>
					<Button
						type='submit'
						disabled={isLoading}>
						{isLoading ? (user ? 'Saving...' : 'Creating...') : user ? 'Save Changes' : 'Create User'}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	)
}
