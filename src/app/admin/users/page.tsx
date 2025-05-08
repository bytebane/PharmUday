'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserDataTable } from './data-table'
import { getColumns, UserRow } from './columns'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { UserForm, UserFormData } from '@/components/admin/user-form'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner' // Import toast from sonner
import { User } from '@/generated/prisma' // Adjust path

export default function UsersPage() {
	const [users, setUsers] = useState<UserRow[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isFormOpen, setIsFormOpen] = useState(false)
	const [editingUser, setEditingUser] = useState<User | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [userToDelete, setUserToDelete] = useState<string | null>(null)

	const fetchUsers = useCallback(async () => {
		setIsLoading(true)
		try {
			const response = await fetch('/api/admin/users')
			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Failed to fetch users')
			}
			const data = (await response.json()) as User[]
			setUsers(data.map(u => ({ ...u, name: u.name ?? 'N/A' }))) // Ensure name is not null for UserRow
		} catch (error: any) {
			toast.error('Error fetching users', { description: error.message })
			console.error('Failed to fetch users:', error)
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchUsers()
	}, [fetchUsers])

	const handleFormSubmit = async (data: UserFormData, userId?: string) => {
		setIsSubmitting(true)
		const url = userId ? `/api/admin/users/${userId}` : '/api/admin/users'
		const method = userId ? 'PUT' : 'POST'

		// Remove password from data if it's empty (for updates)
		const payload = { ...data }
		if (userId && !data.password) {
			delete payload.password
		}

		try {
			const response = await fetch(url, {
				method: method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})
			const result = await response.json()
			if (!response.ok) {
				throw new Error(result.message || `Failed to ${userId ? 'update' : 'create'} user`)
			}
			toast.success(`User ${userId ? 'updated' : 'created'} successfully`)
			setIsFormOpen(false)
			setEditingUser(null)
			fetchUsers() // Refresh the list
		} catch (error: any) {
			toast.error(`Error ${userId ? 'updating' : 'creating'} user`, { description: error.message })
			console.error(`Failed to ${userId ? 'update' : 'create'} user:`, error)
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleEditUser = (user: UserRow) => {
		const fullUser = users.find(u => u.id === user.id) // Get full user object if UserRow is partial
		setEditingUser(fullUser || (user as User)) // Cast if UserRow matches User sufficiently for the form
		setIsFormOpen(true)
	}

	const handleDeleteUser = async () => {
		if (!userToDelete) return
		setIsSubmitting(true)
		try {
			const response = await fetch(`/api/admin/users/${userToDelete}`, { method: 'DELETE' })
			const result = await response.json()
			if (!response.ok) {
				throw new Error(result.message || 'Failed to delete user')
			}
			toast.success('User deleted successfully')
			setUserToDelete(null)
			fetchUsers() // Refresh the list
		} catch (error: any) {
			toast.error('Error deleting user', { description: error.message })
			console.error('Failed to delete user:', error)
		} finally {
			setIsSubmitting(false)
		}
	}

	const columns = getColumns(handleEditUser, userId => setUserToDelete(userId))

	if (isLoading) {
		return <div className='container mx-auto py-10'>Loading users...</div> // Replace with a proper skeleton loader
	}

	return (
		<div className='container mx-auto py-10'>
			<div className='flex justify-between items-center mb-6'>
				<h1 className='text-3xl font-bold'>User Management</h1>
				<Dialog
					open={isFormOpen}
					onOpenChange={isOpen => {
						setIsFormOpen(isOpen)
						if (!isOpen) setEditingUser(null)
					}}>
					<DialogTrigger asChild>
						<Button>
							<PlusCircle className='mr-2 h-4 w-4' /> Add New User
						</Button>
					</DialogTrigger>
					<UserForm
						user={editingUser}
						onSubmit={handleFormSubmit}
						onCancel={() => {
							setIsFormOpen(false)
							setEditingUser(null)
						}}
						isLoading={isSubmitting}
					/>
				</Dialog>
			</div>
			<UserDataTable
				columns={columns}
				data={users}
			/>
			<AlertDialog
				open={!!userToDelete}
				onOpenChange={() => setUserToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
						<AlertDialogDescription>This action cannot be undone. This will permanently delete the user account.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteUser}
							disabled={isSubmitting}
							className='bg-red-600 hover:bg-red-700'>
							{isSubmitting ? 'Deleting...' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
