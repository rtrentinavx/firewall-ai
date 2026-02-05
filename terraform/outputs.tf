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
  value       = <<-EOT
  
  🎉 Infrastructure deployed successfully!
  
  📋 NEXT STEPS:
  
  1️⃣  Set up GitHub Actions for automated deployments:
  
     a. Create service account key:
        gcloud iam service-accounts keys create github-actions-key.json \
          --iam-account=${google_service_account.github_actions.email} \
          --project=${var.project_id}
  
     b. Add GitHub Secrets (Settings → Secrets → Actions):
        - GCP_SA_KEY: <contents of github-actions-key.json>
        - GCP_PROJECT_ID: ${var.project_id}
        - GCP_REGION: ${var.region}
        - GEMINI_API_KEY: not-used-using-vertex-ai
  
     c. Push code to trigger deployment:
        git add .
        git commit -m "Deploy firewall-ai"
        git push origin main
  
  2️⃣  Configure local development (optional):
  
     a. Set environment variables:
        export GOOGLE_CLOUD_PROJECT=${var.project_id}
        gcloud config set project ${var.project_id}
  
     b. Create backend/.env:
        echo "GOOGLE_CLOUD_PROJECT=${var.project_id}" > backend/.env
  
     c. Create frontend/.env.local:
        echo "NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1" > frontend/.env.local
  
     d. Start development servers:
        ./start-dev.sh
  
  3️⃣  Access your deployed services:
  
     🌐 Frontend: ${module.cloud_run.frontend_url}
     🔧 Backend:  ${module.cloud_run.backend_url}
     📊 Monitoring: https://console.cloud.google.com/monitoring/dashboards?project=${var.project_id}
     📝 Logs: https://console.cloud.google.com/logs?project=${var.project_id}
  
  4️⃣  Manual deployment (if not using GitHub Actions):
  
     cd backend && gcloud builds submit --tag gcr.io/${var.project_id}/firewall-ai-backend:latest
     cd ../frontend && gcloud builds submit --tag gcr.io/${var.project_id}/firewall-ai-frontend:latest
     
     gcloud run services update firewall-ai-backend \
       --image gcr.io/${var.project_id}/firewall-ai-backend:latest \
       --region ${var.region} --project ${var.project_id}
     
     gcloud run services update firewall-ai-frontend \
       --image gcr.io/${var.project_id}/firewall-ai-frontend:latest \
       --region ${var.region} --project ${var.project_id}
  
  ⚠️  Note: Services are currently running placeholder images. Deploy your code using step 1 or 4.
  
  EOT
}

output "deployment_commands" {
  description = "Commands to deploy application"
  value = {
    build_backend   = "gcloud builds submit --tag ${replace(var.backend_image, "PROJECT_ID", var.project_id)} ./backend --project ${var.project_id}"
    build_frontend  = "gcloud builds submit --tag ${replace(var.frontend_image, "PROJECT_ID", var.project_id)} ./frontend --project ${var.project_id}"
    update_backend  = "gcloud run services update firewall-ai-backend --image ${replace(var.backend_image, "PROJECT_ID", var.project_id)} --region ${var.region} --project ${var.project_id}"
    update_frontend = "gcloud run services update firewall-ai-frontend --image ${replace(var.frontend_image, "PROJECT_ID", var.project_id)} --region ${var.region} --project ${var.project_id}"
  }
}

output "github_actions_sa_email" {
  description = "GitHub Actions service account email"
  value       = google_service_account.github_actions.email
}

output "github_actions_setup" {
  description = "Instructions to set up GitHub Actions"
  value       = <<-EOT
  
  GitHub Actions Setup:
  
  1. Create a service account key:
     gcloud iam service-accounts keys create github-actions-key.json \
       --iam-account=${google_service_account.github_actions.email} \
       --project=${var.project_id}
  
  2. Add this key as GitHub Secret 'GCP_SA_KEY':
     cat github-actions-key.json
  
  3. Add other GitHub Secrets:
     GCP_PROJECT_ID=${var.project_id}
     GCP_REGION=${var.region}
     GEMINI_API_KEY=not-used-using-vertex-ai
  
  4. Push to main branch to trigger deployment
  
  EOT
}