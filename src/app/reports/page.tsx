import { ReportList } from '@/components/features/reports/reports-list' // Adjust path as needed
import { Suspense } from 'react'
import { Report as PrismaReport, ReportCategory as PrismaReportCategory, User as PrismaUser } from '@/generated/prisma'
import { headers } from 'next/headers'

// Define a more detailed type for reports to include related data
export type ReportWithRelations = PrismaReport & {
	category: PrismaReportCategory
	uploadedBy: Pick<PrismaUser, 'id' | 'email'> // Only select necessary user fields
}

async function getReports(): Promise<ReportWithRelations[]> {
	// Using NEXT_PUBLIC_APP_URL for server-side fetch to own API route
	const cookie = (await headers()).get('cookie') // Get cookies from the incoming request to the Server Component

	// This API route should already be set up to return reports with category and uploadedBy
	const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/reports`, {
		cache: 'no-store', // Ensure fresh data, or adjust caching strategy as needed
		// Consider adding headers if your API requires authentication for this initial fetch
		headers: {
			// Forward the cookie to the API route for authentication
			...(cookie ? { cookie } : {}),
		},
	})
	if (!response.ok) {
		console.error('Failed to fetch reports:', response.statusText)
		throw new Error('Failed to fetch reports on server')
	}
	return response.json()
}

export default async function ReportsPage() {
	const initialReports = await getReports()
	return (
		<div className='container mx-auto py-10'>
			<h1 className='mb-6 text-3xl font-bold'>Medical Reports</h1>
			<Suspense fallback={<div>Loading reports...</div>}>
				<ReportList initialReports={initialReports} />
			</Suspense>
		</div>
	)
}
