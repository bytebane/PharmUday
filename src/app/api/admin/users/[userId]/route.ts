import { NextResponse } from 'next/server'
import * as argon2 from 'argon2'
import { db as prisma } from '@/lib/db'
import { Role } from '@/generated/prisma'
import { authorize, AuthenticatedUser } from '@/lib/utils/auth-utils'

/**
 * GET /api/admin/users/[userId]
 * Fetches a single user by ID.
 */
export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
	const authResult = await authorize([Role.ADMIN, Role.SUPER_ADMIN])
	if (authResult.response) {
		return authResult.response
	}

	const { userId } = await params
	try {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				isActive: true,
				createdAt: true,
				emailVerified: true,
			},
		})

		if (!user) {
			return NextResponse.json({ message: 'User not found' }, { status: 404 })
		}
		return NextResponse.json(user)
	} catch (error) {
		console.error(`Failed to fetch user ${userId}:`, error)
		return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
	}
}

/**
 * PUT /api/admin/users/[userId]
 * Updates a user.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ userId: string }> }) {
	const authResult = await authorize([Role.ADMIN, Role.SUPER_ADMIN])
	if (authResult.response) {
		return authResult.response
	}
	const { user: currentUser } = authResult as { user: AuthenticatedUser } // User is guaranteed non-null
	const { userId } = await params
	const currentUserId = currentUser.id
	const currentUserRole = currentUser.role as Role

	try {
		const body = await req.json()
		const { email, name, role: roleToAssign, isActive, password } = body

		const userToUpdate = await prisma.user.findUnique({ where: { id: userId } })
		if (!userToUpdate) {
			return NextResponse.json({ message: 'User not found' }, { status: 404 })
		}

		// Authorization: Prevent self-deactivation or role change that locks out
		if (userId === currentUserId) {
			// currentUserId is from the authenticated session
			if (typeof isActive === 'boolean' && !isActive) {
				return NextResponse.json({ message: 'Cannot deactivate your own account.' }, { status: 403 })
			}
			if (roleToAssign && roleToAssign !== currentUser.role) {
				// currentUser.role
				return NextResponse.json({ message: 'Cannot change your own role.' }, { status: 403 })
			}
		}

		// Authorization: Admins cannot modify other Admins or Super Admins
		if (currentUserRole === Role.ADMIN) {
			if (userToUpdate.role === Role.ADMIN || userToUpdate.role === Role.SUPER_ADMIN) {
				if (userId !== currentUserId) {
					// Admins can modify their own non-critical fields
					return NextResponse.json({ message: 'Admins cannot modify other Admins or Super Admins.' }, { status: 403 })
				}
			}
			if (roleToAssign === Role.ADMIN || roleToAssign === Role.SUPER_ADMIN) {
				return NextResponse.json({ message: 'Admins cannot assign Admin or Super Admin roles.' }, { status: 403 })
			}
		}

		// Prevent modifying SUPER_ADMIN by non-SUPER_ADMIN
		if (userToUpdate.role === Role.SUPER_ADMIN && currentUserRole !== Role.SUPER_ADMIN) {
			return NextResponse.json({ message: 'Only Super Admins can modify other Super Admins.' }, { status: 403 })
		}

		// Prevent assigning SUPER_ADMIN role by non-SUPER_ADMIN
		if (roleToAssign === Role.SUPER_ADMIN && currentUserRole !== Role.SUPER_ADMIN) {
			return NextResponse.json({ message: 'Only Super Admins can assign the Super Admin role.' }, { status: 403 })
		}

		const updateData: any = {}
		if (email && email !== userToUpdate.email) {
			const existingEmailUser = await prisma.user.findUnique({ where: { email } })
			if (existingEmailUser && existingEmailUser.id !== userId) {
				return NextResponse.json({ message: 'Email already in use by another account.' }, { status: 409 })
			}
			updateData.email = email
		}
		if (name) updateData.name = name
		if (roleToAssign) updateData.role = roleToAssign as Role
		if (typeof isActive === 'boolean') updateData.isActive = isActive
		if (password) {
			updateData.passwordHash = await argon2.hash(password, {
				type: argon2.argon2id,
				memoryCost: 2 ** 16,
				timeCost: 3,
				parallelism: 1,
			})
		}

		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: updateData,
			select: { id: true, email: true, name: true, role: true, isActive: true },
		})

		return NextResponse.json(updatedUser)
	} catch (error) {
		console.error(`User update error for ${userId}:`, error)
		if (error instanceof SyntaxError) {
			return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
		}
		return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
	}
}

/**
 * DELETE /api/admin/users/[userId]
 * Deletes a user.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ userId: string }> }) {
	const authResult = await authorize([Role.ADMIN, Role.SUPER_ADMIN])
	if (authResult.response) {
		return authResult.response
	}
	const { user: currentUser } = authResult as { user: AuthenticatedUser } // User is guaranteed non-null
	const { userId } = await params
	const currentUserId = currentUser.id
	const currentUserRole = currentUser.role as Role
	if (userId === currentUserId) {
		return NextResponse.json({ message: 'Cannot delete your own account.' }, { status: 403 })
	}

	try {
		const userToDelete = await prisma.user.findUnique({ where: { id: userId } })
		if (!userToDelete) {
			return NextResponse.json({ message: 'User not found' }, { status: 404 })
		}

		// Authorization: Admins cannot delete other Admins or Super Admins
		if (currentUserRole === Role.ADMIN && (userToDelete.role === Role.ADMIN || userToDelete.role === Role.SUPER_ADMIN)) {
			return NextResponse.json({ message: 'Admins cannot delete other Admins or Super Admins.' }, { status: 403 })
		}

		await prisma.user.delete({ where: { id: userId } })
		return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 })
	} catch (error) {
		console.error(`User deletion error for ${userId}:`, error)
		// Handle potential foreign key constraint errors if user is linked elsewhere and onDelete is Restrict
		return NextResponse.json({ message: 'Internal server error or user cannot be deleted due to existing relations.' }, { status: 500 })
	}
}
