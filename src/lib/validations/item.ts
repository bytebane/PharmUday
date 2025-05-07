import * as z from 'zod'

export const itemSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	manufacturer: z.string().optional(),
	generic_name: z.string().optional(),
	formulation: z.string().optional(),
	strength: z.string().optional(),
	unit: z.string().optional(),
	schedule: z.string().optional(),
	description: z.string().optional(),
	image: z.string().url().optional().or(z.literal('')), // Allow empty string or valid URL
	thumbnailUrls: z.array(z.string().url()).optional().default([]),
	units_per_pack: z.number().int().positive().optional().nullable(),
	price: z.number().positive('Price must be positive'),
	tax_rate: z.number().min(0).optional().nullable(),
	discount: z.number().min(0).optional().nullable(),
	reorder_level: z.number().int().min(0).optional().nullable(),
	isActive: z.boolean().default(true),
	isAvailable: z.boolean().default(true),
	quantity_in_stock: z.number().int().min(0).default(0),
	expiry_date: z.coerce.date().optional().nullable(), // Coerce string/number to Date
	purchase_price: z.number().min(0).positive().optional().nullable(),
	purchase_date: z.coerce.date().optional().nullable(), // Coerce string/number to Date
	sales_data: z.any().optional(), // Keep as any for now, refine if needed
	// --- Relations ---
	categoryIds: z.array(z.string().cuid()).optional().default([]), // Array of Category CUIDs
	supplierId: z.string().cuid().optional().nullable(), // Optional CUID for Supplier
})

// Schema for updating (most fields become optional)
export const itemPatchSchema = itemSchema.partial()
