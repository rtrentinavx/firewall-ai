# RAG Cloud Deployment - Google Cloud Services Required

## Current Implementation (Development)

The current RAG implementation uses:
- **In-memory FAISS** for vector storage
- **SentenceTransformer** (local model) for embeddings
- **In-memory document storage**

**⚠️ Problem**: Cloud Run containers are **stateless** - when containers restart, all in-memory data is lost.

## Required Google Cloud Services for Production RAG

### 1. **Cloud Storage** ✅ (Already Configured)
- **Purpose**: Store original documents and serialized FAISS indices
- **Buckets Needed**:
  - `{project}-rag-documents-{suffix}` - Store uploaded documents (PDFs, TXT, etc.)
  - `{project}-rag-indices-{suffix}` - Store FAISS index files
  - `{project}-embeddings-{suffix}` - Already exists for Vertex AI Vector Search

**Current Status**: Storage module exists, but needs RAG-specific buckets

### 2. **Firestore** ✅ (Already Configured)
- **Purpose**: Store document metadata, chunk metadata, and searchable indexes
- **Collections Needed**:
  - `rag_documents` - Document metadata (title, source, created_at, etc.)
  - `rag_chunks` - Chunk metadata with references to storage locations
  - `rag_embeddings` - Embedding vectors (if not using Vertex AI Vector Search)

**Current Status**: Firestore module exists and is configured

### 3. **Vertex AI** ✅ (Partially Configured)
- **Purpose**: 
  - **Vertex AI Embeddings API** - Generate embeddings (alternative to SentenceTransformer)
  - **Vertex AI Vector Search** - Managed vector database (alternative to FAISS)

**Current Status**: Vertex AI module exists but needs Vector Search index configuration

### 4. **Cloud Run** ✅ (Already Configured)
- **Purpose**: Host the application
- **Requirements**:
  - Persistent storage access (Cloud Storage + Firestore)
  - Sufficient memory for loading FAISS indices (if using local FAISS)
  - Environment variables for bucket names and Firestore project

**Current Status**: Cloud Run module exists

## Recommended Architecture Options

### Option 1: Cloud Storage + Firestore + Local FAISS (Hybrid)
**Best for**: Cost-effective, moderate scale

- **Documents**: Stored in Cloud Storage
- **Metadata**: Stored in Firestore
- **Vectors**: FAISS index serialized to Cloud Storage, loaded on container startup
- **Embeddings**: SentenceTransformer (local model) or Vertex AI Embeddings API

**Pros**:
- Lower cost (no Vector Search API fees)
- Full control over indexing
- Works with existing FAISS code

**Cons**:
- Slower cold starts (loading FAISS index)
- Memory intensive (FAISS index in memory)
- Not ideal for very large datasets (>1M vectors)

### Option 2: Vertex AI Vector Search (Fully Managed)
**Best for**: Large scale, production workloads

- **Documents**: Stored in Cloud Storage
- **Metadata**: Stored in Firestore
- **Vectors**: Stored in Vertex AI Vector Search
- **Embeddings**: Vertex AI Embeddings API

**Pros**:
- Fast queries (managed service)
- Scales automatically
- No cold start issues
- Better for large datasets

**Cons**:
- Higher cost (Vector Search API fees)
- Requires code changes to use Vertex AI SDK
- More complex setup

### Option 3: Firestore with Vector Search Extension
**Best for**: Simple integration, moderate scale

- **Documents**: Stored in Cloud Storage
- **Metadata + Vectors**: Stored in Firestore (using vector fields)
- **Embeddings**: Vertex AI Embeddings API

**Pros**:
- Single database for metadata and vectors
- Simpler architecture
- Good for moderate scale

**Cons**:
- Firestore vector search is newer (less mature)
- Query performance may be slower than dedicated vector DB

## Required Terraform Changes

### 1. Add RAG-specific Storage Buckets

```hcl
# In terraform/modules/storage/main.tf
resource "google_storage_bucket" "rag_documents" {
  name          = "${var.project_id}-rag-documents-${var.resource_suffix}"
  location      = var.region
  project       = var.project_id
  force_destroy = false

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  versioning {
    enabled = true
  }
}

resource "google_storage_bucket" "rag_indices" {
  name          = "${var.project_id}-rag-indices-${var.resource_suffix}"
  location      = var.region
  project       = var.project_id
  force_destroy = false

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  versioning {
    enabled = true
  }
}
```

### 2. Update Service Account Permissions

Add IAM roles for RAG operations:

```hcl
# In terraform/main.tf
resource "google_project_iam_member" "rag_storage_access" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.firewall_auditor.email}"
}

resource "google_project_iam_member" "rag_firestore_access" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.firewall_auditor.email}"
}

resource "google_project_iam_member" "rag_vertex_ai_access" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.firewall_auditor.email}"
}
```

### 3. Update Cloud Run Environment Variables

```hcl
# In terraform/modules/cloud-run/main.tf
env {
  name  = "RAG_STORAGE_BUCKET"
  value = module.storage.rag_documents_bucket_name
}

env {
  name  = "RAG_INDICES_BUCKET"
  value = module.storage.rag_indices_bucket_name
}

env {
  name  = "RAG_USE_VERTEX_AI"
  value = "true"  # or "false" for local FAISS
}
```

## Required Code Changes

### 1. Update RAG Knowledge Base for Persistence

Modify `backend/rag/knowledge_base.py` to:
- Load/save FAISS index from Cloud Storage on startup/shutdown
- Store document metadata in Firestore
- Load documents from Cloud Storage on demand

### 2. Add Vertex AI Integration (Optional)

Create `backend/rag/vertex_ai_backend.py` for:
- Vertex AI Embeddings API integration
- Vertex AI Vector Search integration
- Fallback to local FAISS if Vertex AI unavailable

## Cost Considerations

### Option 1 (Hybrid - Local FAISS):
- **Cloud Storage**: ~$0.02/GB/month
- **Firestore**: ~$0.18/GB/month (reads/writes)
- **Cloud Run**: Existing costs
- **Total**: Low cost, but slower cold starts

### Option 2 (Vertex AI Vector Search):
- **Cloud Storage**: ~$0.02/GB/month
- **Firestore**: ~$0.18/GB/month
- **Vertex AI Embeddings**: ~$0.0001 per 1K tokens
- **Vertex AI Vector Search**: ~$0.10 per 1M queries
- **Total**: Higher cost, but better performance

## Recommended Approach

For initial production deployment, I recommend **Option 1 (Hybrid)**:
1. Use Cloud Storage for documents
2. Use Firestore for metadata
3. Serialize FAISS index to Cloud Storage
4. Load index on container startup (with caching)
5. Use Vertex AI Embeddings API for embeddings (optional, can use local model)

This provides:
- ✅ Persistent storage
- ✅ Low cost
- ✅ Minimal code changes
- ✅ Works with existing FAISS implementation

## Next Steps

1. Add RAG storage buckets to Terraform
2. Update service account permissions
3. Modify RAG knowledge base for persistence
4. Add startup/shutdown hooks for index loading/saving
5. Test with Cloud Run deployment
