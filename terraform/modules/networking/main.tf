variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "vpc_name" {
  description = "Name of the VPC"
  type        = string
}

variable "subnet_name" {
  description = "Name of the subnetwork"
  type        = string
}

variable "connector_name" {
  description = "Name of the VPC Access Connector"
  type        = string
}

variable "ip_cidr_range" {
  description = "IP CIDR range for the subnetwork and VPC Access Connector"
  type        = string
}

# VPC for Serverless VPC Access (optional)
resource "google_compute_network" "vpc" {
  name                    = var.vpc_name
  auto_create_subnetworks = false
  project                 = var.project_id
}

resource "google_compute_subnetwork" "subnet" {
  name          = var.subnet_name
  ip_cidr_range = var.ip_cidr_range
  region        = var.region
  network       = google_compute_network.vpc.id
  project       = var.project_id
}

# Serverless VPC Access Connector
resource "google_vpc_access_connector" "connector" {
  name          = var.connector_name
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = var.ip_cidr_range
  project       = var.project_id
}
