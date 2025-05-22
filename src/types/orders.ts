import { User } from './common'

export interface OrderItem {
	id: string
	productId: string
	quantity: number
	price: number
	total: number
}

export interface Invoice {
	id: string
	invoiceNumber: string
	status: 'pending' | 'completed' | 'cancelled'
	issuedAt: Date
	dueDate?: Date
}

export interface Order {
	saleDate: string | number | Date
	grandTotal: number
	id: string
	userId: string
	user: User
	items: OrderItem[]
	total: number
	createdAt: Date
	updatedAt: Date
	invoice?: Invoice
	status: 'pending' | 'processing' | 'completed' | 'cancelled'
}
