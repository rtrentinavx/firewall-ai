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
  name                     = var.subnet_name
  ip_cidr_range            = var.ip_cidr_range
  region                   = var.region
  network                  = google_compute_network.vpc.id
  project                  = var.project_id
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Firewall rule to allow Cloud Run traffic
resource "google_compute_firewall" "allow_cloud_run" {
  name    = "${var.vpc_name}-allow-cloud-run"
  network = google_compute_network.vpc.name
  project = var.project_id

  allow {
    protocol = "tcp"
    ports    = ["8080", "3000"]
  }

  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]
  target_tags   = ["cloud-run"]
}

# Firewall rule for VPC connector
resource "google_compute_firewall" "allow_vpc_connector" {
  name    = "${var.vpc_name}-allow-vpc-connector"
  network = google_compute_network.vpc.name
  project = var.project_id

  allow {
    protocol = "tcp"
    ports    = ["667"]
  }

  allow {
    protocol = "udp"
    ports    = ["665-666"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [var.ip_cidr_range]
}

# Serverless VPC Access Connector
resource "google_vpc_access_connector" "connector" {
  name          = var.connector_name
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = var.ip_cidr_range
  project       = var.project_id
}
