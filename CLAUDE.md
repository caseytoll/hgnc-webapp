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
```

### Deployment

**Main App:**
```bash
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

**Prerequisites:** Node.js 18+, npm 9+, clasp (for Apps Script deployment)

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
```

**Positions:** GS, GA, WA, C, WD, GD, GK

---

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

**Local dev:** Vite proxy at `/gas-proxy` bypasses CORS
**Production:** Direct calls to Apps Script (Google handles CORS)

**Google Sheet tabs:** Teams (with Archived column I), Fixture_Results, Ladder_Archive, Settings, LadderData

---

## Data Sync

The app syncs data to Google Sheets at these points:
- **Finalizing a game** - After calculating scores
- **Closing game detail view** - When navigating back to main app
- **Importing team data** - After confirming import
- **Archiving/unarchiving teams** - Immediately via `updateTeam` API
- **Updating team settings** - Immediately via `updateTeam` API
- **Creating new teams** - Immediately via `createTeam` API

Data is always saved to localStorage first for offline support, then synced to the backend when online.

---

## Troubleshooting

**Safari + localhost:** Use network IP (`http://192.168.x.x:3000/`) instead of localhost. Safari has issues with Vite 7.x localhost handling.

**Vite parse errors:** Check brace balance with:
```bash
node --check src/js/app.js
```

**Toggle data source:** Dev panel (bottom-right, localhost only) switches between Mock and API. Also: set `useMockData: true` in `src/js/config.js`.

**Google Sheet returns strings:** The API returns numbers as strings (e.g., `"2"` not `2`). Always use `parseInt()` when doing arithmetic with goal values.

**Service worker updates:** Uses stale-while-revalidate strategy. After deploy, bump `CACHE_NAME` version in `public/sw.js` (currently `v4`), rebuild, and redeploy. Users will see an "Update now" banner when a new version is available. The app checks for updates every 60 seconds.

**Apps Script deployment:** Use clasp to push and deploy changes:
```bash
cd apps-script && clasp push && clasp deploy -i <DEPLOYMENT_ID> -d "Description"
```

---

## Development Complete (2026-01-26)

### Features Implemented
- **Team Management**: Create, edit, archive/unarchive teams
- **Player Management**: Add/edit players, track fill-ins, favorite positions
- **Game Scheduling**: Add games with opponent, date, time, location
- **Lineup Builder**: Drag-and-drop player assignment to positions per quarter
- **Live Scoring**: Track goals per quarter with running totals
- **Statistics**: Team overview, leaderboards, position analysis, player combinations
- **Player Library**: Track career stats across teams/seasons
- **Sharing**: Share game results and lineup cards via native share or clipboard
- **Offline Support**: Full functionality offline via service worker
- **Viewer App**: Read-only app for parents/spectators

### Technical Implementation
- Full API sync for all data changes (teams, players, games, lineups, scores)
- 344 total tests passing (172 main app + 172 viewer app)
- Modular codebase with shared utilities between apps
- Responsive design with mobile-first approach
- Dark mode support
- PWA with install prompt and update notifications

### Deployment
- Frontend: Cloudflare Pages (auto-deploy on push)
- Backend: Google Apps Script (deploy via clasp)
- Both apps live and production-ready

---

## Session Handoff

At the end of each session, update this section with:
- Features added/modified
- Key functions changed
- Any issues to watch for

Then commit and push to deploy.

**Last updated:** 2026-01-26
**Last deployment:** v45 (Apps Script), Cloudflare Pages (main + viewer)
