# HGNC Team Manager – Handover & Documentation

## Project Overview

**HGNC Team Manager** is a mobile-first Progressive Web App (PWA) for managing Hazel Glen Netball Club teams, rosters, games, lineups, and statistics. It supports both offline (mock data) and live (Google Apps Script backend) modes, and is optimized for mobile and desktop use.

---

## Key Features
- Team and player management
- Game scheduling and editing
- Quarter-by-quarter lineup builder
- Live scoring and stats
- Advanced analytics (positions, leaders, combos, attendance)
- Data export/import (JSON, mock-data.js)
- PWA: installable, offline support
- Dev tools: mock/API toggle, export, reload, clear cache
- Game status: Normal, Upcoming, Abandoned, Forfeit (with logic/UI)

---

## Current State (as of 2026-01-24)
- **Frontend:** Vanilla JS (ES modules), Vite, PWA
- **Backend:** Google Apps Script ✅ **CONNECTED**
- **Data:** Mock data (localStorage) for dev, Live API for production
- **Dev server:** Vite (`npm run dev -- --host`)
- **Tests:** Vitest, 173 tests passing
- **Production:** https://hgnc-team-manager.netlify.app
- **GitHub:** https://github.com/caseytoll/hgnc-webapp (auto-deploys to Netlify)

---

## Completed (2026-01-24)

1. ~~**Vite Dev Server Parse Error:**~~ **RESOLVED**
   - **Root cause:** Missing closing brace in `window.calculateGameTotal` function and missing `calculateMockStats` function export.
   - **Fix applied:** Added closing `};` and implemented `calculateMockStats` function.

2. ~~**Backend Integration:**~~ **RESOLVED**
   - Apps Script URL configured in `src/js/config.js`
   - API calls work directly to Apps Script (CORS handled by Google)
   - Local dev uses Vite proxy (`/gas-proxy`), production calls Apps Script directly
   - Real teams loading: U11 Flames, Hazel Glen 6

3. ~~**GitHub + Netlify Auto-Deploy:**~~ **RESOLVED**
   - Repo: https://github.com/caseytoll/hgnc-webapp
   - Push to `master` triggers automatic Netlify deploy
   - Old Apps Script version preserved as tag `legacy-apps-script`

4. **Bug Fixes Applied:**
   - Fixed `saveGameSettings` variable ordering (game used before declaration)
   - Fixed `loadFromLocalStorage` to restore all game fields (status, opponent, etc.)
   - Fixed Safari/localhost CSS MIME type issue (CSS now imported via JS)

## Outstanding Issues / Next Steps
- None critical. App is fully functional with live backend.

---

## Troubleshooting & Dev Workflow

### Safari + localhost Issues (Vite 7.x)
- **Symptom:** Safari shows "can't connect to server" or CSS MIME type errors on `localhost:3000`, but works on network IP.
- **Cause:** Safari has strict handling of localhost connections and WebSocket/MIME types with Vite 7.x.
- **Solution:** Use the network IP instead of localhost:
  ```bash
  npm run dev -- --host
  # Then open http://192.168.x.x:3000/ (shown in terminal output)
  ```
- **Alternative:** Try `http://127.0.0.1:3000/` instead of `http://localhost:3000/`
- **Note:** CSS is imported via JavaScript (`import '../css/styles.css'` in app.js) rather than a `<link>` tag to ensure proper MIME type handling in Vite 7.x.

### Vite Dev Server Parse Errors
- **Symptom:** `Failed to parse source for import analysis because the content contains invalid JS syntax`
- **Common causes:**
  1. Missing closing braces in functions (check brace balance with: `awk '{for(i=1;i<=length;i++){c=substr($0,i,1);if(c=="{")o++;if(c=="}")o--}}END{print o}' src/js/app.js` - should print 0)
  2. BOM or invisible characters (check with `head -c 20 src/js/app.js | xxd`)
  3. Missing function exports
- **Quick syntax check:** `node --check src/js/app.js`

### Backend/API Integration
- **Apps Script URL:** Configured in `src/js/config.js`
- **Local dev:** Uses Vite proxy (`/gas-proxy` → Apps Script) to bypass CORS
- **Production:** Calls Apps Script directly (Google handles CORS for GET requests)
- **Toggle data source:** Use dev panel (bottom-right, localhost only) to switch between Mock and API
- **API endpoints:** `ping`, `getTeams`, `getTeamData`, `saveTeamData` (see `api.js`)

### Data Export/Import
- Use the dev panel to export mock data to `mock-data.js`.
- Import/export team data as JSON for backup or migration.

### Game Status Logic
- Games can be marked as Normal, Upcoming, Abandoned, or Forfeit.
- Abandoned games prompt to clear unplayed quarters.
- Stats only include games with status 'normal'.

---

## Onboarding for Next Developer
- See `README.md` for setup, commands, and structure.
- See `CLAUDE.md` for Claude/AI-specific guidance.
- See `HANDOFF.md` for backend integration and deployment notes.
- All code is in `src/js/` and `src/css/`.
- Main entry: `src/js/app.js` (see parse error note above).
- Dev server: `npm run dev -- --host` (for LAN access).
- Production: Netlify (see link above).

---

## Contacts & Resources
- **Production:** https://hgnc-team-manager.netlify.app
- **GitHub:** https://github.com/caseytoll/hgnc-webapp
- **Apps Script:** https://script.google.com/macros/s/AKfycbyBxhOJDfNBZuZ65St-Qt3UmmeAD57M0Jr1Q0MsoKGbHFxzu8rIvarJOOnB4sLeJZ-V/exec
- **Google Sheet:** ID `13Dxn41HZnClcpMeIzDXtxbhH-gDFtaIJsz5LV3hrE88`

---

*Last updated: 2026-01-24. Backend integration complete, auto-deploy configured.*
