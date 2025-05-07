import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@/generated/prisma'
import { saleCreateSchema } from '@/lib/validations/sale'
import { Prisma } from '@/generated/prisma' // Import Prisma for types

export async function GET() {
	try {
		const user = await getCurrentUser()
		if (!user) return new NextResponse('Unauthorized', { status: 401 })

		// Allow admins/pharmacists to see all sales, others only their own (if applicable)
		// For now, let's assume authorized users can see all sales for simplicity in a pharmacy context
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		const sales = await db.sale.findMany({
			include: {
				staff: { select: { id: true, email: true } },
				customer: { select: { id: true, name: true } },
				saleItems: { include: { item: { select: { id: true, name: true } } } },
				invoice: true,
			},
			orderBy: { saleDate: 'desc' },
		})
		return NextResponse.json(sales)
	} catch (error) {
		console.error('[SALES_GET_LIST]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function POST(req: NextRequest) {
	try {
		const user = await getCurrentUser()
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		const json = await req.json()
		const body = saleCreateSchema.parse(json)

		let subTotal = 0
		const saleItemData: Prisma.SaleItemCreateManySaleInput[] = []

		// Start a transaction
		const result = await db.$transaction(async prisma => {
			// 1. Validate items and calculate subTotal
			for (const saleItem of body.saleItems) {
				const item = await prisma.item.findUnique({ where: { id: saleItem.itemId } })
				if (!item) {
					throw new Error(`Item with ID ${saleItem.itemId} not found.`)
				}
				if (item.quantity_in_stock < saleItem.quantitySold) {
					throw new Error(`Insufficient stock for item: ${item.name}. Available: ${item.quantity_in_stock}, Requested: ${saleItem.quantitySold}.`)
				}

				const priceAtSale = item.price // Use current item price
				const itemTotal = priceAtSale * saleItem.quantitySold - (saleItem.discountOnItem || 0) + (saleItem.taxOnItem || 0)
				subTotal += itemTotal // This subTotal is after item-specific discounts/taxes

				saleItemData.push({
					itemId: saleItem.itemId,
					quantitySold: saleItem.quantitySold,
					priceAtSale: priceAtSale,
					discountOnItem: saleItem.discountOnItem || 0,
					taxOnItem: saleItem.taxOnItem || 0,
					totalPrice: itemTotal,
				})

				// 2. Decrement stock
				await prisma.item.update({
					where: { id: saleItem.itemId },
					data: { quantity_in_stock: { decrement: saleItem.quantitySold } },
				})
			}

			// 3. Calculate grandTotal
			const grandTotal = subTotal - (body.totalDiscount || 0) + (body.totalTax || 0)

			// 4. Create Sale record
			console.log('Inside transaction, typeof prisma:', typeof prisma)
			console.log('Inside transaction, prisma object:', prisma ? Object.keys(prisma) : null)
			const newSale = await prisma.sale.create({
				data: {
					staffId: user.id,
					customerId: body.customerId,
					subTotal: subTotal, // This subTotal is actually the sum of line item totals
					totalDiscount: body.totalDiscount || 0,
					totalTax: body.totalTax || 0,
					grandTotal: grandTotal,
					paymentMethod: body.paymentMethod,
					paymentStatus: 'PAID', // Assuming payment is made at point of sale for now
					amountPaid: grandTotal, // Assuming full payment
					notes: body.notes,
					saleItems: {
						createMany: {
							data: saleItemData,
						},
					},
				},
				include: {
					// Include related data for the response
					saleItems: { include: { item: true } },
					customer: true,
					staff: true,
				},
			})

			// 5. Create Invoice record
			// Simple invoice number generation, consider a more robust system
			const invoiceNumber = `INV-${new Date().getFullYear()}-${String(newSale.id).substring(0, 6).toUpperCase()}`
			await prisma.invoice.create({
				data: {
					saleId: newSale.id,
					invoiceNumber: invoiceNumber,
					issuedDate: new Date(),
					status: 'ISSUED', // Or 'PAID' if paymentStatus is PAID
				},
			})

			return newSale // Return the created sale with its items
		})

		return NextResponse.json(result, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ issues: error.issues }, { status: 422 })
		}
		if (error instanceof Error && (error.message.includes('Item with ID') || error.message.includes('Insufficient stock'))) {
			return NextResponse.json({ message: error.message }, { status: 400 }) // Bad request due to item issue
		}
		console.error('[SALES_POST]', error)
		return NextResponse.json({ message: 'Internal Server Error', error: error instanceof Error ? error.message : String(error) }, { status: 500 })
	}
}
