import { Report as PrismaReport, ReportCategory as PrismaReportCategory, User as PrismaUser, Customer as PrismaCustomer } from '@/generated/prisma'

export type ReportWithRelations = PrismaReport & {
	category: PrismaReportCategory
	customer?: Pick<PrismaCustomer, 'id' | 'name' | 'email' | 'phone'> | null
	uploadedBy: Pick<PrismaUser, 'id' | 'email'>
}

export async function fetchReports_cli(page = 1, limit = 10, filters: { search?: string; categoryId?: string; from?: string; to?: string } = {}): Promise<{ reports: ReportWithRelations[]; total: number }> {
	const params = new URLSearchParams({
		page: String(page),
		limit: String(limit),
		...(filters.search ? { search: filters.search } : {}),
		...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
		...(filters.from ? { from: filters.from } : {}),
		...(filters.to ? { to: filters.to } : {}),
	})
	const response = await fetch(`/api/reports?${params.toString()}`)
	if (!response.ok) throw new Error('Failed to fetch reports')
	const result = await response.json()
	return {
		reports: Array.isArray(result.reports) ? result.reports : [],
		total: typeof result.total === 'number' ? result.total : 0,
	}
}

export async function deleteReport_cli(id: string): Promise<void> {
	const response = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
	if (!response.ok) {
		const errorData = await response.text()
		throw new Error(`Failed to delete report: ${errorData || response.statusText}`)
	}
}

export async function fetchReportCategories_cli(page = 1, limit = 10, search = ''): Promise<{ categories: PrismaReportCategory[]; total: number }> {
	const params = new URLSearchParams({
		page: String(page),
		limit: String(limit),
		...(search ? { search } : {}),
	})
	const response = await fetch(`/api/report-categories?${params.toString()}`)
	if (!response.ok) throw new Error('Failed to fetch report categories')
	const result = await response.json()
	return {
		categories: Array.isArray(result.categories) ? result.categories : [],
		total: typeof result.total === 'number' ? result.total : 0,
	}
}

export async function deleteReportCategory_cli(id: string): Promise<void> {
	const response = await fetch(`/api/report-categories/${id}`, { method: 'DELETE' })
	if (!response.ok) {
		const errorData = await response.text()
		throw new Error(`Failed to delete report category: ${errorData || response.statusText}`)
	}
}
