"""Tests for context cache"""

import pytest
import asyncio
from caching.context_cache import ContextCache


class TestContextCache:
    """Test ContextCache functionality"""

    @pytest.fixture
    def cache(self):
        """Create a cache instance for testing"""
        return ContextCache(max_size=10, ttl_hours=1)

    def test_generate_key(self, cache):
        """Test cache key generation"""
        rules = [
            {"id": "rule-1", "direction": "ingress", "action": "allow"},
            {"id": "rule-2", "direction": "egress", "action": "deny"}
        ]
        intent = "security audit"
        
        key1 = cache.generate_key(rules, intent)
        key2 = cache.generate_key(rules, intent)
        
        # Same input should generate same key
        assert key1 == key2
        assert isinstance(key1, str)
        assert len(key1) > 0

    @pytest.mark.asyncio
    async def test_set_and_get(self, cache):
        """Test setting and getting cache values"""
        key = "test-key-123"
        data = {"result": "test-data"}
        
        await cache.set(key, data)
        result = await cache.get(key)
        
        assert result == data

    @pytest.mark.asyncio
    async def test_get_nonexistent_key(self, cache):
        """Test getting a non-existent key returns None"""
        result = await cache.get("nonexistent-key")
        assert result is None

    @pytest.mark.asyncio
    async def test_clear_cache(self, cache):
        """Test clearing the cache"""
        await cache.set("key1", {"data": 1})
        await cache.set("key2", {"data": 2})
        
        await cache.clear()
        
        assert await cache.get("key1") is None
        assert await cache.get("key2") is None

    @pytest.mark.asyncio
    async def test_get_stats(self, cache):
        """Test getting cache statistics"""
        await cache.set("key1", {"data": 1})
        stats = await cache.get_stats()
        
        assert stats["entries"] == 1
        assert stats["max_size"] == 10
        assert "utilization_percent" in stats
