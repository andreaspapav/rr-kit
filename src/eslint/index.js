// Forked from @epic-web/config lint-rules (MIT, https://github.com/epicweb-dev/config).
import noManualDispose from './no-manual-dispose.js'
import preferDisposeInTests from './prefer-dispose-in-tests.js'

/**
 * ESLint plugin with the cleanup rules from the Epic Stack config.
 *
 * ```js
 * import rrKit from '@andreaspapav/rr-kit/eslint'
 * { plugins: { 'rr-kit': rrKit }, rules: { 'rr-kit/no-manual-dispose': 'warn' } }
 * ```
 */
const plugin = {
	meta: { name: 'rr-kit' },
	rules: {
		'no-manual-dispose': noManualDispose,
		'prefer-dispose-in-tests': preferDisposeInTests,
	},
}

export default plugin
export { noManualDispose, preferDisposeInTests }
