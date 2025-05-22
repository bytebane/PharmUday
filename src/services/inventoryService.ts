import { ItemWithRelations, BasicCategory, BasicSupplier } from '@/types/inventory'
import { Category as PrismaCategory, Supplier as PrismaSupplier } from '@/generated/prisma'

const API_BASE_URL = '/api'

/**
 * Fetch paginated items with optional filters.
 */
export async function fetchItems_cli(page = 1, limit = 10, filters: { status?: string; categoryId?: string; supplierId?: string; search?: string } = {}): Promise<{ items: ItemWithRelations[]; total: number }> {
	const params = new URLSearchParams({
		page: String(page),
		limit: String(limit),
		...(filters.status ? { status: filters.status } : {}),
		...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
		...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
		...(filters.search ? { search: filters.search } : {}),
	})
	const response = await fetch(`${API_BASE_URL}/inv-items?${params.toString()}`)
	if (!response.ok) throw new Error('Failed to fetch items')
	return response.json()
}

/**
 * Fetch categories for filters.
 */
export async function fetchCategories_cli(page = 1, limit = 10, search = ''): Promise<{ categories: PrismaCategory[]; total: number }> {
	const params = new URLSearchParams({
		page: String(page),
		limit: String(limit),
		...(search ? { search } : {}),
	})
	const response = await fetch(`${API_BASE_URL}/inv-categories?${params.toString()}`)
	if (!response.ok) throw new Error('Failed to fetch categories')
	const result = await response.json()
	// Always return an object with categories and total
	return {
		categories: Array.isArray(result.categories) ? result.categories : [],
		total: typeof result.total === 'number' ? result.total : 0,
	}
}

/**
 * Fetch all categories and suppliers for filters.
 */
export async function fetchRelatedInventoryData_cli(): Promise<{ categories: BasicCategory[]; suppliers: BasicSupplier[] }> {
	const [catRes, supRes] = await Promise.all([fetch(`${API_BASE_URL}/inv-categories`), fetch(`${API_BASE_URL}/suppliers`)])
	if (!catRes.ok || !supRes.ok) {
		throw new Error('Failed to fetch related inventory data (categories or suppliers)')
	}
	const catJson = await catRes.json()
	const supJson = await supRes.json()
	// If the API returns { categories: [...] }, extract the array
	const categories = Array.isArray(catJson) ? catJson : (catJson.categories ?? [])
	const suppliers = Array.isArray(supJson) ? supJson : (supJson.suppliers ?? supJson ?? [])
	return { categories, suppliers }
}

/**
 * Delete an item by ID.
 */
export async function deleteItem_cli(id: string): Promise<void> {
	const response = await fetch(`${API_BASE_URL}/inv-items/${id}`, { method: 'DELETE' })
	if (!response.ok) {
		throw new Error(`Failed to delete item: ${response.statusText}`)
	}
}

/**
 * Delete a category by ID.
 */
export async function deleteCategory_cli(id: string): Promise<void> {
	const response = await fetch(`${API_BASE_URL}/inv-categories/${id}`, { method: 'DELETE' })
	if (!response.ok) {
		throw new Error(`Failed to delete category: ${response.statusText}`)
	}
}

/**
 * Fetch paginated suppliers with optional search.
 */
export async function fetchSuppliers_cli(page = 1, limit = 10, search = ''): Promise<{ suppliers: PrismaSupplier[]; total: number }> {
	const params = new URLSearchParams({
		page: String(page),
		limit: String(limit),
		...(search ? { search } : {}),
	})
	const response = await fetch(`/api/suppliers?${params.toString()}`)
	if (!response.ok) throw new Error('Failed to fetch suppliers')
	const result = await response.json()
	return {
		suppliers: Array.isArray(result.suppliers) ? result.suppliers : [],
		total: typeof result.total === 'number' ? result.total : 0,
	}
}

/**
 * Delete a supplier by ID.
 */
export async function deleteSupplier_cli(id: string): Promise<void> {
	const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
	if (!response.ok) {
		const errorData = await response.text()
		throw new Error(`Failed to delete supplier: ${errorData || response.statusText}`)
	}
}

/**
 * Fetch all item names.
 */
export async function fetchAllItemNames_cli() {
	const res = await fetch('/api/inv-items/names')
	if (!res.ok) throw new Error('Failed to fetch item names')
	return res.json() // [{id, name, generic_name}]
}

export async function fetchItemById_cli(id: string) {
	const res = await fetch(`/api/inv-items/${id}`)
	if (!res.ok) throw new Error('Failed to fetch item')
	return res.json()
}
