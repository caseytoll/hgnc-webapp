# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HGNC Team Manager consists of two Progressive Web Apps (PWAs) for managing Hazel Glen Netball Club teams:

- **Coach's App** (`apps/coach-app/`): Full-featured PWA with editing capabilities for coaches
- **Parent Portal** (`apps/parent-portal/`): Read-only SPA for parents and spectators

| Application | URL | Access Level |
|-------------|-----|--------------|
| Coach's App | https://hgnc-team-manager.pages.dev | Full editing access |
| Parent Portal | https://hgnc-gameday.pages.dev | Read-only access |

---

## Commands

### Coach's App (run from root directory)

```bash
npm run dev              # Dev server (port 3000)
npm run dev -- --host    # Dev server with network access (for phone testing)
npm run build            # Production build → dist/
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:coverage    # Tests with coverage
npx vitest src/js/utils.test.js  # Run single test file (from apps/coach-app/)
```

### Parent Portal

```bash
cd apps/parent-portal
npm run dev              # Dev server
npm run build            # Production build
npm run test:run         # Run tests once
```

### Deployment

**Coach's App:**
```bash
git add -A && git commit -m "feat: Description" && git push origin master
npm run build && wrangler pages deploy dist --project-name=hgnc-team-manager --branch=master --commit-dirty=true
```

**Parent Portal:**
```bash
cd apps/parent-portal
npm run build && wrangler pages deploy dist --project-name=hgnc-gameday --branch=main --commit-dirty=true
```

**Backend (Apps Script):**
```bash
cd apps-script && clasp push && clasp deploy -i <DEPLOYMENT_ID> -d "Description"
```
Current production API: https://script.google.com/macros/s/AKfycbz3DmnPOLstWmOmJs4nzDQn42XXWe0E2ujLpmfo4e4WZFkInXxUdeL8-W0SImYj9EQj/exec

### Versioning

**IMPORTANT:** Bump the version before each deploy for cache busting.

| Component | Format | Location |
|-----------|--------|----------|
| App version | `YYYY-MM-DD{letter}` | `apps/coach-app/vite.config.js` line 8: `REVISION = 'x'` |
| SW version | `YYYYMMDDHHMM` | Auto-generated from build timestamp |

- Increment `REVISION` letter (a → b → c) for each deploy on the same day
- Reset to `'a'` on a new day
- The build injects versions into HTML and service worker automatically

---

## Architecture

**Tech:** Vanilla JS (ES modules), Vite 7.x, Vitest, Google Apps Script backend

**Prerequisites:** Node.js 20+, npm 9+, clasp (for Apps Script deployment)

### Directory Structure

```
webapp-local-dev/
├── apps/
│   ├── coach-app/           # Coach's App (Full Editing)
│   │   ├── src/js/app.js    # Main app logic, global state object
│   │   ├── src/js/api.js    # Data transformation (sheet ↔ PWA format)
│   │   ├── src/js/config.js # API endpoint, useMockData toggle
│   │   └── src/js/*.test.js # Test files
│   └── parent-portal/       # Parent Portal (Read-Only)
│       ├── src/js/app.js    # Read-only app logic
│       ├── src/js/router.js # URL routing for team pages
│       └── src/js/*.test.js # Test files
├── common/                  # Shared modules (imported by both apps)
│   ├── styles/
│   │   └── shared.css       # Shared CSS (design system, components, layout, theme)
│   ├── utils.js             # escapeHtml, formatters, isGameInPast, localStorage wrappers
│   ├── mock-data.js         # Mock data AND calculateTeamStats()
│   ├── stats-calculations.js # Leaderboards, combos, analytics (uses isGameInPast)
│   ├── share-utils.js       # Team Sheet generation, lineup sharing
│   └── build/               # Shared build config factories
│       ├── vite.config.shared.js   # createViteConfig() factory
│       └── vitest.config.shared.js # createVitestConfig() factory
├── apps-script/             # Google Apps Script backend
│   └── Code.js              # API handlers and business logic
└── scripts/                 # Build and utility scripts
    └── fetch-ladder.js      # Ladder scraper for NFNL data
```

### Key Patterns

- Single HTML file per app with `<div class="view">` sections (show/hide via `display`)
- Global `state` object in app.js holds current team, game, players
- All onclick handlers attached to `window` (e.g., `window.selectGame = ...`)
- Always use `escapeHtml()` for user input to prevent XSS
- Always use `formatAIContent()` for rendering AI-generated text (escapes HTML first, then applies markdown formatting)
- CSS imported via JS (`import '../css/styles.css'`) for Vite 7.x compatibility. Each app's `styles.css` uses `@import` to pull in `common/styles/shared.css`, then adds app-specific overrides. Shared CSS changes go in `common/styles/shared.css`; coach-only styles stay in coach's `styles.css`; portal-only styles stay in portal's `styles.css`
- Shared modules imported from `../../common/` in both apps
- Name validation (`validatePlayerName`, `validateTeamName`, `validateOpponentName`) requires 2-100 chars with at least one letter
- No linter configured; code style is vanilla JS with ES modules

### Keeping Apps Consistent

**IMPORTANT:** When making style or layout changes, apply them to BOTH apps to maintain visual consistency.

- **CSS classes must match:** Use `.game-item` for game lists (not `.game-card`), `.player-card` for roster, etc.
- **HTML structure:** Game list items use `game-round`, `game-info`, `game-opponent`, `game-meta`, `game-score` classes
- **Stats field names:** Use `avgFor`/`avgAgainst` (not `avgGoalsFor`/`avgGoalsAgainst`) from stats-calculations.js
- **Team name source:** `getTeamData` API doesn't return teamName - use `getTeams` data for team info display
- **Theme toggle:** Uses `data-theme` attribute on `<html>`, not body class. Values: `light` or `dark`
- **Game status handling:** Check for `game.status === 'abandoned'` or `'bye'` before displaying scores. Bye games show "Bye" as opponent text (no "vs" prefix) and no score label. Both statuses use gray round indicator (`var(--gray-400)`)
- **Upcoming games:** Use `isGameInPast()` from utils.js to exclude future games from stats calculations
- **Stats filter consistency:** Both `calculateTeamStats` (mock-data.js) and `calculateAdvancedStats` (stats-calculations.js) use the same filter: `g.status === 'normal' && g.scores && isGameInPast(g)`
- **Team Sheet sharing:** Format is "Round X - TeamName vs Opponent" with full first names (no truncation)
- **Fixture sync fields:** `fixtureMatchId` and `fixtureScore` must round-trip through both apps' `transformTeamDataFromSheet` and `transformTeamDataToSheet` (same pattern as `aiSummary`)

### Team Access Control (PIN System)

- Per-team optional 4-digit PINs. Backend returns `pinToken` (16-char hex) on correct PIN, stored in `state.teamPinTokens` (localStorage)
- Auth gates writes only: `saveTeamData` and `updateTeam` check pinToken. Reads are open for Parent Portal
- Master PIN in Apps Script Properties (`MASTER_PIN`). "Log Out All Devices" regenerates pinToken server-side
- PIN storage: Teams sheet columns L (PIN) and M (PinToken) — not in team data JSON

### Coach Grouping

- Optional `coach` text field per team (Teams sheet column N). Dropdown populated from existing coaches plus "Other..." (`COACH_OTHER_SENTINEL`)
- Team list grouped: My Teams (have pinToken) → Per-coach sections (collapsed) → Other Teams (no coach)

### Coach's App Specifics

- **Service worker:** Auto-updates with build timestamp version. Users see "Update now" banner
- **Offline support:** Data saved to localStorage first, synced when online
- **Caching:** Teams list and team data cached with 5-minute TTL (`TEAM_CACHE_TTL_MS`). Stale-while-revalidate for teams list. `lastModified` version check for team data
- **Main tabs:** Schedule, Roster, Stats, Training (4 bottom nav tabs)
- **Lineup Planner:** Desktop-optimized full-screen 4-quarter view. Uses `position: fixed` to break out of `#app`'s 430px max-width. Features drag-and-drop, auto-fill, copy quarter, undo stack
- **Team Creation Wizard:** 6-step wizard (Info, Competition Type, Season, Coach, Integration, Review). Competition type determines season label and integration options. Validates per step with duplicate detection
- **Squadi Auto-Discovery:** "Auto-Detect from Squadi" in Team Settings scans Squadi API for HG teams, caches in `Squadi_Lookup` sheet (6-month TTL). Force rescan available

### AI Features (Gemini-powered)

Gemini API via Apps Script. API key in Apps Script properties. Four AI endpoints:
- **AI Insights** (`getAIInsights`): Season analysis with opponent difficulty context. Cached in `state.currentTeamData.aiInsights`
- **Game AI Summary** (`getGameAIInsights`): Per-game analysis with player contributions
- **Player AI Insights** (`getPlayerAIInsights`): Individual player analysis
- **AI Training Focus** (`getTrainingFocus`): Rolling window of last 3 games with notes as primary focus. Correlates with training session attendance. History in `trainingFocusHistory[]` (max 5, newest first)

### Opponent Difficulty Ratings

Coach-app only. `getOpponentDifficulty(opponentName)` reads cached ladder from localStorage (`ladder.cache.{teamID}`), uses `fuzzyOpponentMatch()` for name lookup. Returns position/tier or `null` when no ladder data (graceful degradation). Strength of Schedule shown in stats overview.

### Parent Portal Specifics

- No service worker — always fetches fresh data. Read-only, no edit functionality
- Team URLs: `/teams/{slug}` format. Dark/light theme toggle persisted to localStorage

---

## Data Structures

```javascript
// Team (from getTeams API) — hasPin is boolean, raw PIN never exposed
{ teamID, teamName, year, season, sheetName, archived, ladderUrl, resultsApi, hasPin, coach, competitionType }
// competitionType: Not stored in backend, inferred from resultsApi/ladderUrl (NFNL, Nillumbik Force, or Other)
// season: 'Season 1', 'Season 2', 'Nillumbik Force', 'Other', or 'NFNL' (legacy)

// Team Data (from getTeamData API) - NOTE: does NOT include teamName, year, or season
{
  teamID, sheetName,
  players: [{ id, name, fillIn, favPosition }],
  games: [{ gameID, round, opponent, date, location, status, captain, scores, lineup, fixtureMatchId, fixtureScore }],  // status: upcoming|normal|abandoned|forfeit|bye
  trainingSessions: [{ sessionID, date, attendedPlayerIDs, focus, notes }],  // Optional
  trainingFocusHistory: [{ text, generatedAt, gameCount, noteCount, recentGames }]  // Optional, max 5
}

// Lineup (per game, per quarter)
{
  Q1: { GS, GA, WA, C, WD, GD, GK, ourGsGoals, ourGaGoals, oppGsGoals, oppGaGoals, notes },
  Q2: { ... }, Q3: { ... }, Q4: { ... }
}
```

**Positions:** GS, GA, WA, C, WD, GD, GK

---

## API

API actions discoverable from `Code.js` switch cases. Key notes:

- **Local dev:** Vite proxy at `/gas-proxy` bypasses CORS (configured in `vite.config.js`)
- **POST-only actions:** `saveTeamData`, `savePlayerLibrary`, and all AI endpoints (`getAIInsights`, `getGameAIInsights`, `getPlayerAIInsights`, `getTrainingFocus`)
- **All other actions use GET** via `doGet > handleApiRequest`

---

## Data Sync

Data syncs to Google Sheets at these points:
- **Player/game operations** - Adding, editing, or deleting syncs immediately
- **Lineup changes** - Saved to localStorage immediately, synced when closing game detail view (batch sync)
- **Team settings** - Immediately via `updateTeam` API

Data is always saved to localStorage first for offline support, then synced to the backend when online. The `closeGameDetail` function guards against parallel syncs via `syncInProgress` flag.

**Stale Data Protection:** The app tracks a `_lastModified` timestamp in the data. Before saving, the server checks if its data is newer than what the client saw. If another device/tab has updated the data, the save is rejected and the user's view is refreshed with the latest data.

**PIN Auth on Writes:** `saveTeamData` (POST-only, no GET handler) and `updateTeam` (GET) check the `pinToken` parameter against the Teams sheet. If the team has a PIN and the token doesn't match, the request returns `AUTH_REQUIRED`.

**Google Sheet tabs:** Teams, Fixture_Results, Ladder_Archive, Settings, Diagnostics, PlayerLibrary, Squadi_Lookup

**Teams sheet columns:** A=TeamID, B=Year, C=Season, D=TeamName, E=SheetName, F=LadderName, G=LadderApi, H=ResultsApi, I=Archived, J=PlayerCount, K=LastModified, L=PIN, M=PinToken, N=Coach

---

## Ladder & Fixture Integration

### Ladder Sources

| Source | Config | How It Works |
|--------|--------|--------------|
| **NFNL** (static) | `ladderUrl` field | GitHub Action scrapes HTML daily → `public/ladder-<teamID>.json` |
| **Squadi** (live) | `resultsApi` with `source: "squadi"` | Backend fetches from Squadi API → `getSquadiLadder` action |
| **GameDay** (computed) | `resultsApi` with `source: "gameday"` | Backend computes standings from fixture match results (W×4 + D×2 points) |

NFNL scraper: `scripts/fetch-ladder.js`. GameDay ladder: `computeGameDayLadder()` in Code.js (can't scrape client-rendered HTML). GitHub workflow: `.github/workflows/daily-ladder.yml`.

### Fixture Sync (Auto-Populate Games)

Teams with `resultsApi` configured get automatic game population. Sources: Squadi API or GameDay HTML scraping. Merge rules:
1. Match fixture to existing game by `fixtureMatchId` first, fall back to fuzzy match (same round + similar opponent)
2. Existing game: fill empty fields only — **never overwrite** manual data (scores, lineup, notes, captain)
3. New game: create with fixture data, status from fixture, scores = null
4. Status only upgrades from `upcoming` → fixture status (never downgrades)
5. `fixtureScore` always updated when match has ended (for score validation display)
6. Backend caches fixture data in CacheService (6-hour TTL), key includes config hash for invalidation

**GameDay `roundOffset`:** Offsets round numbers for teams with pre-season grading games (e.g., `roundOffset: 3` shifts all rounds by 3).

---

## Change Checklists

### Adding a field to the Team object

The team object is mapped/copied in multiple places. When adding a new field:

1. **Backend `Code.js`:**
   - `ensureTeamsSheetStructure()` — add column header
   - `loadMasterTeamList()` — read from row array (0-indexed)
   - `getTeams` response — include in `pwaTeams` mapping
   - `updateTeamSettings()` — handle in settings write
   - `createNewTeam()` — include in `appendRow` call
   - `createTeam` API action — read from `e.parameter`

2. **Frontend `app.js`:**
   - Initial teams load (~line 719) — add default if needed
   - Background revalidation `freshTeams` mapping — include field with default
   - Background revalidation change-detection signature — include if changes should trigger UI refresh
   - `saveTeamSettings()` — read from form, update `state.currentTeam`, `state.currentTeamData` (if applicable), `teamInList`, send to API, AND add to rollback
   - `openTeamSettings()` — add form field
   - `openAddTeamModal()` / `addNewTeam()` — add form field and include in API call

### Adding a security check

- **Grep for ALL handlers** of the action being secured — `Code.js` has both GET (`doGet > handleApiRequest`) and POST (`doPost`) paths. `saveTeamData` is POST-only; other actions use GET.
- **Grep for ALL callers** that hit the secured endpoint — there are TWO code paths that POST to `saveTeamData`: `saveTeamDataWithProtection()` in `api.js` and `syncToGoogleSheets()` in `app.js`. Both must include auth tokens.
- Consider abuse scenarios: rate limiting, brute force, lockout
- Auth checks should fail-open on errors (don't block saves due to transient issues) but log the failure

### General

- When copying a pattern from elsewhere in the codebase, verify it's correct — don't propagate existing gaps
- Always use `escapeHtml()` / `escapeAttr()` for user data in HTML templates
- Use constants for sentinel values (e.g., `COACH_OTHER_SENTINEL`) — never embed magic strings in templates
- Rollback logic must cover ALL state mutations (currentTeam, currentTeamData, teams list entry)

---

## Troubleshooting

**Safari + localhost:** Use network IP (`http://192.168.x.x:3000/`) instead of localhost.

**Vite parse errors:** Check brace balance:
```bash
node --check src/js/app.js
```

**Toggle data source:** Dev panel (bottom-right, localhost only) or set `useMockData: true` in config.js.

**Google Sheet returns strings:** Always use `parseInt()` when doing arithmetic with goal values.

**Service worker updates:** Auto-generated version from build timestamp. Users see "Update now" banner when available.

**Monitor workflow issues:** If `Resource not accessible by integration`, add `permissions: issues: write` to workflow YAML.
