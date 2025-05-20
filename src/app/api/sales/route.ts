import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@/generated/prisma'
import { saleCreateSchema } from '@/lib/validations/sale'
import { Prisma } from '@/generated/prisma' // Import Prisma for types

const paginationSchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(10),
	search: z.string().optional(),
	period: z.enum(['today', 'this_month', 'this_year', 'all_time']).optional(),
})

function getPeriodRange(period: string) {
	const now = new Date()
	if (period === 'today') {
		const start = new Date(now)
		start.setHours(0, 0, 0, 0)
		const end = new Date(start)
		end.setDate(start.getDate() + 1)
		return { gte: start, lt: end }
	}
	if (period === 'this_month') {
		const start = new Date(now.getFullYear(), now.getMonth(), 1)
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
		return { gte: start, lt: end }
	}
	if (period === 'this_year') {
		const start = new Date(now.getFullYear(), 0, 1)
		const end = new Date(now.getFullYear() + 1, 0, 1)
		return { gte: start, lt: end }
	}
	return undefined
}

export async function GET(req: Request) {
	try {
		const url = new URL(req.url)
		const params = paginationSchema.parse(Object.fromEntries(url.searchParams))
		const { page, limit, search, period } = params

		const where: any = {}

		if (search) {
			where.OR = [{ invoice: { id: { contains: search, mode: 'insensitive' } } }, { customer: { name: { contains: search, mode: 'insensitive' } } }, { staff: { email: { contains: search, mode: 'insensitive' } } }]
		}

		if (period && period !== 'all_time') {
			where.saleDate = getPeriodRange(period)
		}

		const [sales, total] = await Promise.all([
			db.sale.findMany({
				where,
				include: {
					invoice: true,
					customer: true,
					staff: true,
				},
				orderBy: { saleDate: 'desc' },
				skip: (page - 1) * limit,
				take: limit,
			}),
			db.sale.count({ where }),
		])

		return NextResponse.json({ sales, total })
	} catch (error) {
		console.error('[SALES_GET]', error)
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
			// const invoiceNumber = `INV-${new Date().getFullYear()}-${String(newSale.id).substring(0, 6).toUpperCase()}`
			await prisma.invoice.create({
				data: {
					saleId: newSale.id,
					// invoiceNumber: invoiceNumber,
					// createdAt: new Date(),
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
