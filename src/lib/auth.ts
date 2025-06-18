import { type NextAuthOptions, type User as NextAuthUser, Session, getServerSession } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { comparePassword } from '@/lib/passwords'
import { Role } from '@/generated/prisma'
import { randomBytes, createHash } from 'crypto'
import * as argon2 from 'argon2'

// Extend the default User and Session types to include your custom fields
declare module 'next-auth' {
	interface CustomUser extends NextAuthUser {
		role: Role
		id: string
		isActive?: boolean
	}
	interface Session {
		user: CustomUser & {
			role: Role
			id: string
			name: string
			email: string
			image?: string
			isActive?: boolean
		}
		refreshToken?: string
		deviceId?: string
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		role: Role
		id: string
		refreshToken?: string
		deviceId?: string
		isActive?: boolean
	}
}

// Environment variables with defaults
const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE) * 60 || 15 * 60 // Default to 15 minutes
const JWT_MAX_AGE = Number(process.env.JWT_MAX_AGE) * 60 || 15 * 60 // Default to 15 minutes
const REFRESH_TOKEN_MAX_AGE = Number(process.env.REFRESH_TOKEN_MAX_AGE) * 60 * 1000 || 5 * 60 * 1000 // Default to 5 minutes
const REFRESH_TOKEN_EXPIRY_THRESHOLD = Number(process.env.REFRESH_TOKEN_EXPIRY_THRESHOLD) * 60 * 1000 || 1 * 60 * 1000 // Default to 1 minute
const MAX_CONCURRENT_SESSIONS = Number(process.env.MAX_CONCURRENT_SESSIONS) || 5 // Default to 5
const REVOKED_SESSION_RETENTION_DAYS = Number(process.env.REVOKED_SESSION_RETENTION_DAYS) || 30 // Default to 30 days

// Helper function to get device information
function getDeviceInfo(deviceInfo: any) {
	return {
		...deviceInfo,
		timestamp: new Date().toISOString(),
	}
}

// Helper function to generate a device ID
function generateDeviceId(deviceInfo: any): string {
	// Create a stable hash of the device info
	const deviceString = JSON.stringify(deviceInfo)
	return `device_${createHash('sha256').update(deviceString).digest('hex')}`
}

// Helper function to clean up old revoked sessions
async function cleanupRevokedSessions() {
	const retentionDate = new Date()
	retentionDate.setDate(retentionDate.getDate() - REVOKED_SESSION_RETENTION_DAYS)

	await db.refreshToken.deleteMany({
		where: {
			AND: [{ revoked: true }, { updatedAt: { lt: retentionDate } }],
		},
	})
}

// Helper function to generate a refresh token
async function generateRefreshToken(userId: string, deviceId: string, deviceInfo: any) {
	// Clean up expired tokens and old revoked sessions
	await Promise.all([
		db.refreshToken.deleteMany({
			where: {
				expires: { lt: new Date() },
			},
		}),
		cleanupRevokedSessions(),
	])

	// First, check for existing token for this device
	const existingToken = await db.refreshToken.findFirst({
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

	// If we have a valid token for this device, return it
	if (existingToken) {
		return existingToken.tokenHash
	}

	// Check if user has reached maximum concurrent sessions
	const activeTokens = await db.refreshToken.count({
		where: {
			userId,
			revoked: false,
			expires: { gt: new Date() },
		},
	})

	if (activeTokens >= MAX_CONCURRENT_SESSIONS) {
		// Get all active tokens ordered by last activity
		const activeTokens = await db.refreshToken.findMany({
			where: {
				userId,
				revoked: false,
				expires: { gt: new Date() },
			},
			orderBy: {
				updatedAt: 'asc', // Order by last activity
			},
		})

		// Revoke the least recently active token that's not from the current device
		const tokenToRevoke = activeTokens.find(token => token.deviceId !== deviceId)

		if (tokenToRevoke) {
			await db.refreshToken.update({
				where: { id: tokenToRevoke.id },
				data: {
					revoked: true,
					updatedAt: new Date(), // Update the timestamp when revoking
				},
			})
		} else {
			// If all tokens are from the same device, revoke the oldest one
			await db.refreshToken.update({
				where: { id: activeTokens[0].id },
				data: {
					revoked: true,
					updatedAt: new Date(), // Update the timestamp when revoking
				},
			})
		}
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
	await db.refreshToken.create({
		data: {
			tokenHash: hashedToken,
			userId,
			deviceId,
			deviceInfo: getDeviceInfo(deviceInfo),
			expires,
		},
	})
	return token
}

export const authOptions: NextAuthOptions = {
	adapter: PrismaAdapter(db),
	providers: [
		CredentialsProvider({
			name: 'Credentials',
			credentials: {
				email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
				password: { label: 'Password', type: 'password' },
				deviceInfo: { label: 'Device Info', type: 'text' },
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

				if (!user.isActive) {
					throw new Error('Account is inactive. Please contact support to activate your account.')
				}

				if (!user.passwordHash) {
					throw new Error('Invalid account configuration')
				}

				const isPasswordValid = await comparePassword(credentials.password, user.passwordHash)
				if (!isPasswordValid) {
					throw new Error('Invalid password')
				}

				// Parse device info from credentials or use user agent as fallback
				const deviceInfo = credentials.deviceInfo ? JSON.parse(credentials.deviceInfo) : { userAgent: req.headers?.['user-agent'] || 'unknown' }

				const deviceId = generateDeviceId(deviceInfo)
				const refreshToken = await generateRefreshToken(user.id, deviceId, deviceInfo)

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
					isActive: user.isActive,
				}
			},
		}),
	],
	session: {
		strategy: 'jwt',
		maxAge: SESSION_MAX_AGE,
	},
	jwt: {
		maxAge: JWT_MAX_AGE,
	},
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				const customUser = user as NextAuthUser & { id: string; role: Role; refreshToken?: string; deviceId?: string; isActive?: boolean }
				token.id = customUser.id
				token.role = customUser.role
				token.refreshToken = customUser.refreshToken
				token.deviceId = customUser.deviceId
				token.isActive = customUser.isActive
			}
			return token
		},
		async session({ session, token }) {
			if (token && session.user) {
				session.user.id = token.id
				session.user.role = token.role
				session.refreshToken = token.refreshToken
				session.deviceId = token.deviceId
				session.user.isActive = token.isActive as boolean
			}
			return session
		},
	},
	pages: {
		signIn: '/login',
		error: '/login',
	},
	debug: process.env.NODE_ENV === 'development',
}

// Helper function to get session in server components/API routes
export const getCurrentUser = async (): Promise<Session['user'] | null> => {
	const session = await getServerSession(authOptions)
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
			isActive: true,
		},
	})

	if (!user) {
		return null
	}

	// Check if user is inactive
	if (!user.isActive) {
		// Revoke all refresh tokens for this user
		await db.refreshToken.updateMany({
			where: {
				userId,
				revoked: false,
			},
			data: {
				revoked: true,
			},
		})
		return null
	}

	// Check if token is about to expire
	const isExpiringSoon = currentToken.expires.getTime() - Date.now() < REFRESH_TOKEN_EXPIRY_THRESHOLD

	let newRefreshToken = refreshToken
	if (isExpiringSoon) {
		// Generate a new refresh token only if the current one is about to expire
		newRefreshToken = await generateRefreshToken(userId, deviceId, 'refresh')
	}

	return {
		user,
		refreshToken: newRefreshToken,
		deviceId,
	}
}
