fetch-ladder (scripts/fetch-ladder.js)

This repository includes a small scraper that pulls NFNL ladder HTML pages and writes static JSON files into `public/`.

Requirements

- Node.js **20+** is required (undici/cheerio require newer Node features).

Usage

- Run against a local teams file:

```bash
node scripts/fetch-ladder.js --teams ./public/teams.json --out public/
```

- Run using the Google Apps Script `getTeams` API (recommended for production):

```bash
GS_API_URL="https://script.google.com/macros/s/<DEPLOY_ID>/exec" \
  node scripts/fetch-ladder.js --api "$GS_API_URL" --out public/
```

Flags

- `--api <GS_API_URL>`: fetch teams list from the Apps Script `getTeams` endpoint
- `--teams <file>`: use a local teams JSON file instead of the API
- `--out <dir>`: output folder for JSON files (default `public/`)
- `--only-ladder-url <url>`: process only teams with this exact ladder URL (useful in CI or debugging)
- `--only-team-id <teamID>`: process only a single team by `teamID`

Notes

- The generated files are `public/ladder-<teamID>.json` and contain a `lastUpdated` ISO timestamp and a `ladder` array.
- For automation, set the Apps Script URL as a repository secret named `GS_API_URL` and use the provided GitHub Action (`.github/workflows/daily-ladder.yml`).
- The GitHub Action runs on Node 20 and will **fetch ladders for all teams** returned by `getTeams`, commit changed `public/ladder-*.json` to `master`, and trigger a Cloudflare Pages redeploy. Ensure the repository secret `GS_API_URL` points at your current Apps Script deployment.
- The scraper logs HTTP errors and parser errors per-team and continues processing other teams; use the `--only-*` flags for focused debugging.
