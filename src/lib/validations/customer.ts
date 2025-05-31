import * as z from 'zod'
import { indianPhoneSchema } from './phone'

export const customerSchema = z.object({
	name: z.string().min(1, { message: 'Customer name is required.' }).max(255),
	email: z.string().email({ message: 'Invalid email address.' }).max(255).nullable().optional(),
	phone: indianPhoneSchema,
	address: z.string().max(500).nullable().optional(),
	userId: z.string().cuid().nullable().optional(), // If linking to an existing User
})
