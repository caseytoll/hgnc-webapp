# Project Code Review

Review code changes for this project with awareness of its architecture. $ARGUMENTS

## Review Checklist

### Security
- [ ] All user input rendered with `escapeHtml()` or `escapeAttr()` (from `common/utils.js`)
- [ ] AI-generated content rendered with `formatAIContent()` (escapes HTML first, then formats markdown)
- [ ] No raw string concatenation into HTML templates without escaping
- [ ] `pinToken` included in both save paths: `saveTeamDataWithProtection()` in `api.js` AND `syncToGoogleSheets()` in `app.js`

### Cross-App Consistency
- [ ] Style/layout changes applied to BOTH Coach App and Parent Portal
- [ ] CSS classes match between apps (`.game-item`, `.player-card`, `.stats-hero`, etc.)
- [ ] Shared modules in `common/` not broken by changes
- [ ] Data structures consistent between apps (e.g., `favPosition` as array, not string)

### Data Flow
- [ ] New team fields propagated through all 6+ backend locations and 5+ frontend locations (see CLAUDE.md Change Checklists)
- [ ] `freshTeams` mapping in background revalidation includes all team fields
- [ ] Rollback logic in `saveTeamSettings` covers all mutated state

### Code Quality
- [ ] No dead code introduced
- [ ] Constants used for sentinel values (e.g., `COACH_OTHER_SENTINEL`)
- [ ] `parseInt()` used for goal values from Google Sheets (returns strings)
- [ ] Game status checks handle all values: `upcoming`, `normal`, `abandoned`, `forfeit`, `bye`

### Tests
- [ ] Run `npm run test:run` (Coach App)
- [ ] Run `cd apps/parent-portal && npm run test:run` (Parent Portal)
- [ ] Both builds succeed: `npm run build` and `cd apps/parent-portal && npm run build`
