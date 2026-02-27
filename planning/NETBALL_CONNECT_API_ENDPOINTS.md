# Netball Connect API Endpoint Reference
**Updated: 2026-02-27 (Current Token)**

## ✅ Verified Working Endpoints

### Summary
- **4 primary endpoints** — All return data and support the main features
- **1 detailed match endpoint** — Game summary with match details, team info, lineups
- **Zero live score polling** — No real-time scoring endpoint (not exposed via API)
- **Zero team/player metadata** — Individual queries not available; use bulk lists instead

### Endpoints by Category

#### Competition & Standings (2 endpoints)
**Status:** ✅ **200 OK**

```
https://api-netball.squadi.com/livescores/teams/ladder/v2
?divisionIds=29571
&competitionKey=75e568d0-565e-41e6-82e0-f57b9654e3d2
&filteredOutCompStatuses=1
&showForm=1
&sportRefId=1
```

**Required Parameters:**
- `divisionIds` (string, may be comma-separated) — Division ID (e.g., "29571")
- `competitionKey` (string) — UUID from Squadi config (e.g., "75e568d0-565e-41e6-82e0-f57b9654e3d2")
- `filteredOutCompStatuses` (required: "1")
- `showForm` (required: "1")
- `sportRefId` (required: "1" for netball)

**Response Structure:**
```json
{
  "ladders": [
    {
      "id": 194277,
      "teamUniqueKey": "0e9759a6-dc53-41dd-aa0c-b2ff76134b07",
      "name": "HG 13 Fury",
      "divisionId": 29571,
      "divisionName": "Division 2",
      "P": 8,
      "W": 5,
      "L": 2,
      "D": 1,
      "PTS": 21,
      "rk": 4,
      "logoUrl": "...",
      "...(21 more fields)"
    }
  ],
  "nextResults": [...],
  "lastResults": [...],
  "isHidden": false
}
```

**Response Size:** ~30-50 KB  
**Data Points per Team:** 31 fields (position, stats, logo, form, etc.)

**Usage in Code.js:**
- Line 2927-2945: `fetchSquadiLadderData(config)`
- Called by: `getSquadiLadderForTeam()` → cached 6 hours

---

### 2. GET `/livescores/round/matches` — Fetch Rounds & Matches
**Status:** ✅ **200 OK**

```
https://api-netball.squadi.com/livescores/round/matches
?competitionId=4650
```

**Required Parameters:**
- `competitionId` (integer/string) — Competition ID (e.g., "4650" for NFNL)

**Response Structure:**
```json
{
  "rounds": [
    {
      "id": 318057,
      "name": "Round 1",
      "sequence": 0,
      "competitionId": 4650,
      "divisionId": 29571,
      "matches": [
        {
          "id": 4982343,
          "team1Id": 194277,
          "team2Id": 194279,
          "team1Name": "HG 13 Fury",
          "team2Name": "Another Team",
          "startTime": "2026-03-15T10:00:00",
          "venue": "Venue Name",
          "status": "scheduled",
          "score1": null,
          "score2": null,
          "..."
        }
      ],
      "isHidden": false
    }
  ],
  "allRoundsHidden": false
}
```

**Sample Data:** 77 rounds × 4-6 matches per round = 300+ matches per competition  
**Response Size:** ~650 KB

**Usage in Code.js:**
- Line 1552: Used by `fetchGameDayFixtureData()`
- Provides: Match dates, opponents, venue, status updates
- Does NOT include live scores or lineups

---

### 3. GET `/livescores/teams` — Fetch All Teams (Large Dataset)
**Status:** ✅ **200 OK**

```
https://api-netball.squadi.com/livescores/teams
```

**Parameters:** None (optional: can filter by competitionId)

**Response Structure:**
```json
[
  {
    "id": 194277,
    "name": "HG 13 Fury",
    "alias": "HG13F",
    "teamUniqueKey": "0e9759a6-dc53-41dd-aa0c-b2ff76134b07",
    "divisionId": 29571,
    "competitionId": 4650,
    "..."
  }
]
```

**Response Size:** ~87 KB (100+ teams)  
**Warning:** Returns ALL teams system-wide (pagination unknown)

---

### 4. GET `/livescores/matches` — Fetch All Matches (Very Large)
**Status:** ✅ **200 OK**

```
https://api-netball.squadi.com/livescores/matches
```

**Parameters:** None (optional: can filter by competitionId)

**Response Structure:**
```json
[
  {
    "id": 4982343,
    "isResultsLocked": false,
    "team1Id": 194277,
    "team2Id": 194279,
    "startTime": "2026-03-15T10:00:00Z",
    "status": "scheduled",
    "score1": null,
    "score2": null,
    "..."
  }
]
```

**Response Size:** ~543 KB (311+ matches)  
**Warning:** Very large payload; consider filtering by competition

---

### 5. GET `/livescores/matches/public/gameSummary` — Detailed Match Data
**Status:** ✅ **200 OK** (when valid matchId provided)

```
https://api-netball.squadi.com/livescores/matches/public/gameSummary
?matchId=2568254
&competitionUniqueKey=75e568d0-565e-41e6-82e0-f57b9654e3d2
```

**Required Parameters:**
- `matchId` (integer) — Match ID from `/livescores/round/matches` or `/livescores/matches`
- `competitionUniqueKey` (string) — Organisation UUID

**Response Structure:**
- `matchData` — Match details (scores, status, venue, start time, competition name)
- `teamData` — Team info (id, name, logo, uniqueKey) for both teams
- `playing` — Array of active athletes/lineups (may be empty if not started)
- `substitutions` — Array of substitution records (may be empty)
- `teamOfficials` — Team staff/officials
- `attendanceAvailable` — Boolean flag

**Response Size:** ~5-20 KB (depends on match history)  
**Data Freshness:** Updated during/after match  
**Note:** Data availability depends on match progression (lineups only populated when match starts)

---

## ❌ Non-Working / Unreachable Endpoints

| Endpoint | Status | Issue | Notes |
|----------|--------|-------|-------|
| `POST /livescores/competitions` | 401 | Unauthorized | Token auth scope limitation |
| `GET /livescores/competition` | 404 | Doesn't exist | Try `/matches` or `/round/matches` instead |
| `GET /livescores/standing` | 404 | Doesn't exist | Use `/livescores/teams/ladder/v2` for standings |
| `GET /livescores/division*` | 404 | No metadata endpoint | Division IDs numeric only; no clean labels available |
| `POST /api/competitions` | 404 | API path not recognized | — |
| `GET /liveScoreMatchStatistics` | 404 | Not exposed | Use gameSummary for match details |
| `GET /livescores/team/{id}` | 404 | Individual team endpoint doesn't exist | Use `/teams` list instead |
| `GET /livescores/match/{id}` | 404 | Single match endpoint missing | Use `gameSummary` for detailed match data |
| `GET /livescores/season*` | 404 | Season endpoints missing | — |
| `GET /api/organisation/{key}/competitions` | 404 | Org endpoint doesn't exist | — |
| `worldsportaction.com/*` | DNS Fail | Domains don't resolve | Legacy/deprecated API |
| `competition-api-netball.squadi.com/*` | DNS Fail | Subdomain doesn't resolve | Not publicly accessible |

---

## 🔑 Key Findings

### Auth Token Details
- **Token Type:** Bearer (prepend "Bearer " in Authorization header)
- **Storage:** Google Sheets Settings!B1
- **Expiry:** ~1 week (refreshed hourly by GitHub Actions workflow)
- **Scope:** Limited to certain operations (competitions POST returns 401)

### API Characteristics
1. **Base URL:** `https://api-netball.squadi.com` (netball-specific subdomain required)
2. **Response Format:** JSON
3. **Required Headers:**
   ```
   Authorization: Bearer {TOKEN}
   Accept: application/json
   Referer: https://registration.netballconnect.com/
   ```

4. **Parameters are Case-Sensitive:**
   - Note: `divisionIds` (plural) not `divisionId`
   - Use string values for numeric IDs: `"29571"` not `29571`

### Data Structure Findings

**Division IDs (NFNL Example):**
- Div 2: `29571` (HG 13 Fury, HG 13 Fever)
- Div 3: `29579` (...)
- Div 1: `29577` (...)

**Competition Keys (NFNL Example):**
- NFNL: `75e568d0-565e-41e6-82e0-f57b9654e3d2`

**Competition IDs:**
- NFNL: `4650`

### What's NOT Available
- ❌ **Division names/metadata:** No endpoint returns "Division 2" label separate from ID
- ❌ **Live scores:** No real-time scoring endpoint
- ❌ **Match details/lineups:** Not exposed via public API
- ❌ **Player statistics:** Not available
- ❌ **Team member lists:** Not available

---

## 📋 How Code.js Uses These Endpoints

| Component | Endpoint(s) | Purpose | TTL |
|-----------|-----------|---------|-----|
| **Ladder Loading** | `/livescores/teams/ladder/v2` | Standings + form data | 6 hours |
| **Fixture Sync** | `/livescores/round/matches` | Opponent names, dates, venues | Dynamic |
| **Team Discovery** | `/livescores/teams` | Find HG teams in Squadi | Session |
| **Match Results** | `/livescores/matches` | Update game scores | Per-event |

---

## 🚀 Next Steps for Feature Implementation

1. **Division Name Labels** → Create hard-coded mapping:
   ```javascript
   const DIVISION_LABELS = {
     '29571': 'Division 2',
     '29579': 'Division 3',
     '29577': 'Division 1'
   };
   ```

2. **Live Score Polling** → No live endpoint exists; use `/livescores/matches` with polling every 30s

3. **Enhanced Match Details** → Not available; use combined data from rounds + manual entry

4. **Player/Lineup Data** → Not available from Squadi; must be entered manually or synced from separate source

---

## 📊 Response Size Reference

| Endpoint | Size | Type | Frequency |
|----------|------|------|-----------|
| Ladder (1 division) | 30-50 KB | GET | Cache 6h |
| Rounds & Matches | 650 KB | GET | Per-sync |
| All Teams | 87 KB | GET | Per-session |
| All Matches | 543 KB | GET | Per-event |

---

## 🔗 Related Code References

- **Backend:** [apps-script/Code.js](../apps-script/Code.js)
  - `loadAuthToken()` — Line 1193
  - `fetchSquadiLadderData()` — Line 2920
  - `scanSquadiCompetitions()` — Line 2042 (uses auth token)

- **Frontend:** [apps/coach-app/src/js/team-settings.js](../apps/coach-app/src/js/team-settings.js)
  - `autoDetectSquadi()` — Line 456
  - `pickSquadiOption()` — Line 538

- **Token Refresh:** [.github/workflows/refresh-squadi-token.yml](../.github/workflows/refresh-squadi-token.yml)
  - Runs hourly to keep token fresh

---

## 📝 Testing Commands

```bash
# Test ladder endpoint manually
curl -H "Authorization: Bearer {YOUR_TOKEN}" \
  "https://api-netball.squadi.com/livescores/teams/ladder/v2?divisionIds=29571&competitionKey=75e568d0-565e-41e6-82e0-f57b9654e3d2&filteredOutCompStatuses=1&showForm=1&sportRefId=1"

# Test rounds & matches
curl -H "Authorization: Bearer {YOUR_TOKEN}" \
  "https://api-netball.squadi.com/livescores/round/matches?competitionId=4650"
```

---

## 🔬 Testing & Discovery Log (2026-02-27)

**Endpoints Tested:** 22+ variations across multiple base URLs  
**Current Token:** Fresh (refreshed hourly by GitHub Actions)  
**Response:** All working endpoints verified with current authentication

### Discovery Process
1. ✅ Reviewed Code.js for all `UrlFetchApp.fetch()` calls
2. ✅ Tested known endpoints with fresh token
3. ✅ Probed common REST patterns (`/season`, `/sport`, `/team/{id}`, etc.)
4. ✅ Tested World Sport Action domain endpoints (all DNS failures)
5. ✅ Discovered `/livescores/matches/public/gameSummary` endpoint
6. ✅ Tested with real match IDs from `/livescores/round/matches`

### Tested But Not Working
- `GET /livescores/matchstatistics` — 404
- `GET /livescores/competition` — 404
- `GET /liveScoreMatchStatistics` — 404
- `GET /liveScores/live` — 404
- `GET /livescores/seasons` — 404
- `GET /livescores/teams/{id}` — 404
- Individual sport/season/division metadata endpoints — All 404
- All WSA domains (`netball-comp-api.worldsportaction.com`, etc.) — DNS NXDOMAIN
- `competition-api-netball.squadi.com` — DNS NXDOMAIN

### Features NOT Available via API
- ❌ Live score polling (no pub/sub or real-time endpoint)
- ❌ Player individual stats (would need match scorecards)
- ❌ Detailed match analytics
- ❌ Team rosters/member lists
- ❌ Individual player lookup
- ❌ Season metadata
- ❌ Division hierarchy/structure

---
