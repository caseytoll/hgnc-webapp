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
- **Frontend:** Vanilla JS (ES modules), Vite, PWA, Netlify
- **Backend:** Google Apps Script (integration pending)
- **Data:** Mock data (localStorage, mock-data.js) and API (Apps Script)
- **Dev server:** Vite (`npm run dev -- --host`)
- **Tests:** Vitest, coverage maintained
- **Production:** https://hgnc-team-manager.netlify.app

---

## Outstanding Issues / Next Steps
1. ~~**Vite Dev Server Parse Error:**~~ **RESOLVED (2026-01-24)**
   - **Root cause:** Missing closing brace in `window.calculateGameTotal` function (line 2178) and missing `calculateMockStats` function export from `mock-data.js`.
   - **Fix applied:** Added closing `};` and implemented `calculateMockStats` function.
   - All 173 tests passing, build succeeds.

2. **Backend Integration:**
   - Google Apps Script backend must be updated to allow CORS from Netlify domain.
   - Update `doGet`/`doPost` in Apps Script to include CORS headers.
   - Update `api.js` and config to point to live backend.

3. **Handoff for Next Session:**
   - All documentation (README, CLAUDE.md, this handover) is up to date.
   - See below for troubleshooting, dev workflow, and onboarding notes.

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
- Update Google Apps Script to allow CORS from Netlify.
- Update `api.js` to use live API endpoints.
- Test API mode by toggling data source in dev panel.

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
- **Netlify site:** https://hgnc-team-manager.netlify.app
- **Google Apps Script:** (URL to be provided by user)
- **Dev lead:** (to be filled in)

---

*This handover document is up to date as of 2026-01-24. For any issues, see troubleshooting above or contact the previous developer.*
