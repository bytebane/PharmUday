import { PrismaClient, Role } from '../src/generated/prisma'
import bcrypt from 'bcryptjs'
import { categoriesData, itemsData, reportCategoriesData, suppliersData } from './constants'

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

	let superAdminId: string
	if (!existingSuperAdmin) {
		const hashedSuperAdminPassword = await bcrypt.hash(superAdminPassword, 10)
		const superAdmin = await prisma.user.create({
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
		superAdminId = superAdmin.id
	} else {
		console.log(`Super Admin with email ${superAdminEmail} already exists.`)
		superAdminId = existingSuperAdmin.id
	}

	// --- Seed Suppliers ---
	const suppliers = []
	for (const s of suppliersData) {
		const supplier = await prisma.supplier.upsert({
			where: { email: s.email },
			update: {},
			create: s,
		})
		suppliers.push(supplier)
	}

	// --- Seed Categories ---

	const categories = []
	for (const c of categoriesData) {
		const category = await prisma.category.upsert({
			where: { name: c.name },
			update: {},
			create: c,
		})
		categories.push(category)
	}

	// --- Seed Report Categories ---

	for (const rc of reportCategoriesData) {
		await prisma.reportCategory.upsert({
			where: { name: rc.name },
			update: {},
			create: rc,
		})
	}

	for (const item of itemsData) {
		const supplier = suppliers.find(s => s.name === item.supplierName)
		const categoryIds = categories.filter(c => item.categoryNames.includes(c.name)).map(c => ({ id: c.id }))
		// Try to find existing item by name (since name is not unique)
		const existingItem = await prisma.item.findFirst({
			where: { name: item.name },
			select: { id: true },
		})

		await prisma.item.upsert({
			where: { id: existingItem?.id ?? '' }, // If not found, use empty string (will create)
			update: {},
			create: {
				name: item.name,
				manufacturer: item.manufacturer,
				generic_name: item.generic_name,
				formulation: item.formulation,
				strength: item.strength,
				unit: item.unit,
				description: item.description,
				price: item.price,
				quantity_in_stock: item.quantity_in_stock,
				expiry_date: item.expiry_date,
				isActive: true,
				isAvailable: true,
				supplier: supplier ? { connect: { id: supplier.id } } : undefined,
				categories: { connect: categoryIds },
			},
		})
	}

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
