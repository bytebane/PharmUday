import * as z from 'zod'

export const customerSchema = z.object({
	name: z.string().min(1, { message: 'Customer name is required.' }).max(255),
	email: z.string().email({ message: 'Invalid email address.' }).max(255).nullable().optional(),
	phone: z
		.string()
		.max(20)
		.refine(value => !value || /^[+]?[0-9\s-()]*$/.test(value), {
			message: 'Invalid phone number format.',
		})
		.nullable()
		.optional(),
	address: z.string().max(500).nullable().optional(),
	userId: z.string().cuid().nullable().optional(), // If linking to an existing User
})
