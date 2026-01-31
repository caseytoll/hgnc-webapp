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
npm run build:readonly && npm run deploy:readonly-viewer
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
│   ├── utils.js             # escapeHtml, formatters, localStorage wrappers
│   ├── mock-data.js         # Mock data AND calculateMockStats()
│   ├── stats-calculations.js # Leaderboards, combos, analytics
│   └── share-utils.js       # Lineup card generation, sharing
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

---

## Data Structures

```javascript
// Team (from getTeams API)
{ teamID, teamName, year, season, sheetName, archived, ladderUrl }

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

## Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

### File and Directory Inclusion Syntax

Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the gemini command:

**Single file analysis:**
```bash
gemini -p "@src/main.py Explain this file's purpose and structure"
```

**Multiple files:**
```bash
gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"
```

**Entire directory:**
```bash
gemini -p "@src/ Summarize the architecture of this codebase"
```

**Multiple directories:**
```bash
gemini -p "@src/ @tests/ Analyze test coverage for the source code"
```

**Current directory and subdirectories:**
```bash
gemini -p "@./ Give me an overview of this entire project"
# Or use --all_files flag:
gemini --all_files -p "Analyze the project structure and dependencies"
```

### Implementation Verification Examples

```bash
# Check if a feature is implemented
gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"

# Verify authentication implementation
gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"

# Check for specific patterns
gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"

# Verify error handling
gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"

# Check for rate limiting
gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"

# Verify caching strategy
gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"

# Check for specific security measures
gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"

# Verify test coverage for features
gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"
```

### When to Use Gemini CLI

Use `gemini -p` when:
- Analyzing entire codebases or large directories
- Comparing multiple large files
- Need to understand project-wide patterns or architecture
- Current context window is insufficient for the task
- Working with files totaling more than 100KB
- Verifying if specific features, patterns, or security measures are implemented
- Checking for the presence of certain coding patterns across the entire codebase

### Important Notes

- Paths in `@` syntax are relative to your current working directory when invoking gemini
- The CLI will include file contents directly in the context
- No need for `--yolo` flag for read-only analysis
- Gemini's context window can handle entire codebases that would overflow Claude's context
- When checking implementations, be specific about what you're looking for to get accurate results
