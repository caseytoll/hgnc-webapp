# HGNC Parent Portal Automation & Deployment Guide

## Overview
This document describes the fully automated process for building, testing, and deploying the Hazel Glen Netball Club (HGNC) Parent Portal - the read-only viewer SPA for parents and spectators. The Parent Portal is separate from the Coach's App and provides view-only access to team information.

The process ensures:
- All editing controls are hidden/disabled in the Parent Portal (`/viewer/src/js/app.js`)
- All mutation actions are blocked (read-only enforcement)
- Team-specific landing pages are handled by SPA routing (e.g., `/teams/{slug}`)
- Formatting and features are optimized for read-only viewing
- All automation is robust and test-verified

## Applications

### Coach's App (`/`)
- **Location:** Root directory
- **Purpose:** Full-featured PWA for coaches with editing capabilities
- **Build:** `npm run build`
- **Deploy:** `npm run build && wrangler pages deploy dist --project-name=hgnc-team-manager`

### Parent Portal (`/viewer/`)
- **Location:** `viewer/` directory
- **Purpose:** Read-only SPA for parents and spectators
- **Build:** `npm run build:readonly`
- **Deploy:** `npm run deploy:readonly-viewer`

## Automation Steps

### 1. Validate Read-Only Enforcement
- All editing controls are hidden/disabled in the Parent Portal (`/viewer/src/js/app.js`)
- All mutation actions are blocked
- Parity with Coach's App viewing features is maintained

### 2. Build Process
- Run `npm run build:readonly` for the Parent Portal SPA build
- Run `npm run build` for the Coach's App
- Output is written to `/viewer/dist/` for the Parent Portal

### 3. Team-Specific Routing
- Team-specific landing pages are handled by SPA routing at https://hgnc-gameday.pages.dev (e.g., `/teams/{slug}`)
- No static HTML generation or per-team deploys required

### 4. Testing & Validation
- Run `npm run test:run` to execute all unit and integration tests
- All tests must pass (172/172 passing as of last run)

### 5. Deployment
- Use `npm run deploy:readonly-viewer` for production deploys of the SPA to Cloudflare Pages.

## Scripts Reference
- `build:readonly`: Build viewer in read-only mode
- `deploy:readonly-viewer`: Build and deploy the SPA viewer

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