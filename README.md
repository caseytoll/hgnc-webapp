// ...existing code...
All parent and team portals are now served via a single read-only SPA (Single Page Application) at https://hgnc-gameday.pages.dev. Team-specific landing pages are handled by SPA routing (e.g., /teams/{slug}). Static HTML generation scripts, per-team deploys, and old portal artifacts have been removed and are no longer required.
// ...existing code...
# HGNC Team Manager

> **Two Applications:**
> - **Coach's App** (main directory): Full-featured PWA with editing capabilities for coaches
> - **Parent Portal** (`apps/parent-portal/` directory): Read-only SPA for parents and spectators

> **Developer Guide:** See `CLAUDE.md` for project status, troubleshooting, and developer notes.

A mobile-first web application for managing Hazel Glen Netball Club team rosters, game schedules, lineups, and statistics. Optimized for mobile devices and installable as a Progressive Web App (PWA).

## Features

### Coach's App (Full Access)
- **Team Management**: Create and manage multiple teams with player rosters
- **Game Scheduling**: Track games with dates, times, locations, and opponents
- **Lineup Builder**: Visual drag-and-drop lineup builder for each quarter
- **Live Scoring**: Enter scores during games with +/- buttons for easy input
- **Timestamped Notes**: Add timestamped observations during each quarter for training review
- **Statistics**: View team records, goal scorers, and player stats
- **Career Tracking**: Track player stats across multiple teams and seasons
- **Data Editing**: Full CRUD operations for teams, players, games, and lineups
- **iPad Optimized**: Full-width layout on iPad mini for better sideline use

### Parent Portal (Read-Only)
- **Team Information**: View team rosters and basic information
- **Game Schedules**: See upcoming games and results
- **Live Scores**: View scores as they are entered by coaches
- **Statistics**: Access to team records and player stats
- **Shareable Links**: Direct links to specific team information

### Both Applications
- **PWA Support**: Install on your home screen for offline access
- **Cloud Sync**: Data saved to Google Sheets via Apps Script API
- **Offline Support**: Works offline with localStorage, syncs when online
- **Mobile Optimized**: Responsive design for all devices

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
````
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
├── index.html              # Coach's App HTML file
├── package.json            # Project dependencies
├── vite.config.js          # Vite configuration for Coach's App
├── public/
│   ├── manifest.json       # PWA manifest for Coach's App
│   ├── sw.js              # Service worker for offline support
│   └── icons/             # App icons (favicon, PWA, apple-touch-icon)
├── apps/
│   ├── coach-app/         # Coach's App (Full Editing)
│   │   ├── index.html     # App entry point
│   │   ├── package.json   # Dependencies and scripts
│   │   ├── vite.config.js # Build configuration
│   │   ├── vitest.config.js # Test configuration
│   │   ├── public/        # PWA assets (manifest, icons, service worker)
│   │   └── src/
│   │       ├── css/       # Stylesheets
│   │       └── js/        # Application code and tests
│   └── parent-portal/     # Parent Portal (Read-Only)
│       ├── index.html     # App entry point
│       ├── package.json   # Dependencies and scripts
│       ├── vite.config.js # Build configuration
│       ├── vitest.config.js # Test configuration
│       ├── public/        # PWA assets (manifest, icons, service worker)
│       └── src/
│           ├── css/       # Stylesheets
│           └── js/        # Application code and tests
└── common/                 # Shared modules between both apps
    ├── utils.js           # Utility functions
    ├── stats-calculations.js # Statistics calculations
    ├── share-utils.js     # Sharing functionality
    └── mock-data.js       # Mock data and calculations
```

### Available Scripts

#### Coach's App Scripts
- `npm run dev` - Start development server for Coach's App with hot reload
- `npm run build` - Build Coach's App for production
- `npm run preview` - Preview Coach's App production build locally

#### Parent Portal Scripts
- `cd apps/parent-portal && npm run dev` - Start development server for Parent Portal
- `cd apps/parent-portal && npm run build` - Build Parent Portal for production
- `npm run build:readonly` - Build Parent Portal in read-only mode
- `npm run deploy:readonly-viewer` - Build and deploy Parent Portal to production

#### Testing Scripts
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

#### Coach's App
The Coach's App supports two data sources for full editing capabilities:

1. **Mock Data** (default for development): Uses `src/js/mock-data.js` for offline development
2. **Live API**: Connects to Google Apps Script backend for production data (configure in `src/js/config.js`)

Toggle between sources using the DEV panel in the bottom-right corner (only visible on localhost).

#### Parent Portal
The Parent Portal uses the same Live API data source as the Coach's App, but operates in read-only mode with all editing features disabled.

#### Ladder Integration
Both applications support ladder integration:
- The repository includes a scheduled GitHub Action (`.github/workflows/daily-ladder.yml`) that runs the ladder scraper (`scripts/fetch-ladder.js`) daily and on-demand
- The workflow reads the Apps Script `getTeams` API (via the `GS_API_URL` secret), fetches each team's `ladderUrl`, writes `public/ladder-<teamID>.json`, and commits changes to `master`
- This triggers a Cloudflare Pages redeploy, making updated ladder data available to both applications

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

## Parent Portal SPA routing (clean team URLs)

The Parent Portal supports path-based routing for friendly team URLs so you can use links like:

- `/teams/<slug>` (e.g. `/teams/hazel-glen-6-2026-season-1`)

The Parent Portal will auto-select the team by canonical slug and open the read-only view.

Deployment rewrite rules

- Cloudflare Pages: Set the "Custom 404" fallback to `/index.html` in Pages settings so unknown routes serve the SPA. This enables client-side routing for team-specific URLs.

- Netlify (if used):

```
# Redirect team paths to parent portal (200 -> rewrite for SPA)
/teams/*   /index.html   200
```

- S3 + CloudFront (legacy):
  - Configure CloudFront to return `index.html` for 404s and set error caching to 0; use a Lambda@Edge or CloudFront Function to rewrite `/teams/*` to `/` if needed.

Notes
- The current Parent Portal uses SPA routing and doesn't require static file generation or complex redirects.
- Legacy static generation scripts are still available if needed:
  - `npm run generate:team-portals` — generates compact portal redirect pages (`public/hgnc-team-portal-<slug>.html`) and redirects under `/p/<slug>/`.
  - `npm run generate:static-teams` — generates full static read-only pages under `public/teams/<slug>/`.
- To have Pages generate portals during build, set the `GS_API_URL` environment variable in your Pages project so the `prebuild` script runs automatically during build.

**Previewing generated pages locally:** Serve the `public/` directory locally, for example:

```bash
cd public
python3 -m http.server 5000 --bind 0.0.0.0
# Visit http://localhost:5000/teams/<slug>/ or http://localhost:5000/p/<slug>.html
```

---

## Cloudflare Worker (legacy, optional)

The current Parent Portal uses SPA routing and doesn't require a Cloudflare Worker. However, if you previously deployed a worker for static page serving, it may still be in use.

To deploy the Cloudflare Worker proxy (recommended):

1. Create a Cloudflare API token with `Workers` and `Account . Workers Scripts` write permissions and add it to GitHub as `CF_API_TOKEN` (Repository Settings → Secrets).
2. Edit `wrangler.toml.example` and set your `account_id` (and optionally `route`) or configure the route in the Cloudflare dashboard.
3. Deploy the worker with the provided GitHub Action (Run the `Deploy Team Portal Worker` workflow or push changes in `workers/`).

What the worker does:
- Proxies API requests sent to `/api/*` on your domain to the Google Apps Script endpoint and injects proper CORS headers so the parent portal (or other static pages) can call the API reliably.
- Keeps the legacy `/teams/*` static HTML routing features (still supported).

After deploying the worker, set your Parent Portal environment variable in Cloudflare Pages:
- `VITE_GS_API_PROXY_URL` → `https://<your-worker-subdomain-or-route>/api`

Note: If you set the worker URL without `/api`, the app will append `/api` automatically when constructing requests.

Legacy worker behavior (no longer used by default):
- Optional token gating via `WORKER_PORTAL_TOKEN` (set as secret if you need token gating)


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

## Deployment

### Coach's App
- **Production URL:** https://hgnc-team-manager.pages.dev
- **Hosting:** Cloudflare Pages

#### Deploying the Coach's App
1. Build the site:
  ```bash
  npm run build
  ```
2. Deploy to Cloudflare Pages **production** (main branch):
  ```bash
  npx wrangler pages deploy dist --project-name=hgnc-team-manager --branch=main
  ```
  - This ensures the deployment goes to the live production URL: https://hgnc-team-manager.pages.dev
  - If you deploy from a different branch, it will create a preview deployment only.

### Parent Portal
- **Production URL:** https://hgnc-gameday.pages.dev
- **Hosting:** Cloudflare Pages

#### Deploying the Parent Portal
1. Build the read-only viewer:
  ```bash
  npm run build:readonly
  ```
2. Deploy to Cloudflare Pages:
  ```bash
  npm run deploy:readonly-viewer
  ```
  - This deploys to https://hgnc-gameday.pages.dev
  - Team-specific pages are accessible via SPA routing (e.g., `/teams/{slug}`)

- For more deployment details, see [docs/deployment-cloudflare.md](docs/deployment-cloudflare.md).
