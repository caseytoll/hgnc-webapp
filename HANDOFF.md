# Development Handoff Document
**Date:** 2026-01-24
**Project:** HGNC Team Manager
**Status:** ✅ Fully deployed with live backend

> **Handover & Troubleshooting:** See `HANDOVER_SESSION.md` for the latest project status, troubleshooting steps, and onboarding notes.

---

## 🎯 Current Status

**The app is fully functional with live backend integration.**

- **Production:** https://hgnc-team-manager.netlify.app
- **GitHub:** https://github.com/caseytoll/hgnc-webapp (auto-deploys on push)
- **Backend:** Google Apps Script connected and working
- **Teams:** U11 Flames, Hazel Glen 6 (loading from Google Sheets)

### ✅ Completed (2026-01-24)

1. **Backend Integration**
   - Connected to Google Apps Script backend
   - Real team data loading from Google Sheets
   - API calls working (getTeams, getTeamData, saveTeamData)
   - Local dev uses Vite proxy, production calls Apps Script directly

2. **GitHub + Auto-Deploy**
   - Repo: https://github.com/caseytoll/hgnc-webapp
   - Push to `master` → automatic Netlify deploy
   - Old Apps Script version tagged as `legacy-apps-script`

3. **Bug Fixes**
   - Fixed Vite parse error (missing closing brace)
   - Fixed `calculateMockStats` missing function
   - Fixed Safari/localhost CSS MIME type issue
   - Fixed `saveGameSettings` variable ordering
   - Fixed `loadFromLocalStorage` to restore all game fields

4. **All Tests Passing**
   - 173 tests across 4 test files
   - Coverage maintained

---

## 📋 Future Enhancements (Optional)

All critical features are working. These are optional improvements:

1. **Custom Domain** (~$12/year) - Currently using `hgnc-team-manager.netlify.app`
2. **Offline Sync** - Currently works offline with cached data, could add background sync
3. **Push Notifications** - Remind about upcoming games

---

## 🔧 Backend Configuration (Reference)

**Apps Script URL:**
```
https://script.google.com/macros/s/AKfycbyBxhOJDfNBZuZ65St-Qt3UmmeAD57M0Jr1Q0MsoKGbHFxzu8rIvarJOOnB4sLeJZ-V/exec
```

**Google Sheet ID:** `13Dxn41HZnClcpMeIzDXtxbhH-gDFtaIJsz5LV3hrE88`

**API Endpoints:**
- `?api=true&action=ping` - Health check
- `?api=true&action=getTeams` - List all teams
- `?api=true&action=getTeamData&teamID=X&sheetName=Y` - Get team details
- `?api=true&action=saveTeamData&sheetName=X&teamData=JSON` - Save team data

**How API works:**
- **Local dev:** Vite proxy at `/gas-proxy` → Apps Script (bypasses CORS)
- **Production:** Direct calls to Apps Script (Google handles CORS for GET requests)

---

## 🏗️ Project Architecture Recap

### Key Decisions Made

1. **Multi-season/multi-team support:** App is branded "HGNC Team Manager" not tied to a specific team
2. **Deployment:** Netlify (not Google Sites) for proper PWA support
3. **Backend:** Keep existing Google Apps Script + Sheets
4. **Cost:** $0/month (all free tiers)

### Tech Stack
- Vanilla JavaScript (no framework)
- Vite for build/dev
- Vitest for testing
- Progressive Web App (PWA)
- Google Apps Script backend (optional, can use localStorage only)

### Important Files

**Configuration:**
- `src/js/config.js` - API endpoint URL
- `src/js/api.js` - Data source abstraction layer
- `vite.config.js` - Dev server config (includes API proxy)
- `netlify.toml` - Deployment config

**Core Logic:**
- `src/js/app.js` - Main application (2000+ lines)
- `src/js/stats-calculations.js` - Analytics calculations
- `src/js/share-utils.js` - Export/sharing utilities
- `src/js/utils.js` - Validation and escaping

**Styling:**
- `src/css/styles.css` - All styles (3500+ lines)
- Uses CSS custom properties for theming
- Mobile-first responsive design

**PWA:**
- `public/manifest.json` - PWA manifest
- `public/sw.js` - Service worker for offline mode

---

## 🧪 Testing & Development

### Run Development Server
```bash
npm run dev              # localhost only
npm run dev -- --host    # expose on network (for phone testing)
```

### Run Tests
```bash
npm test                 # watch mode
npm run test:run         # run once
npm run test:coverage    # with coverage report
```

### Build for Production
```bash
npm run build            # outputs to dist/
npm run preview          # preview production build locally
```

---

## 📱 App Features

### Existing Features (Working with Mock Data)
- Team roster management
- Game scheduling
- Lineup builder (drag-and-drop)
- Quarter-by-quarter scoring
- Statistics dashboard with 5 tabs:
  - Overview (team stats)
  - Leaders (top scorers, positions)
  - **Positions (NEW)** - Position tracking grid
  - Combos (successful partnerships)
  - Attendance (who shows up to games)
- Share lineup as image
- Export/import team data (JSON)
- Dark/light theme toggle
- PWA install (offline mode)

### Target User
- Junior netball coach (U11s)
- Needs fair playing time distribution
- Wants to track which positions each player has tried
- Uses app on phone at games (often no internet)

---

## 🔍 Important Context

### User's Background
- Previously used Google Apps Script embedded in Google Sites
- Moving to proper PWA for better UX
- iPhone user
- Manages teams across multiple seasons (name changes)
- Wants professional setup but zero cost

### Mock Data
Sample team "U11 Thunder" with:
- 10 players (9 regular, 1 fill-in)
- 3 games (2 completed with lineups, 1 upcoming)
- Full position rotation examples

Located in: `src/js/mock-data.js`

---

## ❓ Questions to Ask User in Next Session

1. **Google Apps Script URL:** What is your Apps Script deployment URL?
   - Format: `https://script.google.com/macros/s/[DEPLOYMENT_ID]/exec`
   - User can get this from Apps Script → Deploy → Manage Deployments

2. **Backend Data Structure:** Does your Google Sheets backend match the data structure in `mock-data.js`?
   - If not, may need to adjust API layer

3. **Access Control:** Do you want to keep the app public, or add any authentication?
   - Current: Anyone with URL can access
   - Mock data mode: Data is local to device (localStorage)
   - API mode: Shared across all users hitting the same Apps Script

4. **Custom Domain:** Do you want to purchase a custom domain (~$12/year) or keep `hgnc-team-manager.netlify.app`?

---

## 🚀 Quick Commands Reference

```bash
# Development
npm run dev                  # Start dev server
npm run dev -- --host        # Dev server with network access
npm test                     # Run tests
npm run build                # Build for production

# Check running processes
lsof -i :3000               # Check if dev server running

# File locations
/Users/casey-work/webapp-local-dev/src/js/config.js        # API config
/Users/casey-work/webapp-local-dev/dist/                   # Production build
/Users/casey-work/webapp-local-dev/CLAUDE.md               # AI assistant guide
```

---

## 📦 Current File Structure

```
/Users/casey-work/webapp-local-dev/
├── dist/                    # Production build (deploy this to Netlify)
├── public/
│   ├── sw.js               # Service worker
│   ├── manifest.json       # PWA manifest
│   └── icons/              # App icons
├── src/
│   ├── css/
│   │   └── styles.css      # All styles (includes new position tracking CSS)
│   └── js/
│       ├── app.js          # Main app (includes new renderStatsPositions function)
│       ├── api.js          # Data source abstraction
│       ├── config.js       # API endpoint (NEEDS UPDATE)
│       ├── mock-data.js    # Sample data
│       ├── utils.js        # Utilities
│       ├── stats-calculations.js
│       └── share-utils.js
├── index.html              # Main HTML
├── package.json            # Dependencies
├── vite.config.js          # Vite config
├── vitest.config.js        # Test config
├── netlify.toml            # Netlify deployment config
├── CLAUDE.md               # Project guide for AI
├── README.md               # Documentation
└── HANDOFF.md              # This file
```

---

## 🎓 For the Next AI Assistant

**Context you need to know:**

This is a Progressive Web App for managing junior netball teams. The user is a coach who wants to:
1. Track fair playing time across positions
2. Use it offline at games
3. Keep it simple and fast
4. Avoid over-engineering

**Current priority:** Connect the Google Apps Script backend so the app uses real data instead of mock data.

**Key architectural decisions:**
- No framework (vanilla JS) - keep it simple
- PWA-first - offline mode is critical
- Mobile-optimized - used on phone during games
- Pure functions in separate modules - everything is testable

**Code style:**
- Use `escapeHtml()` from utils.js for all user input
- All functions called from HTML onclick must be attached to `window`
- Keep CSS in one file with custom properties
- Tests co-located with source files (`.test.js` suffix)

**Important:** The position tracking feature was just added and is a key differentiator. Coaches can now see at a glance which positions each player needs exposure to.

---

## ✅ Ready for Next Session

The codebase is clean, tested, and deployed. The app works perfectly with mock data.

**Next session should focus on:** Getting the Google Apps Script URL from the user and integrating the backend.

**Success criteria:**
- User can load their real team data from Google Sheets
- CRUD operations work (create teams, update lineups, save scores)
- Data persists across devices
- No errors in console

---

## 📞 Deployment Info

**Live URL:** https://hgnc-team-manager.netlify.app
**Netlify Account:** User's account (signed up during this session)
**Site Name:** hgnc-team-manager
**Deploy Method:** Manual drag-and-drop of dist/ folder
**Future Option:** Connect to GitHub for auto-deploys

---

**End of Handoff Document**
