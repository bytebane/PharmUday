'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Report as PrismaReport, ReportCategory as PrismaReportCategory, User as PrismaUser, Role } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ReportForm } from './reports-form' // Assuming this is the correct path to your ReportForm
import { PlusCircle, Edit, Trash2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'

// Type from app/reports/page.tsx
type ReportWithRelations = PrismaReport & {
	category: PrismaReportCategory
	uploadedBy: Pick<PrismaUser, 'id' | 'email'>
}

async function fetchReportsAPI(): Promise<ReportWithRelations[]> {
	const response = await fetch('/api/reports')
	if (!response.ok) {
		throw new Error('Failed to fetch reports from client')
	}
	return response.json()
}

async function deleteReportAPI(id: string): Promise<void> {
	const response = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
	if (!response.ok) {
		const errorData = await response.text()
		throw new Error(`Failed to delete report: ${errorData || response.statusText}`)
	}
}

const reportQueryKeys = {
	all: ['reports'] as const,
	lists: () => [...reportQueryKeys.all, 'list'] as const,
}

interface ReportListProps {
	initialReports: ReportWithRelations[]
}

export function ReportList({ initialReports }: ReportListProps) {
	const { data: session } = useSession()
	const [isSheetOpen, setIsSheetOpen] = useState(false)
	const [editingReport, setEditingReport] = useState<PrismaReport | null>(null) // Use PrismaReport for editing form
	const queryClient = useQueryClient()

	// Users can manage their own reports. Admins/Pharmacists can manage all.
	const canManageAll = session?.user?.role === Role.ADMIN || session?.user?.role === Role.SUPER_ADMIN || session?.user?.role === Role.PHARMACIST

	const {
		data: reports,
		isLoading,
		error,
	} = useQuery<ReportWithRelations[], Error>({
		queryKey: reportQueryKeys.lists(),
		queryFn: fetchReportsAPI,
		initialData: initialReports,
	})

	const deleteMutation = useMutation({
		mutationFn: deleteReportAPI,
		onSuccess: () => {
			toast.success('Report deleted successfully.')
			queryClient.invalidateQueries({ queryKey: reportQueryKeys.lists() })
		},
		onError: (err: Error) => {
			toast.error(err.message || 'Failed to delete report.')
		},
	})

	const handleEdit = (report: PrismaReport) => {
		setEditingReport(report)
		setIsSheetOpen(true)
	}

	const handleAddNew = () => {
		setEditingReport(null)
		setIsSheetOpen(true)
	}

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this report? The associated file will also be removed.')) return
		deleteMutation.mutate(id)
	}

	const handleFormSuccess = () => {
		setIsSheetOpen(false)
		setEditingReport(null)
	}

	if (isLoading && !reports) return <div>Loading reports...</div>
	if (error) return <div className='text-red-600'>Error: {error.message}</div>

	const currentReports = reports || []

	return (
		<div>
			<div className='mb-4 flex justify-end'>
				<Sheet
					open={isSheetOpen}
					onOpenChange={setIsSheetOpen}>
					<SheetTrigger asChild>
						<Button onClick={handleAddNew}>
							<PlusCircle className='mr-2 h-4 w-4' /> Add New Report
						</Button>
					</SheetTrigger>
					<SheetContent className='w-full overflow-y-auto sm:max-w-lg md:max-w-xl'>
						<SheetHeader>
							<SheetTitle>{editingReport ? 'Edit Report' : 'Add New Report'}</SheetTitle>
						</SheetHeader>
						<ReportForm
							reportData={editingReport}
							onSuccess={handleFormSuccess}
						/>
					</SheetContent>
				</Sheet>
			</div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Title</TableHead>
						<TableHead>Category</TableHead>
						<TableHead>Report Date</TableHead>
						<TableHead>Patient</TableHead>
						{canManageAll && <TableHead>Uploaded By</TableHead>}
						<TableHead>File</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{currentReports.map(report => {
						const canCurrentUserModify = canManageAll || session?.user?.id === report.uploadedById
						return (
							<TableRow key={report.id}>
								<TableCell>{report.title}</TableCell>
								<TableCell>{report.category.name}</TableCell>
								<TableCell>{format(new Date(report.reportDate), 'PPP')}</TableCell>
								<TableCell>{report.patientName ?? 'N/A'}</TableCell>
								{canManageAll && <TableCell>{report.uploadedBy.email}</TableCell>}
								<TableCell>
									<a
										href={report.fileUrl}
										target='_blank'
										rel='noopener noreferrer'
										className='text-blue-600 hover:underline'>
										<FileText className='inline h-5 w-5' /> View
									</a>
								</TableCell>
								<TableCell>
									{canCurrentUserModify && (
										<>
											<Button
												variant='ghost'
												size='sm'
												onClick={() => handleEdit(report)}>
												<Edit className='mr-2 h-4 w-4' /> Edit
											</Button>
											<Button
												variant='ghost'
												size='sm'
												className='text-red-600 hover:text-red-700'
												onClick={() => handleDelete(report.id)}
												disabled={deleteMutation.isPending && deleteMutation.variables === report.id}>
												<Trash2 className='mr-2 h-4 w-4' /> Delete
											</Button>
										</>
									)}
								</TableCell>
							</TableRow>
						)
					})}
				</TableBody>
			</Table>
		</div>
	)
}
