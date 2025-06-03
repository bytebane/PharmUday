import { useState, useCallback, useEffect } from 'react'
import { ColumnVisibilityState, DEFAULT_COLUMN_VISIBILITY, COLUMN_PRESETS, COLUMN_VISIBILITY_STORAGE_KEY, getRequiredColumns, ITEM_COLUMNS } from '@/types/column-visibility'

// Helper function to load from localStorage
const loadFromStorage = (): ColumnVisibilityState | null => {
	if (typeof window === 'undefined') return null

	try {
		const stored = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY)
		return stored ? JSON.parse(stored) : null
	} catch (error) {
		console.error('Failed to load column visibility from storage:', error)
		return null
	}
}

// Helper function to save to localStorage
const saveToStorage = (visibility: ColumnVisibilityState) => {
	if (typeof window === 'undefined') return

	try {
		localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(visibility))
	} catch (error) {
		console.error('Failed to save column visibility to storage:', error)
	}
}

// Helper function to enforce required columns
const enforceRequiredColumns = (visibility: ColumnVisibilityState): ColumnVisibilityState => {
	const requiredColumns = getRequiredColumns()
	const enforced = { ...visibility }

	requiredColumns.forEach(column => {
		enforced[column.id] = true
	})

	return enforced
}

export function useColumnVisibility(initialVisibility?: ColumnVisibilityState) {
	// Track hydration state to prevent SSR mismatch
	const [isHydrated, setIsHydrated] = useState(false)

	// Initialize state with defaults to ensure SSR consistency
	const [columnVisibility, setColumnVisibilityState] = useState<ColumnVisibilityState>(() => {
		// Always start with defaults during SSR
		const initial = initialVisibility || DEFAULT_COLUMN_VISIBILITY
		return enforceRequiredColumns(initial)
	})

	// Load from localStorage after hydration
	useEffect(() => {
		setIsHydrated(true)

		const stored = loadFromStorage()
		if (stored) {
			setColumnVisibilityState(enforceRequiredColumns(stored))
		}
	}, [])

	// Wrapper function that enforces required columns and persists to storage
	const setColumnVisibility = useCallback(
		(visibility: ColumnVisibilityState | ((prev: ColumnVisibilityState) => ColumnVisibilityState)) => {
			setColumnVisibilityState(prev => {
				const newVisibility = typeof visibility === 'function' ? visibility(prev) : visibility
				const enforced = enforceRequiredColumns(newVisibility)

				// Only persist to storage after hydration
				if (isHydrated) {
					saveToStorage(enforced)
				}

				return enforced
			})
		},
		[isHydrated],
	)

	const toggleColumn = useCallback(
		(columnId: string) => {
			setColumnVisibility(prev => ({
				...prev,
				[columnId]: !prev[columnId],
			}))
		},
		[setColumnVisibility],
	)

	const showColumn = useCallback(
		(columnId: string) => {
			setColumnVisibility(prev => ({
				...prev,
				[columnId]: true,
			}))
		},
		[setColumnVisibility],
	)

	const hideColumn = useCallback(
		(columnId: string) => {
			setColumnVisibility(prev => ({
				...prev,
				[columnId]: false,
			}))
		},
		[setColumnVisibility],
	)

	const resetToDefaults = useCallback(() => {
		setColumnVisibility(DEFAULT_COLUMN_VISIBILITY)
	}, [setColumnVisibility])

	const applyPreset = useCallback(
		(presetName: keyof typeof COLUMN_PRESETS) => {
			setColumnVisibility(COLUMN_PRESETS[presetName])
		},
		[setColumnVisibility],
	)

	const showAllColumns = useCallback(() => {
		setColumnVisibility(COLUMN_PRESETS.all)
	}, [setColumnVisibility])

	const hideAllColumns = useCallback(() => {
		// Apply the minimal preset (only essential columns)
		setColumnVisibility(COLUMN_PRESETS.minimal)
	}, [setColumnVisibility])

	const isColumnVisible = useCallback(
		(columnId: string) => {
			return columnVisibility[columnId] ?? true
		},
		[columnVisibility],
	)

	const isColumnRequired = useCallback((columnId: string) => {
		return getRequiredColumns().some(col => col.id === columnId)
	}, [])

	return {
		columnVisibility,
		setColumnVisibility,
		toggleColumn,
		showColumn,
		hideColumn,
		resetToDefaults,
		applyPreset,
		showAllColumns,
		hideAllColumns,
		isColumnVisible,
		isColumnRequired,
		isHydrated, // Expose hydration state for components that need it
	}
}
