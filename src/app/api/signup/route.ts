import { NextResponse } from 'next/server'
import { hashPassword } from '@/lib/passwords'
import { Role } from '@/generated/prisma' // Import Role enum if needed for default assignment
import { db } from '@/lib/db'

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const { email, password, firstName, lastName } = body // Add other fields as needed

		// --- Input Validation ---
		if (!email || !password) {
			return NextResponse.json({ message: 'Email and password are required' }, { status: 400 })
		}

		// Add more robust validation as needed (e.g., password complexity, email format)
		if (password.length < 8) {
			return NextResponse.json({ message: 'Password must be at least 8 characters long' }, { status: 400 })
		}

		// --- Check if user already exists ---
		const existingUser = await db.user.findUnique({
			where: { email: email.toLowerCase() }, // Store emails consistently
		})

		if (existingUser) {
			return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 }) // 409 Conflict
		}

		// --- Hash Password ---
		const passwordHash = await hashPassword(password)

		// --- Create User with profile fields directly ---
		const user = await db.user.create({
			data: {
				email: email.toLowerCase(),
				passwordHash: passwordHash,
				name: firstName + ' ' + lastName,
				firstName: firstName || '',
				lastName: lastName || '',
				role: Role.CUSTOMER, // Or determine role based on signup context
			},
		})

		// Don't send back the password hash!
		return NextResponse.json({ message: 'User created successfully', userId: user.id }, { status: 201 })
	} catch (error) {
		console.error('Registration Error:', error)
		return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 })
	}
}
