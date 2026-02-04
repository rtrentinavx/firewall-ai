# RAG Persistence Layer Implementation

## Overview

The RAG (Retrieval-Augmented Generation) system now supports persistent storage using Google Cloud Storage and Firestore, making it production-ready for Cloud Run deployments.

## Architecture

### Storage Components

1. **Cloud Storage Buckets**:
   - `{project}-rag-documents-{suffix}`: Stores original document content
   - `{project}-rag-indices-{suffix}`: Stores serialized FAISS indices and vectors

2. **Firestore Collections**:
   - `rag_documents`: Document metadata (title, source, created_at, etc.)
   - `rag_chunks`: Chunk metadata with references to documents

### Components

#### 1. PersistentRAGStorage (`backend/rag/persistent_storage.py`)
- Handles all interactions with Cloud Storage and Firestore
- Automatically detects GCP environment and enables/disables persistence
- Provides methods for:
  - Saving/loading documents
  - Saving/loading FAISS indices
  - Managing document and chunk metadata

#### 2. Updated RAGKnowledgeBase (`backend/rag/knowledge_base.py`)
- Integrated with `PersistentRAGStorage`
- Automatically loads persisted data on initialization
- Saves data when documents are added/deleted
- Provides `save_state()` method for explicit saves

#### 3. Application Integration (`backend/app.py`)
- Initializes `PersistentRAGStorage` on startup
- Registers shutdown hook to save RAG state
- Automatically detects GCP environment variables

## Environment Variables

The system uses the following environment variables (automatically set by Terraform in Cloud Run):

- `GCP_PROJECT` or `GOOGLE_CLOUD_PROJECT`: GCP project ID
- `RAG_STORAGE_BUCKET`: Cloud Storage bucket for documents
- `RAG_INDICES_BUCKET`: Cloud Storage bucket for FAISS indices

## Terraform Configuration

### New Resources

1. **Storage Buckets** (`terraform/modules/storage/main.tf`):
   - `google_storage_bucket.rag_documents`
   - `google_storage_bucket.rag_indices`

2. **Outputs** (`terraform/modules/storage/outputs.tf`):
   - `rag_documents_bucket_name`
   - `rag_indices_bucket_name`

3. **Cloud Run Environment Variables** (`terraform/modules/cloud-run/main.tf`):
   - `RAG_STORAGE_BUCKET`
   - `RAG_INDICES_BUCKET`

### Service Account Permissions

The service account already has the required permissions:
- `roles/datastore.user` - For Firestore access
- `roles/storage.objectAdmin` - For Cloud Storage access
- `roles/aiplatform.user` - For Vertex AI (if using managed embeddings)

## How It Works

### Startup Flow

1. Application starts and initializes `PersistentRAGStorage`
2. `PersistentRAGStorage` detects GCP environment and initializes clients
3. `RAGKnowledgeBase` loads persisted data:
   - Loads document metadata from Firestore
   - Loads document content from Cloud Storage
   - Rebuilds chunks and generates embeddings
   - Loads FAISS index from Cloud Storage (if available)
   - Rebuilds index if needed

### Document Operations

#### Adding a Document

1. Document is chunked and embedded
2. Added to in-memory structures
3. Automatically saved to:
   - Cloud Storage (document content)
   - Firestore (document metadata)
   - Firestore (chunk metadata)
   - Cloud Storage (updated FAISS index)

#### Deleting a Document

1. Removed from in-memory structures
2. Deleted from:
   - Cloud Storage (document content)
   - Firestore (document metadata)
   - Firestore (chunk metadata)
3. FAISS index is rebuilt and saved

### Shutdown Flow

1. Application shutdown hook triggers `save_state()`
2. Current FAISS index and vectors are saved to Cloud Storage
3. All changes are persisted

## Fallback Behavior

If GCP services are not available (e.g., local development):
- Persistence is automatically disabled
- System works in-memory only
- No errors are thrown
- Logs indicate persistence status

## Performance Considerations

### Cold Starts

- **First startup**: May take longer if loading many documents
- **Subsequent startups**: Faster if FAISS index is loaded from storage
- **Index loading**: Typically 1-5 seconds depending on size

### Memory Usage

- FAISS index is loaded into memory
- Document content is loaded on-demand (not all at once)
- Consider Cloud Run memory limits when scaling

### Cost Optimization

- Documents stored in Cloud Storage (cheap)
- FAISS indices stored in Cloud Storage (small files)
- Firestore used only for metadata (minimal reads/writes)
- Consider lifecycle policies for old documents

## Monitoring

The system logs:
- Persistence initialization status
- Document load/save operations
- FAISS index operations
- Errors with full stack traces

Check logs for:
- `"Loading RAG knowledge base from persistent storage..."`
- `"Loaded {N} documents from persistent storage"`
- `"Saved FAISS index to Cloud Storage"`
- `"Failed to load from persistent storage"` (errors)

## Testing

### Local Development

1. Set environment variables (optional):
   ```bash
   export GCP_PROJECT=your-project-id
   export RAG_STORAGE_BUCKET=your-bucket-name
   export RAG_INDICES_BUCKET=your-indices-bucket-name
   ```

2. Or run without persistence (in-memory only):
   - System automatically detects missing GCP credentials
   - Works normally but data is not persisted

### Cloud Run Deployment

1. Deploy Terraform infrastructure:
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

2. Deploy application:
   - Environment variables are automatically set
   - Service account has required permissions
   - Persistence is enabled automatically

## Troubleshooting

### Documents Not Persisting

1. Check environment variables are set
2. Verify service account permissions
3. Check Cloud Storage bucket exists
4. Review application logs for errors

### Slow Startup

1. Check number of documents
2. Consider lazy loading for large datasets
3. Monitor Cloud Storage/Firestore quotas
4. Review FAISS index size

### Index Mismatch

- If loaded index doesn't match chunks, system automatically rebuilds
- This is logged as a warning
- Normal operation continues

## Future Enhancements

Potential improvements:
1. Incremental index updates (avoid full rebuilds)
2. Lazy loading of document content
3. Vertex AI Vector Search integration (fully managed)
4. Caching layer for frequently accessed documents
5. Background index optimization

## Migration Notes

### From In-Memory to Persistent

1. Deploy Terraform changes
2. Restart application
3. System automatically migrates (loads existing data)
4. New documents are automatically persisted

### Backward Compatibility

- System works without persistence (local dev)
- No breaking changes to API
- Existing code continues to work
