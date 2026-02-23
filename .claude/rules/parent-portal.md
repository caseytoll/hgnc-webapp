---
globs: apps/parent-portal/**
---

# Parent Portal Rules

- **Read-only app**: No edit functionality, no service worker — always fetches fresh data from API
- **Team URLs**: `/teams/{slug}` format, e.g., `/teams/hazel-glen-6`
- **Must match Coach App styling**: Use identical CSS classes for shared UI components (`.game-item`, `.player-card`, `.stats-hero`, etc.)
- **No ladder data**: Parent portal has no access to ladder/difficulty features
- **Theme**: Uses `data-theme` attribute on `<html>`, values: `light` or `dark`
- **Deploy**: `cd apps/parent-portal && npm run build && wrangler pages deploy dist --project-name=hgnc-gameday --branch=main --commit-dirty=true`
