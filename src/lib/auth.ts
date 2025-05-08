import { type NextAuthOptions, type User as NextAuthUser, Session, getServerSession } from 'next-auth' // Import getServerSession
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db, db as prisma } from '@/lib/db' // Corrected import path for prisma client
import { comparePassword } from '@/lib/passwords' // Import password comparison utility
import { Role } from '@/generated/prisma' // Import Role enum

// Extend the default User and Session types to include your custom fields (like role)
declare module 'next-auth' {
	interface User extends NextAuthUser {
		role: Role
		// Add other custom fields from your User model if needed in the session/token
		// isActive: boolean;
	}
	interface Session {
		// Ensure the Session.user type includes all properties you add in the session callback
		user: {
			// This structure should match what you return in the session callback
			// Make sure user object in session includes the role
			id: string // Add id to the session user
			role: Role // Add role to the session user type
			name: string // Add name to the session user type
			email: string // Add email to the session user type
			image?: string // Optional image field
		}
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		role: Role
		// Add other custom fields you want in the JWT
		// isActive: boolean;
		id: string
	}
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

				const user = await prisma.user.findUnique({
					where: { email: credentials.email },
				})

				// Check if user exists and password is correct
				if (user && user.passwordHash && (await comparePassword(credentials.password, user.passwordHash))) {
					// Return user object that matches the session/JWT structure
					return { id: user.id, email: user.email, name: user.email, role: user.role /* add other fields if needed */ }
				} else {
					return null // Authentication failed
				}
			},
		}),
		// Add other providers if needed (e.g., Google, GitHub)
	],
	session: {
		strategy: 'jwt', // Use JWT for session strategy (common for credentials provider)
	},
	callbacks: {
		// Include user role and ID in the JWT
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id
				token.role = user.role
				// token.isActive = user.isActive; // Add other fields if needed
			}
			return token
		},
		// Include user role and ID in the session object
		async session({ session, token }) {
			if (token && session.user) {
				session.user.id = token.id
				session.user.role = token.role
				// session.user.isActive = token.isActive; // Add other fields if needed
			}
			return session
		},
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
