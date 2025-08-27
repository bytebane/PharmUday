import { SalesHistoryList } from '@/components/features/sales/sales-list'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@/generated/prisma'
import { redirect } from 'next/navigation'

export default async function SalesHistoryPage() {
	// Check if user has permission to view all sales
	const currentUser = await getCurrentUser()
	const userRole = currentUser?.role as Role

	// Only allow ADMIN, PHARMACIST, SUPER_ADMIN, and SELLER to view all sales history
	if (userRole !== Role.ADMIN && userRole !== Role.PHARMACIST && userRole !== Role.SUPER_ADMIN && userRole !== Role.SELLER) {
		// Redirect customers to their own orders page
		if (userRole === Role.CUSTOMER) {
			redirect('/orders')
		}
		// For any other role, redirect to dashboard
		redirect('/')
	}

	return (
		<div className='container mx-auto'>
			<SalesHistoryList />
		</div>
	)
}
