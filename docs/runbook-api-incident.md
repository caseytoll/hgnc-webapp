# Runbook — Apps Script / getTeams API incident

When the Apps Script API (getTeams / ping / diagnostics) is failing or returning permission errors (403), follow these steps to restore service and reduce user impact.

1) Triage (first 5 minutes)
- Check GitHub Actions monitor run: `.github/workflows/monitor-api.yml` (runs every 15 minutes).
- Inspect the most recent monitor run for `pingFailed`, `teamsFailed`, or `ping_status` (HTTP code).
- If `ping_status` is 403 → likely Apps Script permission / deployment issue.

2) Immediate mitigation (reduce user-facing failures)
- Deploy a viewer/build that forces `?data=mock` for affected users (quick rollback to mock data):
  - Append `?data=mock` to the public `index.html` for a temporary demo page OR
  - Set `API_CONFIG.useMockData` to `true` and deploy (fastest fix).
- Confirm Coach's App still functions with mock data and that metric spam is suppressed.

3) Investigate Apps Script
- Open the Apps Script deployment (GCP / Apps Script UI) and verify the active deployment's access permissions and "Execute as" settings.
- Check the Apps Script execution log for recent errors.
- Verify OAuth consent / scopes if the script was recently edited or moved to a different GCP project.
- If 403 persists after the script looks correct, verify the published web app URL (script ID) matches the repository `API_CONFIG.baseUrl`.

4) Fix & redeploy
- If deployment version is wrong: create a new Apps Script deployment (Manage deployments → New deployment) and update `API_CONFIG.baseUrl` in source if the URL changed.
- If permissions are wrong: reconfigure sharing/execution settings in Apps Script / GCP.
- After change, run the monitor workflow manually (Actions → Monitor API → Run workflow) to validate.

5) Post-incident
- Ensure the updated Apps Script URL is referenced everywhere (search repo for old script IDs).
- Add a short post-mortem to the incident ticket including root cause and remediation steps.
- Consider adding an automated smoke test (already provided by `monitor-api.yml`).

Notes
- The app has an explicit runtime fallback to mock data when `getTeams` fails; user-facing outages should be minimal if the fallback is healthy.
- The GitHub monitor workflow will create issues when `getTeams` fails or latency spikes. Ensure Slack/GitHub notifications are delivered to the on-call.
