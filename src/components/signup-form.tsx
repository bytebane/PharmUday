'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export function SignupForm() {
	const router = useRouter()
	const [email, setEmail] = React.useState('')
	const [password, setPassword] = React.useState('')
	const [confirmPassword, setConfirmPassword] = React.useState('')
	const [firstName, setFirstName] = React.useState('') // Optional
	const [lastName, setLastName] = React.useState('') // Optional
	const [isLoading, setIsLoading] = React.useState(false)
	const [error, setError] = React.useState<string | null>(null)

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setError(null) // Clear previous errors

		if (password !== confirmPassword) {
			setError('Passwords do not match.')
			return
		}

		setIsLoading(true)

		try {
			const data = JSON.stringify({
				email,
				password,
				firstName, // Send optional fields
				lastName,
			})

			const response = await fetch('/api/signup', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: data,
			})

			const res = await response.json()

			if (!response.ok) {
				throw new Error(res.message || 'Something went wrong')
			}

			// Signup successful
			toast.success('Account created successfully! Please log in.')
			router.push('/login') // Redirect to login page after successful signup
		} catch (err: any) {
			setError(err.message)
			toast.error(err.message || 'Signup failed.')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Card className='w-full max-w-sm'>
			<CardHeader>
				<CardTitle className='text-2xl'>Sign Up</CardTitle>
				<CardDescription>Enter your details below to create an account.</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={handleSubmit}
					className='grid gap-4'>
					{/* Optional First/Last Name */}
					<div className='grid grid-cols-2 gap-4'>
						<div className='grid gap-2'>
							<Label htmlFor='first-name'>First name</Label>
							<Input
								id='first-name'
								placeholder='Max'
								value={firstName}
								onChange={e => setFirstName(e.target.value)}
								disabled={isLoading}
							/>
						</div>
						<div className='grid gap-2'>
							<Label htmlFor='last-name'>Last name</Label>
							<Input
								id='last-name'
								placeholder='Robinson'
								value={lastName}
								onChange={e => setLastName(e.target.value)}
								disabled={isLoading}
							/>
						</div>
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='email'>Email</Label>
						<Input
							id='email'
							type='email'
							placeholder='m@example.com'
							required
							value={email}
							onChange={e => setEmail(e.target.value)}
							disabled={isLoading}
						/>
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='password'>Password</Label>
						<PasswordInput
							id='password'
							required
							minLength={8}
							value={password}
							onChange={e => setPassword(e.target.value)}
							disabled={isLoading}
						/>
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='confirm-password'>Confirm Password</Label>
						<PasswordInput
							id='confirm-password'
							required
							value={confirmPassword}
							onChange={e => setConfirmPassword(e.target.value)}
							disabled={isLoading}
						/>
					</div>
					{error && <p className='text-sm text-red-600'>{error}</p>}
					<Button
						type='submit'
						className='w-full'
						disabled={isLoading}>
						{isLoading ? 'Creating Account...' : 'Create account'}
					</Button>
				</form>
			</CardContent>
		</Card>
	)
}
