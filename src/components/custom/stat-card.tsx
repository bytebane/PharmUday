'use client' // If it uses hooks like Link, or for consistency if part of a client-side tree

import Link from 'next/link'
import { AlertTriangle, ArchiveX, DollarSign, ShoppingCart, TrendingUp, Package, CalendarDays, CalendarRange } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const iconComponents = {
	AlertTriangle,
	ArchiveX,
	DollarSign,
	ShoppingCart,
	TrendingUp,
	Package,
	CalendarDays,
	CalendarRange,
}

export type IconName = keyof typeof iconComponents

export interface StatCardProps {
	title: string
	value: string | number
	iconName: IconName
	description?: string
	link?: string
	linkText?: string
	isLoading?: boolean
}

export function StatCard({ title, value, iconName, description, link, linkText, isLoading }: StatCardProps) {
	const Icon = iconComponents[iconName]

	if (!Icon && !isLoading) {
		console.warn(`StatCard: Icon "${iconName}" not found.`)
		return null // Or a fallback UI
	}

	if (isLoading) {
		return (
			<Card>
				<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
					<Skeleton className='h-6 w-3/4' />
					<Skeleton className='h-6 w-6 rounded-full' />
				</CardHeader>
				<CardContent>
					<Skeleton className='h-8 w-1/2' />
					{description && <Skeleton className='mt-1 h-4 w-full' />}
					{link && <Skeleton className='mt-2 h-4 w-1/4' />}
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
				<CardTitle className='text-sm font-medium'>{title}</CardTitle>
				{Icon && <Icon className='h-5 w-5 text-muted-foreground' />}
			</CardHeader>
			<CardContent>
				<div className='text-2xl font-bold'>{value}</div>
				{description && <p className='text-xs text-muted-foreground'>{description}</p>}
				{link && linkText && (
					<Link
						href={link}
						className='mt-2 inline-block text-sm text-primary hover:underline'>
						{linkText}
					</Link>
				)}
			</CardContent>
		</Card>
	)
}
