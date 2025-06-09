import { type NextAuthOptions, type User as NextAuthUser, Session, getServerSession } from 'next-auth' // Import getServerSession
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db' // Corrected import path for prisma client
import { comparePassword } from '@/lib/passwords' // Import password comparison utility
import { Role } from '@/generated/prisma' // Import Role enum
import { randomBytes } from 'crypto'
import * as argon2 from 'argon2'

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
		}
		refreshToken?: string
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		role: Role
		// Add other custom fields you want in the JWT
		// isActive: boolean;
		id: string
		refreshToken?: string
	}
}

// Convert minutes to seconds for NextAuth
const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE) * 60 || 15 * 60 // Default to 15 minutes if not set
const JWT_MAX_AGE = Number(process.env.JWT_MAX_AGE) * 60 || 15 * 60 // Default to 15 minutes if not set
const REFRESH_TOKEN_MAX_AGE = 60 * 1000 // 60 seconds in seconds
// const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

// Helper function to generate a refresh token
async function generateRefreshToken(userId: string) {
	console.log(`[RefreshToken] Generating new token for user ${userId}`)

	// Clean up any existing tokens before creating a new one
	const deletedTokens = await db.refreshToken.deleteMany({
		where: {
			userId,
			OR: [{ expires: { lt: new Date() } }, { revoked: true }],
		},
	})
	console.log(`[RefreshToken] Cleaned up ${deletedTokens.count} old tokens for user ${userId}`)

	const token = randomBytes(32).toString('hex')
	const hashedToken = await argon2.hash(token, {
		type: argon2.argon2id,
		memoryCost: 2 ** 16,
		timeCost: 3,
		parallelism: 1,
	})

	// Store the refresh token in the database
	const newToken = await db.refreshToken.create({
		data: {
			tokenHash: hashedToken,
			userId,
			expires: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000),
		},
	})
	console.log(`[RefreshToken] Created new token ${newToken.id} for user ${userId}, expires at ${newToken.expires}`)

	return token
}

// Helper function to verify a refresh token
async function verifyRefreshToken(token: string, userId: string) {
	console.log(`[RefreshToken] Verifying token for user ${userId}`)

	// First, clean up any expired tokens
	const deletedTokens = await db.refreshToken.deleteMany({
		where: {
			userId,
			OR: [{ expires: { lt: new Date() } }, { revoked: true }],
		},
	})
	console.log(`[RefreshToken] Cleaned up ${deletedTokens.count} expired/revoked tokens for user ${userId}`)

	// Find the most recent valid token
	const refreshToken = await db.refreshToken.findFirst({
		where: {
			userId,
			revoked: false,
			expires: {
				gt: new Date(),
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	})

	if (!refreshToken) {
		console.log(`[RefreshToken] No valid token found for user ${userId}`)
		return false
	}
	console.log(`[RefreshToken] Found valid token ${refreshToken.id} for user ${userId}, expires at ${refreshToken.expires}`)

	const isValid = await argon2.verify(refreshToken.tokenHash, token)
	if (!isValid) {
		console.log(`[RefreshToken] Token ${refreshToken.id} is invalid for user ${userId}`)
		// If token is invalid, mark it as revoked
		await db.refreshToken.update({
			where: { id: refreshToken.id },
			data: { revoked: true },
		})
		return false
	}

	// Revoke the used token
	await db.refreshToken.update({
		where: { id: refreshToken.id },
		data: { revoked: true },
	})
	console.log(`[RefreshToken] Successfully verified and revoked token ${refreshToken.id} for user ${userId}`)

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
			async authorize(credentials) {
				if (!credentials?.email || !credentials.password) {
					return null // Missing credentials
				}

				const user = await db.user.findUnique({
					where: { email: credentials.email },
				})

				// Check if user exists and password is correct
				if (user && user.passwordHash && (await comparePassword(credentials.password, user.passwordHash))) {
					// Generate refresh token on successful login
					const refreshToken = await generateRefreshToken(user.id)

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
						refreshToken, // Include refresh token in the user object
					}
				} else {
					return null // Authentication failed
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
				// Explicitly type user as CustomUser to avoid 'any' type error
				const customUser = user as NextAuthUser & { id: string; role: Role; refreshToken?: string }
				token.id = customUser.id
				token.role = customUser.role
				token.refreshToken = customUser.refreshToken
				// token.isActive = customUser.isActive; // Add other fields if needed
			}
			return token
		},
		// Include user role and ID in the session object
		async session({ session, token }) {
			if (token && session.user) {
				session.user.id = token.id
				session.user.role = token.role
				session.refreshToken = token.refreshToken
				// session.user.isActive = token.isActive; // Add other fields if needed
			}
			return session
		},
	},
	pages: {
		signIn: '/login',
		error: '/login',
	},
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
export async function refreshSession(refreshToken: string, userId: string) {
	console.log(`[RefreshSession] Attempting to refresh session for user ${userId}`)

	const isValid = await verifyRefreshToken(refreshToken, userId)
	if (!isValid) {
		console.log(`[RefreshSession] Invalid refresh token for user ${userId}`)
		return null
	}

	// Generate a new refresh token
	const newRefreshToken = await generateRefreshToken(userId)
	console.log(`[RefreshSession] Generated new refresh token for user ${userId}`)

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
		console.log(`[RefreshSession] User ${userId} not found`)
		return null
	}

	console.log(`[RefreshSession] Successfully refreshed session for user ${userId}`)
	return {
		user,
		refreshToken: newRefreshToken,
	}
}
