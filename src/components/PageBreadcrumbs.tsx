'use client'

import { usePathname } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'

function getTitleFromPathname(pathname: string): string {
	if (pathname === '/') return 'Dashboard' // Or your home page title
	if (pathname.startsWith('/users')) return 'Users'
	if (pathname.startsWith('/settings')) return 'Settings'
	if (pathname.startsWith('/data-fetching')) return 'Data Fetching' // Example
	// Add more mappings for your routes here

	// Fallback for dynamic routes or unmapped paths
	const segments = pathname.split('/').filter(Boolean)
	if (segments.length > 0) {
		const lastSegment = segments[segments.length - 1]
		// Capitalize first letter
		return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)
	}

	return 'Page' // Default fallback
}

export function PageBreadcrumbs() {
	const pathname = usePathname()
	const currentPageTitle = getTitleFromPathname(pathname)

	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem className='hidden md:block'>
					<BreadcrumbLink href='/'>PharmPilot</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator className='hidden md:block' />
				<BreadcrumbItem>
					<BreadcrumbPage>{currentPageTitle}</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}
