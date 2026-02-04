"""Tests for firewall rule models"""

import pytest
from datetime import datetime
from models.firewall_rule import (
    FirewallRule,
    AuditResult,
    RuleViolation,
    Recommendation,
    CloudProvider,
    RuleDirection,
    RuleAction,
    ViolationSeverity
)


class TestFirewallRule:
    """Test FirewallRule model"""

    def test_create_firewall_rule(self):
        """Test creating a basic firewall rule"""
        rule = FirewallRule(
            id="test-rule-1",
            name="test-rule",
            cloud_provider=CloudProvider.GCP,
            direction=RuleDirection.INGRESS,
            action=RuleAction.ALLOW
        )
        assert rule.id == "test-rule-1"
        assert rule.name == "test-rule"
        assert rule.cloud_provider == CloudProvider.GCP
        assert rule.direction == RuleDirection.INGRESS
        assert rule.action == RuleAction.ALLOW

    def test_firewall_rule_with_optional_fields(self):
        """Test firewall rule with optional fields"""
        rule = FirewallRule(
            id="test-rule-2",
            name="test-rule-2",
            cloud_provider=CloudProvider.AZURE,
            direction=RuleDirection.EGRESS,
            action=RuleAction.DENY,
            priority=100,
            source_ranges=["10.0.0.0/8"],
            protocols=["tcp"],
            ports=["80", "443"]
        )
        assert rule.priority == 100
        assert rule.source_ranges == ["10.0.0.0/8"]
        assert rule.protocols == ["tcp"]
        assert rule.ports == ["80", "443"]


class TestRuleViolation:
    """Test RuleViolation model"""

    def test_create_rule_violation(self):
        """Test creating a rule violation"""
        violation = RuleViolation(
            rule_id="rule-1",
            rule_name="test-rule",
            severity=ViolationSeverity.HIGH,
            category="security",
            description="Test violation",
            reason="Test reason",
            remediation="Fix it"
        )
        assert violation.rule_id == "rule-1"
        assert violation.severity == ViolationSeverity.HIGH
        assert violation.risk_score == 0.0  # Default value


class TestRecommendation:
    """Test Recommendation model"""

    def test_create_recommendation(self):
        """Test creating a recommendation"""
        rec = Recommendation(
            id="rec-1",
            rule_id="rule-1",
            title="Test recommendation",
            description="Test description",
            terraform_code="# test code",
            explanation="Test explanation",
            effort_level="low"
        )
        assert rec.id == "rec-1"
        assert rec.rule_id == "rule-1"
        assert rec.effort_level == "low"
        assert rec.risk_reduction == 0.0  # Default value


class TestAuditResult:
    """Test AuditResult model"""

    def test_create_audit_result(self):
        """Test creating an audit result"""
        result = AuditResult(
            total_rules=10,
            violations_found=2,
            recommendations=3,
            intent="security audit",
            cloud_provider=CloudProvider.GCP
        )
        assert result.total_rules == 10
        assert result.violations_found == 2
        assert result.recommendations == 3
        assert result.intent == "security audit"
        assert result.cloud_provider == CloudProvider.GCP
        assert isinstance(result.timestamp, datetime)
