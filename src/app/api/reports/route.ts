import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { reportCreateSchema } from '@/lib/validations/report'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@/generated/prisma'
import { put } from '@vercel/blob' // Import Vercel Blob SDK
import { nanoid } from 'nanoid' // For generating unique filenames

// Helper to parse FormData
async function parseFormData(req: NextRequest) {
	const formData = await req.formData()
	const data: { [key: string]: unknown } = {}
	let file: File | null = null

	for (const [key, value] of formData.entries()) {
		if (value instanceof File) {
			file = value
		} else {
			data[key] = value
		}
	}
	return { data, file }
}

export async function GET() {
	try {
		const user = await getCurrentUser()
		console.log('User:', user)
		if (!user) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		// Fetch reports uploaded by the current user or all if admin/pharmacist
		const whereClause = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN || user.role === Role.PHARMACIST ? {} : { uploadedById: user.id }

		const reports = await db.report.findMany({
			where: whereClause,
			include: {
				category: true,
				uploadedBy: { select: { id: true, email: true } },
			},
			orderBy: { createdAt: 'desc' },
		})
		return NextResponse.json(reports)
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

		const { data, file } = await parseFormData(req)

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
