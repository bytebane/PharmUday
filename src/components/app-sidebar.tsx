'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { LayoutDashboard, Box, Moon, Sun, ChevronsUpDown, FileChartColumnIncreasing, FolderKanban, Users as UsersIcon, Loader2, LucideIcon, LayoutList, Container, SquareChartGantt, BadgeIndianRupee, FileClock, User, ShoppingCart } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Role } from '@/generated/prisma'
import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import { StoreSwitcher } from '@/components/store-switcher'
import { Skeleton } from '@/components/ui/skeleton'
import { Sidebar, SidebarContent as SidebarContentBase, SidebarFooter, SidebarHeader, SidebarMenuButton, SidebarMenuItem, SidebarRail } from '@/components/ui/sidebar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import Image from 'next/image'

const data = {
	stores: [
		{
			name: 'PharmUday',
			logo: () => (
				<Image
					src='/ppilot.png'
					alt='PharmUday'
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
					icon: LayoutList,
				},
				{
					title: 'Categories',
					url: '/inventory/categories',
					icon: FolderKanban,
					requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN, Role.PHARMACIST] as Role[], // Only for Admin and Super Admin
				},
				{
					title: 'Suppliers',
					url: '/inventory/suppliers',
					icon: Container,
					requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN, Role.PHARMACIST] as Role[], // Only for Admin and Super Admin
				},
			],
		},
		{
			title: 'Reports',
			url: '#',
			icon: SquareChartGantt,
			isActive: true,
			items: [
				{
					title: 'Reports',
					icon: SquareChartGantt,
					url: '/reports',
				},
				{
					title: 'Categories',
					url: '/reports/categories',
					icon: FolderKanban,
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
					icon: BadgeIndianRupee,
					url: '/sales',
				},
				{
					title: 'Sales History',
					icon: FileClock,
					url: '/sales/history',
				},
				{
					title: 'Customers',
					icon: User,
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
			icon: ShoppingCart,
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

// Custom hook to handle session data
function useStableSession() {
	const { data: session, status } = useSession()
	const [stableSession, setStableSession] = React.useState(session)
	const [stableStatus, setStableStatus] = React.useState(status)

	React.useEffect(() => {
		// Only update if essential user data changes
		if (session?.user?.name !== stableSession?.user?.name || session?.user?.email !== stableSession?.user?.email || session?.user?.image !== stableSession?.user?.image || session?.user?.role !== stableSession?.user?.role) {
			console.log('[useStableSession] Essential user data changed, updating stable session')
			setStableSession(session)
		}

		// Only update status if it changes from loading to something else
		if (status !== stableStatus && status !== 'loading') {
			console.log('[useStableSession] Status changed from loading, updating stable status')
			setStableStatus(status)
		}
	}, [session, status])

	return { session: stableSession, status: stableStatus }
}

// Debug component to track re-renders
const DebugRender = React.memo(function DebugRender({ componentName }: { componentName: string }) {
	console.log(`[${componentName}] Rendering at ${new Date().toISOString()}`)
	return null
})

// Memoized sidebar content
const SidebarContentWrapper = React.memo(function SidebarContentWrapper({ filteredNavMain, userData, theme, setTheme }: { filteredNavMain: any[]; userData: { name: string; email: string; avatar: string }; theme: string | undefined; setTheme: (theme: string) => void }) {
	console.log('[SidebarContentWrapper] Rendering with props:', { filteredNavMain, userData, theme })
	return (
		<>
			<DebugRender componentName='SidebarContentWrapper' />
			<SidebarHeader>
				<StoreSwitcher teams={data.stores} />
			</SidebarHeader>
			<SidebarContentBase>
				<NavMain items={filteredNavMain} />
			</SidebarContentBase>
			<SidebarFooter>
				<SidebarMenuItem className='list-none'>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size='lg'
								className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'>
								{theme === 'dark' ? <Moon className='size-4' /> : <Sun className='size-4' />}
								<span className='flex-1 text-left text-sm'>{theme === 'light' ? 'Light Theme' : theme === 'dark' ? 'Dark Theme' : 'System Theme'}</span>
								<ChevronsUpDown className='ml-auto size-4' />
							</SidebarMenuButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className='w-(--radix-dropdown-menu-trigger-width) min-w-32 rounded-lg'
							side={'right'}
							align='end'
							sideOffset={4}>
							<DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
				<NavUser user={userData} />
			</SidebarFooter>
		</>
	)
})

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	console.log('[AppSidebar] Rendering at', new Date().toISOString())
	const { session, status } = useStableSession()
	const { theme, setTheme } = useTheme()
	const router = useRouter()
	const pathname = usePathname()
	const [isNavigating, startTransition] = React.useTransition()
	const [navigatingTo, setNavigatingTo] = React.useState<string | null>(null)

	// Define user data based on session or provide defaults/loading state
	const userData = React.useMemo(() => {
		console.log('[AppSidebar] Computing userData')
		return {
			name: session?.user?.name ?? 'User',
			email: session?.user?.email ?? 'Loading...',
			avatar: session?.user?.image ?? '',
		}
	}, [session?.user?.name, session?.user?.email, session?.user?.image])

	const handleNavigation = React.useCallback(
		(url: string) => {
			if (pathname === url || url === '#') return

			setNavigatingTo(url)
			startTransition(() => {
				router.push(url)
			})
		},
		[pathname, router, startTransition],
	)

	React.useEffect(() => {
		if (navigatingTo && (pathname === navigatingTo || !isNavigating)) {
			setNavigatingTo(null)
		}
	}, [pathname, navigatingTo, isNavigating])

	// Filter nav items based on user role
	const filteredNavMain = React.useMemo(() => {
		console.log('[AppSidebar] Computing filteredNavMain')
		if (!session?.user?.role) return []
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

	if (status === 'loading') {
		console.log('[AppSidebar] Rendering loading state')
		return <SidebarSkeleton {...props} />
	}

	console.log('[AppSidebar] Rendering main content')
	return (
		<Sidebar
			collapsible='icon'
			{...props}>
			<DebugRender componentName='AppSidebar' />
			<SidebarContentWrapper
				filteredNavMain={filteredNavMain}
				userData={userData}
				theme={theme}
				setTheme={setTheme}
			/>
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
			<SidebarContentBase>
				<div className='flex flex-col gap-2 p-2'>
					{[...Array(5)].map((_, i) => (
						<Skeleton
							key={i}
							className='h-10 w-full'
						/> // Skeleton for NavMain items
					))}
				</div>
			</SidebarContentBase>
			<SidebarFooter>
				<Skeleton className='h-[58px] w-full' /> {/* Skeleton for Theme Toggle Item */}
				<Skeleton className='h-[58px] w-full' /> {/* Skeleton for NavUser */}
			</SidebarFooter>
		</Sidebar>
	)
}
