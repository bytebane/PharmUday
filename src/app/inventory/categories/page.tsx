import { CategoryList } from '@/components/features/inventory/categories/cat-list'
import { Suspense } from 'react'
import { Category as PrismaCategory } from '@/generated/prisma' // Assuming this is your Prisma Category type

// Define a type that includes potential parent category info if fetched by the API
type CategoryWithParent = PrismaCategory & {
	parentCategory?: { id: string; name: string } | null
}

async function getCategories(): Promise<CategoryWithParent[]> {
	// Adjust include based on what you want to display (e.g., parentCategory name)
	// Using NEXT_PUBLIC_APP_URL for server-side fetch to own API route
	const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/inv-categories?includeParent=true`, { cache: 'no-store' })
	if (!response.ok) {
		throw new Error('Failed to fetch categories on server')
	}
	return response.json()
}

export default async function InventoryCategoriesPage() {
	const initialCategories = await getCategories()
	return (
		<div className='container mx-auto py-10'>
			<h1 className='mb-6 text-3xl font-bold'>Inventory Categories</h1>
			<Suspense fallback={<div>Loading categories...</div>}>
				<CategoryList initialCategories={initialCategories} />
			</Suspense>
		</div>
	)
}
