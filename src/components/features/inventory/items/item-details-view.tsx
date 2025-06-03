'use client'

import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Calendar, Package, DollarSign, AlertTriangle, CheckCircle, XCircle, Edit, Loader2, Tag, Truck, Info, BarChart3 } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

import { fetchItemById_cli, fetchRelatedInventoryData_cli } from '@/services/inventoryService'
import { ItemWithRelations } from '@/types/inventory'
import { Role } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet'
import { DialogTitle } from '@/components/ui/dialog'
import { ItemForm } from './item-form'

// Helper component for displaying item information
interface InfoFieldProps {
	label: string
	value?: string | number | null
}

function InfoField({ label, value }: InfoFieldProps) {
	return (
		<div>
			<h4 className='font-medium text-muted-foreground mb-1'>{label}</h4>
			<p className='text-foreground'>{value || 'Not specified'}</p>
		</div>
	)
}

interface ItemDetailsViewProps {
	itemId: string
}

export function ItemDetailsView({ itemId }: ItemDetailsViewProps) {
	const router = useRouter()
	const { data: session } = useSession()
	const queryClient = useQueryClient()
	const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false)

	const {
		data: item,
		isLoading,
		error,
		refetch,
	} = useQuery<ItemWithRelations, Error>({
		queryKey: ['items', 'detail', itemId],
		queryFn: () => fetchItemById_cli(itemId),
	})

	// Fetch categories and suppliers for edit form
	const { data: relatedData } = useQuery({
		queryKey: ['relatedData'],
		queryFn: fetchRelatedInventoryData_cli,
		enabled: isEditSheetOpen,
	})

	const canEdit = session?.user?.role === Role.ADMIN || session?.user?.role === Role.PHARMACIST

	const handleEditSuccess = () => {
		setIsEditSheetOpen(false)
		refetch()
		toast.success('Item updated successfully!')
	}

	if (isLoading) {
		return <ItemDetailsSkeleton />
	}

	if (error) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div className='text-center'>
					<XCircle className='mx-auto h-12 w-12 text-destructive mb-4' />
					<h1 className='text-2xl font-bold text-foreground mb-2'>Item Not Found</h1>
					<p className='text-muted-foreground mb-6'>{error.message}</p>
					<Button
						onClick={() => router.back()}
						variant='outline'>
						<ArrowLeft className='mr-2 h-4 w-4' />
						Go Back
					</Button>
				</div>
			</div>
		)
	}

	if (!item) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div className='text-center'>
					<Package className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
					<h1 className='text-2xl font-bold text-foreground mb-2'>Item Not Found</h1>
					<p className='text-muted-foreground mb-6'>The requested item could not be found.</p>
					<Button
						onClick={() => router.back()}
						variant='outline'>
						<ArrowLeft className='mr-2 h-4 w-4' />
						Go Back
					</Button>
				</div>
			</div>
		)
	}

	// Calculate status indicators
	const isExpired = item.expiry_date ? new Date(item.expiry_date) < new Date() : false
	const isExpiringSoon = item.expiry_date ? new Date(item.expiry_date) >= new Date() && new Date(item.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : false
	const isOutOfStock = (item.quantity_in_stock || 0) === 0
	const isLowStock = item.reorder_level && item.quantity_in_stock ? item.quantity_in_stock <= item.reorder_level : false

	return (
		<div className='container mx-auto px-4 py-8 max-w-6xl'>
			{/* Header */}
			<div className='mb-8'>
				<div className='flex items-center justify-between mb-6'>
					<Button
						onClick={() => router.back()}
						variant='ghost'
						className='flex items-center gap-2'>
						<ArrowLeft className='h-4 w-4' />
						Back to Items
					</Button>
					{canEdit && (
						<Button
							onClick={() => setIsEditSheetOpen(true)}
							className='flex items-center gap-2'>
							<Edit className='h-4 w-4' />
							Edit Item
						</Button>
					)}
				</div>

				<div className='flex items-start justify-between mb-4'>
					<div>
						<h1 className='text-3xl font-bold text-foreground mb-2'>{item.name}</h1>
						{item.generic_name && <p className='text-lg text-muted-foreground mb-2'>Generic: {item.generic_name}</p>}
						{item.manufacturer && <p className='text-muted-foreground'>Manufactured by {item.manufacturer}</p>}
					</div>
				</div>

				{/* Status Badges */}
				<div className='flex flex-wrap gap-2'>
					<Badge variant={item.isActive ? 'default' : 'secondary'}>
						{item.isActive ? (
							<>
								<CheckCircle className='mr-1 h-3 w-3' />
								Active
							</>
						) : (
							<>
								<XCircle className='mr-1 h-3 w-3' />
								Inactive
							</>
						)}
					</Badge>
					<Badge variant={item.isAvailable ? 'default' : 'secondary'}>{item.isAvailable ? 'Available' : 'Unavailable'}</Badge>
					{isExpired && (
						<Badge variant='destructive'>
							<AlertTriangle className='mr-1 h-3 w-3' />
							Expired
						</Badge>
					)}
					{isExpiringSoon && !isExpired && (
						<Badge variant='secondary'>
							<AlertTriangle className='mr-1 h-3 w-3' />
							Expiring Soon
						</Badge>
					)}
					{isOutOfStock && (
						<Badge variant='destructive'>
							<XCircle className='mr-1 h-3 w-3' />
							Out of Stock
						</Badge>
					)}
					{isLowStock && !isOutOfStock && (
						<Badge variant='secondary'>
							<AlertTriangle className='mr-1 h-3 w-3' />
							Low Stock
						</Badge>
					)}
				</div>
			</div>

			{/* Main Content */}
			<div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
				{/* Left Column - Main Details */}
				<div className='lg:col-span-2 space-y-6'>
					{/* Basic Information */}
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<Info className='h-5 w-5' />
								Basic Information
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								<InfoField
									label='Item ID'
									value={item.id}
								/>
								<InfoField
									label='Name'
									value={item.name}
								/>
								<InfoField
									label='Generic Name'
									value={item.generic_name}
								/>
								<InfoField
									label='Manufacturer'
									value={item.manufacturer}
								/>
								<InfoField
									label='Formulation'
									value={item.formulation}
								/>
								<InfoField
									label='Strength'
									value={item.strength}
								/>
								<InfoField
									label='Unit'
									value={item.unit}
								/>
								<InfoField
									label='Schedule'
									value={item.schedule}
								/>
								<InfoField
									label='Units Per Pack'
									value={item.units_per_pack}
								/>
								<div className='md:col-span-2'>
									<InfoField
										label='Status'
										value={`${item.isActive ? 'Active' : 'Inactive'} • ${item.isAvailable ? 'Available' : 'Unavailable'}`}
									/>
								</div>
							</div>
							{item.description && (
								<div>
									<h4 className='font-medium text-muted-foreground mb-2'>Description</h4>
									<p className='text-foreground bg-muted/50 p-3 rounded-md'>{item.description}</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Categories and Supplier */}
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<Tag className='h-5 w-5' />
								Categories & Supplier
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='space-y-4'>
								<div>
									<h4 className='font-medium text-muted-foreground mb-2'>Categories</h4>
									<div className='flex flex-wrap gap-2'>
										{item.categories.length > 0 ? (
											item.categories.map(category => (
												<Badge
													key={category.id}
													variant='secondary'>
													{category.name}
												</Badge>
											))
										) : (
											<p className='text-muted-foreground italic'>No categories assigned</p>
										)}
									</div>
								</div>
								<Separator />
								<div className='flex items-center gap-2'>
									<Truck className='h-4 w-4 text-muted-foreground' />
									<div>
										<h4 className='font-medium text-muted-foreground mb-1'>Supplier</h4>
										<p className='text-foreground'>{item.supplier?.name || 'No supplier assigned'}</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Right Column - Stock & Pricing */}
				<div className='space-y-6'>
					{/* Stock Information */}
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center'>
								<Package className='mr-2 h-5 w-5' />
								Stock Information
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div>
								<h4 className='font-medium text-muted-foreground mb-1'>Current Stock</h4>
								<p className='text-2xl font-bold text-foreground'>
									{item.quantity_in_stock} {item.unit || 'units'}
								</p>
							</div>
							{item.reorder_level && (
								<div>
									<h4 className='font-medium text-muted-foreground mb-1'>Reorder Level</h4>
									<p className='text-foreground'>
										{item.reorder_level} {item.unit || 'units'}
									</p>
								</div>
							)}
							{item.expiry_date && (
								<div>
									<h4 className='font-medium text-muted-foreground mb-1'>Expiry Date</h4>
									<p className='text-foreground'>{new Date(item.expiry_date).toLocaleDateString()}</p>
									<p className='text-sm text-muted-foreground'>({formatDistanceToNow(new Date(item.expiry_date), { addSuffix: true })})</p>
								</div>
							)}
							{item.purchase_date && (
								<div>
									<h4 className='font-medium text-muted-foreground mb-1'>Last Purchase</h4>
									<p className='text-foreground'>{new Date(item.purchase_date).toLocaleDateString()}</p>
									<p className='text-sm text-muted-foreground'>({formatDistanceToNow(new Date(item.purchase_date), { addSuffix: true })})</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Pricing Information */}
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center'>
								<DollarSign className='mr-2 h-5 w-5' />
								Pricing Information
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div>
								<h4 className='font-medium text-muted-foreground mb-1'>Selling Price</h4>
								<p className='text-2xl font-bold text-foreground'>${item.price.toFixed(2)}</p>
								{item.units_per_pack && item.units_per_pack > 1 && (
									<p className='text-sm text-muted-foreground'>
										${(item.price / item.units_per_pack).toFixed(2)} per {item.unit || 'unit'}
									</p>
								)}
							</div>
							{item.purchase_price && (
								<div>
									<h4 className='font-medium text-muted-foreground mb-1'>Purchase Price</h4>
									<p className='text-foreground'>${item.purchase_price.toFixed(2)}</p>
									{item.purchase_price && item.price > item.purchase_price && (
										<p className='text-sm text-muted-foreground'>
											Margin: ${(item.price - item.purchase_price).toFixed(2)} ({(((item.price - item.purchase_price) / item.purchase_price) * 100).toFixed(1)}%)
										</p>
									)}
								</div>
							)}
							{item.tax_rate && (
								<div>
									<h4 className='font-medium text-muted-foreground mb-1'>Tax Rate</h4>
									<p className='text-foreground'>{(item.tax_rate * 100).toFixed(1)}%</p>
								</div>
							)}
							{item.discount && item.discount > 0 && (
								<div>
									<h4 className='font-medium text-muted-foreground mb-1'>Discount</h4>
									<p className='text-foreground'>{(item.discount * 100).toFixed(1)}%</p>
									<p className='text-sm text-muted-foreground'>Discounted Price: ${(item.price * (1 - item.discount)).toFixed(2)}</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Sales Data */}
					{item.sales_data && (
						<Card>
							<CardHeader>
								<CardTitle className='flex items-center'>
									<BarChart3 className='mr-2 h-5 w-5' />
									Sales Information
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className='space-y-4'>
									<div>
										<h4 className='font-medium text-muted-foreground mb-2'>Sales Data</h4>
										<div className='bg-muted/50 p-3 rounded-md'>
											<pre className='text-sm text-foreground whitespace-pre-wrap'>{typeof item.sales_data === 'string' ? item.sales_data : JSON.stringify(item.sales_data, null, 2)}</pre>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Timestamps */}
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center'>
								<Calendar className='mr-2 h-5 w-5' />
								Record Information
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div>
								<h4 className='font-medium text-muted-foreground mb-1'>Created</h4>
								<p className='text-foreground'>{new Date(item.createdAt).toLocaleDateString()}</p>
								<p className='text-sm text-muted-foreground'>({formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })})</p>
							</div>
							<div>
								<h4 className='font-medium text-muted-foreground mb-1'>Last Updated</h4>
								<p className='text-foreground'>{new Date(item.updatedAt).toLocaleDateString()}</p>
								<p className='text-sm text-muted-foreground'>({formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })})</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Edit Sheet */}
			<Sheet
				open={isEditSheetOpen}
				onOpenChange={setIsEditSheetOpen}>
				<SheetContent className='w-full sm:max-w-2xl overflow-y-auto'>
					<SheetHeader>
						<DialogTitle>Edit Item</DialogTitle>
					</SheetHeader>
					<div className='mt-6'>
						{isEditSheetOpen && relatedData && (
							<ItemForm
								itemData={item}
								categories={relatedData.categories}
								suppliers={relatedData.suppliers}
								onSuccess={handleEditSuccess}
							/>
						)}
					</div>
				</SheetContent>
			</Sheet>
		</div>
	)
}

function ItemDetailsSkeleton() {
	return (
		<div className='container mx-auto px-4 py-8 max-w-6xl'>
			<div className='mb-8'>
				<Skeleton className='h-10 w-32 mb-4' />
				<div className='flex items-start justify-between'>
					<div>
						<Skeleton className='h-8 w-64 mb-2' />
						<Skeleton className='h-6 w-48 mb-2' />
						<Skeleton className='h-5 w-40' />
					</div>
					<div className='flex flex-col items-end space-y-2'>
						<div className='flex space-x-2'>
							<Skeleton className='h-6 w-16' />
							<Skeleton className='h-6 w-20' />
						</div>
					</div>
				</div>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
				<div className='lg:col-span-2 space-y-6'>
					<Card>
						<CardHeader>
							<Skeleton className='h-6 w-32' />
						</CardHeader>
						<CardContent>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								{Array.from({ length: 4 }).map((_, i) => (
									<div key={i}>
										<Skeleton className='h-4 w-20 mb-1' />
										<Skeleton className='h-5 w-32' />
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<Skeleton className='h-6 w-40' />
						</CardHeader>
						<CardContent>
							<div className='space-y-4'>
								<div>
									<Skeleton className='h-4 w-20 mb-2' />
									<div className='flex gap-2'>
										<Skeleton className='h-6 w-16' />
										<Skeleton className='h-6 w-20' />
									</div>
								</div>
								<div>
									<Skeleton className='h-4 w-16 mb-1' />
									<Skeleton className='h-5 w-32' />
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className='space-y-6'>
					{Array.from({ length: 3 }).map((_, i) => (
						<Card key={i}>
							<CardHeader>
								<Skeleton className='h-6 w-32' />
							</CardHeader>
							<CardContent>
								<div className='space-y-4'>
									{Array.from({ length: 3 }).map((_, j) => (
										<div key={j}>
											<Skeleton className='h-4 w-20 mb-1' />
											<Skeleton className='h-5 w-24' />
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</div>
	)
}
