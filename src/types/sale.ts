import { Customer, Invoice, Sale, User } from '@/generated/prisma'

export type SaleWithBasicRelations = Sale & {
	staff: Pick<User, 'id' | 'email'>
	customer: Pick<Customer, 'id' | 'name'> | null
	invoice: Pick<Invoice, 'id'> | null
	_count?: {
		// If you want to show number of items without fetching all
		saleItems: number
	}
}

export type SaleWithFullDetails = Sale & {
	staff: { email: string; profile?: { firstName?: string | null; lastName?: string | null } | null }
	customer: { name: string; email?: string | null; phone?: string | null; address?: string | null } | null
	saleItems: ({ item: { name: string; strength?: string | null; formulation?: string | null } } & { quantitySold: number; priceAtSale: number; discountOnItem: number; taxOnItem: number; totalPrice: number })[]
	invoice: { id: number; createdAt: Date; status: string } | null
}
