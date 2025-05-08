'use client' // This page uses client-side hooks for session and data fetching

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { AccountForm } from '@/components/features/account/account-form'
import { Skeleton } from '@/components/ui/skeleton'
import { User } from '@/generated/prisma' // Assuming Role is part of User type

type UserAccountData = Pick<User, 'id' | 'name' | 'email' | 'role'>

export default function AccountPage() {
	const { data: session, status } = useSession()
	const [userData, setUserData] = useState<UserAccountData | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (status === 'authenticated') {
			const fetchUserData = async () => {
				setIsLoading(true)
				setError(null)
				try {
					const response = await fetch('/api/account')
					if (!response.ok) {
						const errorData = await response.json()
						throw new Error(errorData.message || 'Failed to fetch account details.')
					}
					const data: UserAccountData = await response.json()
					setUserData(data)
				} catch (err: any) {
					setError(err.message)
				} finally {
					setIsLoading(false)
				}
			}
			fetchUserData()
		} else if (status === 'unauthenticated') {
			// Optionally redirect or show a message if not authenticated
			// For now, we'll just stop loading and show nothing or an error
			setIsLoading(false)
			setError('You must be logged in to view this page.')
		}
	}, [status])

	if (status === 'loading' || (isLoading && status === 'authenticated')) {
		return (
			<div className='container mx-auto p-4 md:p-8'>
				<Skeleton className='h-96 w-full' />
			</div>
		)
	}

	if (error)
		return (
			<div className='container mx-auto p-4 md:p-8'>
				<p className='text-destructive'>{error}</p>
			</div>
		)
	if (!userData)
		return (
			<div className='container mx-auto p-4 md:p-8'>
				<p>No user data found.</p>
			</div>
		)

	return (
		<div className='container mx-auto p-4 md:p-8'>
			<AccountForm userData={userData} />
		</div>
	)
}
