import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Role } from '@/generated/prisma'
import { esClient } from '@/lib/elastic'
import { ElasticIndex } from '@/types/common'
import { authorize } from '@/lib/utils/auth-utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { response } = await authorize([Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN, Role.CUSTOMER])
		if (response) return response

		const { id } = await params
		const sale = await db.sale.findUnique({
			where: { id },
			include: {
				staff: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
					},
				},
				customer: true,
				saleItems: {
					include: {
						item: { select: { id: true, name: true, strength: true, formulation: true } },
					},
					orderBy: { createdAt: 'asc' },
				},
				invoice: true,
			},
		})

		if (!sale) {
			return new NextResponse('Sale not found', { status: 404 })
		}
		return NextResponse.json(sale)
	} catch (error) {
		console.error('[SALE_GET_SINGLE]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { user, response } = await authorize([Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN])
		if (response) return response

		const { id } = await params
		const json = await req.json()
		// You should validate and parse json here (add schema as needed)

		const updatedSale = await db.sale.update({
			where: { id },
			data: json, // In production, validate and sanitize fields
			include: {
				invoice: true,
				customer: true,
				staff: true,
				saleItems: { include: { item: true } },
			},
		})

		// Re-index the updated sale in Elasticsearch
		await esClient.index({
			index: ElasticIndex.SALES,
			id: updatedSale.id,
			document: {
				...updatedSale,
			},
		})

		return NextResponse.json(updatedSale)
	} catch (error) {
		console.error('[SALE_PATCH]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

// PATCH and DELETE for sales can be added here if needed (e.g., for cancellations, refunds, updating payment status)
