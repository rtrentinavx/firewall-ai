"""
Persistent Storage Backend for RAG Knowledge Base
Uses Cloud Storage for documents/indices and Firestore for metadata
"""

import logging
import os
import json
import pickle
import tempfile
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from pathlib import Path
import numpy as np
import faiss

logger = logging.getLogger(__name__)

try:
    from google.cloud import storage
    from google.cloud import firestore
    GCP_AVAILABLE = True
except ImportError:
    GCP_AVAILABLE = False
    logger.warning("Google Cloud libraries not available. RAG persistence will be disabled.")


class PersistentRAGStorage:
    """Handles persistent storage for RAG knowledge base using GCP services"""
    
    def __init__(
        self,
        project_id: Optional[str] = None,
        documents_bucket: Optional[str] = None,
        indices_bucket: Optional[str] = None,
        enable_persistence: bool = True
    ):
        self.project_id = project_id or os.getenv('GCP_PROJECT') or os.getenv('GOOGLE_CLOUD_PROJECT')
        self.documents_bucket_name = documents_bucket or os.getenv('RAG_STORAGE_BUCKET')
        self.indices_bucket_name = indices_bucket or os.getenv('RAG_INDICES_BUCKET')
        self.enable_persistence = enable_persistence and GCP_AVAILABLE and self.project_id
        
        self.storage_client: Optional[storage.Client] = None
        self.firestore_client: Optional[firestore.Client] = None
        self.documents_bucket: Optional[storage.Bucket] = None
        self.indices_bucket: Optional[storage.Bucket] = None
        
        if self.enable_persistence:
            try:
                self._initialize_clients()
            except Exception as e:
                logger.warning(f"Failed to initialize GCP clients: {e}. Persistence disabled.")
                self.enable_persistence = False
    
    def _initialize_clients(self) -> None:
        """Initialize GCP clients"""
        if not GCP_AVAILABLE:
            raise ImportError("Google Cloud libraries not installed")
        
        self.storage_client = storage.Client(project=self.project_id)
        
        if self.documents_bucket_name:
            self.documents_bucket = self.storage_client.bucket(self.documents_bucket_name)
        
        if self.indices_bucket_name:
            self.indices_bucket = self.storage_client.bucket(self.indices_bucket_name)
        
        self.firestore_client = firestore.Client(project=self.project_id)
        
        logger.info(f"Initialized persistent storage: project={self.project_id}, "
                   f"documents_bucket={self.documents_bucket_name}, "
                   f"indices_bucket={self.indices_bucket_name}")
    
    def save_document(
        self,
        document_id: str,
        content: str,
        metadata: Dict[str, Any]
    ) -> bool:
        """Save document content to Cloud Storage"""
        if not self.enable_persistence or not self.documents_bucket:
            return False
        
        try:
            blob_name = f"documents/{document_id}.txt"
            blob = self.documents_bucket.blob(blob_name)
            blob.upload_from_string(content, content_type='text/plain')
            
            logger.debug(f"Saved document {document_id} to Cloud Storage")
            return True
        except Exception as e:
            logger.error(f"Failed to save document {document_id}: {e}")
            return False
    
    def load_document(self, document_id: str) -> Optional[str]:
        """Load document content from Cloud Storage"""
        if not self.enable_persistence or not self.documents_bucket:
            return None
        
        try:
            blob_name = f"documents/{document_id}.txt"
            blob = self.documents_bucket.blob(blob_name)
            
            if not blob.exists():
                return None
            
            content = blob.download_as_text()
            logger.debug(f"Loaded document {document_id} from Cloud Storage")
            return content
        except Exception as e:
            logger.error(f"Failed to load document {document_id}: {e}")
            return None
    
    def delete_document(self, document_id: str) -> bool:
        """Delete document from Cloud Storage"""
        if not self.enable_persistence or not self.documents_bucket:
            return False
        
        try:
            blob_name = f"documents/{document_id}.txt"
            blob = self.documents_bucket.blob(blob_name)
            blob.delete()
            
            logger.debug(f"Deleted document {document_id} from Cloud Storage")
            return True
        except Exception as e:
            logger.error(f"Failed to delete document {document_id}: {e}")
            return False
    
    def save_document_metadata(
        self,
        document_id: str,
        metadata: Dict[str, Any]
    ) -> bool:
        """Save document metadata to Firestore"""
        if not self.enable_persistence or not self.firestore_client:
            return False
        
        try:
            doc_ref = self.firestore_client.collection('rag_documents').document(document_id)
            doc_ref.set({
                **metadata,
                'updated_at': firestore.SERVER_TIMESTAMP
            }, merge=True)
            
            logger.debug(f"Saved metadata for document {document_id} to Firestore")
            return True
        except Exception as e:
            logger.error(f"Failed to save metadata for document {document_id}: {e}")
            return False
    
    def load_document_metadata(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Load document metadata from Firestore"""
        if not self.enable_persistence or not self.firestore_client:
            return None
        
        try:
            doc_ref = self.firestore_client.collection('rag_documents').document(document_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return None
            
            metadata = doc.to_dict()
            # Convert Firestore timestamps to ISO strings
            if 'created_at' in metadata and hasattr(metadata['created_at'], 'isoformat'):
                metadata['created_at'] = metadata['created_at'].isoformat()
            if 'updated_at' in metadata and hasattr(metadata['updated_at'], 'isoformat'):
                metadata['updated_at'] = metadata['updated_at'].isoformat()
            
            return metadata
        except Exception as e:
            logger.error(f"Failed to load metadata for document {document_id}: {e}")
            return None
    
    def list_documents(self) -> List[Dict[str, Any]]:
        """List all documents from Firestore"""
        if not self.enable_persistence or not self.firestore_client:
            return []
        
        try:
            docs = self.firestore_client.collection('rag_documents').stream()
            documents = []
            
            for doc in docs:
                metadata = doc.to_dict()
                metadata['document_id'] = doc.id
                # Convert Firestore timestamps
                if 'created_at' in metadata and hasattr(metadata['created_at'], 'isoformat'):
                    metadata['created_at'] = metadata['created_at'].isoformat()
                if 'updated_at' in metadata and hasattr(metadata['updated_at'], 'isoformat'):
                    metadata['updated_at'] = metadata['updated_at'].isoformat()
                documents.append(metadata)
            
            return documents
        except Exception as e:
            logger.error(f"Failed to list documents: {e}")
            return []
    
    def delete_document_metadata(self, document_id: str) -> bool:
        """Delete document metadata from Firestore"""
        if not self.enable_persistence or not self.firestore_client:
            return False
        
        try:
            doc_ref = self.firestore_client.collection('rag_documents').document(document_id)
            doc_ref.delete()
            
            logger.debug(f"Deleted metadata for document {document_id} from Firestore")
            return True
        except Exception as e:
            logger.error(f"Failed to delete metadata for document {document_id}: {e}")
            return False
    
    def save_faiss_index(
        self,
        index: faiss.Index,
        vectors: np.ndarray,
        metadata: Dict[str, Any]
    ) -> bool:
        """Save FAISS index and vectors to Cloud Storage"""
        if not self.enable_persistence or not self.indices_bucket:
            return False
        
        try:
            # Save index
            with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
                faiss.write_index(index, tmp_file.name)
                blob_name = "faiss_index.bin"
                blob = self.indices_bucket.blob(blob_name)
                blob.upload_from_filename(tmp_file.name)
                os.unlink(tmp_file.name)
            
            # Save vectors
            with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
                np.save(tmp_file.name, vectors)
                blob_name = "faiss_vectors.npy"
                blob = self.indices_bucket.blob(blob_name)
                blob.upload_from_filename(tmp_file.name)
                os.unlink(tmp_file.name)
            
            # Save metadata
            blob_name = "faiss_metadata.json"
            blob = self.indices_bucket.blob(blob_name)
            blob.upload_from_string(
                json.dumps(metadata, default=str),
                content_type='application/json'
            )
            
            logger.info("Saved FAISS index to Cloud Storage")
            return True
        except Exception as e:
            logger.error(f"Failed to save FAISS index: {e}")
            return False
    
    def load_faiss_index(
        self
    ) -> Optional[Tuple[faiss.Index, np.ndarray, Dict[str, Any]]]:
        """Load FAISS index and vectors from Cloud Storage"""
        if not self.enable_persistence or not self.indices_bucket:
            return None
        
        try:
            # Load index
            blob_name = "faiss_index.bin"
            blob = self.indices_bucket.blob(blob_name)
            
            if not blob.exists():
                logger.info("No existing FAISS index found in Cloud Storage")
                return None
            
            with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
                blob.download_to_filename(tmp_file.name)
                index = faiss.read_index(tmp_file.name)
                os.unlink(tmp_file.name)
            
            # Load vectors
            blob_name = "faiss_vectors.npy"
            blob = self.indices_bucket.blob(blob_name)
            
            if not blob.exists():
                logger.warning("FAISS index found but vectors not found")
                return None
            
            with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
                blob.download_to_filename(tmp_file.name)
                vectors = np.load(tmp_file.name)
                os.unlink(tmp_file.name)
            
            # Load metadata
            metadata = {}
            blob_name = "faiss_metadata.json"
            blob = self.indices_bucket.blob(blob_name)
            
            if blob.exists():
                metadata_json = blob.download_as_text()
                metadata = json.loads(metadata_json)
            
            logger.info("Loaded FAISS index from Cloud Storage")
            return (index, vectors, metadata)
        except Exception as e:
            logger.error(f"Failed to load FAISS index: {e}")
            return None
    
    def save_chunks_metadata(
        self,
        document_id: str,
        chunks_metadata: List[Dict[str, Any]]
    ) -> bool:
        """Save chunks metadata to Firestore"""
        if not self.enable_persistence or not self.firestore_client:
            return False
        
        try:
            batch = self.firestore_client.batch()
            
            for chunk_meta in chunks_metadata:
                chunk_id = f"{document_id}_chunk_{chunk_meta.get('chunk_index', 0)}"
                chunk_ref = self.firestore_client.collection('rag_chunks').document(chunk_id)
                batch.set(chunk_ref, {
                    'document_id': document_id,
                    **chunk_meta,
                    'updated_at': firestore.SERVER_TIMESTAMP
                })
            
            batch.commit()
            logger.debug(f"Saved {len(chunks_metadata)} chunks metadata for document {document_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to save chunks metadata for document {document_id}: {e}")
            return False
    
    def delete_chunks_metadata(self, document_id: str) -> bool:
        """Delete chunks metadata from Firestore"""
        if not self.enable_persistence or not self.firestore_client:
            return False
        
        try:
            chunks_ref = self.firestore_client.collection('rag_chunks')
            query = chunks_ref.where('document_id', '==', document_id).stream()
            
            batch = self.firestore_client.batch()
            count = 0
            for doc in query:
                batch.delete(doc.reference)
                count += 1
                # Firestore batches are limited to 500 operations
                if count >= 500:
                    batch.commit()
                    batch = self.firestore_client.batch()
                    count = 0
            
            if count > 0:
                batch.commit()
            
            logger.debug(f"Deleted chunks metadata for document {document_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete chunks metadata for document {document_id}: {e}")
            return False
