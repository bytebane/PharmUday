import { Customer as PrismaCustomer } from '@/generated/prisma'

export async function fetchCustomers_cli(page = 1, limit = 10, search = ''): Promise<{ customers: PrismaCustomer[]; total: number }> {
	const params = new URLSearchParams({
		page: String(page),
		limit: String(limit),
		...(search ? { search } : {}),
	})
	const response = await fetch(`/api/customers?${params.toString()}`)
	if (!response.ok) throw new Error('Failed to fetch customers')
	const result = await response.json()
	return {
		customers: Array.isArray(result.customers) ? result.customers : [],
		total: typeof result.total === 'number' ? result.total : 0,
	}
}

export async function deleteCustomer_cli(id: string): Promise<void> {
	const response = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
	if (!response.ok) {
		const errorData = await response.text()
		throw new Error(`Failed to delete customer: ${errorData || response.statusText}`)
	}
}

export async function fetchAllCustomerNames_cli(): Promise<{ id: string; name: string; phone?: string; email?: string }[]> {
	const res = await fetch('/api/customers/names')
	if (!res.ok) throw new Error('Failed to fetch customer names')
	return res.json()
}

export async function fetchCustomerById_cli(id: string): Promise<PrismaCustomer> {
	const res = await fetch(`/api/customers/${id}`)
	if (!res.ok) throw new Error('Failed to fetch customer')
	return res.json()
}
