# Data Structures & API Reference

Reference for data structures, API endpoints, sheet schema, and sync behavior. $ARGUMENTS

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

## API Endpoints (via Apps Script)

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
