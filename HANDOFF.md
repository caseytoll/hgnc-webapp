# Development Handoff Document
**Date:** 2026-01-24
**Project:** HGNC Team Manager
**Status:** Deployed to Netlify, needs backend integration

> **Handover & Troubleshooting:** See `HANDOVER_SESSION.md` for the latest project status, troubleshooting steps (including Vite parse errors), and onboarding notes for new developers or AI agents.

---

## 🎯 Current Status

See also: `HANDOVER_SESSION.md` for handoff, troubleshooting, and onboarding notes. If you encounter Vite parse errors or encoding issues, follow the steps in that document before making further changes or backend updates.

### ✅ Completed Today

1. **Branding Updated**
   - Changed from "Team Manager" to "HGNC Team Manager"
   - Updated all references (manifest.json, index.html, README, CLAUDE.md, package.json, service worker)
   - Logo: "HGNC" instead of "TM"

2. **New Feature: Position Tracking View**
   - Added new "Positions" tab in Stats section
   - Shows grid of players × positions with quarters played
   - Highlights favorite positions
   - Shows development insights (which players need exposure to which positions)
   - Full styling added to styles.css

3. **Production Deployment**
   - Built production version: `npm run build`
   - Deployed to Netlify
   - Live at: **https://hgnc-team-manager.netlify.app**
   - PWA features working (Add to Home Screen, offline mode)

4. **Development Server**
   - Running with network access: `npm run dev -- --host`
   - Local: http://localhost:3000
   - Network: http://192.168.1.9:3000

5. **All Tests Passing**
   - 173 tests across 4 test files
   - Coverage maintained

---

## 📋 What Needs to Be Done Next

### PRIMARY TASK: Connect Google Apps Script Backend

The app is currently using **mock data only**. User has an existing Google Apps Script backend from their previous Google Sites embed version.

**Required Steps:**

#### 1. Update Google Apps Script CORS Headers

The Apps Script needs to allow requests from the new Netlify domain.

**Location:** User's Google Apps Script project (exact URL unknown)

**Required change:** Add CORS headers to the `doGet` and `doPost` functions:

```javascript
function doGet(e) {
  const output = // ... your existing code

  // Add CORS headers
  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', 'https://hgnc-team-manager.netlify.app')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function doPost(e) {
  // ... existing code

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', 'https://hgnc-team-manager.netlify.app')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Handle preflight requests
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setHeader('Access-Control-Allow-Origin', 'https://hgnc-team-manager.netlify.app')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
}
```

#### 2. Update App Configuration

**File:** `src/js/config.js`

Current state:
```javascript
export const API_CONFIG = {
  BASE_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  TIMEOUT: 10000
};
```

**Action needed:**
- Replace `YOUR_DEPLOYMENT_ID` with actual Google Apps Script deployment ID
- User needs to provide this URL from their Apps Script project

#### 3. Update API Toggle

**File:** `src/js/api.js`

The app has a data source toggle. Current default is 'mock'.

**After backend is connected:**
- Test with live API by clicking dev panel (bottom-right, localhost only)
- Toggle to "API" mode
- Verify data loads from Google Sheets
- Once confirmed working, can change default to 'api' in `src/js/app.js` line 44:
  ```javascript
  const state = {
    dataSource: 'api', // changed from 'mock'
    // ...
  };
  ```

#### 4. Redeploy to Netlify

After configuration changes:
```bash
npm run build
# Drag dist/ folder to Netlify (or it will auto-deploy if GitHub connected)
```

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
