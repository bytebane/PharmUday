import { PrismaClient, Role } from '../src/generated/prisma' // Adjust path if your generated client is elsewhere
import { faker } from '@faker-js/faker'
import { hashPassword } from '../src/lib/passwords' // Assuming you have a hashPassword utility

const prisma = new PrismaClient()

async function main() {
	console.log('Start seeding ...')

	// --- Clean up existing data (optional) ---
	// Be careful with this in production!
	// await prisma.item.deleteMany();
	// await prisma.category.deleteMany();
	// await prisma.supplier.deleteMany();
	// await prisma.user.deleteMany(); // If seeding users too

	// --- Seed Users (Example) ---
	const hashedPassword = await hashPassword('password123') // Use a secure password in real scenarios
	const adminUser = await prisma.user.upsert({
		where: { email: 'admin@pharmpilot.com' },
		update: {},
		create: {
			email: 'admin@pharmpilot.com',
			passwordHash: hashedPassword,
			role: Role.ADMIN,
			isActive: true,
		},
	})
	console.log(`Created admin user: ${adminUser.email}`)

	// --- Seed Categories ---
	const categoriesData = [{ name: 'Pain Relief', description: 'Medications for pain management' }, { name: 'Cold & Flu', description: 'Remedies for cold and flu symptoms' }, { name: 'Vitamins & Supplements' }, { name: 'First Aid' }, { name: 'Digestive Health' }]
	const createdCategories = []
	for (const catData of categoriesData) {
		const category = await prisma.category.upsert({
			where: { name: catData.name },
			update: {},
			create: catData,
		})
		createdCategories.push(category)
		console.log(`Created category: ${category.name}`)
	}

	// --- Seed Suppliers ---
	const suppliersData = [
		{ name: 'MediSupply Inc.', email: 'sales@medisupply.com', phone: '555-1234' },
		{ name: 'PharmaDistributors Ltd.', email: 'orders@pharmadist.com', address: '123 Main St' },
		{ name: 'HealthWell Suppliers', phone: '555-5678' },
	]
	const createdSuppliers = []
	for (const supData of suppliersData) {
		const supplier = await prisma.supplier.upsert({
			where: { email: supData.email ?? `${supData.name}@example.com` }, // Need a unique field for upsert
			update: {},
			create: supData,
		})
		createdSuppliers.push(supplier)
		console.log(`Created supplier: ${supplier.name}`)
	}

	// --- Seed Items ---
	console.log('Creating items...')
	for (let i = 0; i < 25; i++) {
		// Create 25 dummy items
		const randomCategory = faker.helpers.arrayElement(createdCategories)
		const randomSupplier = faker.helpers.arrayElement(createdSuppliers)

		await prisma.item.create({
			data: {
				name: faker.commerce.productName() + ` ${faker.number.int({ min: 50, max: 500 })}mg`,
				manufacturer: faker.company.name(),
				generic_name: faker.lorem.words(2),
				formulation: faker.helpers.arrayElement(['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream']),
				strength: `${faker.number.int({ min: 10, max: 1000 })}${faker.helpers.arrayElement(['mg', 'ml', 'mcg'])}`,
				price: parseFloat(faker.commerce.price({ min: 1, max: 100 })),
				quantity_in_stock: faker.number.int({ min: 0, max: 200 }),
				reorder_level: faker.number.int({ min: 10, max: 50 }),
				expiry_date: faker.date.future({ years: 2 }),
				purchase_price: parseFloat(faker.commerce.price({ min: 0.5, max: 80 })),
				supplierId: randomSupplier.id,
				categories: {
					connect: { id: randomCategory.id }, // Connect to one random category
				},
				isActive: faker.datatype.boolean(0.9), // 90% chance of being active
			},
		})
	}
	console.log('Items created.')

	console.log('Seeding finished.')
}

main()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
