// Forked from @epic-web/totp (MIT, https://github.com/epicweb-dev/totp)
// This was copy/paste/modified/tested from https://npm.im/notp (MIT)
import base32Decode from 'base32-decode'
import base32Encode from 'base32-encode'

/**
 * For all available algorithms, refer to the following:
 * https://developer.mozilla.org/en-US/docs/Web/API/HmacImportParams#hash
 */
export type HashAlgorithm =
	'SHA-1' | 'SHA-256' | 'SHA-386' | 'SHA-512' | (string & {})

// SHA-1 is not secure, but in the context of TOTPs, it's unrealistic to expect
// security issues. Also, it's the default for compatibility with OTP apps.
// That said, if you're acting the role of both client and server and your TOTP
// is longer lived, you can definitely use a more secure algorithm like SHA-256.
// Learn more: https://www.rfc-editor.org/rfc/rfc4226#page-25 (B.1. SHA-1 Status)
const DEFAULT_ALGORITHM: HashAlgorithm = 'SHA-1'
const DEFAULT_CHAR_SET = '0123456789'
const DEFAULT_DIGITS = 6
const DEFAULT_WINDOW = 1
const DEFAULT_PERIOD = 30

type HOTPOptions = {
	counter?: number
	digits?: number
	algorithm?: HashAlgorithm
	charSet?: string
	window?: number
}

/**
 * Generates a HMAC-based One Time Password (HOTP).
 */
async function generateHOTP(
	secret: BufferSource,
	{
		counter = 0,
		digits = DEFAULT_DIGITS,
		algorithm = DEFAULT_ALGORITHM,
		charSet = DEFAULT_CHAR_SET,
	}: HOTPOptions = {},
): Promise<string> {
	const byteCounter = intToBytes(counter)
	const key = await crypto.subtle.importKey(
		'raw',
		secret,
		{ name: 'HMAC', hash: algorithm },
		false,
		['sign'],
	)
	const signature = await crypto.subtle.sign('HMAC', key, byteCounter)
	const hashBytes = new Uint8Array(signature)
	// offset is always the last 4 bits of the signature; its value: 0-15
	const offset = (hashBytes[hashBytes.length - 1] ?? 0) & 0xf

	const byteAt = (index: number) => hashBytes[index] ?? 0

	let hotpVal: bigint
	// the original specification allows any amount of digits between 4 and 10,
	// so stay on the 32bit number if the digits are less then or equal to 10.
	if (digits <= 10) {
		// stay compatible with the authenticator apps and only use the bottom 32 bits of BigInt
		hotpVal =
			0n |
			(BigInt(byteAt(offset) & 0x7f) << 24n) |
			(BigInt(byteAt(offset + 1)) << 16n) |
			(BigInt(byteAt(offset + 2)) << 8n) |
			BigInt(byteAt(offset + 3))
	} else {
		// otherwise create a 64bit value from the hashBytes
		hotpVal =
			0n |
			(BigInt(byteAt(offset) & 0x7f) << 56n) |
			(BigInt(byteAt(offset + 1)) << 48n) |
			(BigInt(byteAt(offset + 2)) << 40n) |
			(BigInt(byteAt(offset + 3)) << 32n) |
			(BigInt(byteAt(offset + 4)) << 24n) |
			// we have only 20 hashBytes; if offset is 15 these indexes are out of the hashBytes
			// fallback to the bytes at the start of the hashBytes
			(BigInt(byteAt((offset + 5) % 20)) << 16n) |
			(BigInt(byteAt((offset + 6) % 20)) << 8n) |
			BigInt(byteAt((offset + 7) % 20))
	}

	let hotp = ''
	const charSetLength = BigInt(charSet.length)
	for (let i = 0; i < digits; i++) {
		hotp = charSet.charAt(Number(hotpVal % charSetLength)) + hotp

		// Ensures hotpVal decreases at a fixed rate, independent of charSet length.
		// 10n is compatible with the original TOTP algorithm used in the authenticator apps.
		hotpVal = hotpVal / 10n
	}

	return hotp
}

/**
 * Verifies a HMAC-based One Time Password (HOTP).
 *
 * @returns `delta`, the number of counter steps between the current counter and
 * the matching one, or `null` if the OTP could not be verified
 */
async function verifyHOTP(
	otp: string,
	secret: BufferSource,
	{
		counter = 0,
		digits = DEFAULT_DIGITS,
		algorithm = DEFAULT_ALGORITHM,
		charSet = DEFAULT_CHAR_SET,
		window = DEFAULT_WINDOW,
	}: HOTPOptions = {},
): Promise<{ delta: number } | null> {
	for (let i = counter - window; i <= counter + window; ++i) {
		if (
			(await generateHOTP(secret, {
				counter: i,
				digits,
				algorithm,
				charSet,
			})) === otp
		) {
			return { delta: i - counter }
		}
	}
	return null
}

/**
 * Creates a time-based one-time password (TOTP). This handles creating a random
 * secret (base32 encoded, unless one is given), and generating a TOTP for the
 * current time. It also returns the config options used to generate the TOTP.
 */
export async function generateTOTP({
	period = DEFAULT_PERIOD,
	digits = DEFAULT_DIGITS,
	algorithm = DEFAULT_ALGORITHM,
	secret = base32Encode(crypto.getRandomValues(new Uint8Array(10)), 'RFC4648'),
	charSet = DEFAULT_CHAR_SET,
}: {
	period?: number
	digits?: number
	algorithm?: HashAlgorithm
	charSet?: string
	secret?: string
} = {}): Promise<{
	otp: string
	secret: string
	period: number
	digits: number
	algorithm: string
	charSet: string
}> {
	const otp = await generateHOTP(base32Decode(secret, 'RFC4648'), {
		counter: getCounter(Number(period)),
		digits: Number(digits),
		algorithm,
		charSet,
	})

	return { otp, secret, period, digits, algorithm, charSet }
}

/**
 * Generates an `otpauth://` URI which you can use to generate a QR code or users
 * can manually enter into their password manager.
 */
export function getTOTPAuthUri({
	period,
	digits,
	algorithm,
	secret,
	accountName,
	issuer,
}: {
	period: number
	digits: number
	algorithm: HashAlgorithm
	secret: string
	accountName: string
	issuer: string
}): string {
	const params = new URLSearchParams({
		secret,
		issuer,
		// the otpauth URI spec doesn't allow dashes in the algorithm name
		algorithm: algorithm.replaceAll('-', ''),
		digits: digits.toString(),
		period: period.toString(),
	})

	const escapedIssuer = encodeURIComponent(issuer)
	const escapedAccountName = encodeURIComponent(accountName)
	const label = `${escapedIssuer}:${escapedAccountName}`

	return `otpauth://totp/${label}?${params.toString()}`
}

/**
 * Verifies a time-based one-time password (TOTP) against the current time.
 *
 * @returns `delta`, the step difference between the current OTP and the one
 * that matched, or `null` if the OTP is invalid
 */
export async function verifyTOTP({
	otp,
	secret,
	period,
	digits,
	algorithm,
	charSet,
	window = DEFAULT_WINDOW,
}: {
	otp: string
	secret: string
	period?: number
	digits?: number
	algorithm?: HashAlgorithm
	charSet?: string
	window?: number
}): Promise<{ delta: number } | null> {
	let decodedSecret: ArrayBuffer
	try {
		decodedSecret = base32Decode(secret, 'RFC4648')
	} catch {
		// an invalid secret can never verify
		return null
	}

	return verifyHOTP(otp, new Uint8Array(decodedSecret), {
		counter: getCounter(period),
		digits,
		window,
		algorithm,
		charSet,
	})
}

/**
 * Converts a number to an 8-byte big-endian array (RFC 4226 counter format).
 */
function intToBytes(num: number): Uint8Array<ArrayBuffer> {
	const arr = new Uint8Array(8)
	for (let i = 7; i >= 0; i--) {
		arr[i] = num & 0xff
		num = num >> 8
	}
	return arr
}

/**
 * The current counter value for the TOTP based on the current time and period.
 */
function getCounter(period: number = DEFAULT_PERIOD): number {
	const now = new Date().getTime()
	return Math.floor(now / 1000 / period)
}
