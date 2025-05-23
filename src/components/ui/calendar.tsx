'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

function Calendar({ className, classNames, showOutsideDays = true, startMonth, endMonth, ...props }: React.ComponentProps<typeof DayPicker>) {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			captionLayout='dropdown'
			navLayout='around'
			animate
			startMonth={startMonth}
			endMonth={endMonth}
			className={cn('p-3', className)}
			classNames={{
				...classNames,
			}}
			components={{
				//@ts-expect-error iconleft
				IconLeft: ({ className, ...props }) => (
					<ChevronLeft
						className={cn('size-4', className)}
						{...props}
					/>
				),
				//@ts-expect-error iconright
				IconRight: ({ className, ...props }) => (
					<ChevronRight
						className={cn('size-4', className)}
						{...props}
					/>
				),
			}}
			{...props}
		/>
	)
}

export { Calendar }
