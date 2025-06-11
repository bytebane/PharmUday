'use client' // Add 'use client' directive

import * as React from 'react' // Import React
import { signIn } from 'next-auth/react' // Import signIn
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { toast } from 'sonner' // Import toast for feedback
import Link from 'next/link' // Use Next.js Link for navigation

export function LoginForm() {
	const [email, setEmail] = React.useState('')
	const [password, setPassword] = React.useState('')
	const [isLoading, setIsLoading] = React.useState(false)
	const [error, setError] = React.useState<string | null>(null)
	const searchParams = useSearchParams()

	// Show error toast when error param is present
	React.useEffect(() => {
		if (error) {
			toast.error(error)
		}
	}, [error])

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setError(null) // Clear previous errors
		setIsLoading(true)

		try {
			const result = await signIn('credentials', {
				email: email,
				password: password,
				callbackUrl: '/', // Default redirect URL
				redirect: false, // Prevent automatic redirect
			})

			if (result?.error) {
				// Display the specific error message from the authentication system
				setError(result.error)
				toast.error(result.error)
			} else if (result?.ok) {
				// If login is successful, redirect to the callback URL
				window.location.href = result.url || '/'
			}
		} catch (err) {
			// Catch any unexpected errors during the signIn process
			console.error('Login Error:', err)
			setError('An unexpected error occurred during login.')
			toast.error('An unexpected error occurred.')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Card className='w-full max-w-sm'>
			<CardHeader>
				<CardTitle className='text-2xl'>Login</CardTitle>
				<CardDescription>Enter your email below to login to your account.</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={handleSubmit}
					className='grid gap-4'>
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
						<div className='flex items-center'>
							<Label htmlFor='password'>Password</Label>
							<Link
								href='#'
								className='ml-auto inline-block text-sm underline'>
								Forgot your password?
							</Link>
						</div>
						<PasswordInput
							id='password'
							required
							value={password}
							onChange={e => setPassword(e.target.value)}
							disabled={isLoading}
						/>
					</div>
					{error && <p className='text-sm text-red-600'>{error}</p>}
					<Button
						type='submit'
						className='w-full'
						disabled={isLoading}>
						{isLoading ? 'Logging in...' : 'Login'}
					</Button>
					{/* Optional: Add OAuth login buttons here */}
					{/* <Button variant="outline" className="w-full" onClick={() => signIn('google')} disabled={isLoading}>Login with Google</Button> */}
				</form>
				<div className='mt-4 text-center text-sm'>
					Don&apos;t have an account?{' '}
					<Link
						href='/signup'
						className='underline'>
						Sign up
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}
