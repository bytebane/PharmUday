'use client' // This page uses client-side hooks for session and data fetching

import { useSession } from 'next-auth/react'
import { AccountForm } from '@/components/features/account/account-form'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccountData } from '@/hooks/use-account-data' // New custom hook

export default function AccountPage() {
	const { status: sessionStatus } = useSession()
	const { userData, isLoading, error } = useAccountData()

	// Display loading skeleton if session is loading OR if account data is loading while authenticated
	if (sessionStatus === 'loading' || (isLoading && sessionStatus === 'authenticated')) {
		return (
			<div className='container mx-auto p-4 md:p-8'>
				<Skeleton className='h-96 w-full' />
			</div>
		)
	}

	// If session is unauthenticated, the hook might set an error or userData to null.
	// You can also explicitly check sessionStatus here for a more direct message.
	if (sessionStatus === 'unauthenticated') {
		return (
			<div className='container mx-auto p-4 md:p-8'>
				<p className='text-destructive'>You must be logged in to view this page.</p>
			</div>
		)
	}

	if (error) {
		return (
			<div className='container mx-auto p-4 md:p-8'>
				<p className='text-destructive'>{error}</p>
			</div>
		)
	}
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
