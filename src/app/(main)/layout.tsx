import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator' // Corrected import if it's from your ui dir
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs'
import React from 'react'

export default function MainLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		// SidebarProvider wraps the main content area that includes the sidebar
		<SidebarProvider>
			<AppSidebar />
			{/* SidebarInset is the main content area that sits next to the sidebar */}
			<SidebarInset>
				{/* Header for breadcrumbs and sidebar trigger */}
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
				{children} {/* This is where the page content (e.g., DashboardPage, ItemList) will render */}
			</SidebarInset>
		</SidebarProvider>
	)
}
