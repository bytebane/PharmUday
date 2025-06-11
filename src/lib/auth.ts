import { type NextAuthOptions, type User as NextAuthUser, Session, getServerSession } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { comparePassword } from '@/lib/passwords'
import { Role } from '@/generated/prisma'
import { randomBytes } from 'crypto'
import * as argon2 from 'argon2'
import { v4 as uuidv4 } from 'uuid'

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
	await db.refreshToken.deleteMany({
		where: {
			OR: [{ expires: { lt: new Date() } }, { revoked: true }],
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
	await db.refreshToken.create({
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

export const authOptions: NextAuthOptions = {
	adapter: PrismaAdapter(db),
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

				const deviceId = generateDeviceId()
				const refreshToken = await generateRefreshToken(user.id, deviceId, req.headers?.['user-agent'] || 'unknown')

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
