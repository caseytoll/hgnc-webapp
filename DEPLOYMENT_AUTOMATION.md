# HGNC Viewer Automation & Deployment Guide

## Overview
This document describes the fully automated process for building, testing, and deploying the Hazel Glen Netball Club (HGNC) read-only viewer for all teams. The process ensures:
- All editing is disabled in the viewer (read-only enforcement)
- Team-specific landing and portal pages are generated
- Formatting and features match the main app
- All automation is robust and test-verified

## Automation Steps

### 1. Validate Read-Only Enforcement
- All editing controls are hidden/disabled in the viewer (`/viewer/src/js/app.js`)
- All mutation actions are blocked
- Parity with main app is maintained

### 2. Build Process
- Run `npm run build:readonly:team` for team-specific builds
- Run `npm run build:readonly` for general read-only viewer build
- Run `npm run build` for the main app
- Output is written to `/viewer/dist/` for the viewer

### 3. Team-Specific Routing & Portals
- Run `node scripts/generate-team-portals.cjs --api <GS_API_URL> --out public/` to generate static portal pages for each team
- Output: `/public/hgnc-team-portal-<slug>.html` and `/public/team-portal-index.json`

### 4. Testing & Validation
- Run `npm run test:run` to execute all unit and integration tests
- All tests must pass (172/172 passing as of last run)

### 5. Deployment
- Use `npm run deploy:readonly-viewer` or `npm run deploy:readonly-viewer:team` for production deploys
- Deploys to Cloudflare Pages (or configured static host)

## Scripts Reference
- `build:readonly` / `build:readonly:team`: Build viewer in read-only mode
- `generate:team-portals`: Generate static team portal pages
- `deploy:readonly-viewer`: Build and deploy the viewer

## Maintenance Notes
- All scripts are in `/scripts/` and referenced in `package.json`
- Read-only logic is enforced in `/viewer/src/js/app.js` and related files
- Team portal generation is robust to API or file-based team lists
- All code is covered by automated tests (see `/src/js/*.test.js`)

## Troubleshooting
- If builds fail, check for missing environment variables (e.g., `GS_API_URL`)
- If portal generation fails, ensure API is reachable and returns valid JSON
- For test failures, run `npm run test:run` and review output

---

_Last updated: 2026-01-28_