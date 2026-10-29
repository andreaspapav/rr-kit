# @andreaspapav/rr-kit

## 0.1.1

### Patch Changes

- a2ec1d4: `generateSitemap` takes an `entries` option (array or async function) for URLs that no route lists, such as rows from a database. Sitemap URLs are now XML-escaped, and duplicate routes are found in linear time.
- 8eed17d: Add `generateSitemapIndex` for a `<sitemapindex>` that points at child sitemaps.
