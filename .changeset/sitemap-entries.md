---
'@andreaspapav/rr-kit': patch
---

`generateSitemap` takes an `entries` option (array or async function) for URLs that no route lists, such as rows from a database. Sitemap URLs are now XML-escaped, and duplicate routes are found in linear time.
