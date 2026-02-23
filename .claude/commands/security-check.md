# Adding a Security Check

Checklist for adding security checks to API endpoints. $ARGUMENTS

---

## Steps

1. **Grep for ALL handlers** of the action being secured — `Code.js` has both GET (`doGet > handleApiRequest`) and POST (`doPost`) paths. `saveTeamData` is POST-only; other actions use GET.
2. **Grep for ALL callers** that hit the secured endpoint — there are TWO code paths that POST to `saveTeamData`: `saveTeamDataWithProtection()` in `api.js` and `syncToGoogleSheets()` in `sync.js`. Both must include auth tokens.
3. Consider abuse scenarios: rate limiting, brute force, lockout
4. Auth checks should fail-open on errors (don't block saves due to transient issues) but log the failure

## General Rules

- When copying a pattern from elsewhere in the codebase, verify it's correct — don't propagate existing gaps
- Always use `escapeHtml()` / `escapeAttr()` for user data in HTML templates
- Use constants for sentinel values (e.g., `COACH_OTHER_SENTINEL`) — never embed magic strings in templates
- Rollback logic must cover ALL state mutations (currentTeam, currentTeamData, teams list entry)
