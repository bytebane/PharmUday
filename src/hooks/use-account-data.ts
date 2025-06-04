import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { User } from '@/generated/prisma' // Assuming Role is part of User type

export type UserAccountData = Pick<User, 'id' | 'name' | 'email' | 'role' | 'firstName' | 'lastName' | 'phoneNumber' | 'address'>

export function useAccountData() {
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
			setIsLoading(false)
			setUserData(null) // Clear user data if not authenticated
			// setError('You must be logged in to view this page.'); // Optionally set error here
		} else if (status === 'loading') {
			setIsLoading(true) // Ensure loading is true while session is resolving
		}
	}, [status, session]) // Add session to dependency array if its change should trigger re-fetch

	return { userData, isLoading, error }
}
