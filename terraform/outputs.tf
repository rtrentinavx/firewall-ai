output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "Deployment region"
  value       = var.region
}

output "backend_url" {
  description = "Backend API URL"
  value       = module.cloud_run.backend_url
}

output "frontend_url" {
  description = "Frontend application URL"
  value       = module.cloud_run.frontend_url
}

output "service_account_email" {
  description = "Service account email"
  value       = google_service_account.firewall_auditor.email
}

output "storage_bucket" {
  description = "Main storage bucket name"
  value       = module.storage.main_bucket_name
}

output "embeddings_bucket" {
  description = "Embeddings storage bucket for Vector Search"
  value       = module.storage.embeddings_bucket_name
}

output "firestore_database" {
  description = "Firestore database ID"
  value       = module.firestore.database_id
}

output "next_steps" {
  description = "Next steps after infrastructure deployment"
  value = <<-EOT
  
  ✅ Infrastructure deployed successfully!
  
  📋 Next Steps:
  
  1. Access your application:
     Frontend: ${module.cloud_run.frontend_url}
     Backend:  ${module.cloud_run.backend_url}
  
  2. Build and deploy application code:
     gcloud builds submit --tag ${replace(var.backend_image, "PROJECT_ID", var.project_id)} ./backend --project ${var.project_id}
     gcloud builds submit --tag ${replace(var.frontend_image, "PROJECT_ID", var.project_id)} ./frontend --project ${var.project_id}
  
  3. Update Cloud Run services with new images:
     gcloud run services update firewall-auditor-backend --image ${replace(var.backend_image, "PROJECT_ID", var.project_id)} --region ${var.region} --project ${var.project_id}
     gcloud run services update firewall-auditor-frontend --image ${replace(var.frontend_image, "PROJECT_ID", var.project_id)} --region ${var.region} --project ${var.project_id}
  
  4. View logs:
     gcloud logging read "resource.type=cloud_run_revision" --limit 50 --project ${var.project_id}
  
  5. Monitor application:
     https://console.cloud.google.com/monitoring/dashboards?project=${var.project_id}
  
  EOT
}

output "deployment_commands" {
  description = "Commands to deploy application"
  value = {
    build_backend = "gcloud builds submit --tag ${replace(var.backend_image, "PROJECT_ID", var.project_id)} ./backend --project ${var.project_id}"
    build_frontend = "gcloud builds submit --tag ${replace(var.frontend_image, "PROJECT_ID", var.project_id)} ./frontend --project ${var.project_id}"
    update_backend = "gcloud run services update firewall-auditor-backend --image ${replace(var.backend_image, "PROJECT_ID", var.project_id)} --region ${var.region} --project ${var.project_id}"
    update_frontend = "gcloud run services update firewall-auditor-frontend --image ${replace(var.frontend_image, "PROJECT_ID", var.project_id)} --region ${var.region} --project ${var.project_id}"
  }
}