# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "compute.googleapis.com",
    "aiplatform.googleapis.com",
    "firestore.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
    "cloudscheduler.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "servicenetworking.googleapis.com",
    "vpcaccess.googleapis.com",
    "discoveryengine.googleapis.com"
  ])

  project                    = var.project_id
  service                    = each.value
  disable_on_destroy         = false
  disable_dependent_services = false
}

# Random suffix for globally unique resource names
resource "random_id" "suffix" {
  byte_length = 4
}

locals {
  resource_suffix = random_id.suffix.hex
  common_labels = merge(var.labels, {
    environment = var.environment
  })
}

# Service Account for Cloud Run services
resource "google_service_account" "firewall_auditor" {
  account_id   = "firewall-ai-sa"
  display_name = "Firewall AI Service Account"
  description  = "Service account for Firewall AI application"
  project      = var.project_id

  depends_on = [google_project_service.required_apis]
}

# Service Account for GitHub Actions CI/CD
resource "google_service_account" "github_actions" {
  account_id   = "github-actions"
  display_name = "GitHub Actions"
  description  = "Service account for GitHub Actions CI/CD pipeline"
  project      = var.project_id

  depends_on = [google_project_service.required_apis]
}

# IAM Roles for GitHub Actions Service Account
resource "google_project_iam_member" "github_actions_roles" {
  for_each = toset([
    "roles/run.admin",
    "roles/storage.admin",
    "roles/cloudbuild.builds.editor",
    "roles/iam.serviceAccountUser",
    "roles/artifactregistry.admin",
    "roles/compute.admin",
    "roles/secretmanager.admin"
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# IAM Roles for Service Account
resource "google_project_iam_member" "service_account_roles" {
  for_each = toset([
    "roles/aiplatform.user",
    "roles/datastore.user",
    "roles/storage.objectAdmin",
    "roles/secretmanager.secretAccessor",
    "roles/compute.viewer",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/cloudtrace.agent"
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.firewall_auditor.email}"
}

# Modules
module "storage" {
  source = "./modules/storage"

  project_id      = var.project_id
  region          = var.region
  resource_suffix = local.resource_suffix
  labels          = local.common_labels

  depends_on = [google_project_service.required_apis]
}

module "secrets" {
  source = "./modules/secrets"

  project_id            = var.project_id
  gemini_api_key        = var.gemini_api_key
  azure_subscription_id = var.azure_subscription_id
  azure_tenant_id       = var.azure_tenant_id
  azure_client_id       = var.azure_client_id
  azure_client_secret   = var.azure_client_secret
  slack_webhook_url     = var.slack_webhook_url
  service_account_email = google_service_account.firewall_auditor.email

  depends_on = [
    google_project_service.required_apis,
    google_service_account.firewall_auditor
  ]
}

module "firestore" {
  source = "./modules/firestore"

  project_id = var.project_id
  region     = var.region

  depends_on = [google_project_service.required_apis]
}

module "vertex_ai" {
  source = "./modules/vertex-ai"

  project_id      = var.project_id
  region          = var.region
  bucket_name     = module.storage.embeddings_bucket_name
  resource_suffix = local.resource_suffix

  depends_on = [
    google_project_service.required_apis,
    module.storage
  ]
}

module "networking" {
  source = "./modules/networking"

  count = var.enable_vpc_connector ? 1 : 0

  project_id      = var.project_id
  region          = var.region
  vpc_name        = var.vpc_name
  subnet_name     = var.subnet_name
  connector_name  = var.connector_name
  ip_cidr_range   = var.ip_cidr_range

  depends_on = [google_project_service.required_apis]
}

module "cloud_run" {
  source = "./modules/cloud-run"

  project_id              = var.project_id
  region                  = var.region
  service_account_email   = google_service_account.firewall_auditor.email
  backend_image           = replace(var.backend_image, "PROJECT_ID", var.project_id)
  frontend_image          = replace(var.frontend_image, "PROJECT_ID", var.project_id)
  backend_cpu             = var.backend_cpu
  backend_memory          = var.backend_memory
  frontend_cpu            = var.frontend_cpu
  frontend_memory         = var.frontend_memory
  max_backend_instances   = var.max_backend_instances
  max_frontend_instances  = var.max_frontend_instances
  enable_shadow_mode      = var.enable_shadow_mode
  enable_cloud_armor      = var.enable_cloud_armor
  vpc_connector_id        = var.enable_vpc_connector ? module.networking[0].vpc_connector_id : null
  gemini_secret_id        = module.secrets.gemini_api_key_secret_id
  azure_credentials_id    = module.secrets.azure_credentials_secret_id
  labels                  = local.common_labels

  depends_on = [
    google_project_service.required_apis,
    module.secrets,
    google_project_iam_member.service_account_roles
  ]
}

module "scheduler" {
  source = "./modules/scheduler"

  project_id            = var.project_id
  region                = var.region
  backend_url           = module.cloud_run.backend_url
  service_account_email = google_service_account.firewall_auditor.email
  schedule              = var.batch_audit_schedule

  depends_on = [
    google_project_service.required_apis,
    module.cloud_run
  ]
}

module "monitoring" {
  source = "./modules/monitoring"

  project_id      = var.project_id
  alert_email     = var.alert_email
  backend_service = module.cloud_run.backend_service_name
  frontend_service = module.cloud_run.frontend_service_name

  depends_on = [
    google_project_service.required_apis,
    module.cloud_run
  ]
}