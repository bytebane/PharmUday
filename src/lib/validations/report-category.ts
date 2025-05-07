import * as z from 'zod'

export const reportCategorySchema = z.object({
	name: z.string().min(1, { message: 'Category name is required.' }).max(255),
	description: z.string().max(1000).nullable().optional(),
	// No parentCategoryId for ReportCategory as per schema
})
