variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "bucket_name" {
  type = string
}

variable "resource_suffix" {
  type = string
}

# Vector Search Index setup instructions
resource "null_resource" "vector_search_instructions" {
  provisioner "local-exec" {
    command = <<-EOT
      echo "⚠️  Vector Search Index Setup Required:"
      echo ""
      echo "After infrastructure is deployed, create the vector search index:"
      echo ""
      echo "gcloud ai indexes create \\"
      echo "  --display-name='firewall-decisions-index' \\"
      echo "  --metadata-file=vector-search-config.json \\"
      echo "  --region=${var.region} \\"
      echo "  --project=${var.project_id}"
    EOT
  }
}

# Create config file for vector search
resource "local_file" "vector_search_config" {
  filename = "${path.module}/vector-search-config.json"
  content = jsonencode({
    contentsDeltaUri = "gs://${var.bucket_name}/embeddings/"
    config = {
      dimensions                 = 768
      approximateNeighborsCount = 10
      distanceMeasureType       = "DOT_PRODUCT_DISTANCE"
      algorithmConfig = {
        treeAhConfig = {
          leafNodeEmbeddingCount      = 1000
          leafNodesToSearchPercent    = 10
        }
      }
    }
  })
}
