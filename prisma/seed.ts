import { PrismaClient, Role } from '../src/generated/prisma'
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
	const suppliersData = [
		{ name: 'Cipla Ltd', contactPerson: 'Rajesh Kumar', email: 'contact@cipla.com', phone: '9876543210', address: 'Mumbai, India' },
		{ name: 'Sun Pharma', contactPerson: 'Anita Sharma', email: 'info@sunpharma.com', phone: '9123456789', address: 'Goregaon, Mumbai' },
		{ name: "Dr. Reddy's", contactPerson: 'Suresh Reddy', email: 'sales@drreddys.com', phone: '9988776655', address: 'Hyderabad, India' },
		{ name: 'Abbott Healthcare', contactPerson: 'Priya Singh', email: 'abbott@health.com', phone: '9001122334', address: 'Bandra, Mumbai' },
		{ name: 'Pfizer India', contactPerson: 'John Mathew', email: 'pfizer@india.com', phone: '9112233445', address: 'Delhi, India' },
	]
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
	const categoriesData = [
		{ name: 'Antibiotics', description: 'Drugs to treat bacterial infections' },
		{ name: 'Pain Relief', description: 'Analgesics and pain management' },
		{ name: 'Antipyretics', description: 'Fever reducing medicines' },
		{ name: 'Vitamins & Supplements', description: 'Nutritional supplements' },
		{ name: 'Antacids', description: 'For acidity and heartburn' },
		{ name: 'Cough & Cold', description: 'Cough syrups and cold remedies' },
		{ name: 'Antidiabetics', description: 'Diabetes management drugs' },
		{ name: 'Antihistamines', description: 'Allergy medications' },
		{ name: 'Cardiac Care', description: 'Heart and blood pressure medicines' },
		{ name: 'Dermatology', description: 'Skin care medicines' },
	]
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
	const reportCategoriesData = [
		{ name: 'Blood Tests', description: 'Routine and advanced blood investigations' },
		{ name: 'Imaging', description: 'X-ray, MRI, CT, Ultrasound' },
		{ name: 'Pathology', description: 'Tissue and cytology reports' },
		{ name: 'Microbiology', description: 'Culture and sensitivity, infection screening' },
		{ name: 'Cardiology', description: 'ECG, Echo, TMT, Holter' },
	]
	for (const rc of reportCategoriesData) {
		await prisma.reportCategory.upsert({
			where: { name: rc.name },
			update: {},
			create: rc,
		})
	}

	// --- Seed Items (Medicines) ---
	const itemsData = [
		{
			name: 'Amoxycillin 500mg Capsule',
			manufacturer: 'Cipla Ltd',
			generic_name: 'Amoxycillin',
			formulation: 'Capsule',
			strength: '500mg',
			unit: 'mg',
			description: 'Broad spectrum antibiotic for bacterial infections.',
			price: 45.0,
			quantity_in_stock: 200,
			expiry_date: new Date('2026-12-31'),
			supplierName: 'Cipla Ltd',
			categoryNames: ['Antibiotics'],
		},
		{
			name: 'Paracetamol 500mg Tablet',
			manufacturer: 'Sun Pharma',
			generic_name: 'Paracetamol',
			formulation: 'Tablet',
			strength: '500mg',
			unit: 'mg',
			description: 'Pain reliever and fever reducer.',
			price: 20.0,
			quantity_in_stock: 500,
			expiry_date: new Date('2027-01-31'),
			supplierName: 'Sun Pharma',
			categoryNames: ['Pain Relief', 'Antipyretics'],
		},
		{
			name: 'Azithromycin 250mg Tablet',
			manufacturer: "Dr. Reddy's",
			generic_name: 'Azithromycin',
			formulation: 'Tablet',
			strength: '250mg',
			unit: 'mg',
			description: 'Antibiotic for respiratory and skin infections.',
			price: 60.0,
			quantity_in_stock: 150,
			expiry_date: new Date('2026-08-31'),
			supplierName: "Dr. Reddy's",
			categoryNames: ['Antibiotics'],
		},
		{
			name: 'Metformin 500mg Tablet',
			manufacturer: 'Sun Pharma',
			generic_name: 'Metformin',
			formulation: 'Tablet',
			strength: '500mg',
			unit: 'mg',
			description: 'First-line medication for type 2 diabetes.',
			price: 35.0,
			quantity_in_stock: 300,
			expiry_date: new Date('2027-03-31'),
			supplierName: 'Sun Pharma',
			categoryNames: ['Antidiabetics'],
		},
		{
			name: 'Cetirizine 10mg Tablet',
			manufacturer: 'Cipla Ltd',
			generic_name: 'Cetirizine',
			formulation: 'Tablet',
			strength: '10mg',
			unit: 'mg',
			description: 'Antihistamine for allergy relief.',
			price: 15.0,
			quantity_in_stock: 250,
			expiry_date: new Date('2026-11-30'),
			supplierName: 'Cipla Ltd',
			categoryNames: ['Antihistamines'],
		},
		{
			name: 'Pantoprazole 40mg Tablet',
			manufacturer: "Dr. Reddy's",
			generic_name: 'Pantoprazole',
			formulation: 'Tablet',
			strength: '40mg',
			unit: 'mg',
			description: 'Proton pump inhibitor for acidity.',
			price: 55.0,
			quantity_in_stock: 180,
			expiry_date: new Date('2027-05-31'),
			supplierName: "Dr. Reddy's",
			categoryNames: ['Antacids'],
		},
		{
			name: 'Vitamin C 500mg Tablet',
			manufacturer: 'Abbott Healthcare',
			generic_name: 'Ascorbic Acid',
			formulation: 'Tablet',
			strength: '500mg',
			unit: 'mg',
			description: 'Vitamin supplement for immunity.',
			price: 30.0,
			quantity_in_stock: 220,
			expiry_date: new Date('2027-02-28'),
			supplierName: 'Abbott Healthcare',
			categoryNames: ['Vitamins & Supplements'],
		},
		{
			name: 'Ibuprofen 400mg Tablet',
			manufacturer: 'Pfizer India',
			generic_name: 'Ibuprofen',
			formulation: 'Tablet',
			strength: '400mg',
			unit: 'mg',
			description: 'NSAID for pain and inflammation.',
			price: 25.0,
			quantity_in_stock: 160,
			expiry_date: new Date('2026-10-31'),
			supplierName: 'Pfizer India',
			categoryNames: ['Pain Relief'],
		},
		{
			name: 'Amlodipine 5mg Tablet',
			manufacturer: 'Sun Pharma',
			generic_name: 'Amlodipine',
			formulation: 'Tablet',
			strength: '5mg',
			unit: 'mg',
			description: 'Calcium channel blocker for hypertension.',
			price: 40.0,
			quantity_in_stock: 140,
			expiry_date: new Date('2027-04-30'),
			supplierName: 'Sun Pharma',
			categoryNames: ['Cardiac Care'],
		},
		{
			name: 'Loratadine 10mg Tablet',
			manufacturer: 'Cipla Ltd',
			generic_name: 'Loratadine',
			formulation: 'Tablet',
			strength: '10mg',
			unit: 'mg',
			description: 'Non-drowsy antihistamine.',
			price: 18.0,
			quantity_in_stock: 120,
			expiry_date: new Date('2026-09-30'),
			supplierName: 'Cipla Ltd',
			categoryNames: ['Antihistamines'],
		},
		{
			name: 'Dolo 650mg Tablet',
			manufacturer: 'Micro Labs',
			generic_name: 'Paracetamol',
			formulation: 'Tablet',
			strength: '650mg',
			unit: 'mg',
			description: 'Pain reliever and fever reducer.',
			price: 22.0,
			quantity_in_stock: 400,
			expiry_date: new Date('2027-01-31'),
			supplierName: 'Sun Pharma',
			categoryNames: ['Pain Relief', 'Antipyretics'],
		},
		{
			name: 'ORS Powder',
			manufacturer: 'Abbott Healthcare',
			generic_name: 'Oral Rehydration Salts',
			formulation: 'Powder',
			strength: 'Standard',
			unit: 'sachet',
			description: 'For dehydration and electrolyte balance.',
			price: 10.0,
			quantity_in_stock: 300,
			expiry_date: new Date('2026-12-31'),
			supplierName: 'Abbott Healthcare',
			categoryNames: ['Vitamins & Supplements'],
		},
		{
			name: 'Betadine Ointment 10%',
			manufacturer: 'Win-Medicare',
			generic_name: 'Povidone Iodine',
			formulation: 'Ointment',
			strength: '10%',
			unit: 'g',
			description: 'Antiseptic for wound care.',
			price: 60.0,
			quantity_in_stock: 80,
			expiry_date: new Date('2026-08-31'),
			supplierName: 'Cipla Ltd',
			categoryNames: ['Dermatology'],
		},
		{
			name: 'Montelukast 10mg Tablet',
			manufacturer: 'Sun Pharma',
			generic_name: 'Montelukast',
			formulation: 'Tablet',
			strength: '10mg',
			unit: 'mg',
			description: 'For asthma and allergies.',
			price: 50.0,
			quantity_in_stock: 90,
			expiry_date: new Date('2027-06-30'),
			supplierName: 'Sun Pharma',
			categoryNames: ['Antihistamines'],
		},
		{
			name: 'Ranitidine 150mg Tablet',
			manufacturer: "Dr. Reddy's",
			generic_name: 'Ranitidine',
			formulation: 'Tablet',
			strength: '150mg',
			unit: 'mg',
			description: 'Reduces stomach acid.',
			price: 28.0,
			quantity_in_stock: 110,
			expiry_date: new Date('2026-07-31'),
			supplierName: "Dr. Reddy's",
			categoryNames: ['Antacids'],
		},
		{
			name: 'Glibenclamide 5mg Tablet',
			manufacturer: 'Pfizer India',
			generic_name: 'Glibenclamide',
			formulation: 'Tablet',
			strength: '5mg',
			unit: 'mg',
			description: 'Oral hypoglycemic for diabetes.',
			price: 32.0,
			quantity_in_stock: 130,
			expiry_date: new Date('2027-02-28'),
			supplierName: 'Pfizer India',
			categoryNames: ['Antidiabetics'],
		},
		{
			name: 'Cough Syrup (Dextromethorphan)',
			manufacturer: 'Abbott Healthcare',
			generic_name: 'Dextromethorphan',
			formulation: 'Syrup',
			strength: '10mg/5ml',
			unit: 'ml',
			description: 'For dry cough relief.',
			price: 65.0,
			quantity_in_stock: 70,
			expiry_date: new Date('2026-11-30'),
			supplierName: 'Abbott Healthcare',
			categoryNames: ['Cough & Cold'],
		},
		{
			name: 'Calcium + Vitamin D3 Tablet',
			manufacturer: 'Cipla Ltd',
			generic_name: 'Calcium Carbonate + Vitamin D3',
			formulation: 'Tablet',
			strength: '500mg/250IU',
			unit: 'mg/IU',
			description: 'For bone health.',
			price: 38.0,
			quantity_in_stock: 210,
			expiry_date: new Date('2027-03-31'),
			supplierName: 'Cipla Ltd',
			categoryNames: ['Vitamins & Supplements'],
		},
		{
			name: 'Losartan 50mg Tablet',
			manufacturer: 'Sun Pharma',
			generic_name: 'Losartan',
			formulation: 'Tablet',
			strength: '50mg',
			unit: 'mg',
			description: 'Angiotensin receptor blocker for hypertension.',
			price: 48.0,
			quantity_in_stock: 100,
			expiry_date: new Date('2027-05-31'),
			supplierName: 'Sun Pharma',
			categoryNames: ['Cardiac Care'],
		},
		{
			name: 'Clotrimazole Cream 1%',
			manufacturer: "Dr. Reddy's",
			generic_name: 'Clotrimazole',
			formulation: 'Cream',
			strength: '1%',
			unit: 'g',
			description: 'Antifungal cream for skin infections.',
			price: 55.0,
			quantity_in_stock: 60,
			expiry_date: new Date('2026-09-30'),
			supplierName: "Dr. Reddy's",
			categoryNames: ['Dermatology'],
		},
	]

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
