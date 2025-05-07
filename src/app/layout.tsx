import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'

import { Separator } from '@radix-ui/react-separator'
import { ThemeProvider } from 'next-themes' // Keep next-themes for theme management
import SessionProvider from '@/components/providers/session-provider' // Import the SessionProvider wrapper
import { TanProviders as QueryProviders } from '@/components/providers/tanstack-provider'
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs'
import { Toaster } from 'sonner'

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
		icon: '/favicon.ico',
		shortcut: '/favicon.ico',
		apple: '/favicon.ico',
	},
	// manifest: '/site.webmanifest',
	metadataBase: new URL('https://pharmpilot.reniyal.dev'),
	viewport: {
		width: 'device-width',
		initialScale: 1,
		maximumScale: 1,
		userScalable: false,
	},
	themeColor: [
		{ media: '(prefers-color-scheme: dark)', color: '#000000' },
		{ media: '(prefers-color-scheme: light)', color: '#ffffff' },
	],
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
				{/* SessionProvider needs to wrap ThemeProvider if theme depends on session, or vice versa. Usually wrapping ThemeProvider is fine. */}

				{/* Add any global query settings here */}
				<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
					<ThemeProvider
						attribute={'class'}
						defaultTheme='system'
						enableSystem>
						<SidebarProvider>
							<AppSidebar />
							<SidebarInset>
								<header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
									<div className='flex items-center gap-2 px-4'>
										<SidebarTrigger className='-ml-1' />
										<Separator
											orientation='vertical'
											className='mr-2 data-[orientation=vertical]:h-4'
										/>
										<PageBreadcrumbs />
									</div>
								</header>
								<QueryProviders>{children}</QueryProviders>
								<Toaster />
							</SidebarInset>
						</SidebarProvider>
					</ThemeProvider>
				</body>
			</html>
		</SessionProvider>
	)
}
