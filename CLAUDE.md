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
npm run build && wrangler pages deploy dist --project-name=hgnc-gameday --branch=master --commit-dirty=true
```

**Backend (Apps Script):**
```bash
cd apps-script && clasp push && clasp deploy -i <DEPLOYMENT_ID> -d "Description"
```
Current production API: https://script.google.com/macros/s/AKfycbwss2trWP44QVCxMdvNzk89sXQaCnhyFbUty22s_dXIg0NOA94Heqagt_bndZYR1NWo/exec

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

### Team Creation Wizard

The Coach's App uses a 6-step wizard for creating new teams:

1. **Team Info** - Name and year
2. **Competition Type** - NFNL, Nillumbik Force, or Other
3. **Season** - Season 1/2/Other (skipped for Nillumbik Force, uses 'Nillumbik Force' label)
4. **Coach** - Optional coach selection
5. **Integration Setup** - Competition-specific:
   - **NFNL**: Ladder URL (MyGameDay) for auto-sync + results API
   - **Nillumbik Force**: Fixture sync (GameDay or Squadi/Netball Connect) with auto-detect
   - **Other**: No integration setup
6. **Review** - Confirm all settings before creation

Validation happens at each step with duplicate team detection. The wizard saves competition type, season, coach, and integration config (ladderUrl or resultsApi) via the createTeam API.

**Squadi Auto-Detect**: Click "Auto-Detect from Squadi" in Team Settings to discover HG teams from Squadi/Netball Connect competitions. Detects both "HG" and "Hazel Glen" team name prefixes. Auto-detection caches results for performance (use "Force Rescan" to refresh).

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
- CSS imported via JS (`import '../css/styles.css'`) for Vite 7.x compatibility. Each app's `styles.css` uses `@import` to pull in `common/styles/shared.css`, then adds app-specific overrides. Shared CSS changes go in `common/styles/shared.css`; coach-only styles (scoring inputs, planner, PIN, AI, training, ladder) stay in coach's `styles.css`; portal-only styles (read-only scoring display) stay in portal's `styles.css`
- Shared modules imported from `../../common/` in both apps
- Name validation (`validatePlayerName`, `validateTeamName`, `validateOpponentName`) requires 2-100 chars with at least one letter
- No linter configured; code style is vanilla JS with ES modules

### Keeping Apps Consistent

**IMPORTANT:** When making style or layout changes, apply them to BOTH apps to maintain visual consistency. The Parent Portal should mirror the Coach's App styling for all shared UI components.

When modifying UI in one app, check if the other needs the same change:

- **CSS classes must match:** Use `.game-item` for game lists (not `.game-card`), `.player-card` for roster, etc.
- **HTML structure:** Game list items use `game-round`, `game-info`, `game-opponent`, `game-meta`, `game-score` classes
- **Stats field names:** Use `avgFor`/`avgAgainst` (not `avgGoalsFor`/`avgGoalsAgainst`) from stats-calculations.js
- **Team name source:** `getTeamData` API doesn't return teamName - use `getTeams` data for team info display
- **Theme toggle:** Uses `data-theme` attribute on `<html>`, not body class. Values: `light` or `dark`
- **Game status handling:** Check for `game.status === 'abandoned'` or `'bye'` before displaying scores. Bye games show "Bye" as opponent text (no "vs" prefix) and no score label. Both statuses use gray round indicator (`var(--gray-400)`).
- **Upcoming games:** Use `isGameInPast()` from utils.js to exclude future games from stats calculations
- **Stats filter consistency:** Both `calculateTeamStats` (mock-data.js) and `calculateAdvancedStats` (stats-calculations.js) use the same filter: `g.status === 'normal' && g.scores && isGameInPast(g)`
- **Team Sheet sharing:** Format is "Round X - TeamName vs Opponent" with full first names (no truncation)
- **Fixture sync fields:** `fixtureMatchId` and `fixtureScore` must round-trip through both apps' `transformTeamDataFromSheet` and `transformTeamDataToSheet` (same pattern as `aiSummary`)

**Shared UI Components (must match between apps):**

| Component | CSS Classes | Notes |
|-----------|-------------|-------|
| Game list | `.game-item`, `.game-round`, `.game-info`, `.game-opponent`, `.game-meta`, `.game-score` | Sort by date descending |
| Player cards | `.player-card`, `.player-avatar`, `.player-info` | Clickable to show stats modal |
| Stats hero | `.stats-hero`, `.stats-record`, `.stats-metrics` | Purple banner with W-L-D |
| Stats tabs | Overview, Leaders, Positions, Combos, Attendance | Same tab structure |
| Scoring display | `.scoring-accordion`, `.scoring-quarter`, `.position-badge` | Accordion with GS/GA badges |
| Position tracker | `.position-grid`, `.pos-grid-cell` | 7-column grid for all positions |
| Modal | `.modal-backdrop`, `.modal`, `.modal-header` | iOS-style bottom sheet |
| Team Sheet | `.lineup-card`, `.lineup-card-header`, `.lineup-card-table` | Shareable image with player positions per quarter |
| Score validation | `.score-validated`, `.score-mismatch`, `.fixture-score-note` | Green check or warning when fixture score differs from manual |

### Team Access Control (PIN System)

- **Per-team PINs:** Each team can optionally have a 4-digit PIN set in Team Settings
- **Device handshake:** When a device enters the correct PIN, the backend returns a `pinToken` (16-char hex). The device stores this in `state.teamPinTokens` (persisted to localStorage) and includes it in subsequent write requests
- **Auth gates writes only:** `saveTeamData` and `updateTeam` check pinToken. Reads (`getTeams`, `getTeamData`) are open so the Parent Portal works without auth
- **Master PIN:** Stored in Apps Script Properties (`MASTER_PIN`). Accepts any team's PIN prompt, useful for admin access
- **Log Out All Devices:** Regenerates the pinToken on the server, invalidating all stored tokens except the caller's
- **PIN storage:** Teams sheet columns L (PIN) and M (PinToken) — not in team data JSON
- **Team list:** Shows lock icon on PIN-protected teams; unlocked icon if device has a valid token

### Coach Grouping

- **Coach field:** Each team has an optional `coach` text field (Teams sheet column N)
- **Coach dropdown:** In Team Settings and Create Team, populated from existing coach names across all teams plus an "Other..." free-text option
- **Grouped team list:** Teams are grouped into sections:
  1. **My Teams** (always expanded) — teams the device has a pinToken for
  2. **Per-coach sections** (collapsed by default) — remaining teams grouped by coach name
  3. **Other Teams** (collapsed) — teams with no coach assigned
- **Collapse state:** Tracked in `state.collapsedCoachSections`, resets each session (not persisted)

### Coach's App Specifics

- **Service worker:** Auto-updates with build timestamp version. Users see "Update now" banner.
- **Notes quick-insert:** Each quarter's notes section has quick-insert buttons:
  - Player first names (from quarter lineup, or all team players if no lineup set)
  - Group buttons: Team, Opp, Goalers, Midcourt, Defence
  - Timestamp button inserts `[h:mmam/pm]` format
- **Scoring panel:** Accordion-style quarters with score steppers and notes
- **Offline support:** Data saved to localStorage first, synced when online
- **Caching:** Teams list and team data cached with 5-minute TTL (`TEAM_CACHE_TTL_MS`). Teams list uses stale-while-revalidate (serve cache, refresh in background). Team data uses `lastModified` version check with TTL fallback. Player library loads in background (non-blocking).
- **Squadi Auto-Discovery:** Team Settings includes "Auto-Detect from Squadi" button that scans Squadi API for HG teams and auto-fills competition/division/team configuration. Results cached in `Squadi_Lookup` sheet tab with 6-month TTL. Force rescan available for updated competitions.
- **Main tabs:** Schedule, Roster, Stats, Training (4 bottom nav tabs)
- **Lineup Planner:** Desktop-optimized full-screen 4-quarter view (opens from game detail). Features:
  - **Layout:** Fixed-position overlay breaking out of #app's 430px max-width. 440px sidebar (bench + position history) + 2×2 quarter grid
  - **Position color coding:** Shooters (GS/GA) = pink, Midcourt (WA/C/WD) = blue, Defence (GD/GK) = green
  - **Fav position tags:** Small colored tags next to bench player names showing their preferred positions
  - **Off indicator:** Each quarter card footer shows which players are sitting out
  - **Player load summary:** Grid below quarters showing Q1-Q4 on/off dots per player with imbalance highlighting
  - **Copy quarter:** Copy/Paste buttons in quarter headers to duplicate lineups between quarters
  - **Undo:** Up to 20-deep undo stack covering all mutations (assign, copy, auto-fill, drag)
  - **Hover highlights:** Hovering a bench player highlights their fav/historical positions across all quarter slots
  - **Drag and drop:** HTML5 DnD for bench-to-slot, slot-to-slot (swap), and slot-to-bench (unassign)
  - **Auto-fill:** Fills active quarter using scoring algorithm (+10 fav position, +N history count, -5 per existing quarter for load balance)
  - **State:** `_plannerActiveQuarter`, `_plannerUndoStack`, `_plannerCopySource`, `_plannerDragPlayer`, `_plannerDragSource`
  - **Helper functions:** `getPosGroup()`, `getPlannerAvailablePlayers()`, `getPlannerPositionStats()` (cached per render cycle)

### AI Features (Gemini-powered)

The app uses Google's Gemini API for AI-generated insights. API key stored in Apps Script properties.

**AI Insights (Stats → Overview tab):**
- Analyzes team performance, leaderboards, combinations
- Includes opponent difficulty context: per-game opponent ladder rank, strength of schedule rating, and full division W-L-D standings
- Generates season summary, strengths, areas to improve, lineup recommendations
- Cached in `state.currentTeamData.aiInsights`

**Training Sessions (Training tab → Training Sessions section):**
- Record training sessions with date, focus area, notes, and player attendance
- Track who attended each session via attendance checklist
- View session history sorted by date (most recent first)
- Edit or delete existing sessions
- Stored in `state.currentTeamData.trainingSessions[]`

**AI Training Focus (Training tab → AI Training Focus section):**
- Aggregates coach notes from all games to suggest training priorities
- **Rolling window:** Recent games (last 3 with notes) are primary focus; earlier notes provide context for persistent issues
- **Training session correlation:** When sessions are recorded, AI analyzes:
  - Training effectiveness (what's working, what needs reinforcement)
  - Player attendance rates and patterns
  - Issue timeline (correlates game note issues with training attendance)
  - Catch-up recommendations for players who missed relevant sessions
- **History archive:** Keeps last 5 generated suggestions for comparison over time
- Stored in `state.currentTeamData.trainingFocusHistory[]` (array, newest first)
- Each entry: `{ text, generatedAt, gameCount, noteCount, recentGames }`

**Example AI Correlation:**
> Lily and Chloe were stepping in Round 1. Training on Feb 5 covered footwork drills but Chloe missed it. Round 2: Lily improved, Chloe still stepping.
> AI output: "Chloe missed the footwork training session and the stepping issue persists. Recommend 1:1 catch-up on landing technique."

**Game AI Summary (Game detail → AI Summary button):**
- Per-game analysis with player contributions and quarter breakdown

**Player AI Insights (Player stats modal):**
- Individual player analysis with position versatility and development suggestions

### Opponent Difficulty Ratings

Coach-app only (parent portal has no ladder data). Uses cached ladder data from localStorage — no additional API calls.

- **`getOpponentDifficulty(opponentName)`** — Reads `ladder.cache.{teamID}` from localStorage, fuzzy-matches opponent to ladder row via `fuzzyOpponentMatch()`. Returns `{ position, totalTeams, tier, label }` or `null`
- **Tiers:** `top` (top 25% of ladder), `mid` (middle 50%), `bottom` (bottom 25%). Color-coded: red/amber/green
- **Game list badges:** Colored pill badge (e.g. "1st", "5th") next to opponent name in `renderSchedule()`. Skipped for bye games
- **Strength of Schedule:** Metric card in stats overview showing 1-100 rating (higher = harder schedule). Clickable modal shows per-opponent breakdown with W/L badges and ladder positions
- **SoS formula:** `(totalTeams - avgOpponentPosition) / (totalTeams - 1) * 100`. Labels: >= 70 "Tough", >= 40 "Average", < 40 "Easy"
- **AI context:** `fetchAIInsights()` includes `opponentRank` per game, `strengthOfSchedule` summary, and `divisionContext` (all division team W-L-D records from `state.divisionResults`)
- **Graceful degradation:** All features return `null`/hidden when no ladder data available

### Parent Portal Specifics

- **No service worker:** Parent portal has no SW - always fetches fresh data from API
- **Read-only:** No edit functionality, but can view all stats and lineups
- **Team URLs:** `/teams/{slug}` format, e.g., `/teams/hazel-glen-6`
- **Player stats modal:** Shows games, quarters, goals, positions played, and all season games
- **Dark/light theme:** Toggle in header, persisted to localStorage

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

// Training Session (stored in teamData.trainingSessions)
{
  sessionID: "ts-1706900000000",  // Timestamp-based ID
  date: "2026-02-05",
  attendedPlayerIDs: ["p1", "p2", "p3"],  // Who came to training
  focus: "Footwork and landing technique",  // Brief summary
  notes: "Worked on 3-step landing drill. Most players improving."
}

// Fixture fields (optional, per game — set by fixture sync)
{
  fixtureMatchId: 12345,              // Links game to external fixture entry (Squadi match ID or GameDay match ID)
  fixtureScore: { us: 25, opponent: 18 }  // Official total from API (null if match not ended)
}

// ResultsApi config (Teams sheet column H — JSON string, per-team)
// Squadi:
{ "source": "squadi", "competitionId": 4650, "divisionId": 29570, "squadiTeamName": "HG 11 Flames", "competitionKey": "75e568d0-..." }
// GameDay:
{ "source": "gameday", "compID": "655969", "client": "0-9074-0-655969-0", "teamName": "Hazel Glen 6", "roundOffset": 3 }
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
| `createTeam` | Create new team | `year`, `season`, `name`, `coach`, `ladderUrl`, `resultsApi` (all optional except year/season/name) |
| `updateTeam` | Update team settings | `teamID`, `settings` (JSON) |
| `validateTeamPIN` | Check team PIN | `teamID`, `pin` |
| `setTeamPIN` | Set/change/remove PIN | `teamID`, `pin`, `pinToken` |
| `revokeTeamAccess` | Invalidate all device tokens | `teamID`, `pinToken` |
| `getPlayerLibrary` | Get career tracking data | - |
| `savePlayerLibrary` | Save career tracking data | `playerLibrary` (JSON) |
| `getAIInsights` | AI season analysis (POST) | `analytics` (JSON with team stats) |
| `getGameAIInsights` | AI game summary (POST) | `gameData` (JSON with game details) |
| `getPlayerAIInsights` | AI player analysis (POST) | `playerData` (JSON with player stats) |
| `getTrainingFocus` | AI training suggestions (POST) | `trainingData` (JSON with notes, rolling window) |
| `getTeamRow` | Get raw team row (admin) | `teamID` |
| `logClientMetric` | Log diagnostic metric | `name`, `value`, `teams`, `extra` |
| `getDiagnostics` | Retrieve diagnostic logs | `limit` (optional, default 50) |
| `getFixtureData` | Fetch fixture data for team | `teamID`, `forceRefresh` (optional) |
| `getSquadiLadder` | Fetch ladder/standings for team | `teamID` |
| `autoDetectSquadi` | Auto-discover Squadi team config | `forceRescan` (optional) |
| `rebuildPlayerCounts` | Rebuild player count cache | - |

**Local dev:** Vite proxy at `/gas-proxy` bypasses CORS (configured in `vite.config.js`)

---

## Data Sync

Data syncs to Google Sheets at these points:
- **Player/game operations** - Adding, editing, or deleting syncs immediately
- **Lineup changes** - Saved to localStorage immediately, synced when closing game detail view (batch sync)
- **Team settings** - Immediately via `updateTeam` API

Data is always saved to localStorage first for offline support, then synced to the backend when online. The `closeGameDetail` function guards against parallel syncs via `syncInProgress` flag.

**Stale Data Protection:** The app tracks a `_lastModified` timestamp in the data. Before saving, the server checks if its data is newer than what the client saw. If another device/tab has updated the data, the save is rejected and the user's view is refreshed with the latest data. This prevents old browser tabs from overwriting newer changes.

**PIN Auth on Writes:** `saveTeamData` (POST-only, no GET handler) and `updateTeam` (GET) check the `pinToken` parameter against the Teams sheet. If the team has a PIN and the token doesn't match, the request returns `AUTH_REQUIRED`. The frontend handles this by clearing the stored token and prompting for re-authentication.

**Google Sheet tabs:** Teams, Fixture_Results, Ladder_Archive, Settings, Diagnostics, PlayerLibrary, Squadi_Lookup

**Teams sheet columns:** A=TeamID, B=Year, C=Season, D=TeamName, E=SheetName, F=LadderName, G=LadderApi, H=ResultsApi, I=Archived, J=PlayerCount, K=LastModified, L=PIN, M=PinToken, N=Coach

**Squadi_Lookup sheet columns:** A=CompetitionId, B=CompetitionName, C=OrgKey, D=DivisionId, E=DivisionName, F=TeamName, G=DiscoveredAt

---

## Ladder & Fixture Integration

### Ladder Sources

Teams can get ladder/standings data from three sources, configured in Team Settings:

| Source | Config | How It Works |
|--------|--------|--------------|
| **NFNL** (static) | `ladderUrl` field | GitHub Action scrapes HTML daily → `public/ladder-<teamID>.json` |
| **Squadi** (live) | `resultsApi` with `source: "squadi"` | Backend fetches from Squadi API → `getSquadiLadder` action |
| **GameDay** (computed) | `resultsApi` with `source: "gameday"` | Backend computes standings from fixture match results (W×4 + D×2 points) |

- **NFNL scraper:** `scripts/fetch-ladder.js` fetches team list, scrapes ladder HTML, writes JSON. Supports `--api` and `--out` CLI args. Has 15s fetch timeout.
- **Automation:** `.github/workflows/daily-ladder.yml` runs scraper daily, commits to main
- **GameDay ladder:** GameDay renders tables via client-side JS (can't scrape server-side), so `computeGameDayLadder()` in Code.js calculates standings from fixture match results

```bash
# NFNL local run
node scripts/fetch-ladder.js --teams ./public/teams.json --out public/

# NFNL production (using Apps Script API)
GS_API_URL="https://script.google.com/macros/s/<DEPLOY_ID>/exec" \
  node scripts/fetch-ladder.js --api "$GS_API_URL" --out public/
```

### Fixture Sync (Auto-Populate Games)

Teams with `resultsApi` configured get automatic game population from external fixture data:

- **Trigger:** Runs after team data loads, if team has fixture config and device is online (non-blocking)
- **Sources:** Squadi API (`fetchSquadiFixtureData`) or GameDay HTML scraping (`fetchGameDayFixtureData`)
- **Merge algorithm:**
  1. Match fixture to existing game by `fixtureMatchId` first
  2. Fall back to fuzzy match: same round + similar opponent name (via `fuzzyOpponentMatch()`)
  3. Existing game: fill empty fields only (date, time, location, opponent) — **never overwrite** manual data (scores, lineup, notes, captain)
  4. New game: create with fixture data, status from fixture, scores = null (user enters manually)
  5. Status only upgrades from `upcoming` → fixture status (never downgrades manual status)
  6. `fixtureScore` always updated when match has ended (for score validation display)
- **Score validation:** When a game has both `fixtureScore` and manual scores, shows match/mismatch badge
- **Caching:** Backend caches fixture data in CacheService (6-hour TTL), key includes config hash for cache invalidation on config changes

### GameDay-Specific Config

- **`roundOffset`:** Offsets round numbers for teams with pre-season grading games. E.g., if a team played 3 grading rounds before the main competition, set `roundOffset: 3` so GameDay Round 1 becomes app Round 4.
- **`compID`** and **`client`:** Found in GameDay fixture page URLs (e.g., `mygameday.app/comp/655969/...`)
- **`teamName`:** Must match exactly how the team appears on GameDay (case-insensitive matching used internally)

### Squadi Auto-Discovery

The "Auto-Detect from Squadi" feature eliminates manual configuration for new teams:

- **Trigger:** "Auto-Detect from Squadi" button in Team Settings → Squadi section
- **API Access:** Uses public Squadi fixture API (no authentication required)
- **Scanning:** Probes competition IDs sequentially, looking for divisions containing "HG" teams
- **Caching:** Results stored in `Squadi_Lookup` sheet with 6-month TTL
- **UI Flow:** Shows picker modal with discovered teams, auto-fills config fields on selection, and automatically saves the configuration
- **Force Rescan:** Available to refresh cached data for new seasons/competitions

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

---

## Using Gemini CLI for Codebase Analysis

Use `gemini -p` with the `@` syntax to analyze multiple files or directories when you need broad codebase understanding. Gemini's large context window can handle the entire codebase at once.

### Project-Specific Examples

```bash
# Understand how both apps share code
gemini -p "@apps/coach-app/src/js/ @apps/parent-portal/src/js/ @common/ How do the two apps share common modules? What's duplicated vs shared?"

# Analyze the data flow from API to UI
gemini -p "@apps/coach-app/src/js/api.js @apps/coach-app/src/js/app.js @apps-script/Code.js Trace how team data flows from Google Sheets through the API to the UI"

# Check stats calculation consistency
gemini -p "@common/stats-calculations.js @common/mock-data.js @apps/coach-app/src/js/app.js Are stats calculated consistently between mock data and live data?"

# Review all test coverage
gemini -p "@apps/coach-app/src/js/*.test.js @apps/parent-portal/src/js/*.test.js @common/ What functionality is tested vs untested?"

# Understand lineup data structure usage
gemini -p "@apps/ @common/ How is the lineup data structure (Q1-Q4 with positions) used throughout the codebase?"

# Check for XSS protection
gemini -p "@apps/ @common/utils.js Where is escapeHtml() used? Are there any places rendering user input without escaping?"

# Analyze offline/sync behavior
gemini -p "@apps/coach-app/src/js/app.js @apps/coach-app/src/js/api.js How does localStorage caching work with the API sync?"
```

### When to Use Gemini

Use `gemini -p` when:
- Analyzing patterns across both apps and common modules
- Tracing data flow from Apps Script backend through to UI
- Checking consistency between coach-app and parent-portal implementations
- Reviewing test coverage across the monorepo
- Understanding how shared modules are used differently by each app

### Syntax Notes

- `@path/` includes a directory recursively
- `@file.js` includes a single file
- Paths are relative to current working directory
- Run from project root for the examples above
