import { ItemWithRelations } from '@/types/inventory'
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet'
import { DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Package, Building2, Calendar, DollarSign, FileText, Tag, Warehouse, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface ItemDetailsSheetProps {
	item: ItemWithRelations | null
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onCategoryFilter: (categoryId: string) => void
	onSupplierFilter: (supplierId: string) => void
}

export const ItemDetailsSheet = ({ item, isOpen, onOpenChange, onCategoryFilter, onSupplierFilter }: ItemDetailsSheetProps) => {
	const handleCategoryClick = (categoryId: string) => {
		onCategoryFilter(categoryId)
		onOpenChange(false)
	}

	const handleSupplierClick = (supplierId: string) => {
		onSupplierFilter(supplierId)
		onOpenChange(false)
	}

	if (!item) return null

	return (
		<Sheet
			open={isOpen}
			onOpenChange={onOpenChange}>
			<SheetContent className='w-full overflow-y-auto sm:max-w-xl md:max-w-2xl lg:max-w-4xl bg-background'>
				<SheetHeader className='mb-6 pb-4 border-b border-border/50'>
					<DialogTitle className='text-2xl font-bold text-foreground flex items-center gap-3'>
						<div className='p-2 bg-primary/10 rounded-lg dark:bg-primary/20'>
							<Package className='h-6 w-6 text-primary' />
						</div>
						<span className='truncate'>{item.name}</span>
					</DialogTitle>
					{item.generic_name && (
						<p className='text-muted-foreground text-sm font-medium pl-14'>
							Generic: <span className='text-foreground/80'>{item.generic_name}</span>
						</p>
					)}
				</SheetHeader>

				<div className='space-y-8'>
					{/* Status Badges */}
					<div className='flex flex-wrap gap-2'>
						<Badge
							variant={item.isActive ? 'default' : 'secondary'}
							className={item.isActive ? 'bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30 dark:hover:bg-green-500/30' : 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'}>
							{item.isActive ? <CheckCircle className='w-3 h-3 mr-1' /> : <XCircle className='w-3 h-3 mr-1' />}
							{item.isActive ? 'Active' : 'Inactive'}
						</Badge>
						<Badge
							variant={item.isAvailable ? 'default' : 'destructive'}
							className={item.isAvailable ? 'bg-blue-500/10 text-blue-700 border-blue-500/20 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 dark:hover:bg-blue-500/30' : 'bg-red-500/10 text-red-700 border-red-500/20 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30'}>
							{item.isAvailable ? <CheckCircle className='w-3 h-3 mr-1' /> : <AlertTriangle className='w-3 h-3 mr-1' />}
							{item.isAvailable ? 'Available' : 'Unavailable'}
						</Badge>
					</div>

					{/* Basic Information */}
					<div className='space-y-4'>
						<div className='flex items-center gap-2 mb-4'>
							<div className='p-1.5 bg-primary/10 rounded-md dark:bg-primary/20'>
								<FileText className='h-5 w-5 text-primary' />
							</div>
							<h3 className='text-lg font-semibold text-foreground'>Basic Information</h3>
						</div>
						<div className='bg-muted/30 dark:bg-muted/50 rounded-lg p-4 space-y-4 border border-muted-foreground/10 dark:border-muted-foreground/20 transition-colors duration-200'>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
								<div className='space-y-1'>
									<h4 className='text-sm font-medium text-muted-foreground'>Product Name</h4>
									<p className='text-foreground font-medium'>{item.name}</p>
								</div>
								{item.manufacturer && (
									<div className='space-y-1'>
										<h4 className='text-sm font-medium text-muted-foreground flex items-center gap-1'>
											<Building2 className='w-3 h-3' />
											Manufacturer
										</h4>
										<p className='text-foreground'>{item.manufacturer}</p>
									</div>
								)}
								{item.formulation && (
									<div className='space-y-1'>
										<h4 className='text-sm font-medium text-muted-foreground'>Formulation</h4>
										<p className='text-foreground'>{item.formulation}</p>
									</div>
								)}
								{item.strength && (
									<div className='space-y-1'>
										<h4 className='text-sm font-medium text-muted-foreground'>Strength</h4>
										<p className='text-foreground font-medium'>{item.strength}</p>
									</div>
								)}
								{item.unit && (
									<div className='space-y-1'>
										<h4 className='text-sm font-medium text-muted-foreground'>Unit</h4>
										<p className='text-foreground'>{item.unit}</p>
									</div>
								)}
							</div>

							{/* Categories and Supplier */}
							<div className='grid grid-cols-1 md:grid-cols-2 gap-6 pt-2'>
								{item.categories && item.categories.length > 0 && (
									<div className='space-y-2'>
										<h4 className='text-sm font-medium text-muted-foreground flex items-center gap-1'>
											<Tag className='w-3 h-3' />
											Categories
										</h4>
										<div className='flex flex-wrap gap-2'>
											{item.categories.map(cat => (
												<button
													key={cat.id}
													onClick={() => handleCategoryClick(cat.id)}
													className='inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer dark:bg-primary/20 dark:text-primary dark:border-primary/30 dark:hover:bg-primary/30'>
													{cat.name}
												</button>
											))}
										</div>
									</div>
								)}
								{item.supplier && (
									<div className='space-y-2'>
										<h4 className='text-sm font-medium text-muted-foreground flex items-center gap-1'>
											<Building2 className='w-3 h-3' />
											Supplier
										</h4>
										<button
											onClick={() => handleSupplierClick(item.supplier!.id)}
											className='text-primary hover:text-primary/80 hover:underline font-medium transition-colors cursor-pointer dark:text-primary dark:hover:text-primary/80'>
											{item.supplier.name}
										</button>
									</div>
								)}
							</div>
						</div>
					</div>

					<Separator />

					{/* Stock Information */}
					<div className='space-y-4'>
						<div className='flex items-center gap-2 mb-4'>
							<div className='p-1.5 bg-green-100 rounded-md dark:bg-green-900/50'>
								<Warehouse className='h-5 w-5 text-green-600 dark:text-green-400' />
							</div>
							<h3 className='text-lg font-semibold text-foreground'>Stock Information</h3>
						</div>
						<div className='bg-green-50/50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200/50 dark:border-green-800/40 transition-colors duration-200'>
							<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
								<div className='space-y-1'>
									<h4 className='text-sm font-medium text-muted-foreground'>Quantity in Stock</h4>
									<div className='flex items-center gap-2'>
										<p className='text-2xl font-bold text-green-700 dark:text-green-400'>{item.quantity_in_stock || 0}</p>
										{item.reorder_level && item.quantity_in_stock && item.quantity_in_stock <= item.reorder_level && (
											<Badge
												variant='destructive'
												className='text-xs'>
												<AlertTriangle className='w-3 h-3 mr-1' />
												Low Stock
											</Badge>
										)}
									</div>
								</div>
								{item.reorder_level && (
									<div className='space-y-1'>
										<h4 className='text-sm font-medium text-muted-foreground flex items-center gap-1'>
											<AlertTriangle className='w-3 h-3' />
											Reorder Level
										</h4>
										<p className='text-lg font-semibold text-orange-600 dark:text-orange-400'>{item.reorder_level}</p>
									</div>
								)}
								{item.expiry_date && (
									<div className='space-y-1'>
										<h4 className='text-sm font-medium text-muted-foreground flex items-center gap-1'>
											<Calendar className='w-3 h-3' />
											Expiry Date
										</h4>
										<p className='text-foreground font-medium'>{new Date(item.expiry_date).toLocaleDateString()}</p>
									</div>
								)}
							</div>
						</div>
					</div>

					<Separator />

					{/* Pricing Information */}
					<div className='space-y-4'>
						<div className='flex items-center gap-2 mb-4'>
							<div className='p-1.5 bg-emerald-100 rounded-md dark:bg-emerald-900/50'>
								<DollarSign className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
							</div>
							<h3 className='text-lg font-semibold text-foreground'>Pricing Information</h3>
						</div>
						<div className='bg-emerald-50/50 dark:bg-emerald-950/30 rounded-lg p-4 border border-emerald-200/50 dark:border-emerald-800/40 transition-colors duration-200'>
							<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
								<div className='space-y-1'>
									<h4 className='text-sm font-medium text-muted-foreground'>Selling Price</h4>
									<p className='text-2xl font-bold text-emerald-700 dark:text-emerald-400'>${item.price.toFixed(2)}</p>
								</div>
								{item.purchase_price && (
									<div className='space-y-1'>
										<h4 className='text-sm font-medium text-muted-foreground'>Purchase Price</h4>
										<p className='text-lg font-semibold text-muted-foreground'>${item.purchase_price.toFixed(2)}</p>
									</div>
								)}
								{item.tax_rate && (
									<div className='space-y-1'>
										<h4 className='text-sm font-medium text-muted-foreground'>Tax Rate</h4>
										<p className='text-lg font-semibold text-purple-600 dark:text-purple-400'>{(item.tax_rate * 100).toFixed(1)}%</p>
									</div>
								)}
							</div>
							{item.purchase_price && (
								<div className='mt-4 pt-4 border-t border-emerald-200/50 dark:border-emerald-800/40'>
									<div className='flex justify-between items-center text-sm'>
										<span className='text-muted-foreground'>Profit Margin:</span>
										<span className='font-semibold text-emerald-700 dark:text-emerald-400'>
											${(item.price - item.purchase_price).toFixed(2)} ({(((item.price - item.purchase_price) / item.purchase_price) * 100).toFixed(1)}%)
										</span>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Additional Information */}
					{(item.description || item.schedule) && (
						<>
							<Separator />
							<div className='space-y-4'>
								<div className='flex items-center gap-2 mb-4'>
									<div className='p-1.5 bg-purple-100 rounded-md dark:bg-purple-900/50'>
										<FileText className='h-5 w-5 text-purple-600 dark:text-purple-400' />
									</div>
									<h3 className='text-lg font-semibold text-foreground'>Additional Information</h3>
								</div>
								<div className='bg-purple-50/50 dark:bg-purple-950/30 rounded-lg p-4 space-y-4 border border-purple-200/50 dark:border-purple-800/40 transition-colors duration-200'>
									{item.description && (
										<div className='space-y-2'>
											<h4 className='text-sm font-medium text-muted-foreground'>Description</h4>
											<p className='text-foreground leading-relaxed'>{item.description}</p>
										</div>
									)}
									{item.schedule && (
										<div className='space-y-2'>
											<h4 className='text-sm font-medium text-muted-foreground flex items-center gap-1'>
												<Clock className='w-3 h-3' />
												Schedule
											</h4>
											<Badge
												variant='outline'
												className='text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'>
												{item.schedule}
											</Badge>
										</div>
									)}
								</div>
							</div>
						</>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}
