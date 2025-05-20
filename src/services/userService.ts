import { User as PrismaUser } from '@/generated/prisma'

export async function fetchUsers_cli(page = 1, limit = 10, search = '', role?: string): Promise<{ users: PrismaUser[]; total: number }> {
	const params = new URLSearchParams({
		page: String(page),
		limit: String(limit),
		...(search ? { search } : {}),
		...(role ? { role } : {}),
	})
	const response = await fetch(`/api/admin/users?${params.toString()}`)
	if (!response.ok) throw new Error('Failed to fetch users')
	const result = await response.json()
	return {
		users: Array.isArray(result.users) ? result.users : [],
		total: typeof result.total === 'number' ? result.total : 0,
	}
}

export async function createUser_cli(data: any): Promise<PrismaUser> {
	const response = await fetch('/api/admin/users', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	})
	const result = await response.json()
	if (!response.ok) throw new Error(result.message || 'Failed to create user')
	return result
}

export async function updateUser_cli(id: string, data: any): Promise<PrismaUser> {
	const payload = { ...data }
	if (!payload.password) delete payload.password
	const response = await fetch(`/api/admin/users/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	})
	const result = await response.json()
	if (!response.ok) throw new Error(result.message || 'Failed to update user')
	return result
}

export async function deleteUser_cli(id: string): Promise<void> {
	const response = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
	const result = await response.json()
	if (!response.ok) throw new Error(result.message || 'Failed to delete user')
}
