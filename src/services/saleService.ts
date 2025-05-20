import { SaleWithBasicRelations } from '@/app/(main)/sales/history/page'
import { SaleCreateFormValues } from '@/lib/validations/sale'

export async function fetchSalesHistory_cli(page = 1, limit = 10, filters: { search?: string; period?: string } = {}): Promise<{ sales: SaleWithBasicRelations[]; total: number }> {
	const params = new URLSearchParams({
		page: String(page),
		limit: String(limit),
		...(filters.search ? { search: filters.search } : {}),
		...(filters.period ? { period: filters.period } : {}),
	})
	const response = await fetch(`/api/sales?${params.toString()}`)
	if (!response.ok) throw new Error('Failed to fetch sales history')
	const result = await response.json()
	return {
		sales: Array.isArray(result.sales) ? result.sales : [],
		total: typeof result.total === 'number' ? result.total : 0,
	}
}

export async function createSaleAPI(payload: SaleCreateFormValues): Promise<{ id: string; message: string }> {
	const response = await fetch('/api/sales', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	})
	const result = await response.json()
	if (!response.ok) throw new Error(result.message || result.error || 'Failed to create sale.')
	return result
}
