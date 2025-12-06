# Scripts Quick Reference

## Deploy
- `./scripts/efficient-deploy.sh "<description>"` — canonical deploy; pushes changed files, versions, deploys, runs runtime + extended smoke + integration; flags: `--skip-smoke`, `--dry-run`, `--ensure-anonymous`, `--allow-dirty` (override clean-tree guard).
- `npm run deploy -- "<description>"` — npm alias for efficient-deploy.
- Config: `scripts/config.sh` (env-first) sets `DEPLOYMENT_ID` and `APP_URL_PUBLIC`; override via environment when needed.

## Validation
- `./scripts/pre-deploy-check.sh [--fix-docs]` — full static validation; `--fix-docs` auto-moves misplaced docs.
- `npm test` — runs pre-deploy-check.

## Tests (manual)
- `npm run test:smoke` — runtime smoke (Puppeteer).
- `npm run test:extended` — extended smoke.
- `npm run test:integration` — full specialized suite.
- Individual: `crud-test.js`, `form-validation-test.js`, `error-recovery-test.js`, `performance-test.js`, `keyboard-nav-test.js`, `mobile-test.js`, `search-filter-test.js`.

## Utilities
- Assets/CDN: `pin-cdn.sh`, `add-asset.sh`, `audit-icons.js`.
- Lint/HTML: `run_html_lint.sh`, `quick_html_checks.sh`; shell lint: `npm run lint:shell` (uses shellcheck if available).
- Deployment access helper: `ensure-deploy-access.js`.
- Archive/cleanup: `zip-archives.sh`, `remove_lone_r.sh`, `fix-insights-cards.py`.
- Screenshots: `compare-screenshots.js`.

## Removed legacy wrappers
- `deploy_and_test.sh`, `test-and-deploy.sh`, `quick-deploy.sh`, `release.sh` → removed; use `efficient-deploy.sh` instead.
