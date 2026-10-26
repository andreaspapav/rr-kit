// Forked from @nasa-gcn/remix-seo (MIT, https://github.com/nasa-gcn/remix-seo),
// itself adapted from kentcdodds.com. Typed against React Router's ServerBuild
// instead of @remix-run/server-runtime, and without the lodash dependency.
import { type ServerBuild } from 'react-router'

export type SitemapEntry = {
	route: string
	lastmod?: string
	changefreq?:
		'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
	priority?: 0.0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0
}

/**
 * Route `handle` shape. Export `getSitemapEntries` from a route to list its
 * URLs (needed for dynamic routes), or return `null` to leave it out.
 */
export type SEOHandle = {
	getSitemapEntries?: (
		request: Request,
	) =>
		| Promise<Array<SitemapEntry | null> | null>
		| Array<SitemapEntry | null>
		| null
}

export type SEOOptions = {
	siteUrl: string
	headers?: HeadersInit
}

export type RobotsPolicy = {
	type: 'allow' | 'disallow' | 'sitemap' | 'crawlDelay' | 'userAgent'
	value: string
}

export type RobotsConfig = {
	appendOnDefaultPolicies?: boolean
	headers?: HeadersInit
}

function removeTrailingSlash(s: string) {
	return s.endsWith('/') ? s.slice(0, -1) : s
}

function sameEntry(a: SitemapEntry, b: SitemapEntry) {
	return (
		a.route === b.route &&
		a.lastmod === b.lastmod &&
		a.changefreq === b.changefreq &&
		a.priority === b.priority
	)
}

function getEntryXml({
	route,
	lastmod,
	changefreq,
	priority = 0.7,
}: SitemapEntry) {
	return `
  <url>
    <loc>${route}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    ${changefreq ? `<changefreq>${changefreq}</changefreq>` : ''}
    ${typeof priority === 'number' ? `<priority>${priority}</priority>` : ''}
  </url>
    `.trim()
}

async function getSitemapXml(
	request: Request,
	routes: ServerBuild['routes'],
	{ siteUrl }: { siteUrl: string },
) {
	const rawSitemapEntries = (
		await Promise.all(
			Object.entries(routes).map(async ([id, route]) => {
				if (id === 'root' || !route) return
				const mod = route.module
				const handle = mod.handle as SEOHandle | undefined
				if (handle?.getSitemapEntries) {
					return handle.getSitemapEntries(request)
				}

				// exclude resource routes from the sitemap
				// (these are an opt-in via the getSitemapEntries method)
				if (!('default' in mod)) return

				let path: string
				if (route.path) {
					path = removeTrailingSlash(route.path)
				} else if (route.index) {
					path = ''
				} else {
					return
				}

				let parentId = route.parentId
				let parent = parentId ? routes[parentId] : null
				while (parent) {
					// the root path is '/', so it messes things up if we add another '/'
					const parentPath = parent.path ? removeTrailingSlash(parent.path) : ''
					path = `${parentPath}/${path}`
					parentId = parent.parentId
					parent = parentId ? routes[parentId] : null
				}

				// dynamic routes need a getSitemapEntries function to be listed
				if (path.includes(':')) return

				const entry: SitemapEntry = { route: removeTrailingSlash(path) }
				return entry
			}),
		)
	)
		.flatMap((entries) => entries)
		.filter((entry): entry is SitemapEntry => Boolean(entry))

	const sitemapEntries: Array<SitemapEntry> = []
	for (const entry of rawSitemapEntries) {
		const existing = sitemapEntries.find((e) => e.route === entry.route)
		if (existing) {
			if (!sameEntry(existing, entry)) {
				console.warn(
					`Duplicate route for ${entry.route} with different sitemap data`,
					{ entry, existingEntryForRoute: existing },
				)
			}
		} else {
			sitemapEntries.push(entry)
		}
	}

	return `
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset
    xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"
  >
    ${sitemapEntries
			.map((entry) =>
				getEntryXml({ ...entry, route: `${siteUrl}${entry.route}` }),
			)
			.join('')}
  </urlset>
    `.trim()
}

export async function generateSitemap(
	request: Request,
	routes: ServerBuild['routes'],
	{ siteUrl, headers }: SEOOptions,
) {
	const sitemap = await getSitemapXml(request, routes, { siteUrl })
	const bytes = new TextEncoder().encode(sitemap).byteLength
	return new Response(sitemap, {
		headers: {
			...headers,
			'Content-Type': 'application/xml',
			'Content-Length': String(bytes),
		},
	})
}

const robotsLabels = {
	userAgent: 'User-agent',
	allow: 'Allow',
	disallow: 'Disallow',
	sitemap: 'Sitemap',
	crawlDelay: 'Crawl-delay',
} satisfies Record<RobotsPolicy['type'], string>

const defaultRobotsPolicies: RobotsPolicy[] = [
	{ type: 'userAgent', value: '*' },
	{ type: 'allow', value: '/' },
]

export function generateRobotsTxt(
	policies: RobotsPolicy[] = [],
	{ appendOnDefaultPolicies = true, headers }: RobotsConfig = {},
) {
	const policiesToUse = appendOnDefaultPolicies
		? [...defaultRobotsPolicies, ...policies]
		: policies
	const robotsText = policiesToUse
		.map(({ type, value }) => `${robotsLabels[type]}: ${value}\n`)
		.join('')
	const bytes = new TextEncoder().encode(robotsText).byteLength
	return new Response(robotsText, {
		headers: {
			...headers,
			'Content-Type': 'text/plain',
			'Content-Length': String(bytes),
		},
	})
}
