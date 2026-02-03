output "gemini_api_key_secret_id" {
  value = google_secret_manager_secret.gemini_api_key.secret_id
}

output "azure_credentials_secret_id" {
  value = var.azure_subscription_id != "" ? google_secret_manager_secret.azure_credentials[0].secret_id : ""
}

output "slack_webhook_secret_id" {
  value = var.slack_webhook_url != "" ? google_secret_manager_secret.slack_webhook[0].secret_id : ""
}
