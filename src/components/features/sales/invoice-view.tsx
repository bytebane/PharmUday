'use client'

import { SaleWithFullDetails } from '@/app/(main)/sales/[id]/page' // Import the detailed type
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { Printer } from 'lucide-react'

interface InvoiceViewProps {
	saleDetails: SaleWithFullDetails
}

export function InvoiceView({ saleDetails }: InvoiceViewProps) {
	const handlePrint = () => {
		window.print()
	}

	if (!saleDetails) return <p>Loading invoice details...</p>
	const { invoice, customer, staff, saleItems, saleDate, subTotal, totalDiscount, totalTax, grandTotal, paymentMethod } = saleDetails

	return (
		<div className='bg-white p-8 shadow-lg rounded-lg max-w-4xl mx-auto print-area text-black'>
			<style
				jsx
				global>{`
				@media print {
					body * {
						visibility: hidden;
					}
					.print-area,
					.print-area * {
						visibility: visible;
					}
					.print-area {
						position: absolute;
						left: 0;
						top: 0;
						width: 100%;
					}
					.no-print {
						display: none !important;
					}
				}
			`}</style>

			<div className='flex justify-between items-start mb-8'>
				<div>
					<h1 className='text-3xl font-bold text-gray-800'>Invoice</h1>
					<p className='text-gray-600'>Invoice #: {invoice?.id || 'N/A'}</p>
					<p className='text-gray-600'>Date: {format(new Date(invoice?.createdAt || saleDate), 'PPP')}</p>
				</div>
				<div className='text-right'>
					<h2 className='text-xl font-semibold text-gray-700'>Your Pharmacy Name</h2>
					<p className='text-gray-500'>123 Pharmacy Lane, MedCity</p>
					<p className='text-gray-500'>Phone: (555) 123-4567</p>
				</div>
			</div>

			<div className='grid grid-cols-2 gap-8 mb-8'>
				<div>
					<h3 className='font-semibold text-gray-700 mb-1'>Bill To:</h3>
					<p className='text-gray-600'>{customer?.name || 'Walk-in Customer'}</p>
					{customer?.address && <p className='text-gray-500'>{customer.address}</p>}
					{customer?.phone && <p className='text-gray-500'>Phone: {customer.phone}</p>}
					{customer?.email && <p className='text-gray-500'>Email: {customer.email}</p>}
				</div>
				<div className='text-right'>
					<h3 className='font-semibold text-gray-700 mb-1'>Staff:</h3>
					<p className='text-gray-600'>{staff.profile?.firstName || staff.email}</p>
				</div>
			</div>

			<Table className='mb-8'>
				<TableHeader>
					<TableRow className='bg-slate-200'>
						<TableHead className='w-[50px] text-slate-800'>#</TableHead>
						<TableHead className='text-slate-800'>Item Description</TableHead>
						<TableHead className='text-right text-slate-800'>Qty</TableHead>
						<TableHead className='text-right text-slate-800'>Unit Price</TableHead>
						<TableHead className='text-right text-slate-800'>Total</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{saleItems.map((sItem, index) => (
						<TableRow key={index}>
							<TableCell>{index + 1}</TableCell>
							<TableCell>
								{sItem.item.name} {sItem.item.strength && `(${sItem.item.strength})`}{' '}
							</TableCell>
							<TableCell className='text-right'>{sItem.quantitySold}</TableCell>
							<TableCell className='text-right'>₹{sItem.priceAtSale.toFixed(2)}</TableCell>
							<TableCell className='text-right'>₹{sItem.totalPrice.toFixed(2)}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<div className='flex justify-end mb-8'>
				<div className='w-full max-w-xs space-y-2'>
					<div className='flex justify-between'>
						<span className='text-gray-600'>Subtotal:</span>
						<span>₹{subTotal.toFixed(2)}</span>
					</div>
					<div className='flex justify-between'>
						<span className='text-gray-600'>Discount:</span>
						<span>- ₹{totalDiscount.toFixed(2)}</span>
					</div>
					<div className='flex justify-between'>
						<span className='text-gray-600'>Tax:</span>
						<span>+ ₹{totalTax.toFixed(2)}</span>
					</div>
					<div className='flex justify-between font-bold text-xl border-t pt-2 mt-2'>
						<span className='text-gray-800'>Grand Total:</span>
						<span>₹{grandTotal.toFixed(2)}</span>
					</div>
				</div>
			</div>

			<div className='mb-8'>
				<h3 className='font-semibold text-gray-700 mb-1'>Payment Details:</h3>
				<p className='text-gray-600'>Method: {paymentMethod.replace('_', ' ')}</p>
				<p className='text-gray-600'>Status: Paid</p>
			</div>

			<div className='text-center text-xs text-gray-500 mt-12'>Thank you for your business!</div>

			<div className='mt-8 text-center no-print'>
				<Button
					onClick={handlePrint}
					size='lg'>
					<Printer className='mr-2 h-5 w-5' /> Print Invoice
				</Button>
			</div>
		</div>
	)
}
