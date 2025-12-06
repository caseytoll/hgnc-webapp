# Workload Identity Federation Terraform (WIF)

This folder contains Terraform templates to create Workload Identity Federation resources and a CI service account for the HGNC WebApp.

Files:
- `workload-identity.tf`: Create the WIF pool, provider and bind a GitHub repo to a service account
- `sa-setup.tf`: Create a service account and IAM bindings, optionally create a key (not recommended)

Prerequisites
- Ensure you have the `terraform` CLI installed (v1.0+ recommended) and a GCP project with billing enabled.
- To bootstrap the WIF resources (first run), you need a GCP admin credential (a user account or a service account JSON key with IAM permissions) to apply the Terraform resources. This can be temporarily supplied as `GOOGLE_CREDENTIALS` environment variable or as `gcloud`-logged-in account.

Bootstrap (manual)
1. Create `terraform.tfvars` file with variables:

```
project_id = "my-gcp-project-id"
sa_id = "hgnc-ci-deployer"
github_repo = "caseytoll/hgnc-webapp"
create_key = false
```

2. Run terraform:

```bash
cd infra
terraform init
terraform apply -var-file=terraform.tfvars
```

3. Terraform outputs will include `service_account_email`, `workload_identity_pool`, and `workload_identity_provider`.

4. Add the `service_account_email` as `GCP_SA_EMAIL` and `workload_identity_provider` as `GCP_WIF_PROVIDER` repo secrets.

CI notes
- The GitHub Action `infra/terraform-apply.yml` can run this terraform with bootstrap credentials, or the OIDC action `ensure-anon-access-oidc.yml` uses WIF auth once the provider exists.
- Avoid storing long-lived SA keys as repo secrets. Use Workload Identity Federation for GitHub OIDC instead.

Security
- If you must create a service account key (`create_key = true`), store it securely and rotate regularly.
- For production, prefer OIDC (no long-lived keys) and minimal roles for the service account.
 - Recommended minimal roles & permissions (least privilege):
	 - `roles/iam.serviceAccountTokenCreator` (for impersonation/OIDC scenarios)
	 - `roles/iam.serviceAccountUser` (optional if the CI needs to act as SA)
	 - Permissions to call Apps Script REST API endpoints used by the CI: `script.projects.get`, `script.projects.deployments.update`, `script.projects.versions.create`.
		 - If you can't grant granular permissions, `roles/script.admin` (or the equivalent managed role that includes these permissions) is acceptable as a temporary step.