'use client'

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
		<div
			className='fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/70 select-none'
			style={{ pointerEvents: 'all' }}
			aria-modal='true'
			role='alertdialog'
			tabIndex={-1}>
			<div className='bg-red-600 text-white px-8 py-6 rounded-lg shadow-lg text-center text-lg font-semibold max-w-xs'>
				No internet connection.
				<br />
				Please connect to the internet first.
			</div>
		</div>
	)
}
