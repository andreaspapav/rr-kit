# Releasing

Releases use [Changesets](https://github.com/changesets/changesets) and are
published from GitHub Actions with npm
[trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC, no npm
token in the repo) and
[provenance](https://docs.npmjs.com/generating-provenance-statements).

## Day to day

1. In a PR that changes the published package, run `npx changeset`, pick the
   bump and describe the change. We are on `0.x`: breaking change = **minor**,
   anything else = **patch**.
2. Merge the PR into `main`. The **Release** workflow opens (or updates) a
   **Version packages** PR that bumps `package.json` and writes `CHANGELOG.md`.
3. Merge the **Version packages** PR. The workflow builds, publishes the new
   version to npm with provenance, and pushes a `v<version>` tag.

Docs, tests and CI changes don't need a changeset.

## One-time setup (before the first release)

### 1. npm scope

The package is published under the `andreaspapav` user scope, which every npm
account owns automatically, so no org is needed. Publish while logged in as
`andreaspapav` (`npm whoami`).

To move it under an org later, create the org, publish under the new name and
deprecate this one (`npm deprecate @andreaspapav/rr-kit "Moved to ..."`).

### 2. GitHub repo

Create `github.com/andreaspapav/rr-kit` (or update `repository`, `bugs` and
`homepage` in `package.json`). Provenance fails if `repository.url` doesn't
match the repo the workflow runs in.

```sh
git remote add origin git@github.com:andreaspapav/rr-kit.git
git push -u origin main
```

### 3. First publish (manual)

npm only lets you configure a trusted publisher on a package that already
exists, so `0.1.0` is published by hand from a clean checkout of `main`:

```sh
npm ci
npm run validate          # lint, typecheck, test, build, publint, attw
npm pack --dry-run        # check the file list: dist/, LICENSE, NOTICE.md, README.md, package.json
npm login
npm publish --access public
```

`prepack` runs the build, so `dist/` is always fresh. This first version has no
provenance; every release from CI after it does.

### 4. Trusted publisher

On npmjs.com, open **@andreaspapav/rr-kit → Settings → Trusted publishing** and
add a GitHub Actions publisher:

- Organization or user: `andreaspapav`
- Repository: `rr-kit`
- Workflow filename: `release.yml`

Then, under **Publishing access**, choose "Require two-factor authentication and
disallow tokens", so only the workflow can publish from then on.

### 5. GitHub settings

- **Settings → Actions → General → Workflow permissions**: allow GitHub Actions
  to create and approve pull requests (needed for the Version packages PR).
- Protect `main` and require the **CI** checks.

## Prereleases

```sh
npx changeset pre enter next   # versions become 0.2.0-next.0, published under the `next` tag
# ...changesets, merge, release as usual...
npx changeset pre exit
```

## Fallback: token publishing

If trusted publishing isn't available, create a granular npm access token with
publish rights to `@andreaspapav/rr-kit`, store it as the `NPM_TOKEN` repo
secret, and add `NPM_TOKEN: ${{ secrets.NPM_TOKEN }}` and
`NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` to the `env` of the Changesets step
in `.github/workflows/release.yml`.
