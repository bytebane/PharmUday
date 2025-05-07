'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react' // Import useSession hook
import { AudioWaveform, LayoutDashboard, Box, Command, GalleryVerticalEnd, Moon, Sun, ChevronsUpDown, FileChartColumnIncreasing, FolderKanban } from 'lucide-react'
import { useTheme } from 'next-themes' // Import useTheme

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import { StoreSwitcher } from '@/components/store-switcher'
import { Skeleton } from '@/components/ui/skeleton' // Import Skeleton for loading state
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenuButton, SidebarMenuItem, SidebarRail } from '@/components/ui/sidebar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'

// This is sample data.
const data = {
	user: {
		name: 'shadcn',
		email: 'm@example.com',
		avatar: '/avatars/shadcn.jpg',
	},
	stores: [
		{
			name: 'Acme Inc',
			logo: GalleryVerticalEnd,
			plan: 'Enterprise',
		},
		{
			name: 'Acme Corp.',
			logo: AudioWaveform,
			plan: 'Startup',
		},
		{
			name: 'Evil Corp.',
			logo: Command,
			plan: 'Free',
		},
	],
	navMain: [
		{
			title: 'Dashboard',
			url: '#',
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
				},
				{
					title: 'Suppliers',
					url: '/inventory/suppliers',
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
				},
			],
		},
		{
			title: 'Sales',
			url: '#',
			icon: FileChartColumnIncreasing, // Or a shopping cart icon
			isActive: true,
			items: [
				{
					title: 'New Sale',
					url: '/sales', // Link to the New Sale page
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

	// Define user data based on session or provide defaults/loading state
	const userData = {
		name: session?.user?.name ?? 'User',
		email: session?.user?.email ?? 'Loading...',
		// Use session image if available, otherwise fallback or leave empty
		avatar: session?.user?.image ?? '', // Auth.js uses 'image' by default
	}

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
				<NavMain items={data.navMain} />
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
