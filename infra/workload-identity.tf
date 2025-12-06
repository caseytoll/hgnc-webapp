// Terraform for Workload Identity Federation: Creates a Workload Identity Pool, Provider and binds it to a Service Account
// WARNING: This config is a template. Replace placeholders with your project and GitHub repo owner/repo.

variable "project_id" { type = string }
variable "sa_id" { type = string }
variable "github_repo" { type = string } # e.g. "caseytoll/hgnc-webapp"
variable "wip_name" { type = string, default = "github-wif" }

provider "google" {
  project = var.project_id
}

resource "google_iam_workload_identity_pool" "wip" {
  provider_id = var.wip_name
  display_name = "${var.wip_name} pool"
  description  = "WIF pool for GitHub Actions to impersonate a GCP SA"
}

resource "google_iam_workload_identity_pool_provider" "github_provider" {
  workload_identity_pool_id = google_iam_workload_identity_pool.wip.name
  provider_id = "github"
  display_name = "GitHub Actions provider"
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_mapping = {
    "google.subject" = "assertion.sub",
    "attribute.repository" = "assertion.repository",
  }
}

resource "google_service_account" "ci_sa" {
  account_id   = var.sa_id
  display_name = "HGNC CI Deployer (WIF)"
}

# Bind the service account to allow principal impersonation from the workload pool subjects
resource "google_service_account_iam_binding" "wif_binding" {
  service_account_id = google_service_account.ci_sa.name
  role = "roles/iam.workloadIdentityUser"
  members = [
    "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.wip.name}/attribute.repository/${var.github_repo}"
  ]
}

output "service_account_email" { value = google_service_account.ci_sa.email }
output "workload_identity_pool" { value = google_iam_workload_identity_pool.wip.name }
output "workload_identity_provider" { value = google_iam_workload_identity_pool_provider.github_provider.name }
