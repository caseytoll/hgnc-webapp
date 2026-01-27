CI & Secrets — HGNC WebApp

Overview
--------
This project has a number of GitHub Actions that automate portal generation, monitoring, and optionally Cloudflare Worker publishing.

High-priority secrets
---------------------
- GS_API_URL
  - The Apps Script API base URL (e.g. https://script.google.com/macros/s/XXXXX/exec)
  - Used by generators and monitors
- VIEWER_BASE_URL
  - The public viewer base URL to set canonical links (e.g. https://hgnc-gameday.pages.dev)
  - Used by generators for canonical links and portal redirects
- CF_API_TOKEN (optional)
  - Cloudflare API token with appropriate permissions to publish Workers (and optionally manage routes)
  - Only required if you want the CI to publish Workers automatically
- SLACK_WEBHOOK_URL (optional)
  - Incoming webhook URL for notifications (monitoring alerts)


Workflows & behavior
--------------------
- `generate-team-portals.yml`
  - Generates `/teams/<slug>/` static pages and `/p/<slug>/` portal redirects and commits them to `master`.
  - Requires `GS_API_URL` and `VIEWER_BASE_URL` to be configured as repository secrets; otherwise the job skips gracefully.

- `monitor-api.yml` (consolidated)
  - Runs every 15 minutes, performs:
    - `ping` endpoint check
    - `getTeams` fetch check
    - `getDiagnostics` check for `getTeams_totalMs` spikes (>2000ms)
  - On issues, sends a Slack message (if `SLACK_WEBHOOK_URL`) or opens a GitHub issue.
  - **Requires** `permissions: issues: write` in the job definition for issue creation.
  - All `github-script` API calls must use `github.rest.issues.*` (not `github.issues.*`).
  - Will skip monitoring if `GS_API_URL` is not set.
  - If you see `Resource not accessible by integration`, check workflow permissions.

- `deploy-worker.yml` & `bind-worker-routes.yml`
  - `deploy-worker.yml` can publish the Worker if `CF_API_TOKEN` is present. If missing, the job now skips gracefully.
  - `bind-worker-routes.yml` attempts to bind worker routes via the Zones API; this often cannot bind `pages.dev` domains. If the zone isn't present, the job emits clear manual steps and exits successfully.

Manual steps (Cloudflare Pages worker binding)
---------------------------------------------
Because Pages-managed domains (eg `*.pages.dev`) are not always exposed through the Zones API, you may need to add route bindings manually via the Cloudflare Dashboard:

1. Go to Cloudflare Dashboard → Workers
2. Select your Worker (e.g. `hgnc-team-portals-worker`)
3. Click "Add route" and add:
   - `hgnc-gameday.pages.dev/teams/*`
   - `hgnc-gameday.pages.dev/p/*`
4. Save

If you have access to a Pages-specific API or a token with Pages permissions, we can attempt to automate this as a follow-up.

Next steps for you
------------------
- Add the required secrets to the repository settings: `GS_API_URL`, `VIEWER_BASE_URL` (and `CF_API_TOKEN` if you want Worker automation).

> **Note:** For Cloudflare Pages prebuild to run in the Pages build environment, set `GS_API_URL` and `VIEWER_BASE_URL` as **Environment Variables** in the Pages project settings (Project → Settings → Environment variables). Relying only on GitHub repository secrets will not populate the Pages build environment.
- If you want alerts in Slack, set `SLACK_WEBHOOK_URL`.

If you'd like, I can:
- Add a Slack/Email notification step to the portal generation workflow, or
- Implement Cloudflare Pages API binding (research + implement), or
- Run a scheduled run (manual dispatch) with the secrets temporarily set to confirm end-to-end behavior.
