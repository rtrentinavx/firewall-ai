output "main_bucket_name" {
  value = google_storage_bucket.firewall_configs.name
}

output "embeddings_bucket_name" {
  value = google_storage_bucket.embeddings.name
}

output "terraform_exports_bucket_name" {
  value = google_storage_bucket.terraform_exports.name
}

output "audit_reports_bucket_name" {
  value = google_storage_bucket.audit_reports.name
}
