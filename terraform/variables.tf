variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "project_name" {
  description = "Human-readable project name"
  type        = string
  default     = "Firewall AI"
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "org_id" {
  description = "GCP Organization ID (optional)"
  type        = string
  default     = ""
}

# Application Configuration
variable "backend_image" {
  description = "Docker image for backend (GitHub Actions will update this)"
  type        = string
  default     = "gcr.io/cloudrun/hello"
}

variable "frontend_image" {
  description = "Docker image for frontend (GitHub Actions will update this)"
  type        = string
  default     = "gcr.io/cloudrun/hello"
}

variable "backend_cpu" {
  description = "CPU allocation for backend Cloud Run service"
  type        = string
  default     = "2"
}

variable "backend_memory" {
  description = "Memory allocation for backend Cloud Run service"
  type        = string
  default     = "2Gi"
}

variable "frontend_cpu" {
  description = "CPU allocation for frontend Cloud Run service"
  type        = string
  default     = "1"
}

variable "frontend_memory" {
  description = "Memory allocation for frontend Cloud Run service"
  type        = string
  default     = "512Mi"
}

variable "max_backend_instances" {
  description = "Maximum number of backend instances"
  type        = number
  default     = 10
}

variable "max_frontend_instances" {
  description = "Maximum number of frontend instances"
  type        = number
  default     = 5
}

# Networking
variable "vpc_name" {
  description = "Name of the VPC network"
  type        = string
}

variable "subnet_name" {
  description = "Name of the subnet"
  type        = string
}

variable "connector_name" {
  description = "Name of the VPC Access Connector"
  type        = string
}

variable "ip_cidr_range" {
  description = "IP CIDR range for the subnet and VPC Access Connector"
  type        = string
}

# Security
variable "gemini_api_key" {
  description = "Gemini API Key (sensitive)"
  type        = string
  sensitive   = true
}

variable "azure_subscription_id" {
  description = "Azure Subscription ID for cross-cloud auditing"
  type        = string
  default     = ""
  sensitive   = true
}

variable "azure_tenant_id" {
  description = "Azure Tenant ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "azure_client_id" {
  description = "Azure Client ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "azure_client_secret" {
  description = "Azure Client Secret"
  type        = string
  default     = ""
  sensitive   = true
}

# Monitoring
variable "alert_email" {
  description = "Email for alert notifications"
  type        = string
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

# Scheduling
variable "batch_audit_schedule" {
  description = "Cron schedule for batch audits (default: Monday 2 AM)"
  type        = string
  default     = "0 2 * * 1"
}

# Feature Flags
variable "enable_shadow_mode" {
  description = "Enable shadow mode (recommendations only, no actions)"
  type        = bool
  default     = true
}

variable "enable_cloud_armor" {
  description = "Enable Cloud Armor DDoS protection"
  type        = bool
  default     = true
}

variable "enable_vpc_connector" {
  description = "Enable Serverless VPC Access"
  type        = bool
  default     = false
}

# Tags
variable "labels" {
  description = "Labels to apply to all resources"
  type        = map(string)
  default = {
    application = "firewall-ai"
    managed-by  = "terraform"
  }
}
