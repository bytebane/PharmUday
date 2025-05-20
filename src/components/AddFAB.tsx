'use client'

import React, { useRef, useState, useEffect } from 'react'
import { PlusCircle } from 'lucide-react'

interface AddFABProps {
	onClick: () => void
	ariaLabel?: string
}

export function AddFAB({ onClick, ariaLabel = 'Add New' }: AddFABProps) {
	const [fabPos, setFabPos] = useState({ x: 32, y: 32 })
	const fabRef = useRef<HTMLButtonElement>(null)
	const dragging = useRef(false)
	const wasDragged = useRef(false)
	const offset = useRef({ x: 0, y: 0 })

	const onFabMouseDown = (e: React.MouseEvent) => {
		dragging.current = true
		wasDragged.current = false
		const rect = fabRef.current?.getBoundingClientRect()
		offset.current = {
			x: e.clientX - (rect?.left ?? 0),
			y: e.clientY - (rect?.top ?? 0),
		}
		document.body.style.userSelect = 'none'
	}

	const onFabMouseMove = (e: MouseEvent) => {
		if (!dragging.current) return
		wasDragged.current = true
		const x = e.clientX - offset.current.x
		const y = e.clientY - offset.current.y
		setFabPos({ x, y })
	}

	const onFabMouseUp = () => {
		dragging.current = false
		setTimeout(() => {
			wasDragged.current = false
		}, 0)
		document.body.style.userSelect = ''
	}

	useEffect(() => {
		window.addEventListener('mousemove', onFabMouseMove)
		window.addEventListener('mouseup', onFabMouseUp)
		return () => {
			window.removeEventListener('mousemove', onFabMouseMove)
			window.removeEventListener('mouseup', onFabMouseUp)
		}
	}, [])

	useEffect(() => {
		setFabPos({
			x: window.innerWidth - 88,
			y: window.innerHeight - 88,
		})
	}, [])

	return (
		<button
			ref={fabRef}
			onMouseDown={onFabMouseDown}
			onClick={e => {
				if (wasDragged.current) {
					e.preventDefault()
					return
				}
				onClick()
			}}
			style={{
				position: 'fixed',
				top: fabPos.y,
				left: fabPos.x,
				zIndex: 50,
				cursor: 'grab',
				borderRadius: '50%',
				boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
				width: 56,
				height: 56,
				background: '#2563eb',
				color: 'white',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: 24,
			}}
			aria-label={ariaLabel}
			type='button'>
			<PlusCircle className='h-7 w-7' />
		</button>
	)
}
