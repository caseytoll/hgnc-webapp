# CLAUDE.md — HGNC Team Manager

Two PWAs for managing Hazel Glen Netball Club teams:
- **Coach's App** (`apps/coach-app/`): Full editing, PWA with offline support, service worker auto-updates
- **Parent Portal** (`apps/parent-portal/`): Read-only SPA, no service worker, always fresh data

| App | URL | Deploy |
|-----|-----|--------|
| Coach's App | https://hgnc-team-manager.pages.dev | `npm run build && wrangler pages deploy dist --project-name=hgnc-team-manager --branch=master` |
| Parent Portal | https://hgnc-gameday.pages.dev | `cd apps/parent-portal && npm run build && wrangler pages deploy dist --project-name=hgnc-gameday --branch=main` |
| Backend | (Apps Script) | `cd apps-script && clasp push && clasp deploy -i <DEPLOYMENT_ID>` |

**Tech Stack:** Vanilla JS (ES modules), Vite 7.x, Vitest, Google Apps Script backend, Google Sheets data store

---

## Essential Reference

### Project Structure
```
apps/coach-app/          → 18 ES modules, global state object, module exports via window.*
apps/parent-portal/      → router.js, read-only UI
common/                  → shared CSS, utils, stats, mock-data, share-utils
apps-script/Code.js      → API handlers + business logic
scripts/fetch-ladder.js  → NFNL ladder scraper (daily via GitHub Action)
```

### Data Model

**Team (from getTeams):** `{ teamID, teamName, year, season, sheetName, archived, ladderUrl, resultsApi, hasPin, coach, competitionType }`

**Team Data (from getTeamData):** `{ teamID, sheetName, players: [{id, name, playerCode, fillIn, favPosition}], games: [{gameID, round, opponent, date, location, status, captain, scores, lineup, fixtureMatchId, fixtureScore}], trainingSessions[], trainingFocusHistory[] }`

**Game Lineup (per quarter):** `{ Q1-Q4: {GS, GA, WA, C, WD, GD, GK, ourGsGoals, ourGaGoals, oppGsGoals, oppGaGoals, notes} }`

**Positions:** GS, GA (shooters), WA, C, WD (midcourt), GD, GK (defence)

### API Endpoints

Core actions: `ping`, `getTeams`, `getTeamData`, `saveTeamData` (POST-only), `createTeam`, `updateTeam`, `getPlayerLibrary`, `savePlayerLibrary` (POST-only)

PIN auth: `validateTeamPIN`, `setTeamPIN`, `revokeTeamAccess`

Fixture sync: `getFixtureData`, `getSquadiLadder`, `autoDetectSquadi` (disabled UI)

AI features: `getAIInsights` (POST), `getGameAIInsights` (POST), `getPlayerAIInsights` (POST), `generateTrainingCorrelation` (POST), `generatePatternDetector` (GET), `generateOppositionInsightsImmediate` (GET), `refreshOppositionMatches` (GET)

Background queue: `queueGameAI`, `queueAllGames`, `processAIQueueManual` (GET), `setupAIQueueTrigger` (GET)

Opposition scouting: `getOppositionScouting`, `setupOppositionTriggers`

Other: `logClientMetric`, `getDiagnostics`, `getTeamRow` (admin)

---

## Critical Rules & Gotchas

### Security & Data Integrity
- **PIN auth:** Protects `saveTeamData` (POST-only) and `updateTeam` (GET). Reads open (Parent Portal needs access).
- **POST-only handlers:** `saveTeamData`, `savePlayerLibrary` have no GET handlers (prevents PIN bypass).
- **GET-only analytics:** `generatePatternDetector`, `generateOppositionInsightsImmediate`, `getSquadiLadder` must use GET + URL params (not POST). POST handler lowercases action names → silent failure.
- **Stale data protection:** Tracks `_lastModified` timestamp. Server rejects saves if client's version is outdated. Frontend refreshes with latest data on rejection.
- **escapeHtml()** always for user input; **formatAIContent()** for AI text (escapes then markdown).

### App Consistency
When modifying one app, apply changes to both. Shared UI classes: `.game-item`, `.player-card`, `.stats-hero`, `.modal`, etc. Stats filter: `g.status === 'normal' && g.scores && isGameInPast(g)` (both apps). Theme: `data-theme` attribute on `<html>` (not body class).

### Coach App Architecture
- **Module pattern:** 18 ES modules, no cross-module imports. Functions called from other modules MUST export to `window.*`
- **Missing `window.*` → mock data fallback:** If onclick handler throws ReferenceError, app falls back to mock data (looks like API is down)
- **ES module `let` is read-only:** Can't write to imported `let` from another module. Use module's setter function instead.
- **CSS:** Each app's `styles.css` imports `common/styles/shared.css`, then adds overrides. Shared changes → `shared.css`. Coach-only (planner, PIN, AI, training) → coach's `styles.css`. Portal-only → portal's `styles.css`.

### Fixture Sync & Ladder
- **Ladder sources:** NFNL (static JSON via GitHub Action), GameDay (computed from fixture scores), Squadi (disabled).
- **Fixture merge:** Match by `fixtureMatchId` first, then fuzzy opponent + round. Never overwrites manual scores, lineups, notes.
- **Opponent difficulty:** `getOpponentDifficulty(opponentName)` reads cached ladder from localStorage, fuzzy-matches via `fuzzyOpponentMatch()`. Returns `{ position, totalTeams, tier, label }` or `null`.
- **GameDay roundOffset:** Adjusts round numbers for teams with pre-season grading games.

### Versioning & Caching
- **Bump REVISION** before each deploy (format `YYYY-MM-DD{letter}`, `apps/coach-app/vite.config.js` line 8). Reset to `'a'` daily, increment (a→b→c) on same day.
- **Service worker version:** Auto-generated from build timestamp `YYYYMMDDHHMM`.
- **Teams list cache:** 5-minute TTL, stale-while-revalidate (serve cache, refresh in background).
- **Team data cache:** `lastModified` version check with 5-minute TTL fallback.

### AI Pipeline Architecture (as of 2026-03-27)
- **Event Analyzer:** Queued via `queueGameAI()`; runs every 10 min. Stores `aiSummary.eventAnalyzer` JSON per game.
- **Pattern Detector:** GET action, needs ≥2 games with eventAnalyzer data. Returns `{ success, data: { patterns, playerTrajectories, ... } }`. Frontend reads `data.data.*`.
- **Training Correlator:** POST action. Returns structured `{ correlation: { teamFocus, individualFocus, ... } }`. Cached in `trainingFocusHistory[]`.
- **Opposition Scouting:** 26 analytics (Groups A-G). Saturday 6 PM collect fixtures, Sunday 10 AM generate AI. Manual refresh: fast (fixtures only) or complete (all 26 analytics).

### Apps Script Rules
- **No IIFEs in control flow:** Use named helper functions in conditional expressions (IIFEs fail silently).
- **Column indexing:** `getDataRange().getValues()` is 0-indexed; `getRange(row, col)` is 1-indexed.
- **appsscript.json:** MUST include `"webapp": {"access": "ANYONE_ANONYMOUS", "executeAs": "USER_DEPLOYING"}` or all URLs return 404.
- **Deployment ID:** Same ID in all config files (config.js, vite.config.js, env, deploy scripts).

---

## Key Patterns

- Single HTML file per app, `<div class="view">` sections toggled via `display`
- Global `state` object holds current team, game, players
- All onclick handlers assigned to `window` (e.g., `window.selectGame = ...`)
- Name validation: 2-100 chars, at least one letter (`validatePlayerName`, `validateTeamName`, `validateOpponentName`)
- Lineup stored as JSON, transformed to/from Google Sheets via `transformTeamDataFromSheet` / `transformTeamDataToSheet`
- Fixture data: `fixtureMatchId` and `fixtureScore` must round-trip both apps
- Player Library: matches by `playerCode` (3-char auto-generated) for cross-season linking
- Offline-first: save to localStorage, sync when online. Guard with `syncInProgress` flag to prevent parallel syncs.

---

## Google Sheets Schema

**Teams sheet:** A=TeamID, B=Year, C=Season, D=TeamName, E=SheetName, F=LadderName, G=LadderApi, H=ResultsApi, I=Archived, J=PlayerCount, K=LastModified, L=PIN, M=PinToken, N=Coach, O=CompetitionType

**Team data (JSON):** Stored in Team's custom sheet, column C1 (merged large cell). Contains players, games, trainingSessions, trainingFocusHistory, aiInsights, etc.

**Other sheets:** Fixture_Results, Ladder_Archive, Settings, Diagnostics, PlayerLibrary, OppositionScouting, AI_Knowledge_Base

---

## Running Locally

**Coach's App (from root):**
```bash
npm run dev                    # Port 3000
npm run dev -- --host         # Network access for phone testing
npm test                       # Watch mode
npm run test:run              # Run once
npm run test:coverage         # With coverage
npx vitest src/js/utils.test.js  # Single file
```

**Parent Portal:**
```bash
cd apps/parent-portal
npm run dev / build / test:run
```

---

## Path-Specific Rules

See `.claude/rules/` for:
- `apps-script.md` — POST vs GET, column indexing, action names
- `coach-modules.md` — Module architecture, window.* exports
- `common-modules.md` — Shared CSS & stats filter consistency
- `parent-portal.md` — Read-only, no service worker, URL routing

---

## Further Reading

- **AI features & training:** Documented in code comments (`apps/coach-app/src/js/training.js`, `apps/coach-app/src/js/stats.js`)
- **Opposition Scouting:** See `OPPOSITION_SCOUTING_SYSTEM.md` in planning docs
- **Fixture JSON import:** Feature in Schedule tab, accepts `[{round, date, opponent, ...}]`
- **Lineup Planner:** Desktop view (440px sidebar + 2×2 quarter grid), undo stack, drag-drop, position color coding
- **Public repo style:** Write feature-focused, no apologies. Describe what things do. See MEMORY.md for details.

**API key & deployment IDs:** See MEMORY.md

