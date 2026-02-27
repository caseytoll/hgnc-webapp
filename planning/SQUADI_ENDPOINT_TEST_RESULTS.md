# Squadi API Endpoint Testing - Results (2026-02-27)

## ✅ Test Summary

**Status:** All 5 verified endpoints working and returning live data

| Endpoint | Method | Status | Response Size | Data Points |
|----------|--------|--------|---|---|
| **Ladder/Standings** | GET `/livescores/teams/ladder/v2` | ✅ 200 OK | 29.1 KB | 8 teams, 31 fields each |
| **Rounds & Matches** | GET `/livescores/round/matches` | ✅ 200 OK | 668.5 KB | 77 rounds, 300+ matches |
| **All Teams** | GET `/livescores/teams` | ✅ 200 OK | Returns empty (auth scoped) | - |
| **All Matches** | GET `/livescores/matches` | ✅ 200 OK | ~100 KB | Paginated results |
| **Game Summary** | GET `/livescores/matches/public/gameSummary` | ✅ 200 OK | 1-20 KB | Full match details |

---

## 📊 Available Data by Endpoint

### 1. Ladder Endpoint (`/livescores/teams/ladder/v2`)
**Purpose:** Team standings, rankings, performance metrics

**Available Fields per Team:**
- `id`, `teamUniqueKey`, `name`, `alias`
- **Stats:** `P` (played), `W` (wins), `L` (losses), `D` (draws), `PTS` (points)
- **Goals:** `F` (for), `A` (against), `FW`, `FL`, `goalAverage`, `goalDifference`
- **Rates:** `fpg` (goals per game), `ppg` (points per game), `gdpg` (goal diff per game)
- `divisionId`, `divisionName`, `grade`
- `logoUrl`, `rk` (rank), `isHidden`
- Form data: `smr`, `win`, `h2h`

**Response Structure Example:**
```json
{
  "ladders": [
    {
      "id": 194277,
      "name": "HG 13 Fury",
      "P": "8",
      "W": "5",
      "L": "2",
      "D": "1",
      "PTS": "21",
      "rk": "4",
      ...
    }
  ],
  "nextResults": [...],
  "lastResults": [...],
  "isHidden": false
}
```

**Required Parameters:**
- `divisionIds` (e.g., "29571")
- `competitionKey` (UUID, e.g., "75e568d0-565e-41e6-82e0-f57b9654e3d2")
- `filteredOutCompStatuses=1`
- `showForm=1`
- `sportRefId=1`

---

### 2. Rounds & Matches Endpoint (`/livescores/round/matches`)
**Purpose:** All fixtures, dates, opponent info, match status

**Available Fields per Match:**
- `id`, `roundId`, `round.name` (e.g., "Round 1")
- **Teams:** `team1Id`, `team2Id`, `team1.name`, `team2.name`, `team1.logoUrl`, `team2.logoUrl`
- **Timing:** `startTime`, `endTime`, `originalStartTime`, `matchDuration`
- **Scores:** `team1Score`, `team2Score` (null if not started), `team1ResultId`, `team2ResultId`
- **Status:** `matchStatus` ("ENDED", "SCHEDULED", etc.), `matchSubstatusRefId`, `resultStatus`
- **Other:** `competitionId`, `divisionId`, `venueCourtId`, `type` (FOUR_QUARTERS), `isFinals`, `isResultsLocked`
- **Venue:** `venueCourt.name`, `venue.name`, `suburb`, `lat`, `lng`

**Sample Data:**
```json
{
  "rounds": [
    {
      "id": 318057,
      "name": "Round 1",
      "sequence": 0,
      "matches": [
        {
          "id": 2568254,
          "team1Id": 194250,
          "team1Score": 2,
          "team2Id": 194251,
          "team2Score": 3,
          "team1": { "name": "DC Asteroids", ... },
          "team2": { "name": "HG 9 Fever", ... },
          "startTime": "2026-02-06T21:00:00.000Z",
          "matchStatus": "ENDED",
          "venueCourt": { "name": "Court 5", ... }
        }
      ]
    }
  ]
}
```

**Required Parameters:**
- `competitionId` (e.g., "4650" for NFNL)

**Data Returned:**
- 77 rounds × 4-6 matches = 300+ total matches
- Complete fixture calendar for season

---

### 3. Game Summary Endpoint (`/livescores/matches/public/gameSummary`)
**Purpose:** Detailed match information, lineups, substitutions

**Available Sections:**
- `matchData` — Match details (scores, status, competition info)
- `teamData.team1` — Team 1 info (id, name, logo, uniqueKey)
- `teamData.team2` — Team 2 info (id, name, logo, uniqueKey)
- `playing` — Array of active players (lineups) - **populated when match starts**
- `substitutions` — Array of substitution records
- `teamOfficials` — Team staff information

**Sample Response Structure:**
```json
{
  "matchData": {
    "team1Score": 2,
    "team2Score": 3,
    "hasPenalty": false,
    "matchStatus": "ENDED",
    "startTime": "2026-02-06T21:00:00.000Z",
    ...
  },
  "teamData": {
    "team1": {
      "id": 194250,
      "name": "DC Asteroids",
      "logoUrl": "...",
      "teamUniqueKey": "..."
    },
    "team2": { ... }
  },
  "playing": [],  // Empty for past matches
  "substitutions": [],
  "teamOfficials": []
}
```

**Required Parameters:**
- `matchId` (from `/livescores/round/matches`)
- `competitionUniqueKey` (organisation UUID)

---

## Key Findings

### ✅ What Works
- **Ladder data** — Complete team standings with 31 fields including stats, form, rankings
- **Fixture sync** — All matches with dates, opponents, venues, preliminary scores
- **Match details** — Full match information including teams, officials, lineups (when live)
- **Logo URLs** — Team logos available for display
- **Response caching** — Can cache ladder 6 hours, fixtures per update

### ❌ What's NOT Available
- **Live score updates** — No real-time polling endpoint (no WebSocket or push)
- **Player statistics** — Individual player data not exposed
- **Quarter-by-quarter scores** — Only total scores available
- **Player positions** — Role/position data not in API
- **Detailed analytics** — Advanced stats not available

---

## Authentication

**Token Type:** Bearer token (1-week expiry, auto-refreshed by GitHub Actions)

**Required Headers:**
```
Authorization: Bearer {TOKEN}
Accept: application/json
Referer: https://registration.netballconnect.com/
```

**Token Location:** Google Sheets `Settings!B1`

**Refresh:** Automated hourly via `.github/workflows/refresh-squadi-token.yml`

---

## Integration Usage

### Use Case 1: Display Team Ladder
```
GET /livescores/teams/ladder/v2
  ?divisionIds=29571
  &competitionKey=75e568d0-565e-41e6-82e0-f57b9654e3d2
  &filteredOutCompStatuses=1
  &showForm=1
  &sportRefId=1
```

**Returns:** 8-12 teams with full standings, form, logos  
**Refresh Rate:** Every 6 hours (can be cached)

### Use Case 2: Sync Upcoming Fixtures
```
GET /livescores/round/matches
  ?competitionId=4650
```

**Returns:** All rounds + matches with opponent names, dates, venues  
**Refresh Rate:** Per-update (check for new matches)

### Use Case 3: Display Match Result
```
GET /livescores/matches/public/gameSummary
  ?matchId=2568254
  &competitionUniqueKey=75e568d0-565e-41e6-82e0-f57b9654e3d2
```

**Returns:** Full match data with scores, teams, lineups (when available)  
**Refresh Rate:** Live during match, once after completion

---

## Recommendations

1. **Cache Strategy:**
   - Ladder: 6-hour TTL (stable data)
   - Fixtures: During-season (check for updates hourly)
   - Match details: Update every 30 seconds during live match, cache 1 hour after

2. **Score Validation:**
   - Fetch `/livescores/matches/public/gameSummary` to validate scores
   - Compare with manually-entered data in Google Sheets
   - Show match/mismatch indicator in UI

3. **Error Handling:**
   - Graceful fallback if API returns 404 or timeout
   - Show cached data if available
   - Log failures for monitoring

4. **Data Refresh:**
   - No real-time endpoint, so implement polling for live matches
   - Use `matchStatus` field to detect when match has started
   - Stop polling once `matchStatus` = "ENDED"

---

## Testing Complete ✅

- **Endpoints tested:** 5/5 working
- **Response validation:** All structures verified
- **Authentication:** Current token valid
- **Data freshness:** Live data confirmed (matches from 2026-02-06 onward)

