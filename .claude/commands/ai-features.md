# AI Features & Opponent Difficulty

Reference for Gemini AI insights, training focus, and opponent difficulty ratings. $ARGUMENTS

---

## AI Features (Gemini-powered)

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

---

## Opponent Difficulty Ratings

Coach-app only (parent portal has no ladder data). Uses cached ladder data from localStorage — no additional API calls.

- **`getOpponentDifficulty(opponentName)`** — Reads `ladder.cache.{teamID}` from localStorage, fuzzy-matches opponent to ladder row via `fuzzyOpponentMatch()`. Returns `{ position, totalTeams, tier, label }` or `null`
- **Tiers:** `top` (top 25% of ladder), `mid` (middle 50%), `bottom` (bottom 25%). Color-coded: red/amber/green
- **Game list badges:** Colored pill badge (e.g. "1st", "5th") next to opponent name in `renderSchedule()`. Skipped for bye games
- **Strength of Schedule:** Metric card in stats overview showing 1-100 rating (higher = harder schedule). Clickable modal shows per-opponent breakdown with W/L badges and ladder positions
- **SoS formula:** `(totalTeams - avgOpponentPosition) / (totalTeams - 1) * 100`. Labels: >= 70 "Tough", >= 40 "Average", < 40 "Easy"
- **AI context:** `fetchAIInsights()` includes `opponentRank` per game, `strengthOfSchedule` summary, and `divisionContext` (all division team W-L-D records from `state.divisionResults`)
- **Graceful degradation:** All features return `null`/hidden when no ladder data available
