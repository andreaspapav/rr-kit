import { defineConfig } from 'tsdown'

const shared = {
	format: 'esm',
	platform: 'neutral',
	target: 'es2022',
	// `npm run build` empties dist first; two configs cleaning in parallel would race.
	clean: false,
} as const

export default defineConfig([
	{
		...shared,
		// One output file per subpath export, so `dist/` mirrors `src/`.
		entry: {
			invariant: 'src/invariant.ts',
			remember: 'src/remember.ts',
			totp: 'src/totp.ts',
			seo: 'src/seo.ts',
			'client-hints/index': 'src/client-hints/index.ts',
			'client-hints/color-scheme': 'src/client-hints/color-scheme.ts',
			'client-hints/time-zone': 'src/client-hints/time-zone.ts',
			'client-hints/reduced-motion': 'src/client-hints/reduced-motion.ts',
		},
		dts: true,
	},
	{
		...shared,
		// The ESLint rules are plain JS. Their types are hand-written against
		// ESLint's own `Rule.RuleModule` instead of being inferred from the JS.
		entry: { 'eslint/index': 'src/eslint/index.js' },
		dts: false,
		copy: { from: 'src/eslint/index.d.ts', to: 'dist/eslint' },
	},
])
