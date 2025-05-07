import { ReportCategoryList } from '@/components/features/reports/categories/cat-list'
import { Suspense } from 'react'
import { ReportCategory as PrismaReportCategory } from '@/generated/prisma'

async function getReportCategories(): Promise<PrismaReportCategory[]> {
	// Using NEXT_PUBLIC_APP_URL for server-side fetch to own API route
	// Ensure you have an API endpoint at /api/report-categories
	const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/report-categories`, { cache: 'no-store' })
	if (!response.ok) {
		throw new Error('Failed to fetch report categories on server')
	}
	return response.json()
}

export default async function ReportCategoriesPage() {
	const initialReportCategories = await getReportCategories()
	return (
		<div className='container mx-auto py-10'>
			<h1 className='mb-6 text-3xl font-bold'>Report Categories</h1>
			<Suspense fallback={<div>Loading report categories...</div>}>
				<ReportCategoryList initialReportCategories={initialReportCategories} />
			</Suspense>
		</div>
	)
}
