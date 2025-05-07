import { Suspense } from 'react'
import { headers } from 'next/headers'
import { Customer as PrismaCustomer } from '@/generated/prisma'
import { CustomerList } from '@/components/features/customers/customer-list'

async function getCustomers(): Promise<PrismaCustomer[]> {
	const cookie = (await headers()).get('cookie')
	const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/customers`, {
		headers: { ...(cookie ? { cookie } : {}) },
		cache: 'no-store',
	})
	if (!response.ok) throw new Error('Failed to fetch customers')
	return response.json()
}

export default async function CustomersPage() {
	const initialCustomers = await getCustomers()
	return (
		<div className='container mx-auto py-10'>
			<h1 className='mb-6 text-3xl font-bold'>Manage Customers</h1>
			<Suspense fallback={<div>Loading customers...</div>}>
				<CustomerList initialCustomers={initialCustomers} />
			</Suspense>
		</div>
	)
}
