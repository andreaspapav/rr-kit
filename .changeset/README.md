# Changesets

Every PR that changes what users of `@andreaspapav/rr-kit` get adds a changeset:

```sh
npx changeset
```

Pick the bump (we are on `0.x`, so a breaking change is a **minor** bump and
everything else is a **patch**) and write one line for the changelog. See
[RELEASING.md](../RELEASING.md) for how changesets become a release.
