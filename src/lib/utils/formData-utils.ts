import { NextRequest } from 'next/server'

export interface ParsedFormData<T = { [key: string]: unknown }> {
	data: T
	file: File | null
}

export async function parseFormData<T = { [key: string]: unknown }>(req: NextRequest): Promise<ParsedFormData<T>> {
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
	return { data: data as T, file }
}
