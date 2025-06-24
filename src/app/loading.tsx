'use client'

import React, { useState, useEffect, useRef } from 'react'

const wittyLoadingTexts = ['Brewing potions of wellness...', 'Consulting the ancient pharmacopoeia...', 'Calibrating the pill counters...', 'Summoning data from the health cloud...', 'Aligning prescription atoms...', 'Waking up the digital pharmacist...', 'Untangling the supply chains...', 'Charging the health-o-matic 3000...', 'Reticulating medical splines...', 'Optimizing your wellness journey...', 'Preparing your health dashboard...', 'Cross-referencing formularies...', 'Ensuring HIPAA hamsters are fed...', 'Polishing the stethoscopes...']

// Helper function to get a random item and its index
const getRandomLoadingText = () => {
	const randomIndex = Math.floor(Math.random() * wittyLoadingTexts.length)
	return { text: wittyLoadingTexts[randomIndex], index: randomIndex }
}
export default function GlobalLoading() {
	const [displayText, setDisplayText] = useState(() => getRandomLoadingText().text)
	const [isFading, setIsFading] = useState(false)
	const currentIndexRef = useRef(getRandomLoadingText().index)

	useEffect(() => {
		let animationTimeoutId: NodeJS.Timeout | null = null

		const intervalId = setInterval(() => {
			setIsFading(true)

			// Clear previous timeout if one was pending, for robustness
			if (animationTimeoutId) {
				clearTimeout(animationTimeoutId)
			}

			animationTimeoutId = setTimeout(() => {
				currentIndexRef.current = (currentIndexRef.current + 1) % wittyLoadingTexts.length
				setDisplayText(wittyLoadingTexts[currentIndexRef.current])
				setIsFading(false)
				animationTimeoutId = null // Reset ID once executed
			}, 500) // Corrected: Duration of fade-out, should match CSS transition (duration-500 is 500ms)
		}, 3000) // Change text every 3 seconds (2.5s visible + 0.5s fade)

		return () => {
			clearInterval(intervalId) // Cleanup interval on unmount
			if (animationTimeoutId) {
				clearTimeout(animationTimeoutId) // Cleanup pending timeout on unmount
			}
		}
	}, [])

	return (
		<div className='flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4 text-foreground'>
			<div className='flex flex-col items-center space-y-6 rounded-lg bg-card p-8 shadow-xl'>
				{/* Bouncing dots animation */}
				<div className='flex space-x-2'>
					<div className='h-5 w-5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]'></div>
					<div className='h-5 w-5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]'></div>
					<div className='h-5 w-5 animate-bounce rounded-full bg-primary'></div>
				</div>
				<span className={`text-center text-xl font-medium text-muted-foreground transition-opacity duration-500 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>{displayText}</span>
			</div>
			<p className='mt-8 text-sm text-gray-500'>PharmUday is preparing your experience...</p>
		</div>
	)
}
