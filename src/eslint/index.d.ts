import type { ESLint, Rule } from 'eslint'

export declare const noManualDispose: Rule.RuleModule
export declare const preferDisposeInTests: Rule.RuleModule

declare const plugin: ESLint.Plugin & {
	meta: { name: 'rr-kit' }
	rules: {
		'no-manual-dispose': Rule.RuleModule
		'prefer-dispose-in-tests': Rule.RuleModule
	}
}

export default plugin
