import { useSession, signOut } from 'next-auth/react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function useRefreshToken() {
	const SESSION_REFRESH_INTERVAL = Number(process.env.SESSION_REFRESH_INTERVAL) || 14 * 60 * 1000 //if null 14 mins
	const { data: session, update } = useSession()
	const router = useRouter()

	useEffect(() => {
		if (!session?.refreshToken || !session?.deviceId) return

		// Refresh token 14 minutes before expiration (1 minute before JWT expires)
		const refreshInterval = setInterval(
			async () => {
				try {
					const response = await fetch('/api/auth/refresh', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
					})

					if (!response.ok) {
						const errorData = await response.json()
						throw new Error(errorData.error || 'Failed to refresh token')
					}

					const data = await response.json()
					await update(data) // Update the session with new data
				} catch (error) {
					console.error('Error refreshing token:', error)
					// Show error message
					toast.error('Your session has expired. Please log in again.')
					// Sign out the user
					await signOut({
						redirect: false,
						callbackUrl: '/login',
					})
					// Redirect to login page
					router.push('/login')
				}
			},
			SESSION_REFRESH_INTERVAL,
			// 30 * 1000, // 30 seconds for testing\
		)

		return () => clearInterval(refreshInterval)
	}, [session?.refreshToken, session?.deviceId, update, router])
}
