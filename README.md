# HGNC WebApp

Lightweight description of the project and a few tips for deployments.

## Pinning assets on the CDN

We publish optimized assets held in this repository to jsDelivr. For production
stability, pin the CDN references to a tag or commit SHA rather than using
`@master`.

To pin all CDN references in the repo to a tag or commit (e.g. `@v1.0.0`), run:

```
./scripts/pin-cdn.sh @v1.0.0
```

Then run tests and commit the changes.

## CI runtime checks

We include a lightweight GitHub Actions workflow that runs pre-deploy checks and,
optionally, a runtime smoke test. The runtime smoke test requires the secret
`DEPLOYMENT_URL` (for private Apps Script deployments) or a `DEPLOYMENT_PUBLIC_URL`/`DEPLOYMENT_URL` pointing to a
publicly accessible deployment for authenticated-less smoke tests.

```
Example: set DEPLOYMENT_URL to the Apps Script published webapp URL
# or set DEPLOYMENT_PUBLIC_URL to a public URL that is accessible by CI
```

