import { ReportList } from '@/components/features/reports/reports-list'

export default function ReportsPage() {
	return (
		<div className='container mx-auto py-10'>
			<h1 className='mb-6 text-3xl font-bold'>Reports</h1>
			<ReportList />
		</div>
	)
}
