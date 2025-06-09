import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

export function useRefreshToken() {
	const { data: session, update } = useSession()

	useEffect(() => {
		if (!session?.refreshToken) return

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
						throw new Error('Failed to refresh token')
					}

					const data = await response.json()
					await update(data) // Update the session with new data
				} catch (error) {
					console.error('Error refreshing token:', error)
				}
			},
			30 * 1000,
			// 14 * 60 * 1000,
		) // 14 minutes

		return () => clearInterval(refreshInterval)
	}, [session?.refreshToken, update])
}
