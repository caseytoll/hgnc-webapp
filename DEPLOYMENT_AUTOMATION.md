# HGNC Deployment Guide

## Current Production Status

| Component | Status | URL |
|-----------|--------|-----|
| Coach's App | ✅ Live | https://hgnc-team-manager.pages.dev |
| Parent Portal | ✅ Live | https://hgnc-gameday.pages.dev |
| Google Apps Script API | ✅ Live | https://script.google.com/macros/s/AKfycbz3DmnPOLstWmOmJs4nzDQn42XXWe0E2ujLpmfo4e4WZFkInXxUdeL8-W0SImYj9EQj/exec |

---

## Deployment Process

### Coach's App Deployment

```bash
cd /Users/casey-work/webapp-local-dev
npm run build
cd apps/coach-app && wrangler pages deploy dist --project-name=hgnc-team-manager --branch=master --commit-dirty=true
```

**Build Output:** `dist/` directory
**Hosted on:** Cloudflare Pages (production branch: `master`)
**Features:** Full PWA with editing, offline support, service worker auto-updates
**Version marker:** `REVISION` in [apps/coach-app/vite.config.js](apps/coach-app/vite.config.js)

### Parent Portal Deployment

```bash
cd /Users/casey-work/webapp-local-dev/apps/parent-portal
npm run build
wrangler pages deploy dist --project-name=hgnc-gameday --branch=main --commit-dirty=true
```

**Build Output:** `dist/` directory
**Hosted on:** Cloudflare Pages (production branch: `main`)
**Features:** Read-only SPA, team-specific routing, no editing controls
**Routing:** SPA handles `/teams/{slug}/` URLs via client-side router

### Google Apps Script Deployment

```bash
cd /Users/casey-work/webapp-local-dev/apps-script
clasp push                                    # Push code changes to HEAD
clasp deploy -i AKfycbz3DmnPOLstWmOmJs4nzDQn42XXWe0E2ujLpmfo4e4WZFkInXxUdeL8-W0SImYj9EQj -d "Description"
```

**Scripts location:** [apps-script/Code.js](apps-script/Code.js)
**Apps Script project:** `18WnCpSMg2dfyNCVQIuu57bGS20w0J9AqdC7b4Zly1O7LhxKJNfJ2J-eV`
**Current API URL:** https://script.google.com/macros/s/AKfycbz3DmnPOLstWmOmJs4nzDQn42XXWe0E2ujLpmfo4e4WZFkInXxUdeL8-W0SImYj9EQj/exec
**Config location:** [apps/coach-app/src/js/config.js](apps/coach-app/src/js/config.js)

**Important:** After deploying a new version, Google may cache the web app URL. If testing fails:
- Wait 2-3 minutes for Google's cache to expire
- Or create a new web app deployment via Google Apps Script editor
- Or test with `curl -L` to follow redirects

---

## Pre-Deployment Checklist

- [ ] All tests pass: `npm run test:run` (Coach App) and `cd apps/parent-portal && npm run test:run` (Parent Portal)
- [ ] Build succeeds: `npm run build` (creates `dist/`)
- [ ] Version bumped: Check `REVISION` in `apps/coach-app/vite.config.js`
- [ ] No console errors: `npm run dev` then check browser DevTools
- [ ] API responding: `curl -L "https://script.google.com/macros/s/AKfycbz3DmnPOLstWmOmJs4nzDQn42XXWe0E2ujLpmfo4e4WZFkInXxUdeL8-W0SImYj9EQj/exec?api=true&action=ping"`

---

## Testing

### Unit Tests

```bash
npm run test:run              # Run all coach app tests once
cd apps/parent-portal && npm run test:run  # Run parent portal tests
npm run test                  # Run tests in watch mode
npm run test:coverage        # Generate coverage report
```

**Test files:**
- `apps/coach-app/src/js/*.test.js` - Unit tests for coach app
- `apps/parent-portal/src/js/*.test.js` - Unit tests for parent portal

### Manual Testing

**Coach's App Features:**
1. Create team with 6-step wizard
2. Create game and add lineup
3. Score game in real-time
4. Toggle offline mode (DevTools → Network → Offline)
5. Resync when back online
6. Generate team sheet

**Parent Portal Features:**
1. View team page: https://hgnc-gameday.pages.dev/teams/{slug}/
2. View latest games
3. View season stats
4. Verify no editing controls visible
5. Test on mobile (responsive)

**API Testing:**

```bash
# Health check
curl -L "https://script.google.com/macros/s/AKfycbz3DmnPOLstWmOmJs4nzDQn42XXWe0E2ujLpmfo4e4WZFkInXxUdeL8-W0SImYj9EQj/exec?api=true&action=ping"

# Get teams
curl -L "https://script.google.com/macros/s/AKfycbz3DmnPOLstWmOmJs4nzDQn42XXWe0E2ujLpmfo4e4WZFkInXxUdeL8-W0SImYj9EQj/exec?api=true&action=getTeams"

# Get Squadi teams
curl -L "https://script.google.com/macros/s/AKfycbz3DmnPOLstWmOmJs4nzDQn42XXWe0E2ujLpmfo4e4WZFkInXxUdeL8-W0SImYj9EQj/exec?api=true&action=autoDetectSquadi"
```

---

## Rollback Procedure

If a deployment causes issues:

1. **Coach's App:** Deploy previous `dist/` commit via Cloudflare Pages
2. **Parent Portal:** Deploy previous `dist/` commit via Cloudflare Pages
3. **Apps Script:** Revert to previous deployment version via clasp or Google Console

```bash
# View all App Script deployments
cd apps-script && clasp deployments

# If needed, delete problematic deployment (select when prompted)
# No action needed - old deployments remain accessible via ID
```

---

## Architecture

- **Frontend:** Vanilla JS (ES modules), Vite builds, Cloudflare Pages hosting
- **Backend:** Google Apps Script with Google Sheets
- **Caching:** Client-side localStorage, 5-minute API cache with stale-while-revalidate
- **Offline:** Service worker persists data, syncs on reconnect
- **Auth:** Optional per-team PIN system with device tokens

---

## Key Configuration

| Config | Value |
|--------|-------|
| Apps Script Project | `18WnCpSMg2dfyNCVQIuu57bGS20w0J9AqdC7b4Zly1O7LhxKJNfJ2J-eV` |
| Google Sheet | `13Dxn41HZnClcpMeIzDXtxbhH-gDFtaIJsz5LV3hrE88` |
| Deployment ID | `AKfycbz3DmnPOLstWmOmJs4nzDQn42XXWe0E2ujLpmfo4e4WZFkInXxUdeL8-W0SImYj9EQj` |
| Coach App CF branch | `master` |
| Parent Portal CF branch | `main` |
