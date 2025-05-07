'use client' // This needs to be a client component

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import React from 'react'

export default function SessionProvider({ children }: { children: React.ReactNode }) {
	// You can optionally pass a session prop here if needed for initial state,
	// but NextAuth usually handles it automatically.
	return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
