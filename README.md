# HGNC Team Manager

> **Developer Guide:** See `CLAUDE.md` for project status, troubleshooting, and developer notes.

A mobile-first web application for managing Hazel Glen Netball Club team rosters, game schedules, lineups, and statistics. Optimized for mobile devices and installable as a Progressive Web App (PWA).

## Features

- **Team Management**: Create and manage multiple teams with player rosters
- **Game Scheduling**: Track games with dates, times, locations, and opponents
- **Lineup Builder**: Visual drag-and-drop lineup builder for each quarter
- **Live Scoring**: Enter scores during games with +/- buttons for easy input
- **Statistics**: View team records, goal scorers, and player stats
- **PWA Support**: Install on your home screen for offline access
- **Cloud Sync**: Data saved to Google Sheets via Apps Script API
- **Offline Support**: Works offline with localStorage, syncs when online
- **Career Tracking**: Track player stats across multiple teams and seasons

## Prerequisites

- Node.js **20+** (required for ladder scraper and CI)
- npm 9+

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd webapp-local-dev
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to the URL shown in the terminal (typically `http://localhost:3000` or the network IP)

## Development

### Safari Users
Safari has issues with `localhost` in Vite 7.x. Use the network IP instead:
```bash
npm run dev -- --host
# Open http://192.168.x.x:3000/ (shown in terminal output)
```
Alternatively, try `http://127.0.0.1:3000/` instead of `localhost`.

### Troubleshooting Vite Parse Errors
If you see a Vite error about "invalid JS syntax" in `src/js/app.js`, check brace balance with `node --check src/js/app.js`. This is usually caused by missing closing braces or encoding issues.

### Project Structure

```
webapp-local-dev/
├── index.html              # Main HTML file
├── package.json            # Project dependencies
├── vite.config.js          # Vite configuration (if present)
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js              # Service worker for offline support
│   └── icons/             # App icons (favicon, PWA, apple-touch-icon)
└── src/
    ├── css/
    │   └── styles.css     # All styles (CSS custom properties)
    └── js/
        ├── app.js         # Main application logic
        ├── config.js      # API configuration
        └── mock-data.js   # Mock data for development
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Run tests with coverage report

### Testing

The project uses [Vitest](https://vitest.dev/) for testing with happy-dom for DOM simulation.

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with coverage report
npm run test:coverage
```

#### Test Structure

```
src/js/
├── utils.js          # Utility functions
├── utils.test.js     # Utility function tests (55 tests)
├── mock-data.js      # Mock data and calculations
└── mock-data.test.js # Mock data tests (20 tests)
```

#### Current Coverage

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| utils.js | 95.71% | 96.66% | 89.47% | 98.30% |
| mock-data.js | 96.61% | 94.44% | 100% | 100% |

### Data Sources

The app supports two data sources:

Ladder automation:
- The repository includes a scheduled GitHub Action (`.github/workflows/daily-ladder.yml`) that runs the ladder scraper (`scripts/fetch-ladder.js`) daily and on-demand. The workflow reads the Apps Script `getTeams` API (via the `GS_API_URL` secret), fetches each team's `ladderUrl`, writes `public/ladder-<teamID>.json`, and commits changes to `master` which triggers a Cloudflare Pages redeploy. Ensure `GS_API_URL` is set to the latest Apps Script deployment (e.g., deployment @56 `AKfycbx5g7fIW28n...`) so the workflow sees `ladderUrl` and diagnostics endpoints.

1. **Mock Data** (default): Uses `src/js/mock-data.js` for offline development
2. **Live API**: Connects to Google Apps Script backend (configure in `src/js/config.js`)

Toggle between sources using the DEV panel in the bottom-right corner (only visible on localhost).

## API Endpoints (Google Apps Script Web App)

All API requests are sent to your deployed Google Apps Script web app URL, with the following query parameters:

- `api=true` (required for all API requests)
- `action=<actionName>` (see below)
- Additional parameters as required by the action

**Base URL Example:**
```
https://script.google.com/macros/s/AKfycb.../exec
```

### Actions

#### 1. Health Check
- **Endpoint:** `?api=true&action=ping`
- **Description:** Returns a simple response to verify the API is live.
- **Response:**
  ```json
  { "success": true, "message": "pong", "timestamp": "..." }
  ```

#### 2. Get Teams
- **Endpoint:** `?api=true&action=getTeams`
- **Description:** Returns a list of all teams with basic info and player counts.
- **Response:**
  ```json
  {
    "success": true,
    "teams": [
      { "teamID": "...", "year": 2025, "season": "Season 1", "teamName": "U11 Thunder", "sheetName": "...", "archived": false, "playerCount": 8 },
      ...
    ]
  }
  ```

#### 3. Get Team Data
- **Endpoint:** `?api=true&action=getTeamData&teamID=<teamID>&sheetName=<sheetName>`
- **Description:** Returns full data for a specific team (players, games, etc.).
- **Response:**
  ```json
  {
    "success": true,
    "teamData": { "teamID": "...", "players": [...], "games": [...], ... }
  }
  ```

#### 4. Save Team Data
- **Endpoint:** `?api=true&action=saveTeamData&sheetName=<sheetName>&teamData=<json>`
- **Description:** Saves the provided team data (as a JSON string) to the specified sheet.
- **Response:**
  ```json
  { "success": true }
  ```

#### 5. Get Player Library
- **Endpoint:** `?api=true&action=getPlayerLibrary`
- **Description:** Returns the player library (career tracking data across teams/seasons).
- **Response:**
  ```json
  {
    "success": true,
    "playerLibrary": { "players": [...] }
  }
  ```

#### 6. Save Player Library
- **Endpoint:** `?api=true&action=savePlayerLibrary&playerLibrary=<json>`
- **Description:** Saves the player library data to the PlayerLibrary sheet.
- **Response:**
  ```json
  { "success": true }
  ```

**Note:** Replace `<sheetName>`, `<teamID>`, and `<json>` with actual values as needed. All requests return JSON responses.

---

## Google Sheet Structure

The backend Google Sheet contains several tabs used by the web app and Apps Script API. Below are the main tabs and their columns:

### Teams
- **Columns:**
  - teamID
  - year
  - season
  - name
  - sheetName
  - Ladder Name
  - Ladder API
  - Results API
- **Sample Row:**
  - team_1762633769992, 2025, Season 2, U11 Flames, data_team_1762633769992, HG 11 Flames, ,

### Fixture_Results
- **Columns:**
  - Date
  - Round
  - Match ID
  - Team 1
  - Team 2
  - Team 1 Score
  - Team 2 Score
  - Result
  - Status
- **Sample Row:**
  - 7/26/2025, Round 1, 2410258, DC Rockets, DC Nova, 8, 0, Win, ENDED

### Ladder_Archive
- **Columns:**
  - Date
  - RK
  - Team
  - P
  - W
  - L
  - D
  - F
  - A
  - PTS
- **Sample Row:**
  - 11/17/2025, 1, DC Rockets, 8, 7, 0, 1, 108, 37, 32

### Settings
- **Columns:**
  - AUTH_TOKEN
- **Sample Row:**
  - (long token string)

### LadderData
- **Note:**
  - This tab is currently empty.

### PlayerLibrary
- **Purpose:** Stores career tracking data for players across multiple teams/seasons
- **Format:** Single cell (A1) containing JSON with player library data
- **Structure:**
  ```json
  {
    "players": [
      {
        "globalId": "gp_123456789",
        "name": "Player Name",
        "createdAt": "2026-01-26T...",
        "linkedInstances": [
          { "teamID": "...", "playerID": "...", "teamName": "...", "year": 2026, "season": "Season 1" }
        ]
      }
    ]
  }
  ```
- **Note:** This sheet is created automatically when a player is first added to career tracking.

If you add or change columns in the Google Sheet, update this section to keep the documentation in sync with your backend data model.

---

## Mobile Testing

To test on your iPhone:

1. Ensure your computer and phone are on the same network
2. Find your local IP address (shown in terminal when dev server starts)
3. Open `http://<your-ip>:3000` on your phone
4. Add to Home Screen for the full PWA experience

## PWA Installation

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home screen"

---

## Viewer SPA routing (clean team URLs)

The viewer app supports path-based routing for friendly team URLs so you can use links like:

- `/team/<slug>` (e.g. `/team/hazel-glen-6`)
- `/viewer/team/<slug>`
- `/viewer/<slug>` (convenience fallback)

The Viewer will auto-select the team by teamID or by slugified team name and open the read-only view.

Deployment rewrite rules

- Netlify (add to `public/_redirects` or `netlify.toml`):

```
# Redirect team paths to viewer app (200 -> rewrite for SPA)
/team/*    /viewer/index.html   200
/viewer/*  /viewer/index.html   200
```

- Cloudflare Pages: create a `_redirects` file with the same rules (Pages supports `_redirects`), or set the "Custom 404" fallback to `/viewer/index.html` in Pages settings so unknown routes serve the SPA. Also add `GS_API_URL` as an Environment Variable in the Pages project settings to enable the prebuild portal generation step.

- S3 + CloudFront:
  - Configure CloudFront to return `index.html` (the viewer's `index.html`) for 404s and set error caching to 0; use a Lambda@Edge or CloudFront Function to rewrite `/team/*` to `/viewer/` if needed.

Notes
- This approach avoids creating one static file per team and keeps URLs clean and human-friendly.
- If you prefer static redirect pages or full static read-only pages, use the generator scripts:
  - `npm run generate:team-portals` — generates compact portal redirect pages (`public/hgnc-team-portal-<slug>.html`) and viewer redirects under `/p/<slug>/`.
  - `npm run generate:static-teams` — generates full static read-only pages under `public/teams/<slug>/` (Viewer-friendly pages that are safe for parents/spectators).
- Slug format is now **season-aware** (`name-season`), with a fallback to `name-teamID` to ensure uniqueness across seasons.

- The Viewer UI now shows a **Read‑only pill** in the game detail when a read-only page is open, and write controls (availability, lineup assignment, scoring) are disabled. System Settings contains a **Read‑only Links** section with copy/open helpers for each team to make it easy to share parent-friendly URLs.

- To have Pages generate portals during build, set the `GS_API_URL` environment variable in your Pages project so the `prebuild` script runs automatically during build.

---

## Cloudflare Worker (optional, recommended)

If you want the Viewer domain to serve the static pages directly and have more control (token gating, caching), deploy the Worker at your Cloudflare account:

1. Create a Cloudflare API token with `Workers` and `Account . Workers Scripts` write permissions and add it to GitHub as `CF_API_TOKEN` (Repository Settings → Secrets).
2. Edit `wrangler.toml.example` and set your `account_id` and optional `route` (or configure route in the dashboard).
3. Deploy the example worker with GitHub Actions (Run `Deploy Team Portal Worker` workflow or push `workers/` files).

Worker behavior
- Handles:
  - `/p/<slug>/` (redirects to `/teams/<slug>/` on the Viewer domain)
  - `/teams/<slug>/` (proxies static HTML from CDN and rewrites canonical links to the Viewer domain)
- Optional token gating via `WORKER_PORTAL_TOKEN` (set as a Worker environment variable or via Cloudflare dashboard).

## Security

This application implements several security measures:

- **XSS Prevention**: All user input is escaped before rendering
- **Input Validation**: Form inputs are validated on submission
- **Type Checking**: Toast notification types are validated
- **Dev Tools Protection**: Developer panel hidden in production

## Browser Support

- iOS Safari 15+
- Chrome 90+
- Firefox 90+
- Edge 90+

## Known Limitations

- No user authentication (data is team-shared via Google Sheets)
- Offline mode serves cached data; changes sync when back online

## License

ISC
