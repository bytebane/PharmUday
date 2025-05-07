import { Category as PrismaCategory, Supplier as PrismaSupplier, Item as PrismaItem } from '@/generated/prisma'

// Basic types for relations when included
export type BasicCategory = Pick<PrismaCategory, 'id' | 'name'>
export type BasicSupplier = Pick<PrismaSupplier, 'id' | 'name'>

// Extended Item type including relations
export type ItemWithRelations = PrismaItem & {
	categories: BasicCategory[]
	supplier: BasicSupplier | null
}

// You can define specific types for form data if they differ significantly
// from the Prisma types, especially for creation/update payloads.

// Example for Item form data (matching Zod schema)
export type ItemFormData = {
	name: string
	manufacturer?: string | null
	generic_name?: string | null
	formulation?: string | null
	strength?: string | null
	unit?: string | null
	schedule?: string | null
	description?: string | null
	image?: string | null
	thumbnailUrls?: string[]
	units_per_pack?: number | null
	price: number
	tax_rate?: number | null
	discount?: number | null
	reorder_level?: number | null
	isActive?: boolean
	isAvailable?: boolean
	quantity_in_stock?: number
	expiry_date?: Date | null
	purchase_price?: number | null
	purchase_date?: Date | null
	categoryIds?: string[]
	supplierId?: string | null
}
