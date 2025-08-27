import * as z from 'zod'

export const reportBaseSchema = z.object({
	title: z.string().min(1, { message: 'Report title is required.' }).max(255),
	patientName: z.string().max(255).nullable().optional(),
	reportDate: z.date({ required_error: 'Report date is required.' }),
	notes: z.string().max(2000).nullable().optional(),
	categoryId: z.string().min(1, { message: 'Report category is required.' }),
	customerId: z.string().nullable().optional(), // Customer selection (optional)
})

export const reportCreateSchema = reportBaseSchema.extend({
	// File will be handled separately, not directly in Zod schema for API payload from client with FormData
})

export const reportPatchSchema = reportBaseSchema.partial() // All fields optional for patching
