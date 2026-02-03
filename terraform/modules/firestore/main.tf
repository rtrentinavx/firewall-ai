variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  # Prevent accidental deletion
  deletion_policy = "ABANDON"
}

# Firestore indexes for common queries
resource "google_firestore_index" "audit_by_timestamp" {
  project    = var.project_id
  database   = google_firestore_database.default.name
  collection = "audits"

  fields {
    field_path = "timestamp"
    order      = "DESCENDING"
  }

  fields {
    field_path = "status"
    order      = "ASCENDING"
  }
}

resource "google_firestore_index" "rules_by_cloud" {
  project    = var.project_id
  database   = google_firestore_database.default.name
  collection = "rules"

  fields {
    field_path = "cloud_provider"
    order      = "ASCENDING"
  }

  fields {
    field_path = "last_modified"
    order      = "DESCENDING"
  }
}
