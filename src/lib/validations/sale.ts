import * as z from 'zod'
import { PaymentMethod } from '@/generated/prisma' // Assuming PaymentMethod enum is generated

export const saleItemSchema = z.object({
	itemId: z.string().cuid({ message: 'Invalid item ID.' }),
	quantitySold: z.number().int().min(1, { message: 'Quantity must be at least 1.' }),
	priceAtSale: z.number().min(0, { message: 'Price cannot be negative.' }), // This will be fetched from item, but good to validate if passed
	discountOnItem: z.number().min(0).optional().default(0), // Optional item-specific discount
	taxOnItem: z.number().min(0).optional().default(0), // Optional item-specific tax
})

export type SaleItemFormValues = z.infer<typeof saleItemSchema>

export const saleCreateSchema = z.object({
	customerId: z.string().cuid({ message: 'Invalid customer ID.' }).nullable().optional(), // Optional customer
	// customerName: z.string().optional(), // For walk-in customers if not selecting an existing one
	saleItems: z.array(saleItemSchema).min(1, { message: 'At least one item must be added to the sale.' }),
	paymentMethod: z.nativeEnum(PaymentMethod),
	totalDiscount: z.number().min(0).optional().default(0), // Overall discount on the sale
	totalTax: z.number().min(0).optional().default(0), // Overall tax on the sale
	notes: z.string().max(1000).nullable().optional(),
	// grandTotal, subTotal, amountPaid will be calculated on the backend or validated if sent
	// paymentStatus will likely be set on the backend
})

export type SaleCreateFormValues = z.infer<typeof saleCreateSchema>

// Schema for updating a sale (e.g., payment status) - can be expanded
export const salePatchSchema = z.object({
	paymentStatus: z.string().optional(),
	amountPaid: z.number().min(0).optional(),
	notes: z.string().max(1000).nullable().optional(),
})
