"""
RAG Knowledge Base - Document storage and retrieval for RAG
Supports document ingestion from local files and URLs
"""

import logging
import os
import hashlib
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from pathlib import Path
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

from rag.persistent_storage import PersistentRAGStorage

logger = logging.getLogger(__name__)

class DocumentChunk:
    """Represents a chunk of a document"""
    
    def __init__(
        self,
        document_id: str,
        chunk_index: int,
        content: str,
        metadata: Dict[str, Any]
    ):
        self.document_id = document_id
        self.chunk_index = chunk_index
        self.content = content
        self.metadata = metadata
        self.embedding: Optional[np.ndarray] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'document_id': self.document_id,
            'chunk_index': self.chunk_index,
            'content': self.content,
            'metadata': self.metadata,
            'embedding_dim': len(self.embedding) if self.embedding is not None else None
        }

class Document:
    """Represents a document in the knowledge base"""
    
    def __init__(
        self,
        document_id: str,
        source: str,
        source_type: str,  # 'file' or 'url'
        title: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.document_id = document_id
        self.source = source
        self.source_type = source_type
        self.title = title
        self.content = content
        self.metadata = metadata or {}
        self.created_at = datetime.utcnow().isoformat()
        self.chunks: List[DocumentChunk] = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'document_id': self.document_id,
            'source': self.source,
            'source_type': self.source_type,
            'title': self.title,
            'content_length': len(self.content),
            'chunks_count': len(self.chunks),
            'metadata': self.metadata,
            'created_at': self.created_at
        }

class RAGKnowledgeBase:
    """RAG Knowledge Base for document storage and retrieval"""
    
    def __init__(
        self,
        embedding_model_name: str = "all-MiniLM-L6-v2",
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        persistent_storage: Optional[PersistentRAGStorage] = None
    ):
        self.embedding_model_name = embedding_model_name
        self.embedding_model = SentenceTransformer(embedding_model_name)
        self.embedding_dim = self.embedding_model.get_sentence_embedding_dimension()
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.persistent_storage = persistent_storage
        
        # Storage
        self.documents: Dict[str, Document] = {}
        self.chunks: List[DocumentChunk] = []
        self.vectors: Optional[np.ndarray] = None
        self.index: Optional[faiss.Index] = None
        
        # Initialize FAISS index
        self._initialize_index()
        
        # Load persisted data if available
        if self.persistent_storage:
            self._load_from_persistent_storage()
    
    def _initialize_index(self) -> None:
        """Initialize FAISS vector index"""
        self.index = faiss.IndexFlatIP(self.embedding_dim)  # Inner product for cosine similarity
    
    def _load_from_persistent_storage(self) -> None:
        """Load documents and FAISS index from persistent storage"""
        if not self.persistent_storage:
            return
        
        try:
            logger.info("Loading RAG knowledge base from persistent storage...")
            
            # Load documents from Firestore
            documents_metadata = self.persistent_storage.list_documents()
            
            for doc_meta in documents_metadata:
                document_id = doc_meta.get('document_id') or doc_meta.get('id')
                if not document_id:
                    continue
                
                # Load document content from Cloud Storage
                content = self.persistent_storage.load_document(document_id)
                if content:
                    document = Document(
                        document_id=document_id,
                        source=doc_meta.get('source', ''),
                        source_type=doc_meta.get('source_type', 'file'),
                        title=doc_meta.get('title', 'Unknown'),
                        content=content,
                        metadata=doc_meta.get('metadata', {})
                    )
                    document.created_at = doc_meta.get('created_at', datetime.utcnow().isoformat())
                    
                    # Rebuild chunks from content
                    text_chunks = self._chunk_text(content)
                    for idx, chunk_text in enumerate(text_chunks):
                        chunk = DocumentChunk(
                            document_id=document_id,
                            chunk_index=idx,
                            content=chunk_text,
                            metadata={
                                **document.metadata,
                                'title': document.title,
                                'source': document.source,
                                'source_type': document.source_type
                            }
                        )
                        # Generate embedding for chunk
                        chunk.embedding = self._generate_embedding(chunk_text)
                        document.chunks.append(chunk)
                        self.chunks.append(chunk)
                    
                    self.documents[document_id] = document
            
            # Try to load FAISS index from storage, otherwise rebuild from chunks
            index_data = self.persistent_storage.load_faiss_index()
            if index_data:
                loaded_index, loaded_vectors, index_metadata = index_data
                # Verify the loaded index matches our chunks
                if len(loaded_vectors) == len(self.chunks):
                    self.index = loaded_index
                    self.vectors = loaded_vectors
                    logger.info(f"Loaded FAISS index with {len(self.vectors)} vectors from storage")
                else:
                    logger.warning(f"Loaded index has {len(loaded_vectors)} vectors but we have {len(self.chunks)} chunks. Rebuilding index.")
                    self._rebuild_index()
            else:
                # No saved index, rebuild from chunks
                if len(self.chunks) > 0:
                    logger.info("No saved FAISS index found, rebuilding from chunks")
                    self._rebuild_index()
            
            logger.info(f"Loaded {len(self.documents)} documents with {len(self.chunks)} chunks from persistent storage")
            
        except Exception as e:
            logger.error(f"Failed to load from persistent storage: {e}", exc_info=True)
    
    def _save_to_persistent_storage(self) -> None:
        """Save FAISS index to persistent storage"""
        if not self.persistent_storage or not self.index or self.vectors is None:
            return
        
        try:
            metadata = {
                'embedding_dim': self.embedding_dim,
                'chunk_count': len(self.chunks),
                'document_count': len(self.documents),
                'saved_at': datetime.utcnow().isoformat()
            }
            
            self.persistent_storage.save_faiss_index(
                self.index,
                self.vectors,
                metadata
            )
            logger.debug("Saved FAISS index to persistent storage")
        except Exception as e:
            logger.error(f"Failed to save to persistent storage: {e}", exc_info=True)
    
    def _chunk_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks"""
        if len(text) <= self.chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + self.chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            
            if end >= len(text):
                break
            
            # Move start position with overlap
            start = end - self.chunk_overlap
        
        return chunks
    
    def _generate_embedding(self, text: str) -> np.ndarray:
        """Generate embedding for text"""
        embedding = self.embedding_model.encode(text)
        return np.array(embedding, dtype=np.float32)
    
    def add_document(
        self,
        source: str,
        source_type: str,
        title: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Add a document to the knowledge base"""
        
        # Generate document ID
        content_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
        document_id = f"{source_type}_{content_hash}"
        
        # Create document
        document = Document(
            document_id=document_id,
            source=source,
            source_type=source_type,
            title=title,
            content=content,
            metadata=metadata or {}
        )
        
        # Chunk the document
        text_chunks = self._chunk_text(content)
        
        # Create chunks with embeddings
        new_chunks = []
        new_vectors = []
        
        for idx, chunk_text in enumerate(text_chunks):
            chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=idx,
                content=chunk_text,
                metadata={
                    **document.metadata,
                    'title': title,
                    'source': source,
                    'source_type': source_type
                }
            )
            
            # Generate embedding
            chunk.embedding = self._generate_embedding(chunk_text)
            document.chunks.append(chunk)
            new_chunks.append(chunk)
            new_vectors.append(chunk.embedding)
        
        # Add to storage
        self.documents[document_id] = document
        self.chunks.extend(new_chunks)
        
        # Update FAISS index
        if new_vectors and self.index is not None:
            vectors_array = np.array(new_vectors, dtype=np.float32)
            self.index.add(vectors_array)
            
            # Update vectors array
            if self.vectors is None:
                self.vectors = vectors_array
            else:
                self.vectors = np.vstack([self.vectors, vectors_array])
        
        # Save to persistent storage
        if self.persistent_storage:
            # Save document content
            self.persistent_storage.save_document(document_id, content, document.metadata)
            
            # Save document metadata
            self.persistent_storage.save_document_metadata(document_id, document.to_dict())
            
            # Save chunks metadata
            chunks_metadata = [chunk.to_dict() for chunk in new_chunks]
            self.persistent_storage.save_chunks_metadata(document_id, chunks_metadata)
            
            # Save FAISS index
            self._save_to_persistent_storage()
        
        logger.info(f"Added document {document_id} with {len(new_chunks)} chunks")
        return document_id
    
    def delete_document(self, document_id: str) -> bool:
        """Delete a document and its chunks from the knowledge base"""
        
        if document_id not in self.documents:
            return False
        
        # Remove chunks
        chunks_to_remove = [c for c in self.chunks if c.document_id == document_id]
        chunk_indices_to_remove = [
            i for i, c in enumerate(self.chunks) if c.document_id == document_id
        ]
        
        # Remove from chunks list
        self.chunks = [c for c in self.chunks if c.document_id != document_id]
        
        # Remove document
        del self.documents[document_id]
        
        # Delete from persistent storage
        if self.persistent_storage:
            self.persistent_storage.delete_document(document_id)
            self.persistent_storage.delete_document_metadata(document_id)
            self.persistent_storage.delete_chunks_metadata(document_id)
        
        # Rebuild index (simpler than removing specific vectors)
        self._rebuild_index()
        
        # Save updated index
        if self.persistent_storage:
            self._save_to_persistent_storage()
        
        logger.info(f"Deleted document {document_id} and {len(chunks_to_remove)} chunks")
        return True
    
    def _rebuild_index(self) -> None:
        """Rebuild the FAISS index with current chunks"""
        
        if not self.chunks:
            self._initialize_index()
            self.vectors = None
            return
        
        # Generate embeddings for all chunks
        embeddings = []
        for chunk in self.chunks:
            if chunk.embedding is None:
                chunk.embedding = self._generate_embedding(chunk.content)
            embeddings.append(chunk.embedding)
        
        if embeddings:
            self.vectors = np.array(embeddings, dtype=np.float32)
            self.index = faiss.IndexFlatIP(self.embedding_dim)
            self.index.add(self.vectors)
    
    def search(
        self,
        query: str,
        limit: int = 5,
        min_score: float = 0.0
    ) -> List[Dict[str, Any]]:
        """Search the knowledge base for relevant chunks"""
        
        if not self.chunks or self.index is None:
            return []
        
        # Generate query embedding
        query_embedding = self._generate_embedding(query)
        query_vector = np.array([query_embedding], dtype=np.float32)
        
        # Search FAISS index
        scores, indices = self.index.search(query_vector, k=min(limit * 2, len(self.chunks)))
        
        # Format results
        results = []
        seen_docs = set()
        
        for score, idx in zip(scores[0], indices[0]):
            if idx >= len(self.chunks):
                continue
            
            chunk = self.chunks[idx]
            
            # Skip if score too low
            if score < min_score:
                continue
            
            # Limit results per document
            if chunk.document_id in seen_docs:
                continue
            
            seen_docs.add(chunk.document_id)
            
            document = self.documents.get(chunk.document_id)
            
            result = {
                'chunk': chunk.to_dict(),
                'document': document.to_dict() if document else None,
                'score': float(score),
                'relevance': 'high' if score > 0.7 else 'medium' if score > 0.5 else 'low'
            }
            
            results.append(result)
            
            if len(results) >= limit:
                break
        
        return results
    
    def get_documents(self) -> List[Dict[str, Any]]:
        """Get all documents"""
        return [doc.to_dict() for doc in self.documents.values()]
    
    def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific document"""
        document = self.documents.get(document_id)
        return document.to_dict() if document else None
    
    def get_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics"""
        stats = {
            'total_documents': len(self.documents),
            'total_chunks': len(self.chunks),
            'embedding_model': self.embedding_model_name,
            'embedding_dimension': self.embedding_dim,
            'chunk_size': self.chunk_size,
            'chunk_overlap': self.chunk_overlap,
            'persistence_enabled': self.persistent_storage is not None and self.persistent_storage.enable_persistence
        }
        
        if self.persistent_storage and self.persistent_storage.enable_persistence:
            stats['persistence_backend'] = 'Cloud Storage + Firestore'
            stats['documents_bucket'] = self.persistent_storage.documents_bucket_name
            stats['indices_bucket'] = self.persistent_storage.indices_bucket_name
        
        return stats
    
    def save_state(self) -> bool:
        """Explicitly save current state to persistent storage"""
        if not self.persistent_storage:
            return False
        
        try:
            self._save_to_persistent_storage()
            return True
        except Exception as e:
            logger.error(f"Failed to save state: {e}")
            return False
