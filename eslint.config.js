import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import rrKit from './src/eslint/index.js'

export default tseslint.config(
	{ ignores: ['dist', 'coverage', 'node_modules'] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: { globals: { ...globals.node, ...globals.browser } },
		plugins: { 'rr-kit': rrKit },
		rules: {
			'rr-kit/no-manual-dispose': 'warn',
			'@typescript-eslint/consistent-type-imports': [
				'warn',
				{ prefer: 'type-imports', fixStyle: 'inline-type-imports' },
			],
			'@typescript-eslint/ban-ts-comment': [
				'error',
				{ 'ts-nocheck': 'allow-with-description' },
			],
		},
	},
	{
		files: ['src/**/*.test.ts'],
		rules: { 'rr-kit/prefer-dispose-in-tests': 'warn' },
	},
)
