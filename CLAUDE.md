# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Handover & Troubleshooting:** See `HANDOVER_SESSION.md` for the latest project status, troubleshooting steps (including Vite parse errors), and onboarding notes for new developers or AI agents.

## Project Overview

See also: `HANDOVER_SESSION.md` for handoff, troubleshooting, and onboarding notes. If you encounter Vite parse errors or encoding issues, follow the steps in that document before making further changes.

HGNC Team Manager is a Progressive Web App (PWA) for managing Hazel Glen Netball Club teams. It includes features for roster management, game scheduling, lineup planning with quarter-by-quarter player assignments, live scoring, and advanced analytics. The app works offline and can connect to a Google Apps Script backend for data persistence.

## Build & Development Commands

```bash
npm run dev          # Start Vite dev server on port 3000
npm run build        # Build for production (output: dist/)
npm run preview      # Preview production build
npm test             # Run tests in watch mode (Vitest)
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage report
```

## Architecture

### Tech Stack
- **Frontend**: Vanilla JavaScript (ES modules), no framework
- **Build Tool**: Vite
- **Testing**: Vitest with happy-dom
- **Backend**: Google Apps Script (optional, can use mock data)
- **Dependencies**: html2canvas (for lineup image generation)

### Directory Structure
```
/
├── index.html           # Main HTML with all view templates
├── src/
│   ├── css/
│   │   └── styles.css   # All styles including themes
│   └── js/
│       ├── app.js           # Main application logic
│       ├── api.js           # API layer (mock/live toggle)
│       ├── config.js        # API configuration
│       ├── mock-data.js     # Mock data for offline dev
│       ├── utils.js         # Validation & HTML escaping
│       ├── stats-calculations.js  # Analytics calculations
│       └── share-utils.js   # Sharing & export utilities
└── public/
    ├── sw.js            # Service worker for PWA
    ├── manifest.json    # PWA manifest
    └── icons/           # App icons (192x192, 512x512)
```

### Key Patterns

**Data Flow**:
- `api.js` abstracts data source (mock vs live API)
- Toggle between mock/API via dev panel in bottom-right corner (only visible on localhost)
- All data fetched through exported functions in `api.js`
- Vite proxy configured to forward `/api` requests to Google Apps Script backend

**Views & Navigation**:
- Single HTML file with multiple `<div class="view">` sections
- `showView(viewId)` function toggles visibility
- Bottom navigation tabs within main app view

**State Management**:
- Global `appState` object in `app.js` holds current team/game data
- localStorage for theme preference and cached data

**Pure Functions**:
- Business logic in separate modules (`utils.js`, `stats-calculations.js`, `share-utils.js`)
- All pure functions are testable and exported

**Security**:
- Always use `escapeHtml()` from `utils.js` for user-controlled data
- Never insert raw user input into innerHTML

## Testing

Tests use Vitest with happy-dom for DOM simulation. Test files are co-located with source files (`.test.js` suffix).

```bash
# Run all tests in watch mode
npm test

# Run all tests once
npm run test:run

# Run specific test file
npm test src/js/utils.test.js

# Run tests matching a name pattern
npm test -- -t "escapeHtml"

# Run with coverage report
npm run test:coverage
```

Test files:
- `utils.test.js` - Validation and escaping functions
- `mock-data.test.js` - Mock data structure validation
- `stats-calculations.test.js` - Analytics calculations
- `share-utils.test.js` - Sharing and export utilities

## Data Structures

### Team Object
```javascript
{
  teamID: "t1234567890",
  teamName: "U11 Thunder",
  year: 2025,
  season: "Season 1",  // "Season 1" | "Season 2" | "NFNL"
  players: [{ id, name, fillIn, favPosition }],
  games: [{ gameID, round, opponent, date, location, status, scores, lineup }]
}
```

### Game Lineup
```javascript
{
  Q1: { GS, GA, WA, C, WD, GD, GK, ourGsGoals, ourGaGoals, opponentScore },
  Q2: { ... },
  Q3: { ... },
  Q4: { ... }
}
```

### Netball Positions
GS (Goal Shooter), GA (Goal Attack), WA (Wing Attack), C (Centre), WD (Wing Defence), GD (Goal Defence), GK (Goal Keeper)

## Common Tasks

### Adding a New Utility Function
1. Add function to appropriate module (`utils.js`, `share-utils.js`, etc.)
2. Export the function
3. Add tests in corresponding `.test.js` file
4. Import in `app.js` if needed for UI

### Adding a New View/Modal
1. Add HTML structure in `index.html` with appropriate class
2. Add CSS in `styles.css`
3. Add JavaScript handlers in `app.js`
4. Expose handler to window if called from onclick

### Modifying Styles
- CSS custom properties defined at top of `styles.css`
- Light theme overrides in `[data-theme="light"]` selector
- Mobile-first responsive design

## Important Notes

- All UI functions called from HTML onclick must be attached to `window`
- Use `haptic()` from share-utils for tactile feedback on mobile
- The service worker (`public/sw.js`) caches assets for offline use
- Dev tools panel in bottom-right toggles mock/live data (localhost only)
- Canvas dependency required for html2canvas (image generation) - don't remove from devDependencies
- **CSS is imported via JavaScript** (`import '../css/styles.css'` in app.js) for Vite 7.x MIME type compatibility
- **Safari + localhost:** Use network IP (e.g., `http://192.168.x.x:3000/`) instead of `localhost:3000` - Safari has issues with Vite's localhost handling
