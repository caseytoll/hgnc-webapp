---
globs: common/**
---

# Common Modules

Both apps import from `common/` — changes here **must be verified in both** coach app and parent portal builds/tests.

- Run `npm run test:run` (coach app from root) AND `cd apps/parent-portal && npm run test:run`
- Build both apps to verify no import/export issues
- CSS changes in `common/styles/shared.css` affect both apps — check visual consistency
- `stats-calculations.js` and `mock-data.js` use the same filter: `g.status === 'normal' && g.scores && isGameInPast(g)`
- `share-utils.js` handles Team Sheet generation used by both apps
