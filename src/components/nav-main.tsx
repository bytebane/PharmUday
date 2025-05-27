'use client'

import { ChevronRight, type LucideIcon, Loader2 } from 'lucide-react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '@/components/ui/sidebar'

interface NavItemProps {
	title: string
	url: string
	icon?: LucideIcon | typeof Loader2 // Allow Loader2 type
	iconClassName?: string // For animate-spin
	isActive?: boolean
	onClick?: () => void // For transition-based navigation
	disabled?: boolean // To disable during navigation
	items?: NavItemProps[] // For sub-items
}

export function NavMain({ items }: { items: NavItemProps[] }) {
	return (
		<SidebarGroup>
			<SidebarMenu>
				{items.map(item =>
					item.items ? (
						<Collapsible
							key={item.title}
							asChild
							defaultOpen={true}
							className='group/collapsible'>
							<SidebarMenuItem>
								<CollapsibleTrigger asChild>
									{/* The trigger button itself doesn't navigate, only expands/collapses */}
									{/* It can still show a loader if its 'url' (likely '#') matches navigatingTo, though onClick will be a no-op */}
									<SidebarMenuButton
										tooltip={item.title}
										onClick={item.onClick} // Will be a no-op if url is '#' due to AppSidebar logic
										disabled={item.disabled && item.url !== '#'} // Disable only if it's a real nav target
										className={item.isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}>
										{item.icon && <item.icon className={item.iconClassName} />}
										<span>{item.title}</span>
										<ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
									</SidebarMenuButton>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<SidebarMenuSub>
										{item.items?.map((subItem: NavItemProps) => (
											<SidebarMenuSubItem key={subItem.title}>
												<SidebarMenuSubButton
													onClick={subItem.disabled ? undefined : subItem.onClick}
													className={`${subItem.isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''} ${subItem.disabled ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''}`}>
													{/* Sub-items might not have icons defined in original data, but AppSidebar adds Loader2 if it's the target */}
													{subItem.icon && <subItem.icon className={subItem.iconClassName} />}
													<span>{subItem.title}</span>
												</SidebarMenuSubButton>
											</SidebarMenuSubItem>
										))}
									</SidebarMenuSub>
								</CollapsibleContent>
							</SidebarMenuItem>
						</Collapsible>
					) : (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								tooltip={item.title}
								onClick={item.onClick}
								disabled={item.disabled}
								className={item.isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}>
								{item.icon && <item.icon className={item.iconClassName} />}
								<span>{item.title}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					),
				)}
			</SidebarMenu>
		</SidebarGroup>
	)
}
