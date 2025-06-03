export interface ColumnVisibilityState {
	[key: string]: boolean
}

export interface ColumnConfig {
	id: string
	label: string
	defaultVisible: boolean
	category: 'basic' | 'advanced'
	required?: boolean
}

export const ITEM_COLUMNS: ColumnConfig[] = [
	// Core identification fields - Basic
	{ id: 'name', label: 'Name', defaultVisible: true, category: 'basic', required: true },
	{ id: 'generic_name', label: 'Generic Name', defaultVisible: true, category: 'basic' },
	{ id: 'manufacturer', label: 'Manufacturer', defaultVisible: false, category: 'basic' },

	// Categories and supplier - Basic
	{ id: 'categories', label: 'Categories', defaultVisible: true, category: 'basic' },
	{ id: 'supplierId', label: 'Supplier', defaultVisible: true, category: 'basic' },

	// Stock and inventory - Basic
	{ id: 'quantity_in_stock', label: 'Stock', defaultVisible: true, category: 'basic' },
	{ id: 'expiry_date', label: 'Expiry Date', defaultVisible: true, category: 'basic' },

	// Pricing - Basic
	{ id: 'price', label: 'Price', defaultVisible: true, category: 'basic', required: true },

	// Physical properties - Advanced
	{ id: 'formulation', label: 'Formulation', defaultVisible: false, category: 'advanced' },
	{ id: 'strength', label: 'Strength', defaultVisible: false, category: 'advanced' },
	{ id: 'unit', label: 'Unit', defaultVisible: false, category: 'advanced' },
	{ id: 'units_per_pack', label: 'Units per Pack', defaultVisible: false, category: 'advanced' },

	// Regulatory and description - Advanced
	{ id: 'schedule', label: 'Schedule', defaultVisible: false, category: 'advanced' },
	{ id: 'description', label: 'Description', defaultVisible: false, category: 'advanced' },

	// Stock and inventory - Advanced
	{ id: 'reorder_level', label: 'Reorder Level', defaultVisible: false, category: 'advanced' },

	// Pricing - Advanced
	{ id: 'purchase_price', label: 'Purchase Price', defaultVisible: false, category: 'advanced' },
	{ id: 'tax_rate', label: 'Tax Rate', defaultVisible: false, category: 'advanced' },
	{ id: 'discount', label: 'Discount', defaultVisible: false, category: 'advanced' },

	// Purchase information - Advanced
	{ id: 'purchase_date', label: 'Purchase Date', defaultVisible: false, category: 'advanced' },

	// Status flags - Advanced
	{ id: 'isActive', label: 'Active', defaultVisible: false, category: 'advanced' },
	{ id: 'isAvailable', label: 'Available', defaultVisible: false, category: 'advanced' },

	// Media - Advanced
	{ id: 'image', label: 'Image', defaultVisible: false, category: 'advanced' },

	// Timestamps - Advanced
	{ id: 'createdAt', label: 'Created', defaultVisible: false, category: 'advanced' },
	{ id: 'updatedAt', label: 'Updated', defaultVisible: false, category: 'advanced' },
]

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibilityState = ITEM_COLUMNS.reduce(
	(acc, column) => ({
		...acc,
		[column.id]: column.defaultVisible,
	}),
	{},
)

// Helper functions
export const getBasicColumns = () => ITEM_COLUMNS.filter(col => col.category === 'basic')
export const getAdvancedColumns = () => ITEM_COLUMNS.filter(col => col.category === 'advanced')
export const getRequiredColumns = () => ITEM_COLUMNS.filter(col => col.required)

// Predefined column visibility presets
export const COLUMN_PRESETS = {
	minimal: ITEM_COLUMNS.reduce(
		(acc, col) => ({
			...acc,
			[col.id]: ['name', 'price', 'quantity_in_stock', 'categories'].includes(col.id),
		}),
		{} as ColumnVisibilityState,
	),
	basic: ITEM_COLUMNS.reduce(
		(acc, col) => ({
			...acc,
			[col.id]: col.category === 'basic',
		}),
		{} as ColumnVisibilityState,
	),
	all: ITEM_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {} as ColumnVisibilityState),
} as const

// Storage key for persistence
export const COLUMN_VISIBILITY_STORAGE_KEY = 'pharmpilot-column-visibility'
