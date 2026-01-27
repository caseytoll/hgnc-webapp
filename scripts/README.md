fetch-ladder (scripts/fetch-ladder.js)

This repository includes a small scraper that pulls NFNL ladder HTML pages and writes static JSON files into `public/`.

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

Notes

- The generated files are `public/ladder-<teamID>.json` and contain a `lastUpdated` ISO timestamp and a `ladder` array.
- For automation, set the Apps Script URL as a repository secret named `GS_API_URL` and use the provided GitHub Action (`.github/workflows/daily-ladder.yml`).
- The GitHub Action commits any changed `public/ladder-*.json` to the default branch (`master`) so Cloudflare Pages will deploy the update.
