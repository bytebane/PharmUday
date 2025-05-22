import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
	baseDirectory: __dirname,
})

const eslintConfig = [
	...compat.extends(
		'next/core-web-vitals',
		'next/typescript',
		'plugin:prettier/recommended', // <-- Add this line
	),
	{
		rules: {
			'prettier/prettier': 'warn', // <-- Optional: show Prettier issues as warnings
			'@typescript-eslint/no-explicit-any': 'off',
			// for @/generated/prisma/wasm.js
			'@typescript-eslint/no-unused-vars': 'off',
			// for @/generated/prisma/wasm.js
			'@typescript-eslint/no-unused-expressions': 'off',
			// for @/generated/prisma/wasm.js
			'@typescript-eslint/no-require-imports': 'off',
			// for @/generated/prisma/wasm.js
			'@typescript-eslint/no-this-alias': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-unnecessary-type-constraint': 'off',
			'@typescript-eslint/no-unsafe-function-type': 'off',
			'@typescript-eslint/no-wrapper-object-types': 'off',
			'react-hooks/exhaustive-deps': 'off',
		},
	},
]

export default eslintConfig
