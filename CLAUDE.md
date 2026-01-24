# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Recent Changes (2026-01-24)

**Captain Selection:**
- Tap a player in a position slot to mark as captain (shows "C" badge)
- Captain stored at game level: `game.captain = "Player Name"`
- Light theme: improved badge visibility with darker purple + shadow

**Shared Lineup Card:**
- Captain displays below match info ("Captain: Name")
- New format: players listed alphabetically, positions shown per quarter
- See `docs/examples/Example Lineup.pdf` for reference

**Netlify:**
- Auto-deploys DISABLED to conserve credits (was burning through free tier)
- Manual deploy workflow documented below
- Credits reset February 23

**Documentation:**
- Consolidated all docs into single CLAUDE.md
- Removed HANDOFF.md and HANDOVER_SESSION.md

**Status:** All features working. 173 tests passing. Ready for next feature.

---

## Quick Reference

| Resource | URL |
|----------|-----|
| Production | https://hgnc-team-manager.netlify.app |
| GitHub | https://github.com/caseytoll/hgnc-webapp |
| Apps Script | `https://script.google.com/macros/s/AKfycbyBxhOJDfNBZuZ65St-Qt3UmmeAD57M0Jr1Q0MsoKGbHFxzu8rIvarJOOnB4sLeJZ-V/exec` |
| Google Sheet | ID `13Dxn41HZnClcpMeIzDXtxbhH-gDFtaIJsz5LV3hrE88` |

**Deploy:** Auto-deploys OFF. See "Netlify Deployment" section below for manual deploy steps.

---

## Project Overview

HGNC Team Manager is a PWA for managing Hazel Glen Netball Club teams. Features include roster management, game scheduling, lineup planning, live scoring, and analytics. Works offline via service worker.

**Target user:** Junior netball coach who needs fair playing time distribution and offline access at games.

**Key features:**
- Team/player management
- Quarter-by-quarter lineup builder with captain selection
- Live scoring
- Stats dashboard (overview, leaders, positions, combos, attendance)
- Share lineup as image
- Dark/light theme
- PWA (installable, offline)

---

## Commands

```bash
npm run dev              # Dev server (port 3000)
npm run dev -- --host    # Dev server with network access (for phone testing)
npm run build            # Production build → dist/
npm run test:run         # Run tests once
npm run test:coverage    # Tests with coverage
```

---

## Architecture

**Tech:** Vanilla JS (ES modules), Vite, Vitest, Google Apps Script backend

**Key files:**
- `src/js/app.js` - Main application logic
- `src/js/api.js` - Data source abstraction (mock/API toggle)
- `src/js/config.js` - API endpoint URL
- `src/js/share-utils.js` - Lineup card generation, sharing
- `src/css/styles.css` - All styles with CSS custom properties

**Patterns:**
- Single HTML file with `<div class="view">` sections
- Global `state` object in app.js
- All onclick handlers attached to `window`
- Always use `escapeHtml()` for user input
- CSS imported via JS (`import '../css/styles.css'`) for Vite 7.x compatibility

---

## Data Structures

```javascript
// Team
{
  teamID, teamName, year, season,
  players: [{ id, name, fillIn, favPosition }],
  games: [{ gameID, round, opponent, date, location, status, captain, scores, lineup }]
}

// Lineup (per game)
{
  Q1: { GS, GA, WA, C, WD, GD, GK, ourGsGoals, ourGaGoals, opponentScore },
  Q2: { ... }, Q3: { ... }, Q4: { ... }
}
```

**Positions:** GS, GA, WA, C, WD, GD, GK

---

## API

**Endpoints** (via Apps Script):
- `?api=true&action=ping` - Health check
- `?api=true&action=getTeams` - List teams
- `?api=true&action=getTeamData&teamID=X&sheetName=Y` - Get team
- `?api=true&action=saveTeamData&sheetName=X&teamData=JSON` - Save team

**Local dev:** Vite proxy at `/gas-proxy` bypasses CORS
**Production:** Direct calls to Apps Script (Google handles CORS)

---

## Netlify Deployment

**Free tier:** 300 credits/month. Auto-deploys DISABLED to conserve credits.

**To deploy changes:**
1. Push to `master` (saves code, won't auto-deploy)
2. Go to Netlify → Deploys tab
3. Click **"Activate builds"**
4. Click **"Trigger deploy"** → **"Clear cache and deploy site"**
5. Wait ~10 seconds for deploy
6. Go to **Site configuration** → **Build & deploy** → **Build settings** → **Stop builds**

**If credits run low:** Switch to Netlify CLI (zero credits):
```bash
npm install -g netlify-cli && netlify login && netlify link
npm run build && netlify deploy --prod
```

**Check usage:** Netlify dashboard → Billing (resets monthly)

---

## Troubleshooting

**Safari + localhost:** Use network IP (`http://192.168.x.x:3000/`) instead of localhost. Safari has issues with Vite 7.x localhost handling.

**Vite parse errors:** Check brace balance with:
```bash
node --check src/js/app.js
```

**Toggle data source:** Dev panel (bottom-right, localhost only) switches between Mock and API.

---

## Future Enhancements (Optional)

- Custom domain (~$12/year)
- Offline sync (background sync when connection restored)
- Push notifications (game reminders)

---

## Session Handoff

At the end of each session, update the "Recent Changes" section at the top of this file with:
- Features added/modified
- Key functions changed
- Any issues to watch for

Then commit and push to deploy.
