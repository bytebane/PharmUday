import { PrismaClient, Role } from '../src/generated/prisma' // Assuming Role is exported from @prisma/client
// If Role is in src/generated/prisma, adjust the import:
// import { Role } from '../src/generated/prisma';
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
	console.log('Start seeding ...')

	// --- Seed Super Admin ---
	const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com'
	const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'superStrongPass123!' // CHANGE THIS IN .env
	const superAdminName = 'Super Administrator'

	if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
		console.warn('Warning: SUPER_ADMIN_EMAIL and/or SUPER_ADMIN_PASSWORD not set in .env. Using default credentials for seeding. PLEASE CHANGE THESE FOR PRODUCTION.')
	}

	const existingSuperAdmin = await prisma.user.findUnique({
		where: { email: superAdminEmail },
	})

	if (!existingSuperAdmin) {
		const hashedSuperAdminPassword = await bcrypt.hash(superAdminPassword, 10)
		await prisma.user.create({
			data: {
				email: superAdminEmail,
				name: superAdminName,
				passwordHash: hashedSuperAdminPassword,
				role: Role.SUPER_ADMIN,
				isActive: true,
				emailVerified: new Date(),
			},
		})
		console.log(`Super Admin "${superAdminName}" created with email ${superAdminEmail}`)
	} else {
		console.log(`Super Admin with email ${superAdminEmail} already exists.`)
	}

	// You can add more seed data here, e.g., a regular Admin
	// const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
	// ... and so on

	console.log('Seeding finished.')
}

main()
	.catch(e => {
		console.error('Error during seeding:', e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
