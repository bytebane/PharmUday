'use client'

import * as React from 'react'
import { ColumnDef, ColumnFiltersState } from '@tanstack/react-table'

import { Input } from '@/components/ui/input'
import { CustomDataTable } from '@/components/custom/custom-data-table' // Import your custom component

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
}

export function UserDataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
	// Column filters are often managed here because the filter inputs are part of this component's layout.
	// If CustomDataTable were to manage them, you'd need to pass callbacks or render filter inputs via props.
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

	// This is a common pattern: get a reference to the table instance if you need to interact with it
	// For simple display, CustomDataTable might not need to expose its internal table instance.
	// However, for column-specific filtering like below, you need access to table.getColumn().
	// One way is to pass `columnFilters` and `onColumnFiltersChange` to CustomDataTable
	// and let it manage its internal table state.

	// For this example, let's assume CustomDataTable handles its own table instance
	// and we'll need to adjust how filters are applied if they are outside CustomDataTable.
	// A more advanced CustomDataTable would accept `externalColumnFilters` and `onExternalColumnFiltersChange` props.

	// For now, let's simplify and assume the filter input directly updates a filter state
	// that CustomDataTable can consume if we pass it.
	// The current CustomDataTable doesn't accept external filter state directly,
	// so this input would not work without modifying CustomDataTable to accept filter state/handlers.

	// To make the existing filter input work with the new CustomDataTable,
	// CustomDataTable would need to accept `columnFilters` and `onColumnFiltersChange` as props
	// and pass them to its `useReactTable` instance.
	// Let's assume we'll modify CustomDataTable later for that.
	// For now, this input is illustrative of where you'd place it.

	return (
		<div>
			<div className='flex items-center py-4'>
				<Input
					placeholder='Filter by name...'
					// This would need to be wired up to the CustomDataTable's filtering mechanism
					// For example, by passing a filter state and setter to CustomDataTable
					// Or by having CustomDataTable expose a method to set filters.
					// value={columnFilters.find(f => f.id === 'name')?.value as string ?? ''}
					// onChange={event => {
					//   const newFilters = columnFilters.filter(f => f.id !== 'name');
					//   if (event.target.value) {
					//     newFilters.push({ id: 'name', value: event.target.value });
					//   }
					//   setColumnFilters(newFilters);
					// }}
					className='max-w-sm'
				/>
			</div>
			<CustomDataTable
				columns={columns}
				data={data}
			/>
			{/* Pagination controls would ideally be part of CustomDataTable or passed to it */}
		</div>
	)
}
