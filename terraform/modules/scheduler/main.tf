variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "backend_url" {
  type = string
}

variable "service_account_email" {
  type = string
}

variable "schedule" {
  type = string
}

# Cloud Scheduler Job for weekly audits
resource "google_cloud_scheduler_job" "weekly_audit" {
  name             = "weekly-firewall-audit"
  description      = "Automated weekly full network audit"
  schedule         = var.schedule
  time_zone        = "America/New_York"
  attempt_deadline = "320s"
  region           = var.region
  project          = var.project_id

  retry_config {
    retry_count = 3
  }

  http_target {
    http_method = "POST"
    uri         = "${var.backend_url}/api/batch/run-audit"
    body = base64encode(jsonencode({
      audit_type           = "full_network"
      cloud_providers      = ["gcp", "azure"]
      notify_on_completion = true
    }))

    headers = {
      "Content-Type" = "application/json"
    }

    oidc_token {
      service_account_email = var.service_account_email
    }
  }
}

# Daily drift detection job
resource "google_cloud_scheduler_job" "daily_drift_check" {
  name             = "daily-drift-detection"
  description      = "Daily Terraform state drift detection"
  schedule         = "0 8 * * *"
  time_zone        = "America/New_York"
  attempt_deadline = "180s"
  region           = var.region
  project          = var.project_id

  http_target {
    http_method = "POST"
    uri         = "${var.backend_url}/api/drift/detect"

    oidc_token {
      service_account_email = var.service_account_email
    }
  }
}
