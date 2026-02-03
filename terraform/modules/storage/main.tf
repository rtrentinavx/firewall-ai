variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "resource_suffix" {
  type = string
}

variable "labels" {
  type = map(string)
}

# Logs bucket for access logging
resource "google_storage_bucket" "logs" {
  name          = "${var.project_id}-logs-${var.resource_suffix}"
  location      = var.region
  project       = var.project_id
  force_destroy = false

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  labels = var.labels
}

# Main storage bucket for firewall configs
resource "google_storage_bucket" "firewall_configs" {
  name          = "${var.project_id}-firewall-configs-${var.resource_suffix}"
  location      = var.region
  project       = var.project_id
  force_destroy = false

  uniform_bucket_level_access = true

  public_access_prevention = "enforced"

  versioning {
    enabled = true
  }

  logging {
    log_bucket = google_storage_bucket.logs.name
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  labels = var.labels
}

# Bucket for embeddings (Vector Search)
resource "google_storage_bucket" "embeddings" {
  name          = "${var.project_id}-embeddings-${var.resource_suffix}"
  location      = var.region
  project       = var.project_id
  force_destroy = false

  uniform_bucket_level_access = true

  public_access_prevention = "enforced"

  versioning {
    enabled = true
  }

  logging {
    log_bucket = google_storage_bucket.logs.name
  }

  labels = var.labels
}

# Bucket for Terraform state exports
resource "google_storage_bucket" "terraform_exports" {
  name          = "${var.project_id}-tf-exports-${var.resource_suffix}"
  location      = var.region
  project       = var.project_id
  force_destroy = false

  uniform_bucket_level_access = true

  public_access_prevention = "enforced"

  versioning {
    enabled = true
  }

  logging {
    log_bucket = google_storage_bucket.logs.name
  }

  labels = var.labels
}

# Bucket for audit reports
resource "google_storage_bucket" "audit_reports" {
  name          = "${var.project_id}-audit-reports-${var.resource_suffix}"
  location      = var.region
  project       = var.project_id
  force_destroy = false

  uniform_bucket_level_access = true

  public_access_prevention = "enforced"

  versioning {
    enabled = true
  }

  logging {
    log_bucket = google_storage_bucket.logs.name
  }

  labels = var.labels
}
