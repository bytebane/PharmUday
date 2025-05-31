import * as z from 'zod'
import { indianPhoneSchema } from './phone'

export const supplierSchema = z.object({
	name: z.string().min(1, 'Supplier name is required'),
	contactPerson: z.string().optional().nullable(),
	email: z.string().email('Invalid email address').optional().nullable(),
	phone: indianPhoneSchema,
	address: z.string().optional().nullable(),
})

// Schema for updating (all fields optional)
export const supplierPatchSchema = supplierSchema.partial()
