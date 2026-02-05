"""
Firewall Rule Models
Pydantic models for firewall rules and audit results
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum

class CloudProvider(str, Enum):
    GCP = "gcp"
    AZURE = "azure"
    AVIATRIX = "aviatrix"
    CISCO = "cisco"
    PALO_ALTO = "palo_alto"

class RuleDirection(str, Enum):
    INGRESS = "ingress"
    EGRESS = "egress"

class RuleAction(str, Enum):
    ALLOW = "allow"
    DENY = "deny"
    REDIRECT = "redirect"

class FirewallRule(BaseModel):
    """Universal firewall rule model"""
    id: str
    name: str
    description: Optional[str] = None
    cloud_provider: CloudProvider
    direction: RuleDirection
    action: RuleAction
    priority: Optional[int] = None
    source_ranges: List[str] = Field(default_factory=list)
    destination_ranges: List[str] = Field(default_factory=list)
    source_tags: List[str] = Field(default_factory=list)
    target_tags: List[str] = Field(default_factory=list)
    source_service_accounts: List[str] = Field(default_factory=list)
    protocols: List[str] = Field(default_factory=list)
    ports: List[str] = Field(default_factory=list)
    network: Optional[str] = None
    target_service_accounts: List[str] = Field(default_factory=list)
    disabled: bool = False
    logging_enabled: bool = False

    # Provider-specific fields
    provider_specific: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        use_enum_values = True

class ViolationSeverity(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class RuleViolation(BaseModel):
    """Represents a rule violation"""
    rule_id: str
    rule_name: str
    severity: ViolationSeverity
    category: str
    description: str
    reason: str
    remediation: str
    risk_score: float = Field(ge=0.0, le=10.0)
    affected_resources: List[str] = Field(default_factory=list)
    compliance_standards: List[str] = Field(default_factory=list)

class Recommendation(BaseModel):
    """AI-generated recommendation for rule improvement"""
    id: str
    rule_id: str
    title: str
    description: str
    terraform_code: str
    explanation: str
    risk_reduction: float = Field(ge=0.0, le=10.0)
    effort_level: str  # "low", "medium", "high"
    alternative_approaches: List[str] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)

class AuditResult(BaseModel):
    """Complete audit result"""
    id: str = Field(default_factory=lambda: f"audit_{datetime.utcnow().isoformat()}")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    total_rules: int
    violations_found: int
    recommendations: int
    intent: str
    cloud_provider: CloudProvider
    violations: List[RuleViolation] = Field(default_factory=list)
    recommendations_list: List[Recommendation] = Field(default_factory=list)
    summary: Dict[str, Any] = Field(default_factory=dict)
    execution_time_seconds: float = 0.0
    cached: bool = False
    confidence_score: float = Field(ge=0.0, le=1.0, default=0.8)
    similar_issues: List[Dict[str, Any]] = Field(default_factory=list)
    terraform_diff: Optional[Dict[str, Any]] = None

class IntentAnalysis(BaseModel):
    """Analysis of business security intent"""
    requirements: List[str] = Field(default_factory=list)
    constraints: List[str] = Field(default_factory=list)
    risk_levels: Dict[str, List[str]] = Field(default_factory=dict)
    key_principles: List[str] = Field(default_factory=list)
    exceptions_allowed: List[str] = Field(default_factory=list)

class NormalizedRule(BaseModel):
    """Normalized rule in universal schema"""
    original_rule: FirewallRule
    normalized_data: Dict[str, Any]
    schema_version: str = "1.0"
    normalization_timestamp: datetime = Field(default_factory=datetime.utcnow)
    confidence_score: float = Field(ge=0.0, le=1.0, default=1.0)


class ComplianceStandard(BaseModel):
    """Represents a compliance standard or framework"""
    name: str  # e.g., "CIS", "NIST", "PCI-DSS", "SOC 2"
    version: Optional[str] = None
    requirement_id: Optional[str] = None
    description: str
    source: str  # Document title or URL


class ComplianceCheck(BaseModel):
    """Result of a compliance check for a rule"""
    rule_id: str
    rule_name: str
    standard: ComplianceStandard
    compliant: bool
    severity: ViolationSeverity
    finding: str
    recommendation: str
    evidence: List[str] = Field(default_factory=list)  # Supporting evidence from RAG
    risk_score: float = Field(ge=0.0, le=10.0)


class ComplianceResult(BaseModel):
    """Overall compliance assessment result"""
    id: str = Field(default_factory=lambda: f"compliance_{datetime.utcnow().isoformat()}")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    cloud_provider: CloudProvider
    total_rules: int
    compliant_rules: int
    non_compliant_rules: int
    checks: List[ComplianceCheck] = Field(default_factory=list)
    standards_checked: List[str] = Field(default_factory=list)
    overall_compliance_score: float = Field(ge=0.0, le=100.0)
    summary: Dict[str, Any] = Field(default_factory=dict)
    rag_context_used: bool = False
    rag_documents_count: int = 0