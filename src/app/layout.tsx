import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from 'next-themes' // Keep next-themes for theme management
import SessionProvider from '@/components/providers/session-provider' // Import the SessionProvider wrapper
import { TanProviders as QueryProviders } from '@/components/providers/tanstack-provider'
import { Toaster } from 'sonner'
import { NetworkStatusOverlay } from '@/components/NetworkStatusOverlay'

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

export const metadata: Metadata = {
	title: 'PharmPilot',
	description: 'All-in-one solution for your pharmacy needs',
	icons: {
		icon: [
			{ url: '/favicon.ico', type: 'image/x-icon', sizes: 'any' }, // Keep if it's a multi-size .ico
			{ url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
			{ url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
			{ url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
			{ url: '/android-icon-192x192.png', sizes: '192x192', type: 'image/png' },
		],
		apple: [
			{ url: '/apple-icon-57x57.png', sizes: '57x57' },
			{ url: '/apple-icon-60x60.png', sizes: '60x60' },
			{ url: '/apple-icon-72x72.png', sizes: '72x72' },
			{ url: '/apple-icon-76x76.png', sizes: '76x76' },
			{ url: '/apple-icon-114x114.png', sizes: '114x114' },
			{ url: '/apple-icon-120x120.png', sizes: '120x120' },
			{ url: '/apple-icon-144x144.png', sizes: '144x144' },
			{ url: '/apple-icon-152x152.png', sizes: '152x152' },
			{ url: '/apple-icon-180x180.png', sizes: '180x180' },
		],
		shortcut: ['/favicon.ico'],
	},
	metadataBase: new URL('https://pharmpilot.reniyal.dev'),
	manifest: '/manifest.json',
	appleWebApp: {
		title: 'PharmPilot',
		statusBarStyle: 'default',
	},
	applicationName: 'PharmPilot',
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<SessionProvider>
			<html
				lang='en'
				suppressHydrationWarning>
				<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
					<ThemeProvider
						attribute={'class'}
						defaultTheme='system'
						enableSystem>
						<NetworkStatusOverlay />
						{/* The children here will be the content from (main)/layout.tsx or (auth)/layout.tsx */}
						<QueryProviders>{children}</QueryProviders>
						<Toaster />
					</ThemeProvider>
				</body>
			</html>
		</SessionProvider>
	)
}
