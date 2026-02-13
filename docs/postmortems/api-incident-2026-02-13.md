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

---

Document prepared: 2026-02-13 — HGNC Team Manager engineering
