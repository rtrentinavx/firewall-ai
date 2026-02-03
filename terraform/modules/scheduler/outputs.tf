output "weekly_audit_job_name" {
  value = google_cloud_scheduler_job.weekly_audit.name
}

output "daily_drift_job_name" {
  value = google_cloud_scheduler_job.daily_drift_check.name
}
