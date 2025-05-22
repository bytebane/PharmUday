import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { reportCreateSchema } from '@/lib/validations/report'
import { getCurrentUser } from '@/lib/auth'
import { put } from '@vercel/blob' // Import Vercel Blob SDK
import { nanoid } from 'nanoid' // For generating unique filenames
import { parseFormData } from '@/lib/utils/formData-utils'

const paginationSchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(10),
	search: z.string().optional(),
	categoryId: z.string().optional(),
	from: z.string().optional(),
	to: z.string().optional(),
})

export async function GET(req: Request) {
	try {
		const url = new URL(req.url)
		const params = paginationSchema.parse(Object.fromEntries(url.searchParams))
		const { page, limit, search, categoryId, from, to } = params

		const where: any = {}
		if (search) {
			where.OR = [{ title: { contains: search, mode: 'insensitive' } }, { patientName: { contains: search, mode: 'insensitive' } }, { notes: { contains: search, mode: 'insensitive' } }]
		}
		if (categoryId && categoryId !== 'all') {
			where.categoryId = categoryId
		}
		if (from || to) {
			where.reportDate = {}
			if (from) where.reportDate.gte = new Date(from)
			if (to) where.reportDate.lte = new Date(to)
		}

		const [reports, total] = await Promise.all([
			db.report.findMany({
				where,
				include: {
					category: true,
					uploadedBy: { select: { id: true, email: true } },
				},
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * limit,
				take: limit,
			}),
			db.report.count({ where }),
		])

		return NextResponse.json({ reports, total })
	} catch (error) {
		console.error('[REPORTS_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function POST(req: NextRequest) {
	try {
		const user = await getCurrentUser()
		if (!user) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		// Define the expected shape of non-file form data for type safety with parseFormData
		type ReportCreateFormData = Omit<z.infer<typeof reportCreateSchema>, 'file'> // Assuming 'file' is not part of schema for text fields

		const { data, file } = await parseFormData<ReportCreateFormData>(req)

		// Manually convert reportDate from string to Date
		if (data.reportDate && typeof data.reportDate === 'string') {
			data.reportDate = new Date(data.reportDate)
		}

		const body = reportCreateSchema.parse(data)

		if (!file) {
			return NextResponse.json({ message: 'Report file is required.' }, { status: 422 })
		}

		// --- File Upload Logic (Vercel Blob) ---
		const fileExtension = file.name.split('.').pop()
		const uniqueFilename = `${nanoid()}${fileExtension ? '.' + fileExtension : ''}`

		const blob = await put(uniqueFilename, file, {
			access: 'public', // Make the blob publicly accessible
			// You can add contentType if needed, though Vercel Blob often infers it
			// contentType: file.type,
		})
		// --- End File Upload Logic ---

		const report = await db.report.create({
			data: {
				...body,
				fileUrl: blob.url, // Store the actual URL from your storage service
				fileType: file.type,
				fileSize: file.size,
				uploadedById: user.id, // Store the URL from Vercel Blob
			},
		})
		return NextResponse.json(report, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ issues: error.issues }, { status: 422 })
		}
		console.error('[REPORTS_POST]', error)
		return NextResponse.json({ message: 'Internal Server Error', error: error instanceof Error ? error.message : String(error) }, { status: 500 })
	}
}
