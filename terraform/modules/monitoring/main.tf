variable "project_id" {
  type = string
}

variable "alert_email" {
  type = string
}

variable "backend_service" {
  type = string
}

variable "frontend_service" {
  type = string
}

# Notification Channel - Email
resource "google_monitoring_notification_channel" "email" {
  display_name = "Firewall Auditor Email Alerts"
  type         = "email"
  project      = var.project_id

  labels = {
    email_address = var.alert_email
  }
}

# Alert Policy - High Error Rate
resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "Firewall Auditor - High Error Rate"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Error rate > 5%"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.backend_service}\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 5

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "86400s"
  }
}

# Alert Policy - High Latency
resource "google_monitoring_alert_policy" "high_latency" {
  display_name = "Firewall Auditor - High Latency"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Request latency > 5s"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.backend_service}\" AND metric.type=\"run.googleapis.com/request_latencies\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 5000

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_PERCENTILE_95"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]
}

# Log-based Metric - Audit Completions
resource "google_logging_metric" "audit_completions" {
  name    = "audit_completions"
  project = var.project_id
  filter  = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.backend_service}\" AND jsonPayload.event=\"audit_completed\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"

    labels {
      key         = "severity"
      value_type  = "STRING"
      description = "Audit severity level"
    }
  }

  label_extractors = {
    "severity" = "EXTRACT(jsonPayload.severity)"
  }
}

# Dashboard
resource "google_monitoring_dashboard" "main" {
  dashboard_json = jsonencode({
    displayName = "Firewall Auditor - Operations Dashboard"
    mosaicLayout = {
      columns = 12
      tiles = [
        {
          width  = 6
          height = 4
          widget = {
            title = "Request Count"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.backend_service}\" AND metric.type=\"run.googleapis.com/request_count\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_RATE"
                    }
                  }
                }
              }]
            }
          }
        }
      ]
    }
  })
}
