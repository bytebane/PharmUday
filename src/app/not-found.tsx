'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function NotFound() {
	const router = useRouter()

	return (
		<div className='flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 p-4 text-center'>
			<div className='flex h-32 w-32 items-center justify-center rounded-full bg-muted'>
				<Image
					src='/ppilot.png'
					alt='PharmPilot Logo'
					width={80}
					height={80}
					className='object-contain'
				/>
			</div>
			<div className='space-y-2'>
				<h1 className='text-4xl font-bold tracking-tight'>404</h1>
				<h2 className='text-2xl font-semibold tracking-tight'>Page Not Found</h2>
				<p className='text-muted-foreground'>The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
			</div>
			<div className='flex gap-4'>
				<Button
					variant='outline'
					onClick={() => router.back()}>
					Go Back
				</Button>
				<Button onClick={() => router.push('/')}>Return Home</Button>
			</div>
		</div>
	)
}
