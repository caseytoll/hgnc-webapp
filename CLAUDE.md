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
npm run build && wrangler pages deploy dist --project-name=hgnc-team-manager --branch=main --commit-dirty=true
```

**Parent Portal:**
```bash
cd apps/parent-portal
npm run build && wrangler pages deploy dist --project-name=hgnc-gameday --branch=main --commit-dirty=true
```

**Backend (Apps Script):**
```bash
cd apps-script && clasp push && clasp deploy -i AKfycbyBxhOJDfNBZuZ65St-Qt3UmmeAD57M0Jr1Q0MsoKGbHFxzu8rIvarJOOnB4sLeJZ-V -d "Description"
```

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
│   ├── utils.js             # escapeHtml, formatters, isGameInPast, localStorage wrappers
│   ├── mock-data.js         # Mock data AND calculateTeamStats()
│   ├── stats-calculations.js # Leaderboards, combos, analytics (uses isGameInPast)
│   └── share-utils.js       # Team Sheet generation, lineup sharing
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
- CSS imported via JS (`import '../css/styles.css'`) for Vite 7.x compatibility
- Shared modules imported from `../../common/` in both apps
- No linter configured; code style is vanilla JS with ES modules

### Keeping Apps Consistent

**IMPORTANT:** When making style or layout changes, apply them to BOTH apps to maintain visual consistency. The Parent Portal should mirror the Coach's App styling for all shared UI components.

When modifying UI in one app, check if the other needs the same change:

- **CSS classes must match:** Use `.game-item` for game lists (not `.game-card`), `.player-card` for roster, etc.
- **HTML structure:** Game list items use `game-round`, `game-info`, `game-opponent`, `game-meta`, `game-score` classes
- **Stats field names:** Use `avgFor`/`avgAgainst` (not `avgGoalsFor`/`avgGoalsAgainst`) from stats-calculations.js
- **Team name source:** `getTeamData` API doesn't return teamName - use `getTeams` data for team info display
- **Theme toggle:** Uses `data-theme` attribute on `<html>`, not body class. Values: `light` or `dark`
- **Game status handling:** Check for `game.status === 'abandoned'` before displaying scores
- **Upcoming games:** Use `isGameInPast()` from utils.js to exclude future games from stats calculations
- **Team Sheet sharing:** Format is "Round X - TeamName vs Opponent" with full first names (no truncation)

**Shared UI Components (must match between apps):**

| Component | CSS Classes | Notes |
|-----------|-------------|-------|
| Game list | `.game-item`, `.game-round`, `.game-info`, `.game-opponent`, `.game-meta`, `.game-score` | Sort by date descending |
| Player cards | `.player-card`, `.player-avatar`, `.player-info` | Clickable to show stats modal |
| Stats hero | `.stats-hero`, `.stats-record`, `.stats-metrics` | Purple banner with W-L-D |
| Stats tabs | Overview, Leaders, Positions, Combos | Same tab structure |
| Scoring display | `.scoring-accordion`, `.scoring-quarter`, `.position-badge` | Accordion with GS/GA badges |
| Position tracker | `.position-grid`, `.pos-grid-cell` | 7-column grid for all positions |
| Modal | `.modal-backdrop`, `.modal`, `.modal-header` | iOS-style bottom sheet |
| Team Sheet | `.lineup-card`, `.lineup-card-header`, `.lineup-card-table` | Shareable image with player positions per quarter |

### Parent Portal Specifics

- **No service worker:** Parent portal has no SW - always fetches fresh data from API
- **Read-only:** No edit functionality, but can view all stats and lineups
- **Team URLs:** `/teams/{slug}` format, e.g., `/teams/hazel-glen-6`
- **Player stats modal:** Shows games, quarters, goals, positions played, and all season games
- **Dark/light theme:** Toggle in header, persisted to localStorage

---

## Data Structures

```javascript
// Team (from getTeams API)
{ teamID, teamName, year, season, sheetName, archived, ladderUrl }

// Team Data (from getTeamData API) - NOTE: does NOT include teamName, year, or season
{
  teamID, sheetName,
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
| `updateTeam` | Update team settings | `teamID`, `settings` (JSON) |
| `getPlayerLibrary` | Get career tracking data | - |
| `savePlayerLibrary` | Save career tracking data | `playerLibrary` (JSON) |

**Local dev:** Vite proxy at `/gas-proxy` bypasses CORS (configured in `vite.config.js`)

---

## Data Sync

Data syncs to Google Sheets at these points:
- **Player/game operations** - Adding, editing, or deleting syncs immediately
- **Lineup changes** - Saved to localStorage immediately, synced when closing game detail view (batch sync)
- **Team settings** - Immediately via `updateTeam` API

Data is always saved to localStorage first for offline support, then synced to the backend when online.

**Stale Data Protection:** The app tracks a `_lastModified` timestamp in the data. Before saving, the server checks if its data is newer than what the client saw. If another device/tab has updated the data, the save is rejected and the user's view is refreshed with the latest data. This prevents old browser tabs from overwriting newer changes.

**Google Sheet tabs:** Teams, Fixture_Results, Ladder_Archive, Settings, LadderData, PlayerLibrary

---

## Ladder Integration

- **Purpose:** Fetch NFNL ladder data when `ladderUrl` is set in Team Settings
- **Scraper:** `scripts/fetch-ladder.js` fetches team list, scrapes ladder HTML, writes `public/ladder-<teamID>.json`
- **Automation:** `.github/workflows/daily-ladder.yml` runs scraper daily, commits to master

```bash
# Local run
node scripts/fetch-ladder.js --teams ./public/teams.json --out public/

# Production (using Apps Script API)
GS_API_URL="https://script.google.com/macros/s/<DEPLOY_ID>/exec" \
  node scripts/fetch-ladder.js --api "$GS_API_URL" --out public/
```

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
