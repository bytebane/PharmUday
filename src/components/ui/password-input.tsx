'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string
}

export function PasswordInput({ label, className, ...props }: PasswordInputProps) {
	const [showPassword, setShowPassword] = React.useState(false)

	return (
		<div className='relative'>
			<Input
				type={showPassword ? 'text' : 'password'}
				className={className}
				{...props}
			/>
			<Button
				type='button'
				variant='ghost'
				size='sm'
				className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
				onClick={() => setShowPassword(!showPassword)}>
				{showPassword ? <EyeOff className='h-4 w-4 text-muted-foreground' /> : <Eye className='h-4 w-4 text-muted-foreground' />}
				<span className='sr-only'>{showPassword ? 'Hide password' : 'Show password'}</span>
			</Button>
		</div>
	)
}
