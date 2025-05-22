'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { LayoutDashboard, Box, Moon, Sun, ChevronsUpDown, FileChartColumnIncreasing, FolderKanban, Users as UsersIcon, Loader2, LucideIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Role } from '@/generated/prisma'
import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import { StoreSwitcher } from '@/components/store-switcher'
import { Skeleton } from '@/components/ui/skeleton'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenuButton, SidebarMenuItem, SidebarRail } from '@/components/ui/sidebar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import Image from 'next/image'

// This is sample data.
const data = {
	stores: [
		{
			name: 'PharmPilot',
			logo: () => (
				<Image
					src='/ppilot.png'
					alt='PharmPilot'
					className='h-6 w-6'
					width={64}
					height={64}
				/>
			),
			plan: 'Enterprise',
		},
		// {
		// 	name: 'Acme Corp.',
		// 	logo: AudioWaveform,
		// 	plan: 'Startup',
		// },
		// {
		// 	name: 'Evil Corp.',
		// 	logo: Command,
		// 	plan: 'Free',
		// },
	],
	navMainBase: [
		// Renamed to avoid conflict if you want to compute navMain dynamically
		{
			title: 'Dashboard',
			url: '/',
			icon: LayoutDashboard,
			isActive: true,
		},
		{
			title: 'Inventory',
			url: '#',
			icon: Box,
			isActive: true,
			items: [
				{
					title: 'Items',
					url: '/inventory/items',
				},
				{
					title: 'Categories',
					url: '/inventory/categories',
					requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN, Role.PHARMACIST] as Role[], // Only for Admin and Super Admin
				},
				{
					title: 'Suppliers',
					url: '/inventory/suppliers',
					requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN, Role.PHARMACIST] as Role[], // Only for Admin and Super Admin
				},
			],
		},
		{
			title: 'Reports',
			url: '#',
			icon: FolderKanban,
			isActive: true,
			items: [
				{
					title: 'Reports',

					url: '/reports',
				},
				{
					title: 'Categories',
					url: '/reports/categories',
					requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN, Role.PHARMACIST] as Role[], // Only for Admin and Super Admin
				},
			],
		},
		{
			title: 'Sales',
			url: '#',
			icon: FileChartColumnIncreasing,
			isActive: true,
			requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN, Role.PHARMACIST] as Role[], // Only for Admin and Super Admin
			items: [
				{
					title: 'New Sale',
					url: '/sales',
				},
				{
					title: 'Sales History',
					url: '/sales/history',
				},
				{
					title: 'Customers',
					url: '/customers',
				},
			],
		},
		{
			title: 'Users',
			url: '/admin/users',
			icon: UsersIcon,
			requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN] as Role[], // Only for Admin and Super Admin
		},
		{
			title: 'My Orders',
			url: '/orders',
			icon: UsersIcon,
			requiredRoles: [Role.CUSTOMER] as Role[], // Only for Customer
		},
		// {
		// 	title: 'Settings',
		// 	url: '#',
		// 	icon: Settings,
		// 	isActive: true,
		// },
	],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { data: session, status } = useSession() // Get session data and status
	const { theme, setTheme } = useTheme() // Get theme state and setter
	const router = useRouter()
	const pathname = usePathname()
	const [isNavigating, startTransition] = React.useTransition()
	const [navigatingTo, setNavigatingTo] = React.useState<string | null>(null)

	// Define user data based on session or provide defaults/loading state
	const userData = {
		name: session?.user?.name ?? 'User',
		email: session?.user?.email ?? 'Loading...',
		// Use session image if available, otherwise fallback or leave empty
		avatar: session?.user?.image ?? '', // Auth.js uses 'image' by default
	}

	const handleNavigation = React.useCallback(
		(url: string) => {
			if (pathname === url || url === '#') return // Don't navigate if already on the page or it's a placeholder

			setNavigatingTo(url)
			startTransition(() => {
				router.push(url)
			})
		},
		[pathname, router, startTransition],
	)

	React.useEffect(() => {
		// Clear navigatingTo when the actual pathname changes (navigation completes)
		// or when isNavigating becomes false (transition ended, possibly before pathname update if error)
		if (navigatingTo && (pathname === navigatingTo || !isNavigating)) {
			setNavigatingTo(null)
		}
	}, [pathname, navigatingTo, isNavigating])

	// Filter nav items based on user role
	const filteredNavMain = React.useMemo(() => {
		if (!session?.user?.role) return [] // Or return a default set for unauthenticated/loading
		const userRole = session.user.role

		type NavItem = {
			title: string
			url: string
			icon?: LucideIcon
			isActive?: boolean
			requiredRoles?: Role[]
			items?: NavItem[]
			iconClassName?: string
			onClick?: () => void
			disabled?: boolean
		}

		const processItems = (items: NavItem[]): NavItem[] => {
			return items
				.filter(item => {
					return !item.requiredRoles || item.requiredRoles.includes(userRole as Role)
				})
				.map(item => {
					const isCurrentNavigationTarget = isNavigating && navigatingTo === item.url
					const actualIcon = isCurrentNavigationTarget ? Loader2 : item.icon
					const iconClassName = isCurrentNavigationTarget ? 'animate-spin' : ''
					return { ...item, icon: actualIcon, iconClassName, onClick: () => handleNavigation(item.url), disabled: isCurrentNavigationTarget, items: item.items ? processItems(item.items) : undefined, isActive: item.url !== '#' && pathname.startsWith(item.url) }
				})
		}
		return processItems(data.navMainBase)
	}, [session?.user?.role, pathname, handleNavigation, isNavigating, navigatingTo])

	// Optional: Show skeleton while loading session
	if (status === 'loading') {
		return <SidebarSkeleton {...props} /> // Use a skeleton component for loading
	}

	return (
		<Sidebar
			collapsible='icon'
			{...props}>
			<SidebarHeader>
				<StoreSwitcher teams={data.stores} />
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={filteredNavMain} />
			</SidebarContent>
			<SidebarFooter>
				{/* Theme Switcher integrated as a SidebarMenuItem */}
				<SidebarMenuItem className='list-none'>
					{' '}
					{/* Add list-none to remove marker */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size='lg'
								className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'>
								{/* Show Sun or Moon based on current theme */}
								{theme === 'dark' ? <Moon className='size-4' /> : <Sun className='size-4' />}
								{/* Display full theme name */}
								<span className='flex-1 text-left text-sm'>{theme === 'light' ? 'Light Theme' : theme === 'dark' ? 'Dark Theme' : 'System Theme'}</span>
								<ChevronsUpDown className='ml-auto size-4' />
							</SidebarMenuButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className='w-(--radix-dropdown-menu-trigger-width) min-w-32 rounded-lg' // Adjusted width
							side={'right'} // Keep consistent side
							align='end'
							sideOffset={4}>
							{/* Theme options */}
							<DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
				{/* Pass dynamic user data to NavUser */}
				<NavUser user={userData} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}

// Optional: Skeleton component for loading state
function SidebarSkeleton({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar
			collapsible='icon'
			{...props}>
			<SidebarHeader>
				<Skeleton className='h-10 w-full' /> {/* Skeleton for StoreSwitcher */}
			</SidebarHeader>
			<SidebarContent>
				<div className='flex flex-col gap-2 p-2'>
					{[...Array(5)].map((_, i) => (
						<Skeleton
							key={i}
							className='h-10 w-full'
						/> // Skeleton for NavMain items
					))}
				</div>
			</SidebarContent>
			<SidebarFooter>
				<Skeleton className='h-[58px] w-full' /> {/* Skeleton for Theme Toggle Item */}
				<Skeleton className='h-[58px] w-full' /> {/* Skeleton for NavUser */}
			</SidebarFooter>
		</Sidebar>
	)
}
