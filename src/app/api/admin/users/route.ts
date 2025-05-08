import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; // Adjusted path to your authOptions
import { db as prisma } from '@/lib/db'; // Adjusted path to your prisma client
import { Role } from '@/generated/prisma'; // Adjusted path to your generated Role enum
import bcrypt from 'bcryptjs';

/**
 * GET /api/admin/users
 * Lists users.
 * - SUPER_ADMIN and ADMIN can see all users.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ message: 'Forbidden: Insufficient privileges' }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        emailVerified: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * Creates a new user.
 * - SUPER_ADMIN can create any user role.
 * - ADMIN can create PHARMACIST, CUSTOMER, SELLER.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const currentUserRole = session.user.role;

  if (currentUserRole !== Role.ADMIN && currentUserRole !== Role.SUPER_ADMIN) {
    return NextResponse.json({ message: 'Forbidden: Insufficient privileges' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, password, name, role: roleToAssign } = body;

    if (!email || !password || !roleToAssign || !name) {
      return NextResponse.json({ message: 'Missing required fields: email, password, name, and role are required.' }, { status: 400 });
    }

    if (!Object.values(Role).includes(roleToAssign)) {
        return NextResponse.json({ message: 'Invalid role specified.' }, { status: 400 });
    }

    // Authorization check: Who can create whom?
    if (currentUserRole === Role.ADMIN) {
      if (roleToAssign === Role.ADMIN || roleToAssign === Role.SUPER_ADMIN) {
        return NextResponse.json({ message: 'Admins cannot create other Admins or Super Admins.' }, { status: 403 });
      }
    }
    // SUPER_ADMIN can create any role.

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
        role: roleToAssign as Role,
        isActive: true, // New users are active by default
        // For admin-created users, you might consider them verified or skip verification.
        emailVerified: new Date(), // Or null, depending on your logic
      },
      select: { // Only return non-sensitive fields
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    });

    return NextResponse.json(newUser, { status: 201 });

  } catch (error) {
    console.error('User creation error:', error);
    if (error instanceof SyntaxError) { // JSON parsing error
        return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
