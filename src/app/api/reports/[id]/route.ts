import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { reportPatchSchema } from '@/lib/validations/report'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@/generated/prisma'
import { del } from '@vercel/blob' // Import Vercel Blob SDK for deletion
import { put } from '@vercel/blob' // Import Vercel Blob SDK for upload
import { nanoid } from 'nanoid' // For unique filenames
import { parseFormData } from '@/lib/utils/formData-utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await getCurrentUser()
		if (!user) return new NextResponse('Unauthorized', { status: 401 })

		const { id } = await params
		const report = await db.report.findUnique({
			where: { id },
			include: { category: true, uploadedBy: { select: { id: true, email: true } } },
		})

		if (!report) return new NextResponse('Report not found', { status: 404 })

		// Authorization: User can only get their own reports unless admin/pharmacist
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		return NextResponse.json(report)
	} catch (error) {
		console.error('[REPORT_GET]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await getCurrentUser()
		if (!user) return new NextResponse('Unauthorized', { status: 401 })

		const { id } = await params
		const reportToUpdate = await db.report.findUnique({ where: { id } })

		if (!reportToUpdate) return new NextResponse('Report not found', { status: 404 })

		// Authorization check: only owner or authorized roles can edit
		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		// Define the expected shape of non-file form data for type safety with parseFormData
		type ReportPatchFormData = Omit<z.infer<typeof reportPatchSchema>, 'file'> // Assuming 'file' is not part of schema for text fields

		const { data: formDataValues, file: newFile } = await parseFormData<ReportPatchFormData>(req)

		// Manually convert reportDate from string to Date if present in formDataValues
		if (formDataValues.reportDate && typeof formDataValues.reportDate === 'string') {
			formDataValues.reportDate = new Date(formDataValues.reportDate)
		}

		const body = reportPatchSchema.parse(formDataValues)
		const dataToUpdate: any = { ...body }

		if (newFile) {
			// 1. Delete old file from Vercel Blob if it exists
			if (reportToUpdate.fileUrl) {
				try {
					await del(reportToUpdate.fileUrl)
				} catch (blobDeleteError) {
					console.warn(`Failed to delete old blob file ${reportToUpdate.fileUrl}:`, blobDeleteError)
					// Decide if this should be a hard error or just a warning
				}
			}

			// 2. Upload new file to Vercel Blob
			const fileExtension = newFile.name.split('.').pop()
			const uniqueFilename = `${nanoid()}${fileExtension ? '.' + fileExtension : ''}`
			const newBlob = await put(uniqueFilename, newFile, {
				access: 'public',
			})

			// 3. Update database fields for the new file
			dataToUpdate.fileUrl = newBlob.url
			dataToUpdate.fileType = newFile.type
			dataToUpdate.fileSize = newFile.size
		}

		const updatedReport = await db.report.update({
			where: { id },
			data: dataToUpdate,
		})
		return NextResponse.json(updatedReport)
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ issues: error.issues }, { status: 422 })
		}
		console.error('[REPORT_PATCH]', error)
		return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
	}
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await getCurrentUser()
		if (!user) return new NextResponse('Unauthorized', { status: 401 })

		const { id } = await params
		const reportToDelete = await db.report.findUnique({ where: { id } })

		if (!reportToDelete) return new NextResponse('Report not found', { status: 404 })

		if (!user || ![Role.ADMIN, Role.PHARMACIST, Role.SUPER_ADMIN].includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST')) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		// Delete the file from Vercel Blob storage
		if (reportToDelete.fileUrl) {
			await del(reportToDelete.fileUrl)
		}

		await db.report.delete({ where: { id } })
		return new NextResponse(null, { status: 204 })
	} catch (error) {
		console.error('[REPORT_DELETE]', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}
