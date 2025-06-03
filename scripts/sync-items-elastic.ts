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
		console.log(`Index ${index} already exists, skipping settings update to avoid conflicts`)
		// Skip settings update for existing indices to avoid conflicts
		// Only create if not exists to prevent schema conflicts
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
}

async function ensureAllIndices() {
	for (const [index, config] of Object.entries(indexConfigs)) {
		await ensureIndex(index, config.settings, config.mappings)
	}
}

// Memory-optimized batch sizes for production
const BATCH_SIZES = {
	items: 25, // Reduced from unlimited
	sales: 15, // Sales have more nested data
	customers: 50, // Lighter objects
	users: 100, // Very light objects
}

// Add delay between batches to prevent memory spikes
const BATCH_DELAY = 2000 // 2 seconds

async function syncWithBatching<T>(fetchFn: () => Promise<T[]>, indexName: string, batchSize: number, label: string) {
	console.log(`Syncing ${label} to Elasticsearch...`)

	const items = await fetchFn()
	console.log(`Found ${items.length} ${label} to sync`)

	if (items.length === 0) return

	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize)
		const batchNum = Math.floor(i / batchSize) + 1
		const totalBatches = Math.ceil(items.length / batchSize)

		console.log(`Processing ${label} batch ${batchNum}/${totalBatches} (${batch.length} items)`)

		try {
			// Process batch
			for (const item of batch) {
				await esClient.index({
					index: indexName,
					id: (item as any).id,
					document: item,
				})
			}

			console.log(`✅ ${label} batch ${batchNum} completed`)

			// Add delay between batches to prevent memory overload
			if (i + batchSize < items.length) {
				console.log(`Waiting ${BATCH_DELAY}ms before next batch...`)
				await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
			}
		} catch (error) {
			console.error(`❌ Error processing ${label} batch ${batchNum}:`, error)
			// Continue with next batch instead of failing completely
		}
	}

	console.log(`✅ ${label} sync completed`)
}

async function main() {
	try {
		// Ensure indices exist first
		console.log('Ensuring Elasticsearch indices exist...')
		await ensureAllIndices()

		// Sync in order of importance and memory usage (lightest first)
		await syncWithBatching(() => db.user.findMany({}), ElasticIndex.USERS, BATCH_SIZES.users, 'users')

		await syncWithBatching(() => db.customer.findMany({}), ElasticIndex.CUSTOMERS, BATCH_SIZES.customers, 'customers')

		await syncWithBatching(
			() =>
				db.item.findMany({
					include: {
						categories: true,
						supplier: true,
					},
				}),
			ElasticIndex.ITEMS,
			BATCH_SIZES.items,
			'items',
		)

		await syncWithBatching(
			() =>
				db.sale.findMany({
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
						},
					},
				}),
			ElasticIndex.SALES,
			BATCH_SIZES.sales,
			'sales',
		)

		console.log('🎉 All data synced successfully!')
	} catch (error) {
		console.error('💥 Sync failed:', error)
		process.exit(1)
	}
}

main()
