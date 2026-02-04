terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "service_account_email" {
  type = string
}

variable "backend_image" {
  type = string
}

variable "frontend_image" {
  type = string
}

variable "backend_cpu" {
  type = string
}

variable "backend_memory" {
  type = string
}

variable "frontend_cpu" {
  type = string
}

variable "frontend_memory" {
  type = string
}

variable "max_backend_instances" {
  type = number
}

variable "max_frontend_instances" {
  type = number
}

variable "enable_shadow_mode" {
  type = bool
}

variable "vpc_connector_id" {
  type    = string
  default = null
}

variable "gemini_secret_id" {
  type = string
}

variable "azure_credentials_id" {
  type = string
}

variable "labels" {
  type = map(string)
}

variable "rag_documents_bucket" {
  type    = string
  default = ""
}

variable "rag_indices_bucket" {
  type    = string
  default = ""
}

# Backend Cloud Run Service
resource "google_cloud_run_v2_service" "backend" {
  name     = "firewall-ai-backend"
  location = var.region
  project  = var.project_id

  template {
    service_account = var.service_account_email

    scaling {
      max_instance_count = var.max_backend_instances
      min_instance_count = 0
    }

    dynamic "vpc_access" {
      for_each = var.vpc_connector_id != null ? [1] : []
      content {
        connector = var.vpc_connector_id
        egress    = "PRIVATE_RANGES_ONLY"
      }
    }

    timeout = "300s"

    containers {
      # Use gcr.io/cloudrun/hello as initial placeholder image
      # GitHub Actions will update this with actual backend image
      image = var.backend_image

      resources {
        limits = {
          cpu    = var.backend_cpu
          memory = var.backend_memory
        }
        cpu_idle = true
      }

      ports {
        container_port = 8080
      }

      env {
        name  = "GCP_PROJECT"
        value = var.project_id
      }

      env {
        name  = "GCP_REGION"
        value = var.region
      }

      env {
        name  = "ENVIRONMENT"
        value = "production"
      }

      env {
        name  = "SHADOW_MODE"
        value = var.enable_shadow_mode ? "true" : "false"
      }

      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = var.gemini_secret_id
            version = "latest"
          }
        }
      }

      dynamic "env" {
        for_each = var.rag_documents_bucket != "" ? [1] : []
        content {
          name  = "RAG_STORAGE_BUCKET"
          value = var.rag_documents_bucket
        }
      }

      dynamic "env" {
        for_each = var.rag_indices_bucket != "" ? [1] : []
        content {
          name  = "RAG_INDICES_BUCKET"
          value = var.rag_indices_bucket
        }
      }

      dynamic "env" {
        for_each = var.azure_credentials_id != "" ? [1] : []
        content {
          name = "AZURE_CREDENTIALS"
          value_source {
            secret_key_ref {
              secret  = var.azure_credentials_id
              version = "latest"
            }
          }
        }
      }

      startup_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 10
        period_seconds        = 3
        timeout_seconds       = 1
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
        }
        period_seconds    = 10
        timeout_seconds   = 1
        failure_threshold = 3
      }
    }
  }

  labels = var.labels

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version
    ]
  }
}

# Backend IAM - Allow public access
resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  location = google_cloud_run_v2_service.backend.location
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Frontend Cloud Run Service
resource "google_cloud_run_v2_service" "frontend" {
  name     = "firewall-ai-frontend"
  location = var.region
  project  = var.project_id

  template {
    service_account = var.service_account_email

    scaling {
      max_instance_count = var.max_frontend_instances
      min_instance_count = 0
    }

    containers {
      image = var.frontend_image

      resources {
        limits = {
          cpu    = var.frontend_cpu
          memory = var.frontend_memory
        }
        cpu_idle = true
      }

      ports {
        container_port = 8080
      }

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = google_cloud_run_v2_service.backend.uri
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
    }
  }

  labels = var.labels

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version
    ]
  }

  depends_on = [google_cloud_run_v2_service.backend]
}

# Frontend IAM - Allow public access
resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  location = google_cloud_run_v2_service.frontend.location
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Cloud Armor Security Policy (optional
