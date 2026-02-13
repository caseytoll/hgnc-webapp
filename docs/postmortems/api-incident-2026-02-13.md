# Postmortem — Apps Script / getTeams incident (2026-02-13)

## Summary
On 2026-02-13 the Coach's App experienced failures when fetching team data because the Google Apps Script `getTeams`/`ping` endpoints returned errors or were unreachable. The client fell back inconsistently to mock data causing intermittent user-facing errors.

## Impact
- Users could see missing teams or the coach app falling back to mock data in production in some cases.
- Metrics were noisy while the backend was unavailable.

## Timeline (UTC)
- 01:10 — Reports of fetch/Service Worker errors in production.
- 01:20 — Verified Apps Script ping/getTeams returned 302/403 depending on path; root cause traced to Apps Script deployment/permissions.
- 01:40 — Repointed client `API_CONFIG.baseUrl` to the published Apps Script URL and added runtime health-check + fallback to mock data.
- 02:05 — Downloaded and published missing team/opponent logos; added scheduled refresh workflow.
- 02:25 — Added unit tests, fixed headless test failures, updated monitoring and runbook; deployed patched site.

## Root cause
- Apps Script deployment/permission issues (403 responses) combined with client code that did not clearly surface HTTP status or gracefully degrade in all cases.

## Corrective actions (completed)
- Client: added runtime health-check and automatic fallback to mock data when backend is down.
- Monitoring: `monitor-api.yml` now records HTTP ping status and raises clearer alerts for 403/permission errors.
- Tests: added unit tests for `loadTeams()` fallback and fixed headless UI test issues.
- Assets: downloaded and published missing logos; added `.github/workflows/refresh-team-logos.yml` to refresh assets daily.
- Documentation: added `docs/runbook-api-incident.md` and this postmortem.

## Preventive / long-term
- Continue scheduled monitor runs and add Slack alerts for API permission errors.
- Consider a lightweight synthetic monitor (external) that validates Apps Script web app execution and content.
- Keep scheduled logo refresh and add a CI gate to prevent missing-logo regressions.

## Follow-up actions (open)
- Add post-incident notes to stakeholder channel and update service status page. (owner: Product)
- Add CI badge to README and ensure CI workflow runs on master/main. (owner: Dev)
- Review Apps Script deployment process and add a checklist for redeploying/publishing.

## Additional Learnings from 2026-02-13 Incident Response
During the incident response, several additional breakage points were discovered and fixed, revealing systemic issues that could cause future incidents:

### Breakage Points Fixed
1. **Runtime API Crash**: `callAppsScript()` failed with "undefined url" because `new URL(API_CONFIG.baseUrl)` was called on an undefined value. **Fix**: Always construct URLs safely with proper error handling.
2. **Logo Asset Mapping**: Team slugs were inconsistent (hyphens removed), causing missing logo assets. **Fix**: Preserve hyphens in `slugifyTeamName()` and use centralized `club-logos.json` mapping.
3. **Redundant API Calls**: `getTeamInfo` was called unnecessarily per team load, increasing latency. **Fix**: Only call when `getTeamData` lacks logos/nextFixture.
4. **Merge Conflicts in Production Code**: Leftover Git conflict markers blocked builds. **Fix**: Always resolve conflicts before committing; add pre-commit hooks to detect markers.
5. **Monitoring Blind Spots**: API monitor didn't detect HTTP 403 errors clearly. **Fix**: Enhanced monitor to log HTTP status codes and alert on permission errors.
6. **Build Failures from Conflicts**: JSON and JS files with unresolved conflicts caused parse errors. **Fix**: Implement automated conflict detection in CI.

### Key Learnings
- **URL Construction Robustness**: Always validate base URLs before constructing new URLs; add try-catch around URL operations.
- **Asset Mapping Consistency**: Use a single source of truth (like `club-logos.json`) for all asset lookups; avoid ad-hoc slugging.
- **API Efficiency**: Profile and minimize redundant calls; cache where appropriate.
- **Merge Conflict Hygiene**: Treat unresolved conflicts as build-breaking errors; add linting rules to detect `<<<<<<<`, `=======`, `>>>>>>>`.
- **Monitoring Completeness**: Ensure monitors capture HTTP status codes, not just success/failure; alert on specific error types (403, 500).
- **Build Validation**: Run builds in CI after merges; add smoke tests for critical paths.

### Preventing Recurrence
- **Code Review Checklist**: Require reviews for API config changes, asset mappings, and merge commits.
- **CI Enhancements**: Add a "conflict detector" job that fails builds with unresolved markers; run full builds on PRs.
- **Documentation Updates**: Expand runbook with merge conflict resolution steps and API URL validation.
- **Automated Checks**: Add pre-commit hooks for conflict markers and URL validation.
- **Training**: Document these patterns in team onboarding and incident response training.

---

Document prepared: 2026-02-13 — HGNC Team Manager engineering
