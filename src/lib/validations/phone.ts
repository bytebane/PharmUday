import * as z from 'zod'

// Indian phone number validation
// - Must be exactly 10 digits
// - Must start with 6, 7, 8, or 9 (valid Indian mobile number prefixes)
export const indianPhoneSchema = z
	.string()
	.refine(
		value => {
			if (!value) return true // Allow empty/null values for optional fields
			// Check if it's exactly 10 digits and starts with 6, 7, 8, or 9
			return /^[6-9]\d{9}$/.test(value)
		},
		{
			message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9',
		},
	)
	.nullable()
	.optional()

// For required phone fields
export const requiredIndianPhoneSchema = z
	.string()
	.min(1, { message: 'Phone number is required' })
	.refine(
		value => {
			// Check if it's exactly 10 digits and starts with 6, 7, 8, or 9
			return /^[6-9]\d{9}$/.test(value)
		},
		{
			message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9',
		},
	)

export const formatPhoneForDisplay = (phone: string | null | undefined): string => {
	if (!phone) return ''
	// Format as XXX-XXX-XXXX for display
	if (phone.length === 10) {
		return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`
	}
	return phone
}

export const validateIndianPhone = (phone: string): boolean => {
	return /^[6-9]\d{9}$/.test(phone)
}
