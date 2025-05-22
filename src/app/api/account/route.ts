import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Zod schema for updating user account details
const accountUpdateSchema = z
	.object({
		name: z.string().min(2, 'Name must be at least 2 characters').optional(),
		currentPassword: z.string().optional(),
		newPassword: z.string().min(6, 'New password must be at least 6 characters').optional(),
		confirmNewPassword: z.string().optional(),
	})
	.refine(
		data => {
			// If newPassword is provided, currentPassword and confirmNewPassword must also be provided
			if (data.newPassword) {
				return !!data.currentPassword && !!data.confirmNewPassword
			}
			return true
		},
		{
			message: 'Current password and confirmation are required to set a new password.',
			path: ['currentPassword'], // Or a more general path
		},
	)
	.refine(data => data.newPassword === data.confirmNewPassword, {
		message: 'New passwords do not match.',
		path: ['confirmNewPassword'],
	})

/**
 * GET /api/account
 * Fetches the current authenticated user's account details.
 */
export async function GET() {
	const session = await getServerSession(authOptions)

	if (!session?.user?.id) {
		return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
	}

	try {
		const user = await db.user.findUnique({
			where: { id: session.user.id },
			select: {
				id: true,
				name: true,
				email: true,
				role: true, // Include role for display purposes
			},
		})

		if (!user) {
			return NextResponse.json({ message: 'User not found' }, { status: 404 })
		}
		return NextResponse.json(user)
	} catch (error) {
		console.error('Failed to fetch account details:', error)
		return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
	}
}

/**
 * PUT /api/account
 * Updates the current authenticated user's account details.
 */
export async function PUT(req: Request) {
	const session = await getServerSession(authOptions)

	if (!session?.user?.id) {
		return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
	}

	try {
		const body = await req.json()
		const validation = accountUpdateSchema.safeParse(body)

		if (!validation.success) {
			return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 })
		}

		const { name, currentPassword, newPassword } = validation.data
		const updateData: { name?: string; passwordHash?: string } = {}

		if (name) {
			updateData.name = name
		}

		if (newPassword && currentPassword) {
			const user = await db.user.findUnique({ where: { id: session.user.id } })
			if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
				return NextResponse.json({ message: 'Incorrect current password' }, { status: 400 })
			}
			updateData.passwordHash = await bcrypt.hash(newPassword, 10)
		}

		await db.user.update({ where: { id: session.user.id }, data: updateData })
		return NextResponse.json({ message: 'Account updated successfully' })
	} catch (error) {
		console.error('Failed to update account:', error)
		return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
	}
}
