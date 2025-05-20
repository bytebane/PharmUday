import { ReportCategoryList } from '@/components/features/reports/categories/cat-list'

export default function ReportCategoriesPage() {
	return (
		<div className='container mx-auto py-10'>
			<h1 className='mb-6 text-3xl font-bold'>Report Categories</h1>
			<ReportCategoryList />
		</div>
	)
}
