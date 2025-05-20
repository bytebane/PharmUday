import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth' // Assuming getCurrentUser fetches the session user
import { Role } from '@/generated/prisma' // Assuming Role enum is from Prisma

// Define a type for the user object expected from getCurrentUser,
// focusing on fields relevant for authorization.
export type AuthenticatedUser = {
	id: string
	role: string // Role from session might be a string from next-auth
	email?: string | null
	name?: string | null
	// Add other fields from session user if needed by handlers after authorization
}

interface AuthResult {
	user: AuthenticatedUser | null // The authenticated user if authorization passes
	response: NextResponse | null // A NextResponse if authorization fails, otherwise null
}

/**
 * Checks if the current user is authenticated and has one of the allowed roles.
 * @param allowedRoles An array of `Role` enum values that are permitted.
 * @returns An AuthResult object containing the user if authorized, or a NextResponse if not.
 */
export async function authorize(allowedRoles: Role[]): Promise<AuthResult> {
	const user = await getCurrentUser()

	if (!user || !user.id) {
		return { user: null, response: NextResponse.json({ message: 'Not authenticated' }, { status: 401 }) }
	}

	const userRole = user.role as Role // Cast the role string from session to your Role enum

	if (!allowedRoles.includes(userRole)) {
		return { user, response: NextResponse.json({ message: 'Forbidden: Insufficient privileges' }, { status: 403 }) }
	}

	return { user, response: null }
}
