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

// --- Helper Functions for PUT ---
function canModifySelf(userId: string, currentUserId: string, isActive: boolean | undefined, roleToAssign: Role | undefined, currentUserRole: Role) {
	if (userId === currentUserId) {
		if (typeof isActive === 'boolean' && !isActive) {
			return { allowed: false, message: 'Cannot deactivate your own account.' }
		}
		if (roleToAssign && roleToAssign !== currentUserRole) {
			return { allowed: false, message: 'Cannot change your own role.' }
		}
	}
	return { allowed: true }
}

function canAdminModify(userToUpdateRole: Role, userId: string, currentUserId: string, roleToAssign: Role | undefined, currentUserRole: Role) {
	if (currentUserRole === Role.ADMIN) {
		if ((userToUpdateRole === Role.ADMIN || userToUpdateRole === Role.SUPER_ADMIN) && userId !== currentUserId) {
			return { allowed: false, message: 'Admins cannot modify other Admins or Super Admins.' }
		}
		if (roleToAssign === Role.ADMIN || roleToAssign === Role.SUPER_ADMIN) {
			return { allowed: false, message: 'Admins cannot assign Admin or Super Admin roles.' }
		}
	}
	return { allowed: true }
}

function canSuperAdminModify(userToUpdateRole: Role, currentUserRole: Role, roleToAssign: Role | undefined) {
	if (userToUpdateRole === Role.SUPER_ADMIN && currentUserRole !== Role.SUPER_ADMIN) {
		return { allowed: false, message: 'Only Super Admins can modify other Super Admins.' }
	}
	if (roleToAssign === Role.SUPER_ADMIN && currentUserRole !== Role.SUPER_ADMIN) {
		return { allowed: false, message: 'Only Super Admins can assign the Super Admin role.' }
	}
	return { allowed: true }
}

async function prepareUpdateData(prisma: any, userId: string, userToUpdate: any, email: string | undefined, name: string | undefined, roleToAssign: Role | undefined, isActive: boolean | undefined, password: string | undefined) {
	const updateData: any = {}
	if (email && email !== userToUpdate.email) {
		const existingEmailUser = await prisma.user.findUnique({ where: { email } })
		if (existingEmailUser && existingEmailUser.id !== userId) {
			return { error: 'Email already in use by another account.' }
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
	return { updateData }
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
	const { user: currentUser } = authResult as { user: AuthenticatedUser }
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

		// --- Authorization Checks ---
		const selfCheck = canModifySelf(userId, currentUserId, isActive, roleToAssign, currentUserRole)
		if (!selfCheck.allowed) {
			return NextResponse.json({ message: selfCheck.message }, { status: 403 })
		}
		const adminCheck = canAdminModify(userToUpdate.role, userId, currentUserId, roleToAssign, currentUserRole)
		if (!adminCheck.allowed) {
			return NextResponse.json({ message: adminCheck.message }, { status: 403 })
		}
		const superAdminCheck = canSuperAdminModify(userToUpdate.role, currentUserRole, roleToAssign)
		if (!superAdminCheck.allowed) {
			return NextResponse.json({ message: superAdminCheck.message }, { status: 403 })
		}

		// --- Prepare Update Data ---
		const { updateData, error } = await prepareUpdateData(prisma, userId, userToUpdate, email, name, roleToAssign, isActive, password)
		if (error) {
			return NextResponse.json({ message: error }, { status: 409 })
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
