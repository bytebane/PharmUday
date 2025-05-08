// Create a new component, e.g., FormattedDateCell.tsx
// src/components/ui/formatted-date-cell.tsx (or similar location)
'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface FormattedDateCellProps {
	dateValue: string | Date
	formatString: string
}

export function FormattedDateCell({ dateValue, formatString }: FormattedDateCellProps) {
	const [formattedDate, setFormattedDate] = useState('')

	useEffect(() => {
		// This effect runs only on the client after hydration
		setFormattedDate(format(new Date(dateValue), formatString))
	}, [dateValue, formatString])

	// Render nothing or a placeholder on the server and during initial client render
	// to avoid mismatch. Once `formattedDate` is set, it will re-render with the client-formatted date.
	if (!formattedDate) {
		// You could return a placeholder like a few dashes or the raw date part
		// to minimize visual shift, or even the server-rendered date if you can pass it.
		// For simplicity, returning null initially or a basic format.
		// Let's try rendering a basic, non-locale-time format initially.
		try {
			return format(new Date(dateValue), 'yyyy-MM-dd') // Basic, non-time part
		} catch (e) {
			return 'Invalid Date'
		}
	}

	return <>{formattedDate}</>
}
