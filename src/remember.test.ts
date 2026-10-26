import { describe, expect, test } from 'vitest'
import { forget, remember } from './remember.ts'

describe('remember', () => {
	test('calls the factory once per name and returns the same value', () => {
		let calls = 0
		const make = () => {
			calls++
			return { id: calls }
		}

		const first = remember('remember-test-once', make)
		const second = remember('remember-test-once', make)

		expect(second).toBe(first)
		expect(calls).toBe(1)
		forget('remember-test-once')
	})

	test('forget makes the next call run the factory again', () => {
		remember('remember-test-forget', () => 'a')
		expect(forget('remember-test-forget')).toBe(true)
		expect(forget('remember-test-forget')).toBe(false)
		expect(remember('remember-test-forget', () => 'b')).toBe('b')
		forget('remember-test-forget')
	})
})
