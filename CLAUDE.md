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
│   │   ├── src/js/app.js    # Entry point: theme, init, module imports (~250 lines)
│   │   ├── src/js/state.js  # Shared state object, cache, localStorage
│   │   ├── src/js/data-loader.js  # Team/data loading, fixture sync, metrics
│   │   ├── src/js/rendering.js    # Main app, ladder, schedule, roster rendering
│   │   ├── src/js/scoring.js      # Score inputs, quarter notes, availability
│   │   ├── src/js/stats.js        # Stats rendering (all tabs)
│   │   ├── src/js/training.js     # Training session CRUD, AI focus
│   │   ├── src/js/game-detail.js  # Game detail, share/export, lineup builder
│   │   ├── src/js/lineup-planner.js # Desktop 4-quarter planner
│   │   ├── src/js/player.js       # Player + game management
│   │   ├── src/js/player-library.js # Career stats tracking
│   │   ├── src/js/team-settings.js  # Team/game settings
│   │   ├── src/js/team-selector.js  # Team list rendering, PIN entry
│   │   ├── src/js/wizard.js       # Create team wizard (6-step)
│   │   ├── src/js/system-settings.js # System settings, cache mgmt
│   │   ├── src/js/sync.js         # Google Sheets sync, debounce
│   │   ├── src/js/ui.js           # View/tab/modal/toast, loading states
│   │   ├── src/js/helpers.js      # Shared helper functions
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
- Shared `state` object exported from `state.js`, imported by all feature modules
- Coach app is split into ~18 ES modules (see directory structure above); `app.js` is just the entry point (~250 lines)
- All onclick handlers attached to `window` (e.g., `window.selectGame = ...`)
- Always use `escapeHtml()` for user input to prevent XSS
- Always use `formatAIContent()` for rendering AI-generated text (escapes HTML first, then applies markdown formatting)
- CSS imported via JS (`import '../css/styles.css'`) for Vite 7.x compatibility. Each app's `styles.css` uses `@import` to pull in `common/styles/shared.css`, then adds app-specific overrides. Shared CSS changes go in `common/styles/shared.css`; coach-only styles stay in coach's `styles.css`; portal-only styles stay in portal's `styles.css`
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
| Score card | `.game-score-card`, `.game-score-display`, `.score-team`, `.score-value`, `.score-label`, `.team-logo-game` | Column layout: logo, score (2.25rem), team name. Uses `state.currentTeam.teamName` (not "Us"). Coach app has logos, portal text-only |
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
- **Notes quick-insert:** Each quarter's notes section has quick-insert buttons (player names, groups, timestamp)
- **Scoring panel:** Accordion-style quarters with score steppers and notes
- **Offline support:** Data saved to localStorage first, synced when online
- **Caching:** Teams list and team data cached with 5-minute TTL (`TEAM_CACHE_TTL_MS`). Teams list uses stale-while-revalidate. Team data uses `lastModified` version check with TTL fallback.
- **Main tabs:** Schedule, Roster, Stats, Training (4 bottom nav tabs)
- **Lineup Planner:** Desktop-optimized full-screen 4-quarter view (opens from game detail). 440px sidebar + 2×2 quarter grid. Features drag-and-drop, auto-fill, copy/paste, undo stack, position color coding, player load summary.

### Parent Portal Specifics

- **No service worker:** Always fetches fresh data from API
- **Read-only:** No edit functionality, but can view all stats and lineups
- **Team URLs:** `/teams/{slug}` format, e.g., `/teams/hazel-glen-6`
- **Dark/light theme:** Toggle in header, persisted to localStorage

---

## Change Checklists

### General

- When copying a pattern from elsewhere in the codebase, verify it's correct — don't propagate existing gaps
- Always use `escapeHtml()` / `escapeAttr()` for user data in HTML templates
- Use constants for sentinel values (e.g., `COACH_OTHER_SENTINEL`) — never embed magic strings in templates
- Rollback logic must cover ALL state mutations (currentTeam, currentTeamData, teams list entry)

---

## Troubleshooting

**Safari + localhost:** Use network IP (`http://192.168.x.x:3000/`) instead of localhost.

**Vite parse errors:** Check brace balance (run from `apps/coach-app/`):
```bash
node --check src/js/app.js
node --check src/js/data-loader.js  # or whichever module has the error
```

**Toggle data source:** Dev panel (bottom-right, localhost only) or set `useMockData: true` in config.js.

**Google Sheet returns strings:** Always use `parseInt()` when doing arithmetic with goal values.

**Service worker updates:** Auto-generated version from build timestamp. Users see "Update now" banner when available.

**Monitor workflow issues:** If `Resource not accessible by integration`, add `permissions: issues: write` to workflow YAML.

---

## Skills Reference (lazy-loaded — invoke with /command-name)

- `/data-ref` — Data structures, API endpoints, sheet schema, sync behavior
- `/fixture-ladder` — Ladder sources, fixture sync algorithm, GameDay/Squadi config
- `/ai-features` — Gemini AI insights, training focus, opponent difficulty ratings
- `/add-field` — Checklist for adding a new Team object field
- `/security-check` — Checklist for adding security checks
- `/gemini-tips` — Using Gemini CLI for codebase analysis
- `/review` — Project code review checklist
- `/deploy-coach`, `/deploy-parent`, `/deploy-backend`, `/deploy-all` — Deployment
