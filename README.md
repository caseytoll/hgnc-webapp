# HGNC Team Manager

[![Deploy Pages Site](https://github.com/caseytoll/hgnc-webapp/actions/workflows/deploy-pages.yml/badge.svg?branch=master)](https://github.com/caseytoll/hgnc-webapp/actions/workflows/deploy-pages.yml)

Team management PWA for Hazel Glen Netball Club coaches, with read-only parent portal.

## Apps

| App | URL | Status |
|-----|-----|--------|
| **Coach's App** | [hgnc-team-manager.pages.dev](https://hgnc-team-manager.pages.dev) | ✅ Production |
| **Parent Portal** | [hgnc-gameday.pages.dev](https://hgnc-gameday.pages.dev) | ✅ Production |

## Latest Release (v2026-02-12)

### Team Creation Wizard  
- 6-step wizard with competition type selection (NFNL, Nillumbik Force, Other)
- Conditional season selection and fixture sync setup
- Full validation with duplicate detection

### Squadi Integration  
- ✅ Auto-detect teams from Squadi/Netball Connect competitions
- ✅ Detects both "HG" and "Hazel Glen" team name prefixes
- Automatic fixture sync configuration

## Features

- **Lineup Management** - Assign players to positions for each quarter
- **Live Scoring** - Track goals by quarter during games  
- **Team Sheet Sharing** - Generate shareable lineup images
- **Season Stats** - Win/loss records, player leaderboards, position tracking
- **Offline Support** - Works without internet, syncs when back online
- **Fixture Integration** - Sync from Squadi, Netball Connect, or GameDay
- **AI Insights** - AI-powered season analysis and player recommendations

## Tech Stack

- Vanilla JavaScript (ES modules)
- Vite 7.x for builds  
- Vitest for unit testing
- Google Apps Script backend
- Cloudflare Pages hosting

## Development

```bash
# Coach's App
cd apps/coach-app
npm install
npm run dev

# Parent Portal
cd apps/parent-portal
npm install
npm run dev
```

See [CLAUDE.md](./CLAUDE.md) for detailed documentation.
