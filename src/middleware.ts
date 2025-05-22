import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt' // Use getToken for middleware

export async function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl

	// --- Define Public Paths ---
	// These paths are accessible without authentication
	const publicPaths = ['/login', '/signup', '/api/auth', '/api/signup'] // Add any other public paths/APIs

	// Check if the current path starts with any of the public paths
	const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

	// Allow requests to public paths and internal Next.js paths/assets
	if (isPublicPath || pathname.startsWith('/_next/') || pathname.startsWith('/static/') || pathname.includes('.')) {
		return NextResponse.next()
	}

	// --- Check Authentication ---
	// Use getToken to get the JWT payload without hitting the database
	const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

	// --- Redirect Logic ---
	const loginUrl = new URL('/login', req.url)

	if (!token) {
		// If no token and trying to access a protected route, redirect to login
		loginUrl.searchParams.set('callbackUrl', pathname) // Optionally add callback URL
		return NextResponse.redirect(loginUrl)
	}

	// --- RBAC: Restrict certain API routes to privileged roles ---
	const adminOnlyApiPatterns = [
		/^\/api\/categories/,
		// /^\/api\/report-categories/,
		// /^\/api\/sales/,
		// Add more as needed
	]

	const privilegedRoles = ['ADMIN', 'SUPER_ADMIN', 'PHARMACIST']

	if (adminOnlyApiPatterns.some(pattern => pattern.test(pathname)) && !privilegedRoles.includes(token.role)) {
		return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
	}

	// If authenticated and authorized, allow the request to proceed
	return NextResponse.next()
}

// --- Matcher Configuration ---
// Apply middleware to all paths except those explicitly excluded above (like _next, static, files)
export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes - handled specifically above if needed)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - login, signup (public pages - handled specifically above)
		 */
		'/((?!api/auth|_next/static|_next/image|favicon.ico|login|signup).*)',
		'/api/categories/:path*',
		// '/api/report-categories/:path*',
		// '/api/sales/:path*',
	],
}
