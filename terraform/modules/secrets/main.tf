variable "project_id" {
  type = string
}

variable "gemini_api_key" {
  type      = string
  sensitive = true
}

variable "azure_subscription_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "azure_tenant_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "azure_client_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "azure_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "slack_webhook_url" {
  type      = string
  sensitive = true
  default   = ""
}

variable "service_account_email" {
  type        = string
  description = "Service account email that needs access to secrets"
}

# Gemini API Key
resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "gemini-api-key"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "gemini_api_key" {
  secret      = google_secret_manager_secret.gemini_api_key.id
  secret_data = var.gemini_api_key
}

# IAM binding to allow service account to access gemini-api-key secret
resource "google_secret_manager_secret_iam_member" "gemini_api_key_access" {
  secret_id = google_secret_manager_secret.gemini_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.service_account_email}"
}

# Azure Credentials (if provided)
resource "google_secret_manager_secret" "azure_credentials" {
  count     = var.azure_subscription_id != "" ? 1 : 0
  secret_id = "azure-credentials"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "azure_credentials" {
  count  = var.azure_subscription_id != "" ? 1 : 0
  secret = google_secret_manager_secret.azure_credentials[0].id
  secret_data = jsonencode({
    subscription_id = var.azure_subscription_id
    tenant_id       = var.azure_tenant_id
    client_id       = var.azure_client_id
    client_secret   = var.azure_client_secret
  })
}

# Slack Webhook (if provided)
resource "google_secret_manager_secret" "slack_webhook" {
  count     = var.slack_webhook_url != "" ? 1 : 0
  secret_id = "slack-webhook-url"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "slack_webhook" {
  count       = var.slack_webhook_url != "" ? 1 : 0
  secret      = google_secret_manager_secret.slack_webhook[0].id
  secret_data = var.slack_webhook_url
}
