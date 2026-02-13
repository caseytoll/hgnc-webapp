# HGNC Deployment Guide

## Current Production Status

| Component | Status | URL |
|-----------|--------|-----|
| Coach's App | ✅ Live | https://hgnc-team-manager.pages.dev |
| Parent Portal | ✅ Live | https://hgnc-gameday.pages.dev |
| Google Apps Script API | ✅ Live (v@10) | https://script.google.com/macros/s/AKfycbwZm-gIyWPg2LvS-PYcPQBGjWXA86tddFvg_10A0TDLNQZdo-B9JZ7a3EKdoA24cyES/exec |

**Last Updated:** February 12, 2026  
**Latest Version:** v2026-02-12 - Team creation wizard restructuring, Squadi auto-detect fixes  
**Tests:** 173/173 passing

---

## Deployment Process

### Coach's App Deployment

```bash
cd /Users/casey-work/webapp-local-dev
npm run build
wrangler pages deploy dist --project-name=hgnc-team-manager --branch=main --commit-dirty=true
```

**Build Output:** `dist/` directory  
**Hosted on:** Cloudflare Pages  
**Features:** Full PWA with editing, offline support, service worker auto-updates  
**Version marker:** `REVISION` in [apps/coach-app/vite.config.js](apps/coach-app/vite.config.js)

### Parent Portal Deployment  

```bash
cd /Users/casey-work/webapp-local-dev/apps/parent-portal
npm run build
wrangler pages deploy dist --project-name=hgnc-gameday --branch=main --commit-dirty=true
```

**Build Output:** `dist/` directory  
**Hosted on:** Cloudflare Pages  
**Features:** Read-only SPA, team-specific routing, no editing controls  
**Routing:** SPA handles `/teams/{slug}/` URLs via client-side router

### Google Apps Script Deployment

```bash
cd /Users/casey-work/webapp-local-dev/apps-script
clasp push                                    # Push code changes to HEAD
clasp deploy -d "Description"                 # Create new versioned deployment
```

**Scripts location:** [apps-script/Code.js](apps-script/Code.js)  
**Current API URL:** https://script.google.com/macros/s/AKfycbwZm-gIyWPg2LvS-PYcPQBGjWXA86tddFvg_10A0TDLNQZdo-B9JZ7a3EKdoA24cyES/exec  
**Config location:** [apps/coach-app/src/js/config.js](apps/coach-app/src/js/config.js)

**Important:** After deploying a new version, Google may cache the web app URL. If testing fails:
- Wait 2-3 minutes for Google's cache to expire
- Or create a new web app deployment via Google Apps Script editor
- Or test with `curl -L` to follow redirects

---

## Pre-Deployment Checklist

- [ ] All tests pass: `npm run test:run` (must be 173/173 passing)
- [ ] Build succeeds: `npm run build` (creates `dist/`)
- [ ] Version bumped: Check `REVISION` in `apps/coach-app/vite.config.js`
- [ ] No console errors: `npm run dev` then check browser DevTools
- [ ] API responding: `curl https://script.google.com/macros/s/.../exec?api=true&action=ping`

---

## Testing

### Unit Tests

```bash
npm run test:run              # Run all tests once
npm run test                  # Run tests in watch mode
npm run test:coverage        # Generate coverage report
```

**Current status:** 173/173 tests passing  
**Test files:**
- `apps/coach-app/src/js/*.test.js` - Unit tests for coach app
- `apps/parent-portal/src/js/*.test.js` - Unit tests for parent portal
- `apps/coach-app/vitest.config.js` - Test configuration

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
curl "https://script.google.com/macros/s/AKfycbwZm-gIyWPg2LvS-PYcPQBGjWXA86tddFvg_10A0TDLNQZdo-B9JZ7a3EKdoA24cyES/exec?api=true&action=ping"

# Get teams
curl "https://script.google.com/macros/s/AKfycbwZm-gIyWPg2LvS-PYcPQBGjWXA86tddFvg_10A0TDLNQZdo-B9JZ7a3EKdoA24cyES/exec?api=true&action=getTeams"

# Get Squadi teams
curl "https://script.google.com/macros/s/AKfycbwZm-gIyWPg2LvS-PYcPQBGjWXA86tddFvg_10A0TDLNQZdo-B9JZ7a3EKdoA24cyES/exec?api=true&action=autoDetectSquadi"
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

## Recent Changes (v2026-02-12)

### Team Creation Wizard
- Restructured from 4 to 6 steps
- Added competition type selection (NFNL, Nillumbik Force, Other)
- Conditional season selection
- Integrated fixture sync setup

### Squadi Integration
- Auto-detect teams from Squadi/Netball Connect competitions
- Detects both "HG" and "Hazel Glen" team name prefixes
- Automatic configuration for fixture sync

### API Updates
- `createTeam` now accepts `ladderUrl` and `resultsApi` parameters
- Backend properly stores integration config
- Maintains backward compatibility with existing teams

### Deployment Status
- ✅ All tests passing (173/173)
- ✅ Both apps building successfully
- ✅ Apps Script deployed (v@10)
- ✅ Squadi auto-detect working end-to-end