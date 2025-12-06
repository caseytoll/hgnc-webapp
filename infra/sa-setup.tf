// Terraform snippet to create a Service Account and bind roles for Apps Script deployment
// Usage:
//   - Create terraform.tfvars with `project_id = "your-gcp-project"` and optionally `create_key = true`
//   - Run `terraform init` and `terraform apply` to create the SA and optionally create a JSON key
// IMPORTANT: Creating an SA key is sensitive; prefer Workload Identity Federation where possible.

variable "project_id" {
  description = "GCP project id"
  type        = string
}

variable "sa_id" {
  description = "Service account id (no @). Example: hgnc-ci-deployer"
  type        = string
  default     = "hgnc-ci-deployer"
}

variable "roles" {
  description = "List of IAM roles to bind to the service account"
  type = list(string)
  default = [
    "roles/editor", // Alternatively restrict roles to script.projects and script.deployments
    // "roles/cloudfunctions.developer",
    // "roles/script.projects",  // Not always required: check Apps Script API permissions
  ]
}

variable "create_key" {
  description = "Whether to create a short-lived SA key in TF output (set false for production)"
  type = bool
  default = false
}

provider "google" {
  project = var.project_id
}

resource "google_service_account" "sa" {
  account_id   = var.sa_id
  display_name = "HGNC CI deployer service account"
}

resource "google_project_iam_member" "sa_bindings" {
  for_each = toset(var.roles)
  project  = var.project_id
  role     = each.key
  member   = "serviceAccount:${google_service_account.sa.email}"
}

resource "google_service_account_key" "sa_key" {
  count        = var.create_key ? 1 : 0
  service_account_id = google_service_account.sa.name
  # Set key algorithm: KEY_ALG_RSA_2048 (default)
  # Note: store key securely and rotate them often
}

output "service_account_email" {
  value = google_service_account.sa.email
}

output "create_sa_key" {
  value = var.create_key ? google_service_account_key.sa_key[0].private_key : "NO_KEY_CREATED"
  description = "Base64-encoded JSON key (only when create_key=true). Avoid enabling in CI outputs, use externally secure storage."
  sensitive = true
}
