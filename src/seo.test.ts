import { describe, expect, test } from 'vitest'
import { generateRobotsTxt, generateSitemap } from './seo.ts'

type Routes = Parameters<typeof generateSitemap>[1]

function route(
	id: string,
	options: {
		path?: string
		index?: boolean
		parentId?: string
		module?: Record<string, unknown>
	},
) {
	return {
		id,
		path: options.path,
		index: options.index,
		parentId: options.parentId,
		module: options.module ?? { default: () => null },
	}
}

const request = new Request('https://example.com/sitemap.xml')

describe('generateSitemap', () => {
	test('lists static routes, nesting paths through parents', async () => {
		const routes = {
			root: route('root', { path: '' }),
			layout: route('layout', { path: 'en', parentId: 'root' }),
			home: route('home', { index: true, parentId: 'layout' }),
			about: route('about', { path: 'about/', parentId: 'layout' }),
		} as unknown as Routes

		const response = await generateSitemap(request, routes, {
			siteUrl: 'https://example.com',
		})
		const xml = await response.text()

		expect(response.headers.get('Content-Type')).toBe('application/xml')
		expect(xml).toContain('<loc>https://example.com/en</loc>')
		expect(xml).toContain('<loc>https://example.com/en/about</loc>')
	})

	test('skips dynamic, resource and opted-out routes; uses getSitemapEntries', async () => {
		const routes = {
			root: route('root', { path: '' }),
			dynamic: route('dynamic', { path: ':id', parentId: 'root' }),
			resource: route('resource', {
				path: 'api',
				parentId: 'root',
				module: {},
			}),
			hidden: route('hidden', {
				path: 'hidden',
				parentId: 'root',
				module: {
					default: () => null,
					handle: { getSitemapEntries: () => null },
				},
			}),
			custom: route('custom', {
				path: ':slug',
				parentId: 'root',
				module: {
					default: () => null,
					handle: {
						getSitemapEntries: () => [
							{ route: '/a', lastmod: '2025-01-01' },
							null,
						],
					},
				},
			}),
		} as unknown as Routes

		const xml = await (
			await generateSitemap(request, routes, { siteUrl: 'https://x.test' })
		).text()

		expect(xml).toContain('<loc>https://x.test/a</loc>')
		expect(xml).toContain('<lastmod>2025-01-01</lastmod>')
		expect(xml).not.toContain('/api')
		expect(xml).not.toContain('/hidden')
		expect(xml).not.toContain(':id')
	})

	test('de-duplicates identical routes', async () => {
		const entries = () => [{ route: '/same' }]
		const routes = {
			a: route('a', {
				path: 'a',
				module: { default: () => null, handle: { getSitemapEntries: entries } },
			}),
			b: route('b', {
				path: 'b',
				module: { default: () => null, handle: { getSitemapEntries: entries } },
			}),
		} as unknown as Routes

		const xml = await (
			await generateSitemap(request, routes, { siteUrl: 'https://x.test' })
		).text()
		expect(xml.match(/<loc>/g)).toHaveLength(1)
	})
})

describe('generateSitemap entries option', () => {
	const routes = {
		root: route('root', { path: '' }),
		about: route('about', { path: 'about', parentId: 'root' }),
	} as unknown as Routes

	test('adds entries that no route lists, e.g. from a database', async () => {
		const xml = await (
			await generateSitemap(request, routes, {
				siteUrl: 'https://x.test',
				entries: async () => [
					{ route: '/listings/1', lastmod: '2026-10-20' },
					null,
				],
			})
		).text()

		expect(xml).toContain('<loc>https://x.test/about</loc>')
		expect(xml).toContain('<loc>https://x.test/listings/1</loc>')
		expect(xml).toContain('<lastmod>2026-10-20</lastmod>')
	})

	test('a route already listed by a route module is not repeated', async () => {
		const xml = await (
			await generateSitemap(request, routes, {
				siteUrl: 'https://x.test',
				entries: [{ route: '/about' }],
			})
		).text()

		expect(xml.match(/<loc>/g)).toHaveLength(1)
	})
})

test('escapes XML special characters in URLs', async () => {
	const xml = await (
		await generateSitemap(request, {} as Routes, {
			siteUrl: 'https://x.test',
			entries: [{ route: '/search?a=1&b=2' }],
		})
	).text()

	expect(xml).toContain('<loc>https://x.test/search?a=1&amp;b=2</loc>')
	expect(xml).toMatch(/^<\?xml/)
})

describe('generateRobotsTxt', () => {
	test('prepends the default policies', async () => {
		const response = generateRobotsTxt([
			{ type: 'disallow', value: '/private' },
			{ type: 'sitemap', value: 'https://x.test/sitemap.xml' },
		])
		expect(response.headers.get('Content-Type')).toBe('text/plain')
		expect(await response.text()).toBe(
			'User-agent: *\nAllow: /\nDisallow: /private\nSitemap: https://x.test/sitemap.xml\n',
		)
	})

	test('can replace the defaults', async () => {
		const response = generateRobotsTxt([{ type: 'userAgent', value: 'Bot' }], {
			appendOnDefaultPolicies: false,
		})
		expect(await response.text()).toBe('User-agent: Bot\n')
	})
})
