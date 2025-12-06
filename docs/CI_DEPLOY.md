# CI: Ensure Apps Script Deployment is Anonymous

This document explains how to configure the CI pipeline to ensure the production Apps Script deployment (`exec` URL) is set to `Anyone (even anonymous)` after deployments.

## Overview

We’ve added the code and workflows to:
- Ensure the `appsscript.json` manifest requests `ANYONE_ANONYMOUS` by default
- Provide a `scripts/ensure-deploy-access.js` script that uses the Apps Script REST API to patch the deployment access
- Add a GitHub Actions workflow `.github/workflows/ensure-anon-access.yml` that runs the script after pushes / releases

## Why this is necessary
Deployments can change access permissions if the manifest or deploy commands do not explicitly set `ANYONE_ANONYMOUS`. This pipeline step verifies and, if needed, patches the deployment to keep the public exec URL accessible to anonymous users.

## GCP service account setup (for the GitHub Action)

1) Ensure the Google Cloud project that owns the Apps Script project has `Apps Script API` enabled.
2) In the GCP Console, create a service account. Give it at least these roles on the project:
   - `Editor` (or a role with `script.deployments.update` / `script.projects` permissions)
3) Create a JSON key for the service account. Download the JSON file.

## GitHub secrets
Add the following secrets to your repo (Repository → Settings → Secrets & variables → Actions):
- `GCP_SA_KEY` => Paste the whole JSON content of the service account key file.
- `SCRIPT_ID` => Copy the `scriptId` from `.clasp.json` (or your Apps Script project’s scriptId).
- `DEPLOYMENT_ID` => The deployment id used for production (the stable, numbered deployment id)

Optionally, you may add a `PROD_DEPLOYMENT_ID` secret (same as `DEPLOYMENT_ID`) and update `.github/workflows/runtime-smoke-test.yml` to point to it.

## Running the workflow
- The workflow `.github/workflows/ensure-anon-access.yml` runs on commit to `master` and can be manually triggered via the GitHub UI.
- It will use `GCP_SA_KEY` to authenticate, patch the deployment entryPoints to set `webApp.access` to `ANYONE_ANONYMOUS`, then run the runtime smoke test to confirm the exec URL is accessible.

## Manual steps (if you prefer UI)
If something fails in CI, you can also fix the deployed access via the Apps Script UI:
1) Go to https://script.google.com, find the project
2) Deploy → Manage deployments
3) Edit the production deployment and set "Who has access" to "Anyone (even anonymous)"

## Notes & troubleshooting
- If the `Clasp` CLI is used in CI, ensure it is up to date and supports `--access ANYONE_ANONYMOUS` in `clasp deploy`.
- Service account permissions must be sufficient to patch the deployment. If you get `403` or `permission denied`, review the service account IAM role and ensure the Apps Script project is under the same GCP project or that you have granted permissions properly.
- The workflow uses a Node script (`scripts/ensure-deploy-access.js`) that performs a PATCH to the Apps Script REST API. This ensures the webapp entryPoints webApp.access is set to `ANYONE_ANONYMOUS` and safeguards the public exec URL.

If you want me to implement programmatic creation of the service account or a token rotation mechanism for keys, I can help extend these steps.