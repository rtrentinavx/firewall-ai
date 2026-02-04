"""Tests for normalization engine"""

import pytest
from models.firewall_rule import FirewallRule, CloudProvider, RuleDirection, RuleAction
from normalization.engine import NormalizationEngine


class TestNormalizationEngine:
    """Test NormalizationEngine functionality"""

    @pytest.fixture
    def engine(self):
        """Create a normalization engine instance"""
        return NormalizationEngine()

    @pytest.fixture
    def sample_gcp_rule(self):
        """Create a sample GCP firewall rule"""
        return FirewallRule(
            id="gcp-rule-1",
            name="test-gcp-rule",
            cloud_provider=CloudProvider.GCP,
            direction=RuleDirection.INGRESS,
            action=RuleAction.ALLOW,
            source_ranges=["10.0.0.0/8"],
            protocols=["tcp"],
            ports=["80", "443"]
        )

    @pytest.mark.asyncio
    async def test_normalize_gcp_rule(self, engine, sample_gcp_rule):
        """Test normalizing a GCP rule"""
        normalized = await engine.normalize_rule(sample_gcp_rule)
        
        assert normalized.original_rule == sample_gcp_rule
        assert normalized.normalized_data["rule_type"] == "vpc_firewall"
        assert normalized.normalized_data["direction"] == "ingress"
        assert normalized.normalized_data["action"] == "allow"
        assert normalized.normalized_data["metadata"]["provider"] == "gcp"
        assert normalized.confidence_score > 0

    @pytest.mark.asyncio
    async def test_normalize_batch(self, engine, sample_gcp_rule):
        """Test normalizing multiple rules"""
        rules = [sample_gcp_rule]
        normalized_rules = await engine.normalize_rules_batch(rules)
        
        assert len(normalized_rules) == 1
        assert normalized_rules[0].original_rule == sample_gcp_rule
