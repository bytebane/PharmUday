import { type NextAuthOptions, type User as NextAuthUser, Session, getServerSession } from 'next-auth' // Import getServerSession
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db' // Corrected import path for prisma client
import { comparePassword } from '@/lib/passwords' // Import password comparison utility
import { Role } from '@/generated/prisma' // Import Role enum
import { randomBytes } from 'crypto'
import * as argon2 from 'argon2'
import { v4 as uuidv4 } from 'uuid'

// Extend the default User and Session types to include your custom fields (like role)
declare module 'next-auth' {
	interface CustomUser extends NextAuthUser {
		role: Role
		id: string
	}
	interface Session {
		// Ensure the Session.user type includes all properties you add in the session callback
		// Make sure user object in session includes the role
		user: CustomUser & {
			role: Role
			id: string
			name: string // Add name to the session user type
			email: string // Add email to the session user type
			image?: string // Optional image field
			deviceId?: string
		}
		refreshToken?: string
		deviceId?: string
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		role: Role
		// Add other custom fields you want in the JWT
		// isActive: boolean;
		id: string
		refreshToken?: string
		deviceId?: string
	}
}

// Convert minutes to seconds for NextAuth
const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE) * 60 || 15 * 60 // Default to 15 minutes if not set
const JWT_MAX_AGE = Number(process.env.JWT_MAX_AGE) * 60 || 15 * 60 // Default to 15 minutes if not set
const REFRESH_TOKEN_MAX_AGE = 5 * 60 * 1000 // 5 minutes for testing
const REFRESH_TOKEN_EXPIRY_THRESHOLD = 1 * 60 * 1000 // 1 minute for testing
const MAX_CONCURRENT_SESSIONS = 5 // Maximum number of concurrent sessions per user

// Helper function to get device information
function getDeviceInfo(userAgent: string) {
	return {
		userAgent,
		timestamp: new Date().toISOString(),
	}
}

// Helper function to generate a device ID
function generateDeviceId(): string {
	return `device_${uuidv4()}`
}

// Helper function to generate a refresh token
async function generateRefreshToken(userId: string, deviceId: string, userAgent: string) {
	// Clean up expired tokens
	const expiredTokens = await db.refreshToken.deleteMany({
		where: {
			OR: [{ expires: { lt: new Date() } }, { revoked: true }],
		},
	})

	// Only revoke expired tokens for this device
	const revokedTokens = await db.refreshToken.updateMany({
		where: {
			userId,
			deviceId,
			revoked: false,
			expires: { lt: new Date() }, // Only revoke expired tokens
		},
		data: {
			revoked: true,
		},
	})

	// Check if user has reached maximum concurrent sessions
	const activeTokens = await db.refreshToken.count({
		where: {
			userId,
			revoked: false,
			expires: { gt: new Date() },
		},
	})

	if (activeTokens >= MAX_CONCURRENT_SESSIONS) {
		throw new Error('Maximum number of concurrent sessions reached')
	}

	const token = randomBytes(32).toString('hex')
	const hashedToken = await argon2.hash(token, {
		type: argon2.argon2id,
		memoryCost: 2 ** 16,
		timeCost: 3,
		parallelism: 1,
	})

	const expires = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE)

	// Store the refresh token in the database
	const newToken = await db.refreshToken.create({
		data: {
			tokenHash: hashedToken,
			userId,
			deviceId,
			deviceInfo: getDeviceInfo(userAgent),
			expires,
		},
	})
	return token
}

// Helper function to verify a refresh token
async function verifyRefreshToken(token: string, userId: string, deviceId: string) {
	// Clean up expired tokens
	const expiredTokens = await db.refreshToken.deleteMany({
		where: {
			OR: [{ expires: { lt: new Date() } }, { revoked: true }],
		},
	})

	// Find the token for this specific device
	const refreshToken = await db.refreshToken.findFirst({
		where: {
			userId,
			deviceId,
			revoked: false,
			expires: { gt: new Date() },
		},
	})

	if (!refreshToken) {
		return false
	}

	const isValid = await argon2.verify(refreshToken.tokenHash, token)
	if (!isValid) {
		await db.refreshToken.update({
			where: { id: refreshToken.id },
			data: { revoked: true },
		})
		return false
	}

	return true
}

export const authOptions: NextAuthOptions = {
	adapter: PrismaAdapter(db), // Use Prisma adapter with your client
	providers: [
		CredentialsProvider({
			name: 'Credentials',
			credentials: {
				email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
				password: { label: 'Password', type: 'password' },
			},
			async authorize(credentials, req) {
				if (!credentials?.email || !credentials.password) {
					throw new Error('Please enter both email and password')
				}

				const user = await db.user.findUnique({
					where: { email: credentials.email },
				})

				if (!user) {
					throw new Error('No user found with this email')
				}

				if (!user.passwordHash) {
					throw new Error('Invalid account configuration')
				}

				const isPasswordValid = await comparePassword(credentials.password, user.passwordHash)
				if (!isPasswordValid) {
					throw new Error('Invalid password')
				}

				const deviceId = generateDeviceId()
				const refreshToken = await generateRefreshToken(user.id, deviceId, req.headers?.['user-agent'] || 'unknown')

				// Return user object that matches the session/JWT structure
				return {
					id: user.id,
					email: user.email,
					name: user.name,
					role: user.role,
					firstName: user.firstName,
					lastName: user.lastName,
					phoneNumber: user.phoneNumber,
					address: user.address,
					refreshToken,
					deviceId,
				}
			},
		}),
		// Add other providers if needed (e.g., Google, GitHub)
	],
	session: {
		strategy: 'jwt', // Use JWT for session strategy (common for credentials provider)
		maxAge: SESSION_MAX_AGE, // 15 minutes
	},
	jwt: {
		maxAge: JWT_MAX_AGE, // 15 minutes
	},
	callbacks: {
		// Include user role and ID in the JWT
		async jwt({ token, user }) {
			if (user) {
				const customUser = user as NextAuthUser & { id: string; role: Role; refreshToken?: string; deviceId?: string }
				token.id = customUser.id
				token.role = customUser.role
				token.refreshToken = customUser.refreshToken
				token.deviceId = customUser.deviceId
			}
			return token
		},
		// Include user role and ID in the session object
		async session({ session, token }) {
			if (token && session.user) {
				session.user.id = token.id
				session.user.role = token.role
				session.refreshToken = token.refreshToken
				session.deviceId = token.deviceId
			}
			return session
		},
	},
	pages: {
		signIn: '/login',
		error: '/login',
	},
	debug: process.env.NODE_ENV === 'development', // Enable debug messages in development
	// Define custom pages if needed
	// pages: {
	//   signIn: '/auth/signin',
	//   signOut: '/auth/signout',
	//   error: '/auth/error', // Error code passed in query string as ?error=
	//   verifyRequest: '/auth/verify-request', // (used for email/passwordless login)
	//   newUser: '/auth/new-user' // New users will be directed here on first sign in (leave the property out to disable)
	// }
}

// Helper function to get session in server components/API routes
export const getCurrentUser = async (): Promise<Session['user'] | null> => {
	const session = await getServerSession(authOptions)
	// The session object already contains the user structure defined in the session callback
	// Adjust the return type if your session callback structure is different
	return session?.user ?? null
}
// Helper function to refresh the session using a refresh token
export async function refreshSession(refreshToken: string, userId: string, deviceId: string) {
	// Find the current refresh token
	const currentToken = await db.refreshToken.findFirst({
		where: {
			userId,
			deviceId,
			revoked: false,
			expires: { gt: new Date() },
		},
		orderBy: {
			createdAt: 'desc',
		},
	})

	if (!currentToken) {
		return null
	}

	// Verify the current token
	const isValid = await argon2.verify(currentToken.tokenHash, refreshToken)
	if (!isValid) {
		await db.refreshToken.update({
			where: { id: currentToken.id },
			data: { revoked: true },
		})
		return null
	}

	// Check if token is about to expire (within 1 minute)
	const isExpiringSoon = currentToken.expires.getTime() - Date.now() < REFRESH_TOKEN_EXPIRY_THRESHOLD

	let newRefreshToken = refreshToken
	if (isExpiringSoon) {
		// Generate a new refresh token only if the current one is about to expire
		newRefreshToken = await generateRefreshToken(userId, deviceId, 'refresh')
	}

	// Get the user
	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			name: true,
			role: true,
			firstName: true,
			lastName: true,
			phoneNumber: true,
			address: true,
		},
	})

	if (!user) {
		return null
	}

	return {
		user,
		refreshToken: newRefreshToken,
		deviceId,
	}
}
