'use client' // This needs to be a client component

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import React from 'react'

interface CustomSessionProviderProps {
	children: React.ReactNode
	// You can add other props here if needed, like an initial session
	// session?: Session | null; // Example
}

export default function SessionProvider({ children }: CustomSessionProviderProps) {
	// You can optionally pass a session prop here if needed for initial state,
	// but NextAuth usually handles it automatically.
	return (
		<NextAuthSessionProvider
			refetchOnWindowFocus={false} // Prevent refetch on window focus
			refetchInterval={5 * 60} // Refetch session every 5 minutes (300 seconds)
		>
			{children}
		</NextAuthSessionProvider>
	)
}
