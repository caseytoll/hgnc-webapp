# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HGNC Team Manager is a PWA for managing Hazel Glen Netball Club teams. Features include roster management, game scheduling, lineup planning, live scoring, and analytics. Works offline via service worker.

**Target user:** Junior netball coach who needs fair playing time distribution and offline access at games.

**Status:** Development complete. All features working. Ready for production use.

| Resource | URL |
|----------|-----|
| Production | https://hgnc-team-manager.pages.dev |
| Viewer App | https://hgnc-gameday.pages.dev |
| GitHub | https://github.com/caseytoll/hgnc-webapp |

---

## Commands

### Main App (root directory)

```bash
npm run dev              # Dev server (port 3000)
npm run dev -- --host    # Dev server with network access (for phone testing)
npm run build            # Production build → dist/
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:coverage    # Tests with coverage
npx vitest src/js/utils.test.js  # Run single test file
npm run preview          # Preview production build locally
```

### Viewer App (`viewer/` directory)

Read-only app for parents/spectators to view schedules and stats.

```bash
cd viewer
npm run dev              # Dev server
npm run build            # Production build
npm run test:run         # Run tests once
npx vitest src/js/utils.test.js  # Run single test file
```

### Deployment

**IMPORTANT:** Always commit to GitHub AND deploy to Cloudflare. GitHub is the source of truth for version control; Cloudflare hosts the live site.

**Main App:**
```bash
# 1. Commit to GitHub
git add -A && git commit -m "feat: Description of changes" && git push origin master

# 2. Deploy to Cloudflare
npm run build && wrangler pages deploy dist --project-name=hgnc-team-manager --branch=main --commit-dirty=true
```

**Viewer App:**
```bash
cd viewer && npm run build && wrangler pages deploy dist --project-name=hgnc-gameday --branch=main --commit-dirty=true
```

**Backend (Apps Script):**
```bash
cd apps-script && clasp push && clasp deploy -i AKfycbyBxhOJDfNBZuZ65St-Qt3UmmeAD57M0Jr1Q0MsoKGbHFxzu8rIvarJOOnB4sLeJZ-V -d "Description"
```

---

## Architecture

**Tech:** Vanilla JS (ES modules), Vite 7.x, Vitest, Google Apps Script backend

**Prerequisites:** Node.js 20+ (required for ladder scraper compatibility), npm 9+, clasp (for Apps Script deployment)

### Main App Files (`src/js/`)
- `app.js` - Main application logic, global `state` object
- `api.js` - Data transformation functions (sheet ↔ PWA format)
- `config.js` - API endpoint URL, `useMockData` toggle
- `utils.js` - Utility functions (escapeHtml, formatters, localStorage wrappers)
- `mock-data.js` - Mock data AND `calculateMockStats()` used for all data sources
- `stats-calculations.js` - Advanced stats (leaderboards, combos, analytics)
- `share-utils.js` - Lineup card generation, sharing

### Viewer App Files (`viewer/src/js/`)
- `app.js` - Main viewer logic with inline API calls
- `utils.js`, `mock-data.js`, `stats-calculations.js`, `share-utils.js` - Shared modules
- `config.js` - API endpoint configuration

### Backend Files (`apps-script/`)
- `Code.js` - Main API handlers and business logic
- `.clasp.json` - Clasp configuration for deployment

**Test files:** `*.test.js` alongside source files
- Main app: 172 tests (utils 55, share-utils 57, mock-data 20, stats-calculations 40)
- Viewer app: 172 tests (same distribution)

**Patterns:**
- Single HTML file with `<div class="view">` sections (show/hide via `display`)
- Global `state` object in app.js holds current team, game, players
- All onclick handlers attached to `window` (e.g., `window.selectGame = ...`)
- Always use `escapeHtml()` for user input to prevent XSS
- CSS imported via JS (`import '../css/styles.css'`) for Vite 7.x compatibility
- No linter configured; code style is vanilla JS with ES modules

---

## Data Structures

```javascript
// Team (from getTeams API)
{
  teamID, teamName, year, season, sheetName, archived
}

// Team Data (from getTeamData API)
{
  teamID, teamName, year, season,
  players: [{ id, name, fillIn, favPosition }],
  games: [{ gameID, round, opponent, date, location, status, captain, scores, lineup }]
}

// Lineup (per game, per quarter)
{
  Q1: { GS, GA, WA, C, WD, GD, GK, ourGsGoals, ourGaGoals, oppGsGoals, oppGaGoals },
  Q2: { ... }, Q3: { ... }, Q4: { ... }
}

// Player Library (career tracking across teams/seasons)
{
  players: [{
    globalId: 'gp_123',
    name: 'Emma Smith',
    createdAt: '2026-01-26T...',
    linkedInstances: [
      { teamID, playerID, teamName, year, season }
    ]
  }]
}
```

**Positions:** GS, GA, WA, C, WD, GD, GK

---

## Ladder Integration 🔧

- **Purpose:** Fetch and display NFNL ladder data per team when a `ladderUrl` is provided in Team Settings. The Ladder tab is shown on a team's page only when a `ladderUrl` exists for that team.
- **Where it's stored:** The `ladderUrl` value is persisted in the `Teams` sheet (column G). The Apps Script `getTeams` response includes `ladderUrl`, and `updateTeamSettings` persists it.
- **Frontend behavior:** The client fetches a static JSON file `public/ladder-<teamID>.json` (created by the scraper). The Ladder view shows a `lastUpdated` timestamp, highlights the current team row, and provides a portrait "Show extra columns" toggle (persisted per team in `localStorage`). The layout is responsive (portrait/landscape rules, container queries) and respects `prefers-reduced-motion` for animations. Errors are handled gracefully; when the ladder JSON is unavailable the Ladder tab is hidden or shows an error message.
- **JSON format:** Generated JSON contains an ISO `lastUpdated` timestamp and a `ladder` array of rows (summary fields like teamName, played, won, lost, goalsFor/against, percentage). Example: `{ "lastUpdated": "2026-01-26T12:34:56Z", "ladder": [{...}, ...] }`.
- **Scraper script:** `scripts/fetch-ladder.js` fetches the team list (from a local `teams.json` or the Apps Script `getTeams` API), requests each `ladderUrl`, parses the HTML (Cheerio) and writes `public/ladder-<teamID>.json`.

  Notes & runtime:
  - **Requires Node.js 20+** for modern fetch/undici compatibility. Ensure your CI uses Node 20 (the workflow uses `actions/setup-node@v4` with `node-version: '20'`).
  - CLI flags:
    - `--api <GS_API_URL>` — fetch teams via Apps Script `getTeams` (recommended in CI)
    - `--teams <file>` — read a local teams JSON file
    - `--out <dir>` — output directory (usually `public/`)
    - `--only-ladder-url <url>` — process only teams with this exact ladder URL
    - `--only-team-id <teamID>` — process only a single team by `teamID`
  - Example (local):
    ```bash
    node scripts/fetch-ladder.js --teams ./public/teams.json --out public/
    ```
  - Example (production using Apps Script):
    ```bash
    GS_API_URL="https://script.google.com/macros/s/<DEPLOY_ID>/exec" \
      node scripts/fetch-ladder.js --api "$GS_API_URL" --out public/
    ```
  - Logging & error handling: the scraper logs per-team fetch attempts and errors (HTTP failures or parse issues) and continues processing other teams. It writes `ladder-<teamID>.json` when parsing succeeds.
  - If you need to debug a single team quickly, use `--only-ladder-url` or `--only-team-id` to limit requests and surface errors faster.
- **Automation:** A **Daily Ladder Update** workflow (`.github/workflows/daily-ladder.yml`) has been added to run `scripts/fetch-ladder.js` on a schedule and via manual dispatch. The workflow uses the `GS_API_URL` repository secret (Apps Script `getTeams` endpoint) to fetch ladder URLs for *all teams* returned by `getTeams`, generates `public/ladder-*.json`, and commits any changes to `master` so Cloudflare Pages will deploy the updated ladders. To enable it, set `GS_API_URL` in your repository Secrets (Settings → Secrets) and trigger it manually in the Actions tab or rely on the daily schedule.
- **Deployment notes:** After generating and committing `public/ladder-*.json`, deploy to Cloudflare Pages (see Deployment commands). Ensure the Apps Script deployment referenced in `src/js/config.js` is the correct, published deployment that includes `getTeams`/`updateTeamSettings` with `ladderUrl` support.
- **Debug helpers:** `apps-script/Code.js` includes `getTeamRowByID()` used for verification. Remove it if you prefer a minimal API surface.

## API

**Endpoints** (via Apps Script):

| Action | Description | Parameters |
|--------|-------------|------------|
| `ping` | Health check | - |
| `getTeams` | List all teams | - |
| `getTeamData` | Get team details | `teamID`, `sheetName` |
| `saveTeamData` | Save team data | `sheetName`, `teamData` (JSON) |
| `createTeam` | Create new team | `year`, `season`, `name` |
| `updateTeam` | Update team settings | `teamID`, `settings` (JSON with teamName/year/season/archived) |
| `getPlayerLibrary` | Get career tracking data | - |
| `savePlayerLibrary` | Save career tracking data | `playerLibrary` (JSON) |

**Local dev:** Vite proxy at `/gas-proxy` bypasses CORS (configured in `vite.config.js`)
**Production:** Direct calls to Apps Script (Google handles CORS)

---

## Data Sync

The app syncs data to Google Sheets at these points:
- **Player operations** - Adding, editing, or deleting players syncs immediately
- **Player library (career tracking)** - Adding, linking, or removing players syncs to `PlayerLibrary` sheet
- **Game operations** - Adding games syncs immediately; deleting syncs via closeGameDetail
- **Finalizing a game** - After calculating scores
- **Closing game detail view** - When navigating back to main app (batches lineup/scoring changes)
- **Importing team data** - After confirming import
- **Archiving/unarchiving teams** - Immediately via `updateTeam` API
- **Updating team settings** - Immediately via `updateTeam` API
- **Creating new teams** - Immediately via `createTeam` API

Data is always saved to localStorage first for offline support, then synced to the backend when online.

**Note:** Lineup changes, availability toggles, and scoring inputs are saved to localStorage immediately but only sync to the API when closing the game detail view (batch sync for performance).

**Google Sheet tabs:** Teams, Fixture_Results, Ladder_Archive, Settings, LadderData, PlayerLibrary

---

## Troubleshooting

**Safari + localhost:** Use network IP (`http://192.168.x.x:3000/`) instead of localhost. Safari has issues with Vite 7.x localhost handling.

**Vite parse errors:** Check brace balance with:
```bash
node --check src/js/app.js
```

**Toggle data source:** Dev panel (bottom-right, localhost only) switches between Mock and API. Also: set `useMockData: true` in `src/js/config.js`.

**Google Sheet returns strings:** The API returns numbers as strings (e.g., `"2"` not `2`). Always use `parseInt()` when doing arithmetic with goal values.

**Service worker updates:** Uses stale-while-revalidate strategy. Version is auto-generated from build timestamp (YYYYMMDDHHMM) via Vite plugin - no manual bumping needed. Users will see an "Update now" banner when a new version is available. The app checks for updates every 60 seconds.

**Apps Script deployment:** See deployment commands in the Commands section above.

---

## Session Handoff

Update this section at the end of each session:
- Features added/modified
- Key functions changed
- Any issues to watch for

**Last session:** 2026-01-27
- Changed API sync from GET to POST requests to handle large data payloads (was hitting URL length limits)
- Added automatic build versioning via Vite plugin (`vite.config.js`) - generates YYYYMMDDHHMM timestamps in Melbourne timezone
- Fixed game sorting to display by round number (not insertion order)
- Added HGNC logo branding:
  - Splash page logo (72x72)
  - Browser favicon (32x32)
  - PWA icons (192x192, 512x512)
  - Apple touch icon (180x180)
- Added player count to `getTeams` API response (displayed on landing page team cards)
- **Added Ladder integration:** Implemented ladder scraping script (`scripts/fetch-ladder.js`) that generates `public/ladder-<teamID>.json`; updated `apps-script/Code.js` to persist `ladderUrl` (`updateTeamSettings`) and include it in `getTeams`; added frontend Ladder tab that conditionally displays and fetches the per-team JSON, with responsive portrait/landscape behavior, a per-team "Show extra columns" toggle (persisted in `localStorage`), and accessibility/reduced-motion support. Sample ladder JSONs were committed to `public/` during testing. Documentation updated (CLAUDE.md) to explain usage and automation options.
- All icons generated from `docs/HGNC Logo.jpg` using macOS `sips`
- All 172 tests passing, deployed to production
