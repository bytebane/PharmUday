import { Role } from '@/generated/prisma'

export interface Pagination {
	pageIndex: number
	pageSize: number
}

export interface User {
	id: string
	name: string
	email: string
	role: Role
	storeId: string
}

export interface Store {
	id: string
	name: string
	logo?: string
	plan: string
}

export interface ApiResponse<T> {
	data: T
	error?: string
	success: boolean
}

export interface DataTableColumn {
	accessorKey: string
	header: string
	cell: (props: { row: any }) => React.ReactNode
}

export enum ElasticIndex {
	ITEMS = 'items',
	CUSTOMERS = 'customers',
	REPORTS = 'reports',
	SALES = 'sales',
	USERS = 'users',
}
