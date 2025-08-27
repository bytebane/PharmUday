import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

import { Settings2, Eye, EyeOff, RotateCcw, CheckSquare, Square, Layers, Star, Lock } from 'lucide-react'
import { ITEM_COLUMNS, ColumnVisibilityState, getBasicColumns, getAdvancedColumns, COLUMN_PRESETS, DEFAULT_COLUMN_VISIBILITY } from '@/types/column-visibility'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface ColumnVisibilityToggleProps {
	columnVisibility: ColumnVisibilityState
	onToggleColumn: (columnId: string) => void
	onResetToDefaults: () => void
	onApplyPreset: (presetName: keyof typeof COLUMN_PRESETS) => void
	onShowAllColumns: () => void
	onHideAllColumns: () => void
	isColumnRequired: (columnId: string) => boolean
	isHydrated?: boolean // Add hydration prop
	allowedColumns?: string[] // List of allowed columns for restricted users
	restrictedMode?: boolean // Whether to operate in restricted mode
}

export function ColumnVisibilityToggle({ columnVisibility, onToggleColumn, onResetToDefaults, onApplyPreset, onShowAllColumns, onHideAllColumns, isColumnRequired, isHydrated = true, allowedColumns, restrictedMode = false }: ColumnVisibilityToggleProps) {
	const [isOpen, setIsOpen] = useState(false)

	// Filter columns based on restrictedMode and allowedColumns
	const availableColumns = restrictedMode && allowedColumns ? ITEM_COLUMNS.filter(col => allowedColumns.includes(col.id)) : ITEM_COLUMNS

	// Calculate visible columns count - use defaults during SSR
	const visibleCount = isHydrated ? Object.values(columnVisibility).filter(Boolean).length : Object.values(DEFAULT_COLUMN_VISIBILITY).filter(Boolean).length
	const totalCount = availableColumns.length

	const basicColumns = restrictedMode && allowedColumns ? getBasicColumns().filter(col => allowedColumns.includes(col.id)) : getBasicColumns()
	const advancedColumns = restrictedMode && allowedColumns ? getAdvancedColumns().filter(col => allowedColumns.includes(col.id)) : getAdvancedColumns()

	// Calculate counts for each category - use defaults during SSR
	const basicVisibleCount = isHydrated ? basicColumns.filter(col => columnVisibility[col.id] ?? true).length : basicColumns.filter(col => DEFAULT_COLUMN_VISIBILITY[col.id] ?? true).length
	const advancedVisibleCount = isHydrated ? advancedColumns.filter(col => columnVisibility[col.id] ?? true).length : advancedColumns.filter(col => DEFAULT_COLUMN_VISIBILITY[col.id] ?? true).length

	const renderColumnItem = (column: (typeof ITEM_COLUMNS)[0]) => {
		const isVisible = isHydrated ? (columnVisibility[column.id] ?? true) : (DEFAULT_COLUMN_VISIBILITY[column.id] ?? true)
		const isRequired = isColumnRequired(column.id)

		return (
			<DropdownMenuCheckboxItem
				key={column.id}
				className='flex items-center gap-2 capitalize'
				checked={isVisible}
				disabled={isRequired}
				onSelect={e => e.preventDefault()} // Prevent dropdown from closing
				onCheckedChange={() => !isRequired && onToggleColumn(column.id)}>
				<div className='flex items-center gap-2 flex-1'>
					{column.label}
					{isRequired && <Lock className='h-3 w-3 text-muted-foreground' />}
				</div>
			</DropdownMenuCheckboxItem>
		)
	}

	return (
		<DropdownMenu
			open={isOpen}
			onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant='outline'
					size='sm'
					className='ml-2 gap-2'>
					<Settings2 className='h-4 w-4' />
					Columns
					<Badge
						variant='secondary'
						className='ml-1 h-5 px-1.5 text-xs'>
						{visibleCount}/{totalCount}
					</Badge>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align='end'
				className='w-80'
				side='bottom'
				sideOffset={4}>
				<DropdownMenuLabel className='flex items-center gap-2'>
					<Layers className='h-4 w-4' />
					Column Visibility
				</DropdownMenuLabel>
				<DropdownMenuSeparator />

				{/* Quick Actions */}
				<div className='p-2'>
					<div className='flex gap-1 flex-wrap'>
						<Button
							variant='outline'
							size='sm'
							className='h-7 px-2 text-xs'
							onClick={onHideAllColumns}>
							<Square className='h-3 w-3 mr-1' />
							Minimal
						</Button>
						<Button
							variant='outline'
							size='sm'
							className='h-7 px-2 text-xs'
							onClick={() => onApplyPreset('basic')}>
							<Star className='h-3 w-3 mr-1' />
							Basic
						</Button>
						{!restrictedMode && (
							<Button
								variant='outline'
								size='sm'
								className='h-7 px-2 text-xs'
								onClick={onShowAllColumns}>
								<CheckSquare className='h-3 w-3 mr-1' />
								Show All
							</Button>
						)}
						<Button
							variant='outline'
							size='sm'
							className='h-7 px-2 text-xs'
							onClick={onResetToDefaults}>
							<RotateCcw className='h-3 w-3 mr-1' />
							Reset
						</Button>
					</div>
				</div>

				<DropdownMenuSeparator />

				{/* Tabbed Column Lists */}
				<div className='p-2'>
					<Tabs
						defaultValue='basic'
						className='w-full'>
						<TabsList className='grid w-full grid-cols-2 h-8'>
							<TabsTrigger
								value='basic'
								className='text-xs flex items-center gap-1'>
								<Star className='h-3 w-3' />
								Basic
								<Badge
									variant='secondary'
									className='h-4 px-1 text-[10px]'>
									{basicVisibleCount}/{basicColumns.length}
								</Badge>
							</TabsTrigger>
							<TabsTrigger
								value='advanced'
								className='text-xs flex items-center gap-1'>
								<Settings2 className='h-3 w-3' />
								Advanced
								<Badge
									variant='secondary'
									className='h-4 px-1 text-[10px]'>
									{advancedVisibleCount}/{advancedColumns.length}
								</Badge>
							</TabsTrigger>
						</TabsList>

						<TabsContent
							value='basic'
							className='mt-2 space-y-1'>
							<div className='text-xs text-muted-foreground px-2 py-1'>Essential columns for daily operations</div>
							<div className='max-h-48 overflow-y-auto'>{basicColumns.map(renderColumnItem)}</div>
						</TabsContent>

						<TabsContent
							value='advanced'
							className='mt-2 space-y-1'>
							<div className='text-xs text-muted-foreground px-2 py-1'>Detailed columns for comprehensive view</div>
							<div className='max-h-48 overflow-y-auto'>{advancedColumns.map(renderColumnItem)}</div>
						</TabsContent>
					</Tabs>
				</div>

				<DropdownMenuSeparator />

				{/* Footer with info */}
				<div className='p-2 text-xs text-muted-foreground flex items-center gap-1'>
					<Lock className='h-3 w-3' />
					Name and Price columns are always visible
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
