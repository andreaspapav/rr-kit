// Forked from @epic-web/client-hints (MIT, https://github.com/epicweb-dev/client-hints)
import { type ClientHint } from './utils.js'

export const clientHint = {
	cookieName: 'CH-time-zone',
	getValueCode: 'Intl.DateTimeFormat().resolvedOptions().timeZone',
	fallback: 'UTC',
} as const satisfies ClientHint<string>
