# HGNC Team Manager

Team management apps for Hazel Glen Netball Club.

## Apps

| App | URL | Description |
|-----|-----|-------------|
| **Coach's App** | [hgnc-team-manager.pages.dev](https://hgnc-team-manager.pages.dev) | Full team management for coaches |
| **Parent Portal** | [hgnc-gameday.pages.dev](https://hgnc-gameday.pages.dev) | Read-only view for parents |

## Features

- **Lineup Management** - Assign players to positions for each quarter
- **Live Scoring** - Track goals by quarter during games
- **Team Sheet Sharing** - Generate shareable lineup images
- **Season Stats** - Win/loss records, player leaderboards, position tracking
- **Offline Support** - Works without internet, syncs when back online

## Tech Stack

- Vanilla JavaScript (ES modules)
- Vite 7.x for builds
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
