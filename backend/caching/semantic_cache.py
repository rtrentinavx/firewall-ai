"""
Semantic Cache - Vector-Based Recommendation Storage
Stores approved fixes and retrieves similar recommendations using vector similarity
"""

import logging
import numpy as np
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from sentence_transformers import SentenceTransformer
import faiss

logger = logging.getLogger(__name__)

class SemanticCache:
    """Semantic caching using vector similarity for firewall recommendations"""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2", max_entries: int = 5000):
        self.model = SentenceTransformer(model_name)
        self.max_entries = max_entries
        self.entries: List[Dict[str, Any]] = []
        self.vectors: Optional[np.ndarray[Any, np.dtype[np.floating[Any]]]] = None
        self.index: Optional[faiss.Index] = None
        self.embedding_dim = self.model.get_sentence_embedding_dimension()

        # Initialize FAISS index
        self._initialize_index()

    def _initialize_index(self):
        """Initialize FAISS vector index"""
        self.index = faiss.IndexFlatIP(self.embedding_dim)  # Inner product for cosine similarity

    def generate_key(self, intent: str, rules: List[Dict[str, Any]]) -> str:
        """Generate semantic key from intent and rule patterns"""

        # Create semantic representation
        intent_embedding = self.model.encode(intent)

        # Extract key patterns from rules
        rule_patterns = self._extract_rule_patterns(rules)
        pattern_text = " ".join(rule_patterns)

        # Combine intent and patterns
        semantic_text = f"{intent} {pattern_text}"
        semantic_embedding = self.model.encode(semantic_text)

        # Convert to hash for storage key
        import hashlib
        key_data = {
            "intent": intent,
            "patterns": rule_patterns,
            "timestamp": datetime.utcnow().isoformat()
        }

        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.sha256(key_string.encode()).hexdigest()

    async def get(self, key: str, similarity_threshold: float = 0.85) -> Optional[List[Dict[str, Any]]]:
        """Retrieve semantically similar recommendations"""

        if not self.entries or self.index is None:
            return None

        # Generate embedding for the query
        query_embedding = self._generate_embedding_from_key(key)
        if query_embedding is None:
            return None

        # Search for similar entries
        query_vector = np.array([query_embedding], dtype=np.float32)
        scores, indices = self.index.search(query_vector, k=5)  # Top 5 similar

        # Filter by similarity threshold
        similar_entries = []
        for score, idx in zip(scores[0], indices[0]):
            if score >= similarity_threshold and idx < len(self.entries):
                entry = self.entries[idx]
                entry["similarity_score"] = float(score)
                similar_entries.append(entry)

        if similar_entries:
            logger.info(f"Found {len(similar_entries)} semantically similar recommendations")
            return similar_entries[0]["recommendations"]  # Return the recommendations

        return None

    async def set(self, key: str, recommendations: List[Dict[str, Any]]) -> None:
        """Store recommendations with semantic embedding"""

        # Generate embedding for storage
        embedding = self._generate_embedding_from_key(key)
        if embedding is None:
            logger.warning(f"Could not generate embedding for key {key[:8]}...")
            return

        # Create entry
        entry = {
            "key": key,
            "recommendations": recommendations,
            "timestamp": datetime.utcnow().isoformat(),
            "usage_count": 0
        }

        # Add to entries
        self.entries.append(entry)

        # Add to vector index
        vector = np.array([embedding], dtype=np.float32)
        if self.vectors is None:
            self.vectors = vector
        else:
            self.vectors = np.vstack([self.vectors, vector])

        if self.index is not None:
            self.index.add(vector)

        # Maintain size limit
        if len(self.entries) > self.max_entries:
            await self._evict_old_entries()

        logger.info(f"Stored semantic recommendations for key {key[:8]}...")

    async def update_usage(self, key: str) -> None:
        """Update usage statistics for a cached entry"""
        for entry in self.entries:
            if entry["key"] == key:
                entry["usage_count"] += 1
                break

    async def get_stats(self) -> Dict[str, Any]:
        """Get semantic cache statistics"""
        if not self.entries:
            return {"entries": 0, "total_usage": 0, "avg_similarity": 0}

        total_usage = sum(entry["usage_count"] for entry in self.entries)
        avg_usage = total_usage / len(self.entries)

        return {
            "entries": len(self.entries),
            "max_entries": self.max_entries,
            "total_usage": total_usage,
            "avg_usage_per_entry": avg_usage,
            "embedding_dimension": self.embedding_dim,
            "model_name": self.model.get_sentence_embedding_dimension()
        }

    def _generate_embedding_from_key(self, key: str) -> Optional[np.ndarray[Any, np.dtype[np.floating[Any]]]]:
        """Generate embedding from semantic key"""

        try:
            # The key contains JSON data that we can use to recreate the semantic content
            # For now, we'll use the key itself as the semantic content
            # In a real implementation, you'd decode the key to get intent and patterns

            # Simple approach: use the key as text for embedding
            embedding = self.model.encode(key)
            return np.array(embedding, dtype=np.float32)

        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None

    def _extract_rule_patterns(self, rules: List[Dict[str, Any]]) -> List[str]:
        """Extract semantic patterns from rules"""

        patterns = []

        for rule in rules:
            # Create semantic description of the rule
            direction = rule.get("direction", "unknown")
            action = rule.get("action", "unknown")
            protocols = rule.get("protocols", [])
            ports = rule.get("ports", [])

            pattern = f"{direction} {action} rule"
            if protocols:
                pattern += f" for {', '.join(protocols)}"
            if ports:
                pattern += f" on ports {', '.join(ports)}"

            patterns.append(pattern)

        return patterns

    async def _evict_old_entries(self, keep_percent: float = 0.9) -> None:
        """Evict least-used entries to maintain size limit"""

        if len(self.entries) <= self.max_entries:
            return

        # Sort by usage count (ascending) then by timestamp (oldest first)
        sorted_entries = sorted(
            self.entries,
            key=lambda x: (x["usage_count"], datetime.fromisoformat(x["timestamp"]))
        )

        # Keep the most used entries
        keep_count = int(len(sorted_entries) * keep_percent)
        entries_to_keep = sorted_entries[-keep_count:]

        # Rebuild index with kept entries
        self.entries = entries_to_keep
        self._rebuild_index()

        logger.info(f"Evicted {len(sorted_entries) - keep_count} semantic cache entries")

    def _rebuild_index(self) -> None:
        """Rebuild the FAISS index with current entries"""

        if not self.entries:
            self._initialize_index()
            return

        # Generate embeddings for all entries
        embeddings = []
        for entry in self.entries:
            embedding = self._generate_embedding_from_key(entry["key"])
            if embedding is not None:
                embeddings.append(embedding)

        if embeddings:
            self.vectors = np.array(embeddings, dtype=np.float32)
            self.index = faiss.IndexFlatIP(self.embedding_dim)
            if self.index is not None:
                self.index.add(self.vectors)

    async def find_similar_issues(self, issue_description: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Find similar historical issues and their resolutions"""

        if not self.entries or self.index is None:
            return []

        # Embed the issue description
        issue_embedding = self.model.encode(issue_description)
        query_vector = np.array([issue_embedding], dtype=np.float32)

        # Search for similar issues
        scores, indices = self.index.search(query_vector, k=limit)

        similar_issues = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(self.entries):
                entry = self.entries[idx].copy()
                entry["similarity_score"] = float(score)
                similar_issues.append(entry)

        return similar_issues

    async def learn_from_feedback(self, original_issue: str, approved_fix: Dict[str, Any]) -> None:
        """Learn from user feedback to improve future recommendations"""

        # Store the approved fix with high priority
        key = f"approved_fix_{hash(original_issue)}"

        # Boost the usage count to prevent early eviction
        approved_entry = {
            "key": key,
            "recommendations": [approved_fix],
            "timestamp": datetime.utcnow().isoformat(),
            "usage_count": 100,  # High usage count to retain
            "feedback_approved": True
        }

        self.entries.append(approved_entry)

        # Rebuild index to include the new entry
        embedding = self.model.encode(original_issue)
        vector = np.array([embedding], dtype=np.float32)

        if self.vectors is None:
            self.vectors = vector
        else:
            self.vectors = np.vstack([self.vectors, vector])

        if self.index is not None:
            self.index.add(vector)

        logger.info("Learned from user feedback and updated semantic cache")