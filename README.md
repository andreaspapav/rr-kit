# @rr-kit/core

Small helpers shared by our React Router apps: assertions, singletons, TOTP,
client hints, sitemap/robots.txt and two ESLint rules. Most of it is forked from
[epic-web](https://github.com/epicweb-dev) packages and maintained in-house (see
[NOTICE.md](./NOTICE.md)).

ESM only, Node 22+. Every helper is its own subpath export, so you only load
what you import.

```sh
npm install @rr-kit/core
```

## Subpath exports

| Import                                     | Exports                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| `@rr-kit/core/invariant`                   | `invariant`, `invariantResponse`, `InvariantError`                             |
| `@rr-kit/core/remember`                    | `remember`, `forget`                                                           |
| `@rr-kit/core/totp`                        | `generateTOTP`, `verifyTOTP`, `getTOTPAuthUri`, `HashAlgorithm`                |
| `@rr-kit/core/client-hints`                | `getHintUtils`, `ClientHint`, `ClientHintsValue`                               |
| `@rr-kit/core/client-hints/color-scheme`   | `clientHint`, `subscribeToSchemeChange`                                        |
| `@rr-kit/core/client-hints/time-zone`      | `clientHint`                                                                   |
| `@rr-kit/core/client-hints/reduced-motion` | `clientHint`, `subscribeToMotionChange`                                        |
| `@rr-kit/core/seo`                         | `generateSitemap`, `generateRobotsTxt`, `SEOHandle`, `SitemapEntry`            |
| `@rr-kit/core/eslint`                      | ESLint plugin (default) with `no-manual-dispose` and `prefer-dispose-in-tests` |

`totp` uses Web Crypto and belongs on the server. Keep it in a `*.server.ts`
module so it never ends up in a client bundle.

## Peer dependencies

- `react-router` `^8`: needed for the `seo` types (`ServerBuild`).
- `eslint` `^9 || ^10` (optional): only for `@rr-kit/core/eslint`.

## ESLint plugin

```js
// eslint.config.js
import rrKit from '@rr-kit/core/eslint'

export default [
	{
		plugins: { 'rr-kit': rrKit },
		rules: { 'rr-kit/no-manual-dispose': 'warn' },
	},
	{
		files: ['**/*.test.{ts,tsx}'],
		plugins: { 'rr-kit': rrKit },
		rules: { 'rr-kit/prefer-dispose-in-tests': 'warn' },
	},
]
```

## Development

```sh
npm install
npm run validate   # lint, typecheck, test, build, publint + are-the-types-wrong
npm run dev        # rebuild dist/ on change
```

Source is TypeScript in `src/`. `tsdown` compiles one ESM file plus a `.d.ts`
per subpath into `dist/`, which is all that gets published (`files` in
`package.json`). The ESLint rules are plain JS; their types are hand-written in
`src/eslint/index.d.ts`.

Tests are plain Vitest with no database: TOTP against the RFC 6238 vectors,
`remember`, sitemap and robots.txt, and the ESLint rules via `RuleTester`.

### Working on the kit against an app

Don't publish to try a change. Build the kit and point the app at your local
copy instead.

**`npm link`** (no changes to the app's `package.json`):

```sh
cd ~/workspace/@rr-kit
npm run dev                  # keeps dist/ up to date
npm link                     # once: registers the global link

cd ~/workspace/my-app
npm link @rr-kit/core        # node_modules/@rr-kit/core -> ~/workspace/@rr-kit
```

Undo with `npm unlink @rr-kit/core && npm install` in the app. Note that any
later `npm install` in the app also replaces the link with the registry version.

**`file:` dependency** (survives `npm install`, but don't commit it):

```sh
cd ~/workspace/my-app
npm install ../@rr-kit       # writes "@rr-kit/core": "file:../@rr-kit"
```

Revert `package.json` and `package-lock.json` before committing.

Either way the app imports `dist/`, so keep `npm run dev` running. Vite
pre-bundles dependencies, so restart the app's dev server (or run it with
`--force`) if it doesn't pick a change up.

## Releasing

See [RELEASING.md](./RELEASING.md).

## License

MIT. See [LICENSE](./LICENSE) and [NOTICE.md](./NOTICE.md) for the upstream
projects this code is forked from.
