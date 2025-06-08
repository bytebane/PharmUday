'use client'

import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface SalesChartProps {
	data: {
		date: string
		amount: number
	}[]
	className?: string
}

const chartConfig = {
	sales: {
		label: 'Sales',
		color: 'var(--chart-1)',
	},
} satisfies ChartConfig

const timeRangeOptions = [
	{ value: 'today', label: 'Today' },
	{ value: '7d', label: 'Last 7 days' },
	{ value: '30d', label: 'Last 30 days' },
	{ value: '90d', label: 'Last 3 months' },
	{ value: '180d', label: 'Last 6 months' },
	{ value: '270d', label: 'Last 9 months' },
	{ value: '365d', label: 'Last year' },
] as const

type TimeRange = (typeof timeRangeOptions)[number]['value']

export function SalesChart({ data, className }: SalesChartProps) {
	const [timeRange, setTimeRange] = React.useState<TimeRange>('30d')

	const filteredData = React.useMemo(() => {
		return data.filter(item => {
			const date = new Date(item.date)
			const referenceDate = new Date()
			let daysToSubtract = 30

			switch (timeRange) {
				case 'today':
					const today = new Date()
					today.setHours(0, 0, 0, 0)
					return date >= today
				case '7d':
					daysToSubtract = 7
					break
				case '90d':
					daysToSubtract = 90
					break
				case '180d':
					daysToSubtract = 180
					break
				case '270d':
					daysToSubtract = 270
					break
				case '365d':
					daysToSubtract = 365
					break
			}

			const startDate = new Date(referenceDate)
			startDate.setDate(startDate.getDate() - daysToSubtract)
			return date >= startDate
		})
	}, [data, timeRange])

	return (
		<Card
			data-slot='sales-chart'
			className={cn('pt-0', className)}>
			<CardHeader className='flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row'>
				<div className='grid flex-1 gap-1'>
					<CardTitle>Sales Overview</CardTitle>
					<CardDescription>Showing total sales for the selected period</CardDescription>
				</div>
				<Select
					value={timeRange}
					onValueChange={(value: TimeRange) => setTimeRange(value)}>
					<SelectTrigger
						className='hidden w-[160px] rounded-lg sm:ml-auto sm:flex'
						aria-label='Select time range'>
						<SelectValue placeholder='Last 30 days' />
					</SelectTrigger>
					<SelectContent className='rounded-xl'>
						{timeRangeOptions.map(option => (
							<SelectItem
								key={option.value}
								value={option.value}
								className='rounded-lg'>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</CardHeader>
			<CardContent className='px-2 pt-4 sm:px-6 sm:pt-6'>
				<ChartContainer
					config={chartConfig}
					className='aspect-auto h-[250px] w-full'>
					<AreaChart data={filteredData}>
						<defs>
							<linearGradient
								id='fillSales'
								x1='0'
								y1='0'
								x2='0'
								y2='1'>
								<stop
									offset='5%'
									stopColor='var(--color-sales)'
									stopOpacity={0.8}
								/>
								<stop
									offset='95%'
									stopColor='var(--color-sales)'
									stopOpacity={0.1}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey='date'
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={32}
							tickFormatter={value => {
								const date = new Date(value)
								return date.toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
								})
							}}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									labelFormatter={value => {
										return new Date(value).toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric',
										})
									}}
									formatter={value => `₹${value}`}
									indicator='dot'
								/>
							}
						/>
						<Area
							dataKey='amount'
							type='natural'
							fill='url(#fillSales)'
							stroke='var(--color-sales)'
							name='sales'
						/>
						<ChartLegend content={<ChartLegendContent />} />
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
}
