---
globs: apps/coach-app/src/js/**
---

# Coach App Module Architecture

- **app.js is ~250 lines** — entry point with theme, init, and module imports only
- **18 ES modules** — each self-registers via `window.*` for onclick handlers
- **Shared state**: All modules import `state` from `state.js` (single object reference, mutations visible everywhere)
- **Cross-module calls require `window.*`**: Feature modules don't import each other. Functions called from other modules MUST be assigned to `window` (e.g., `window.renderStats = renderStats`). Plain `function` or `export function` is NOT visible cross-module at runtime.
- **Broken refs cause mock data fallback**: If a `window.someFn()` call throws ReferenceError during `renderTeamList` or tab switching, the app's catch block falls back to mock data — making it look like the API is down when it's actually a missing window assignment.
- **ES module imported `let` is read-only**: Can't write `hasPendingChanges = false` from another module. Use the module's own setter function instead (e.g., `updateSyncIndicator('synced')`).
- **Key modules**: `data-loader.js` (team loading, fixture sync), `rendering.js` (schedule, roster, ladder), `team-settings.js` (settings UI + save), `wizard.js` (create team), `sync.js` (Google Sheets sync)
