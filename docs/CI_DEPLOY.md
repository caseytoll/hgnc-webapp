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
   
### Terraform snippet

If you prefer Terraform to create the service account and bind roles, here's a simple snippet (the sample is also included under `infra/sa-setup.tf` in the repo):

1. Create `terraform.tfvars` with your project id and optionally `create_key = true` (not recommended for long-lived keys):

```
project_id = "my-gcp-project-id"
sa_id = "hgnc-ci-deployer"
create_key = false
```

2. Run:

```bash
terraform init
terraform apply -var-file=terraform.tfvars
```

3. If you created a key (`create_key = true`), the key will be available in `output.create_sa_key` — store it as a GitHub secret `GCP_SA_KEY`.

Security note: Prefer using Workload Identity Federation instead of generating and storing long-lived JSON keys. See below.

### gcloud CLI sample (manual path)
Instead of Terraform, the `gcloud` CLI commands below create the service account and attach roles:

```bash
gcloud iam service-accounts create hgnc-ci-deployer --project=my-gcp-project-id --display-name="HGNC CI Deployer"
gcloud projects add-iam-policy-binding my-gcp-project-id \
   --member="serviceAccount:hgnc-ci-deployer@my-gcp-project-id.iam.gserviceaccount.com" \
   --role="roles/editor"
# Create a key
gcloud iam service-accounts keys create key.json --iam-account=hgnc-ci-deployer@my-gcp-project-id.iam.gserviceaccount.com
```

Then copy/paste the `key.json` contents into the GitHub repository Secret `GCP_SA_KEY`.

### Workload Identity Federation (recommended)
If possible, prefer GitHub OIDC (Workload Identity Federation) rather than storing a long-lived service account key in GitHub Secrets. This involves:

- Enabling Workload Identity Pool in Google Cloud
- Creating a provider binding GitHub repo to a GCP service account
- Granting the service account minimal privileges and using short-lived tokens

### Terraform example for Workload Identity Federation
The repository includes `infra/workload-identity.tf` which creates the workload identity pool + provider and a service account.
You should configure the provider with your `project_id`, `sa_id` and `github_repo` (the repo in the form `owner/repo`). Example:

```hcl
variable "project_id" { default = "my-gcp-project" }
variable "sa_id" { default = "hgnc-ci-deployer" }
variable "github_repo" { default = "caseytoll/hgnc-webapp" }
```

Apply the Terraform, then copy the `workload_identity_provider` output and the `service_account_email` output to your repository secrets:

- `GCP_WIF_PROVIDER` => the full provider resource name
- `GCP_SA_EMAIL` => the service account email (used by the OIDC auth action to impersonate SA)

### GitHub Actions OIDC auth example
The repo contains a workflow `.github/workflows/ensure-anon-access-oidc.yml` that:
- Uses `google-github-actions/auth@v1` to authenticate using the `GCP_WIF_PROVIDER` and `GCP_SA_EMAIL` secrets
- Calls `gcloud auth print-access-token` to get a short-lived access token
- Runs `node ./scripts/ensure-deploy-access.js` with the token set in `GCP_OIDC_TOKEN` to patch the deployment

Remember that Workload Identity Federation eliminates the need to store a long-lived SA key in GitHub secrets and is generally better for security.

Examples and a Terraform integration are beyond this doc; if you prefer this option, say the word and I’ll add a Terraform module and GitHub Action snippet to use OIDC instead of JSON keys.


## GitHub secrets
Add the following secrets to your repo (Repository → Settings → Secrets & variables → Actions):
- `GCP_SA_KEY` => Paste the whole JSON content of the service account key file.
- `SCRIPT_ID` => Copy the `scriptId` from `.clasp.json` (or your Apps Script project’s scriptId).
- `DEPLOYMENT_ID` => The deployment id used for production (the stable, numbered deployment id)
 - `GITHUB_OIDC_PROVIDER` (optional) => If using Workload Identity Federation, add provider details. This uses fewer long-lived secrets and is the preferred approach.

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