import React from 'react'

export default function AuthLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return <>{children}</> // Minimal layout, just render children
}
