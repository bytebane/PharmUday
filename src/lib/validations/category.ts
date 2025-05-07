import * as z from 'zod'

export const categorySchema = z.object({
	name: z.string().min(1, 'Category name is required'),
	description: z.string().optional().nullable(),
	parentCategoryId: z.string().cuid('Invalid parent category ID').optional().nullable(),
})

// Schema for updating (all fields optional)
export const categoryPatchSchema = categorySchema.partial()
