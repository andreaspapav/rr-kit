import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { generateTOTP, getTOTPAuthUri, verifyTOTP } from './totp.ts'

// RFC 6238 Appendix B test secret ("12345678901234567890") in base32
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

describe('totp', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	test('matches RFC 6238 SHA-1 vectors at 8 digits', async () => {
		vi.setSystemTime(59_000)
		const at59 = await generateTOTP({ secret: RFC_SECRET, digits: 8 })
		expect(at59.otp).toBe('94287082')

		vi.setSystemTime(1_234_567_890_000)
		const at1234567890 = await generateTOTP({ secret: RFC_SECRET, digits: 8 })
		expect(at1234567890.otp).toBe('89005924')
	})

	test('verifies the current OTP and reports the step delta', async () => {
		vi.setSystemTime(59_000)
		const { otp } = await generateTOTP({ secret: RFC_SECRET, digits: 8 })
		await expect(
			verifyTOTP({ otp, secret: RFC_SECRET, digits: 8 }),
		).resolves.toEqual({ delta: 0 })
	})

	test('accepts the previous step within the window and rejects it outside', async () => {
		vi.setSystemTime(59_000)
		const previous = await generateTOTP({ secret: RFC_SECRET, digits: 8 })

		// one 30s step later: the previous OTP is delta -1
		vi.setSystemTime(89_000)
		await expect(
			verifyTOTP({ otp: previous.otp, secret: RFC_SECRET, digits: 8 }),
		).resolves.toEqual({ delta: -1 })
		await expect(
			verifyTOTP({
				otp: previous.otp,
				secret: RFC_SECRET,
				digits: 8,
				window: 0,
			}),
		).resolves.toBeNull()
	})

	test('returns null for an invalid base32 secret', async () => {
		await expect(
			verifyTOTP({ otp: '123456', secret: 'not base32!!' }),
		).resolves.toBeNull()
	})

	test('builds an otpauth URI without dashes in the algorithm', () => {
		const uri = getTOTPAuthUri({
			period: 30,
			digits: 6,
			algorithm: 'SHA-1',
			secret: RFC_SECRET,
			accountName: 'andreas@example.com',
			issuer: 'Spitakimu',
		})
		expect(uri).toBe(
			`otpauth://totp/Spitakimu:andreas%40example.com?secret=${RFC_SECRET}&issuer=Spitakimu&algorithm=SHA1&digits=6&period=30`,
		)
	})
})
