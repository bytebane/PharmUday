'use client'

import { WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

export function NetworkStatusOverlay() {
	const [isOnline, setIsOnline] = useState(true)

	useEffect(() => {
		const updateStatus = () => setIsOnline(navigator.onLine)
		updateStatus()
		window.addEventListener('online', updateStatus)
		window.addEventListener('offline', updateStatus)
		return () => {
			window.removeEventListener('online', updateStatus)
			window.removeEventListener('offline', updateStatus)
		}
	}, [])

	if (isOnline) return null

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm'>
			<div className='mx-4 flex max-w-sm flex-col items-center gap-4 rounded-lg border bg-card p-6 text-center shadow-lg'>
				<div className='flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10'>
					<WifiOff className='h-6 w-6 text-destructive' />
				</div>
				<div className='space-y-2'>
					<h3 className='text-lg font-semibold'>No Internet Connection</h3>
					<p className='text-sm text-muted-foreground'>Please check your network connection and try again.</p>
				</div>
			</div>
		</div>
	)
}
