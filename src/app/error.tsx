'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/ui/button' // Assuming you have a Button component

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		// Log the error to an error reporting service
		console.error('Global Error Boundary Caught:', error)
	}, [error])

	return (
		<html lang='en'>
			<body>
				<div className='flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-4'>
					<div className='max-w-md text-center'>
						<h1 className='mb-4 text-4xl font-bold text-destructive'>Oops! Something went wrong.</h1>
						<p className='mb-6 text-lg'>We encountered an unexpected error. Please try again, or contact support if the problem persists.</p>
						{process.env.NODE_ENV === 'development' && error?.message && <pre className='mb-4 whitespace-pre-wrap rounded-md bg-muted p-4 text-left text-sm text-muted-foreground'>Error: {error.message}</pre>}
						{process.env.NODE_ENV === 'development' && error?.digest && <pre className='mb-6 whitespace-pre-wrap rounded-md bg-muted p-4 text-left text-sm text-muted-foreground'>Digest: {error.digest}</pre>}
						<Button
							onClick={
								// Attempt to recover by trying to re-render the segment
								() => reset()
							}>
							Try again
						</Button>
					</div>
				</div>
			</body>
		</html>
	)
}
