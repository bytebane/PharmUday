import { db } from '@/lib/db'
import { esClient } from '@/lib/elastic'
import { ElasticIndex } from '@/types'

// Utility to create or update index settings and mappings
async function ensureIndex(index: string, settings: any, mappings: object) {
	const exists = await esClient.indices.exists({ index })
	if (!exists) {
		await esClient.indices.create({
			index,
			settings,
			mappings,
		})
		console.log(`Created index: ${index}`)
	} else {
		// Only update dynamic settings for existing indices
		const dynamicSettings = { ...settings }
		delete dynamicSettings.number_of_shards
		await esClient.indices.putSettings({
			index,
			settings: dynamicSettings,
		})
		console.log(`Updated settings for index: ${index}`)
	}
}

const indexConfigs = {
	[ElasticIndex.ITEMS]: {
		settings: {
			number_of_shards: 1,
			number_of_replicas: 0,
			refresh_interval: '1s',
			analysis: {
				analyzer: {
					case_insensitive: {
						type: 'custom',
						tokenizer: 'standard',
						filter: ['lowercase'],
					},
				},
			},
		},
		mappings: {
			properties: {
				id: { type: 'keyword' },
				name: { type: 'text', analyzer: 'case_insensitive' },
				manufacturer: { type: 'text', analyzer: 'case_insensitive' },
				generic_name: { type: 'text', analyzer: 'case_insensitive' },
				formulation: { type: 'text', analyzer: 'case_insensitive' },
				strength: { type: 'text', analyzer: 'case_insensitive' },
				unit: { type: 'text', analyzer: 'case_insensitive' },
				schedule: { type: 'text', analyzer: 'case_insensitive' },
				description: { type: 'text', analyzer: 'case_insensitive' },
				image: { type: 'text', index: false },
				thumbnailUrls: { type: 'keyword' },
				units_per_pack: { type: 'integer' },
				price: { type: 'float' },
				tax_rate: { type: 'float' },
				discount: { type: 'float' },
				reorder_level: { type: 'integer' },
				isActive: { type: 'boolean' },
				isAvailable: { type: 'boolean' },
				quantity_in_stock: { type: 'integer' },
				expiry_date: { type: 'date' },
				purchase_price: { type: 'float' },
				purchase_date: { type: 'date' },
				sales_data: { type: 'object', enabled: false },
				createdAt: { type: 'date' },
				updatedAt: { type: 'date' },
				categories: {
					properties: {
						id: { type: 'keyword' },
						name: { type: 'text', analyzer: 'case_insensitive' },
					},
				},
				supplier: {
					properties: {
						id: { type: 'keyword' },
						name: { type: 'text', analyzer: 'case_insensitive' },
					},
				},
			},
		},
	},
	[ElasticIndex.CUSTOMERS]: {
		settings: {
			number_of_shards: 1,
			number_of_replicas: 0,
			refresh_interval: '1s',
			analysis: {
				analyzer: {
					case_insensitive: {
						type: 'custom',
						tokenizer: 'standard',
						filter: ['lowercase'],
					},
				},
			},
		},
		mappings: {
			properties: {
				id: { type: 'keyword' },
				name: { type: 'text', analyzer: 'case_insensitive' },
				email: { type: 'keyword' },
				phone: { type: 'keyword' },
				address: { type: 'text', analyzer: 'case_insensitive' },
				createdAt: { type: 'date' },
				updatedAt: { type: 'date' },
			},
		},
	},
	[ElasticIndex.USERS]: {
		settings: {
			number_of_shards: 1,
			number_of_replicas: 0,
			refresh_interval: '1s',
			analysis: {
				analyzer: {
					case_insensitive: {
						type: 'custom',
						tokenizer: 'standard',
						filter: ['lowercase'],
					},
				},
			},
		},
		mappings: {
			properties: {
				id: { type: 'keyword' },
				name: { type: 'text', analyzer: 'case_insensitive' },
				email: { type: 'keyword' },
				role: { type: 'keyword' },
				isActive: { type: 'boolean' },
				createdAt: { type: 'date' },
				updatedAt: { type: 'date' },
			},
		},
	},
	[ElasticIndex.SALES]: {
		settings: {
			number_of_shards: 1,
			number_of_replicas: 0,
			refresh_interval: '1s',
			analysis: {
				analyzer: {
					case_insensitive: {
						type: 'custom',
						tokenizer: 'standard',
						filter: ['lowercase'],
					},
				},
			},
		},
		mappings: {
			properties: {
				id: { type: 'keyword' },
				saleDate: { type: 'date' },
				subTotal: { type: 'float' },
				totalDiscount: { type: 'float' },
				totalTax: { type: 'float' },
				grandTotal: { type: 'float' },
				paymentMethod: { type: 'keyword' },
				paymentStatus: { type: 'keyword' },
				amountPaid: { type: 'float' },
				notes: { type: 'text', analyzer: 'case_insensitive' },
				staffId: { type: 'keyword' },
				customerId: { type: 'keyword' },
				createdAt: { type: 'date' },
				updatedAt: { type: 'date' },
				saleItems: {
					properties: {
						id: { type: 'keyword' },
						quantitySold: { type: 'integer' },
						priceAtSale: { type: 'float' },
						discountOnItem: { type: 'float' },
						taxOnItem: { type: 'float' },
						totalPrice: { type: 'float' },
						itemId: { type: 'keyword' },
					},
				},
			},
		},
	},
	[ElasticIndex.REPORTS]: {
		settings: {
			number_of_shards: 1,
			number_of_replicas: 0,
			refresh_interval: '1s',
			analysis: {
				analyzer: {
					case_insensitive: {
						type: 'custom',
						tokenizer: 'standard',
						filter: ['lowercase'],
					},
				},
			},
		},
		mappings: {
			properties: {
				id: { type: 'keyword' },
				title: { type: 'text', analyzer: 'case_insensitive' },
				patientName: { type: 'text', analyzer: 'case_insensitive' },
				reportDate: { type: 'date' },
				fileUrl: { type: 'text', index: false },
				fileType: { type: 'keyword' },
				fileSize: { type: 'integer' },
				notes: { type: 'text', analyzer: 'case_insensitive' },
				categoryId: { type: 'keyword' },
				uploadedById: { type: 'keyword' },
				createdAt: { type: 'date' },
				updatedAt: { type: 'date' },
			},
		},
	},
}

async function ensureAllIndices() {
	for (const [index, config] of Object.entries(indexConfigs)) {
		await ensureIndex(index, config.settings, config.mappings)
	}
}

// Ensure all indices exist before syncing data
ensureAllIndices()

async function syncItems() {
	console.log('Syncing items to Elasticsearch...')
	const items = await db.item.findMany({
		include: {
			categories: true,
			supplier: true,
		},
	})

	console.log(`Found ${items.length} items to sync`)
	for (const item of items) {
		await esClient.index({
			index: ElasticIndex.ITEMS,
			id: item.id,
			document: {
				...item,
			},
		})
		console.log(`Indexed item ${item.id}`)
	}

	console.log('Sync complete!')
}

async function syncCustomers() {
	console.log('Syncing customers to Elasticsearch...')
	const customers = await db.customer.findMany()
	console.log(`Found ${customers.length} customers to sync`)
	for (const customer of customers) {
		await esClient
			.index({
				index: ElasticIndex.CUSTOMERS,
				id: customer.id,
				document: {
					...customer,
				},
			})
			.catch(err => {
				console.error('Error indexing customer:', err)
			})

		console.log(`Indexed customer ${customer.id}`)
	}
}

async function syncUsers() {
	console.log('Syncing users to Elasticsearch...')
	const users = await db.user.findMany({})

	console.log(`Found ${users.length} users to sync`)
	for (const user of users) {
		await esClient
			.index({
				index: ElasticIndex.USERS,
				id: user.id,
				document: {
					...user,
				},
			})
			.catch(err => {
				console.error('Error indexing user:', err)
			})
		console.log(`Indexed user ${user.id}`)
	}
}

async function syncSales() {
	console.log('Syncing sales to Elasticsearch...')
	const sales = await db.sale.findMany({
		include: {
			invoice: true,
			customer: true,
			staff: true,
			saleItems: {
				include: {
					item: {
						select: {
							id: true,
							name: true,
							strength: true,
							formulation: true,
						},
					},
				},
				orderBy: { createdAt: 'asc' },
			},
		},
	})
	console.log(`Found ${sales.length} sales to sync`)
	for (const sale of sales) {
		await esClient
			.index({
				index: ElasticIndex.SALES,
				id: sale.id,
				document: {
					...sale,
				},
			})
			.catch(err => {
				console.error('Error indexing sale:', err)
			})
	}
}

syncUsers().catch(err => {
	console.error('Sync failed:', err)
	process.exit(1)
})

syncCustomers().catch(err => {
	console.error('Sync failed:', err)
	process.exit(1)
})

syncSales().catch(err => {
	console.error('Sync failed:', err)
	process.exit(1)
})

syncItems()
	.catch(err => {
		console.error('Sync failed:', err)
		process.exit(1)
	})
	.finally(() => process.exit(0))
