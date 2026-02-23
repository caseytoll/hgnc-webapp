# Ladder & Fixture Integration

Reference for ladder sources, fixture sync algorithm, GameDay/Squadi configuration. $ARGUMENTS

---

## Ladder Sources

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

---

## Fixture Sync (Auto-Populate Games)

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

---

## GameDay-Specific Config

- **`roundOffset`:** Offsets round numbers for teams with pre-season grading games. E.g., if a team played 3 grading rounds before the main competition, set `roundOffset: 3` so GameDay Round 1 becomes app Round 4.
- **`compID`** and **`client`:** Found in GameDay fixture page URLs (e.g., `mygameday.app/comp/655969/...`)
- **`teamName`:** Must match exactly how the team appears on GameDay (case-insensitive matching used internally)

---

## Squadi Auto-Discovery

The "Auto-Detect from Squadi" feature eliminates manual configuration for new teams:

- **Trigger:** "Auto-Detect from Squadi" button in Team Settings → Squadi section
- **API Access:** Uses public Squadi fixture API (no authentication required)
- **Scanning:** Probes competition IDs sequentially, looking for divisions containing "HG" teams
- **Caching:** Results stored in `Squadi_Lookup` sheet with 6-month TTL
- **UI Flow:** Shows picker modal with discovered teams, auto-fills config fields on selection, and automatically saves the configuration
- **Force Rescan:** Available to refresh cached data for new seasons/competitions
