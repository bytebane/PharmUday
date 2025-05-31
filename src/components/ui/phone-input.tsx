'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PhoneInputProps extends Omit<React.ComponentProps<'input'>, 'type' | 'onChange'> {
	value?: string
	onChange?: (value: string) => void
	onBlur?: () => void
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(({ className, value = '', onChange, onBlur, placeholder = 'Enter 10-digit mobile number', ...props }, ref) => {
	const [internalValue, setInternalValue] = React.useState(value)

	React.useEffect(() => {
		setInternalValue(value)
	}, [value])

	const formatPhoneNumber = (input: string): string => {
		// Remove all non-numeric characters
		const numeric = input.replace(/\D/g, '')
		// Limit to 10 digits
		const limited = numeric.slice(0, 10)
		return limited
	}

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const formatted = formatPhoneNumber(e.target.value)
		setInternalValue(formatted)
		onChange?.(formatted)
	}

	const handleBlur = () => {
		onBlur?.()
	}

	return (
		<Input
			{...props}
			ref={ref}
			type='tel'
			inputMode='numeric'
			pattern='[0-9]*'
			value={internalValue}
			onChange={handleInputChange}
			onBlur={handleBlur}
			placeholder={placeholder}
			maxLength={10}
			className={cn(className)}
		/>
	)
})

PhoneInput.displayName = 'PhoneInput'

export { PhoneInput }
