import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { Role } from '@/generated/prisma'
import { authorize } from '@/lib/utils/auth-utils' // Import the new utility
import bcrypt from 'bcryptjs'

const paginationSchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(10),
	search: z.string().optional(),
	role: z.string().optional(),
})

/**
 * GET /api/admin/users
 * Lists users.
 * - SUPER_ADMIN and ADMIN can see all users.
 */
export async function GET(req: Request) {
	const authResult = await authorize([Role.ADMIN, Role.SUPER_ADMIN])
	if (authResult.response) {
		return authResult.response
	}
	try {
		const url = new URL(req.url)
		const params = paginationSchema.parse(Object.fromEntries(url.searchParams))
		const { page, limit, search, role } = params

		const where: any = {}
		if (search) {
			where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }]
		}
		if (role) {
			where.role = role
		}

		const [users, total] = await Promise.all([
			db.user.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * limit,
				take: limit,
			}),
			db.user.count({ where }),
		])

		return NextResponse.json({ users, total })
	} catch (error) {
		console.error('[USERS_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

/**
 * POST /api/admin/users
 * Creates a new user.
 * - SUPER_ADMIN can create any user role.
 * - ADMIN can create PHARMACIST, CUSTOMER, SELLER.
 */
export async function POST(req: Request) {
	const authResult = await authorize([Role.ADMIN, Role.SUPER_ADMIN])
	if (authResult.response) {
		return authResult.response
	}
	// User is guaranteed to be non-null here if response was null
	const currentUserRole = authResult.user!.role as Role

	try {
		const body = await req.json()
		const { email, password, name, role: roleToAssign } = body

		if (!email || !password || !roleToAssign || !name) {
			return NextResponse.json({ message: 'Missing required fields: email, password, name, and role are required.' }, { status: 400 })
		}

		if (!Object.values(Role).includes(roleToAssign)) {
			return NextResponse.json({ message: 'Invalid role specified.' }, { status: 400 })
		}

		// Authorization check: Who can create whom?
		if (currentUserRole === Role.ADMIN) {
			if (roleToAssign === Role.ADMIN || roleToAssign === Role.SUPER_ADMIN) {
				return NextResponse.json({ message: 'Admins cannot create other Admins or Super Admins.' }, { status: 403 })
			}
		}
		// SUPER_ADMIN can create any role.

		const existingUser = await db.user.findUnique({
			where: { email },
		})

		if (existingUser) {
			return NextResponse.json({ message: 'User with this email already exists.' }, { status: 409 })
		}

		const hashedPassword = await bcrypt.hash(password, 10)

		// Create user
		const newUser = await db.user.create({
			data: {
				email,
				name,
				passwordHash: hashedPassword,
				role: roleToAssign as Role,
				isActive: true,
				emailVerified: new Date(),
			},
			select: { id: true, email: true, name: true, role: true },
		})

		// If user is CUSTOMER, create Customer entry
		if (roleToAssign === Role.CUSTOMER) {
			await db.customer.create({
				data: {
					name,
					email,
					userId: newUser.id,
					// ...add other fields if needed
				},
			})
		}

		// If user is SELLER, create Supplier entry
		if (roleToAssign === Role.SELLER) {
			await db.supplier.create({
				data: {
					name,
					email,
					userId: newUser.id,
					// ...add other fields if needed
				},
			})
		}

		return NextResponse.json(newUser, { status: 201 })
	} catch (error) {
		console.error('User creation error:', error)
		if (error instanceof SyntaxError) {
			// JSON parsing error
			return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
		}
		return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
	}
}
