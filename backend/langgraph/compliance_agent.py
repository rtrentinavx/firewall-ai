"""
Compliance Agent - Checks firewall rules against industry standards and best practices
Uses RAG to retrieve relevant compliance standards and recommendations
"""

import logging
import json
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from pydantic import BaseModel, Field

from models.firewall_rule import (
    FirewallRule,
    CloudProvider,
    RuleDirection,
    RuleAction,
    ViolationSeverity
)
from rag.knowledge_base import RAGKnowledgeBase

logger = logging.getLogger(__name__)


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


class ComplianceAgent:
    """Agent for checking firewall rule compliance against industry standards"""

    def __init__(self, rag_knowledge_base: Optional[RAGKnowledgeBase] = None):
        self.rag_knowledge_base = rag_knowledge_base
        
        # Common compliance standards to check
        self.standard_frameworks = [
            "CIS Benchmarks",
            "NIST Cybersecurity Framework",
            "PCI-DSS",
            "SOC 2",
            "ISO 27001",
            "AWS Well-Architected Framework",
            "Google Cloud Security Best Practices",
            "Azure Security Best Practices"
        ]

    async def check_compliance(
        self,
        rules: List[FirewallRule],
        cloud_provider: CloudProvider,
        standards: Optional[List[str]] = None,
        use_rag: bool = True
    ) -> ComplianceResult:
        """
        Check firewall rules for compliance with industry standards
        
        Args:
            rules: List of firewall rules to check
            cloud_provider: Cloud provider (GCP, Azure, etc.)
            standards: Optional list of specific standards to check (defaults to all)
            use_rag: Whether to use RAG knowledge base for context
        
        Returns:
            ComplianceResult with compliance checks and scores
        """
        logger.info(f"Starting compliance check for {len(rules)} rules on {cloud_provider.value}")

        standards_to_check = standards or self.standard_frameworks
        compliance_checks: List[ComplianceCheck] = []
        rag_context_used = False
        rag_documents_count = 0

        # Retrieve relevant compliance documents from RAG if available
        rag_documents: List[Dict[str, Any]] = []
        if use_rag and self.rag_knowledge_base:
            try:
                # Search for compliance standards relevant to the cloud provider
                search_queries = [
                    f"{cloud_provider.value} firewall security best practices",
                    f"{cloud_provider.value} compliance standards",
                    "firewall rule compliance CIS NIST",
                    "network security compliance requirements"
                ]
                
                all_results = []
                for query in search_queries:
                    results = self.rag_knowledge_base.search(query, limit=3, min_score=0.4)
                    all_results.extend(results)
                
                # Deduplicate by document ID
                seen_docs = set()
                for result in all_results:
                    doc_id = result.get('document', {}).get('id') if result.get('document') else None
                    if doc_id and doc_id not in seen_docs:
                        seen_docs.add(doc_id)
                        rag_documents.append(result)
                
                rag_context_used = len(rag_documents) > 0
                rag_documents_count = len(rag_documents)
                
                if rag_context_used:
                    logger.info(f"Retrieved {rag_documents_count} compliance documents from RAG")
            except Exception as e:
                logger.warning(f"Failed to retrieve RAG context for compliance: {e}")

        # Check each rule against standards
        for rule in rules:
            rule_checks = self._check_rule_compliance(
                rule,
                cloud_provider,
                standards_to_check,
                rag_documents
            )
            compliance_checks.extend(rule_checks)

        # Calculate compliance scores
        compliant_count = sum(1 for check in compliance_checks if check.compliant)
        non_compliant_count = len(compliance_checks) - compliant_count
        
        # Calculate overall compliance score (percentage)
        if compliance_checks:
            overall_score = (compliant_count / len(compliance_checks)) * 100.0
        else:
            overall_score = 100.0  # No checks = fully compliant (edge case)

        # Group by standard
        standards_checked = list(set(check.standard.name for check in compliance_checks))
        
        # Generate summary
        summary = self._generate_compliance_summary(
            compliance_checks,
            standards_checked,
            rag_documents
        )

        result = ComplianceResult(
            cloud_provider=cloud_provider,
            total_rules=len(rules),
            compliant_rules=compliant_count,
            non_compliant_rules=non_compliant_count,
            checks=compliance_checks,
            standards_checked=standards_checked,
            overall_compliance_score=round(overall_score, 2),
            summary=summary,
            rag_context_used=rag_context_used,
            rag_documents_count=rag_documents_count
        )

        logger.info(
            f"Compliance check complete: {compliant_count}/{len(compliance_checks)} compliant "
            f"(score: {overall_score:.1f}%)"
        )

        return result

    def _check_rule_compliance(
        self,
        rule: FirewallRule,
        cloud_provider: CloudProvider,
        standards: List[str],
        rag_documents: List[Dict[str, Any]]
    ) -> List[ComplianceCheck]:
        """Check a single rule against compliance standards"""
        checks: List[ComplianceCheck] = []

        # Extract rule characteristics for compliance checking
        rule_characteristics = self._analyze_rule_characteristics(rule)

        # Check against each standard
        for standard_name in standards:
            check = self._check_against_standard(
                rule,
                standard_name,
                rule_characteristics,
                cloud_provider,
                rag_documents
            )
            if check:
                checks.append(check)

        return checks

    def _analyze_rule_characteristics(self, rule: FirewallRule) -> Dict[str, Any]:
        """Analyze rule characteristics for compliance checking"""
        return {
            'has_source_restriction': bool(rule.source_ranges or rule.source_tags or rule.source_service_accounts),
            'has_destination_restriction': bool(rule.destination_ranges),
            'allows_all_traffic': (
                '0.0.0.0/0' in rule.source_ranges or
                '*' in rule.source_ranges or
                not rule.source_ranges
            ),
            'allows_all_ports': (
                not rule.ports or
                '0-65535' in rule.ports or
                '*' in rule.ports
            ),
            'allows_all_protocols': (
                not rule.protocols or
                'all' in rule.protocols or
                '*' in rule.protocols
            ),
            'is_ingress': rule.direction == RuleDirection.INGRESS,
            'is_egress': rule.direction == RuleDirection.EGRESS,
            'action': rule.action.value,
            'has_logging': rule.logging_enabled,
            'is_disabled': rule.disabled,
            'priority': rule.priority
        }

    def _check_against_standard(
        self,
        rule: FirewallRule,
        standard_name: str,
        characteristics: Dict[str, Any],
        cloud_provider: CloudProvider,
        rag_documents: List[Dict[str, Any]]
    ) -> Optional[ComplianceCheck]:
        """Check rule against a specific compliance standard"""
        
        # Search RAG documents for relevant standard information
        relevant_context = self._find_relevant_context(standard_name, cloud_provider, rag_documents)
        
        # Apply compliance rules based on standard
        compliant = True
        finding = ""
        recommendation = ""
        severity = ViolationSeverity.INFO
        evidence: List[str] = []

        # CIS Benchmarks checks
        if "CIS" in standard_name:
            compliant, finding, recommendation, severity = self._check_cis_compliance(
                rule, characteristics, relevant_context
            )
            if relevant_context:
                evidence.append(f"Found CIS guidance in knowledge base: {relevant_context[0].get('document', {}).get('title', 'Unknown')}")

        # NIST Framework checks
        elif "NIST" in standard_name:
            compliant, finding, recommendation, severity = self._check_nist_compliance(
                rule, characteristics, relevant_context
            )
            if relevant_context:
                evidence.append(f"Found NIST guidance in knowledge base: {relevant_context[0].get('document', {}).get('title', 'Unknown')}")

        # PCI-DSS checks
        elif "PCI" in standard_name:
            compliant, finding, recommendation, severity = self._check_pci_compliance(
                rule, characteristics, relevant_context
            )
            if relevant_context:
                evidence.append(f"Found PCI-DSS guidance in knowledge base: {relevant_context[0].get('document', {}).get('title', 'Unknown')}")

        # Generic cloud provider best practices
        elif cloud_provider.value.lower() in standard_name.lower():
            compliant, finding, recommendation, severity = self._check_cloud_best_practices(
                rule, characteristics, cloud_provider, relevant_context
            )
            if relevant_context:
                evidence.append(f"Found {cloud_provider.value} best practices in knowledge base")

        # Generic compliance check if no specific standard match
        else:
            compliant, finding, recommendation, severity = self._check_generic_compliance(
                rule, characteristics, standard_name, relevant_context
            )

        # Only return check if there's a finding (non-compliant or info)
        if not compliant or finding:
            # Calculate risk score based on severity and characteristics
            risk_score = self._calculate_risk_score(severity, characteristics)

            return ComplianceCheck(
                rule_id=rule.id,
                rule_name=rule.name,
                standard=ComplianceStandard(
                    name=standard_name,
                    description=f"Compliance check against {standard_name}",
                    source=relevant_context[0].get('document', {}).get('title', standard_name) if relevant_context else standard_name
                ),
                compliant=compliant,
                severity=severity,
                finding=finding or "Rule meets compliance requirements",
                recommendation=recommendation or "No changes needed",
                evidence=evidence,
                risk_score=risk_score
            )

        return None

    def _find_relevant_context(
        self,
        standard_name: str,
        cloud_provider: CloudProvider,
        rag_documents: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Find relevant context from RAG documents for a standard"""
        relevant = []
        
        for doc in rag_documents:
            content = doc.get('chunk', {}).get('content', '').lower()
            doc_title = doc.get('document', {}).get('title', '').lower()
            
            # Check if document is relevant to the standard
            if (standard_name.lower() in content or 
                standard_name.lower() in doc_title or
                cloud_provider.value.lower() in content):
                relevant.append(doc)
        
        return relevant[:3]  # Return top 3 most relevant

    def _check_cis_compliance(
        self,
        rule: FirewallRule,
        characteristics: Dict[str, Any],
        context: List[Dict[str, Any]]
    ) -> tuple[bool, str, str, ViolationSeverity]:
        """Check compliance with CIS Benchmarks"""
        compliant = True
        finding = ""
        recommendation = ""
        severity = ViolationSeverity.INFO

        # CIS 3.1: Restrict default network access
        if characteristics['allows_all_traffic'] and rule.direction == RuleDirection.INGRESS:
            compliant = False
            finding = "CIS 3.1: Rule allows traffic from 0.0.0.0/0 (all sources)"
            recommendation = "Restrict source IP ranges to specific subnets or use service accounts"
            severity = ViolationSeverity.HIGH

        # CIS 3.2: Ensure firewall rules are not overly permissive
        if characteristics['allows_all_ports'] and characteristics['allows_all_protocols']:
            compliant = False
            finding = "CIS 3.2: Rule allows all ports and protocols"
            recommendation = "Specify specific ports and protocols required for the application"
            severity = ViolationSeverity.HIGH if not finding else severity

        # CIS 3.3: Enable logging
        if not characteristics['has_logging']:
            compliant = False
            finding = "CIS 3.3: Firewall logging is not enabled"
            recommendation = "Enable firewall logging for security monitoring and compliance"
            severity = ViolationSeverity.MEDIUM

        return compliant, finding, recommendation, severity

    def _check_nist_compliance(
        self,
        rule: FirewallRule,
        characteristics: Dict[str, Any],
        context: List[Dict[str, Any]]
    ) -> tuple[bool, str, str, ViolationSeverity]:
        """Check compliance with NIST Cybersecurity Framework"""
        compliant = True
        finding = ""
        recommendation = ""
        severity = ViolationSeverity.INFO

        # NIST PR.AC-5: Network integrity is protected
        if characteristics['allows_all_traffic']:
            compliant = False
            finding = "NIST PR.AC-5: Rule does not protect network integrity (allows all sources)"
            recommendation = "Implement network segmentation and restrict source addresses"
            severity = ViolationSeverity.HIGH

        # NIST PR.DS-2: Data-in-transit is protected
        if not characteristics['has_source_restriction']:
            compliant = False
            finding = "NIST PR.DS-2: Rule lacks source restrictions for data protection"
            recommendation = "Add source IP restrictions or service account filters"
            severity = ViolationSeverity.MEDIUM

        return compliant, finding, recommendation, severity

    def _check_pci_compliance(
        self,
        rule: FirewallRule,
        characteristics: Dict[str, Any],
        context: List[Dict[str, Any]]
    ) -> tuple[bool, str, str, ViolationSeverity]:
        """Check compliance with PCI-DSS"""
        compliant = True
        finding = ""
        recommendation = ""
        severity = ViolationSeverity.INFO

        # PCI-DSS Requirement 1: Firewall configuration
        if characteristics['allows_all_traffic']:
            compliant = False
            finding = "PCI-DSS Req 1: Rule allows unrestricted network access"
            recommendation = "Restrict source IPs to known, trusted networks only"
            severity = ViolationSeverity.HIGH

        # PCI-DSS Requirement 10: Logging and monitoring
        if not characteristics['has_logging']:
            compliant = False
            finding = "PCI-DSS Req 10: Firewall logging not enabled"
            recommendation = "Enable firewall logging for audit trail and compliance"
            severity = ViolationSeverity.HIGH

        return compliant, finding, recommendation, severity

    def _check_cloud_best_practices(
        self,
        rule: FirewallRule,
        characteristics: Dict[str, Any],
        cloud_provider: CloudProvider,
        context: List[Dict[str, Any]]
    ) -> tuple[bool, str, str, ViolationSeverity]:
        """Check compliance with cloud provider best practices"""
        compliant = True
        finding = ""
        recommendation = ""
        severity = ViolationSeverity.INFO

        # Principle of least privilege
        if characteristics['allows_all_traffic']:
            compliant = False
            finding = f"{cloud_provider.value} Best Practice: Rule violates principle of least privilege"
            recommendation = "Restrict source addresses to minimum required IP ranges"
            severity = ViolationSeverity.HIGH

        # Specific port restrictions
        if characteristics['allows_all_ports']:
            compliant = False
            finding = f"{cloud_provider.value} Best Practice: Rule allows all ports"
            recommendation = "Specify only required ports (e.g., 80, 443 for web traffic)"
            severity = ViolationSeverity.MEDIUM

        # Logging recommendations
        if not characteristics['has_logging']:
            compliant = False
            finding = f"{cloud_provider.value} Best Practice: Logging not enabled"
            recommendation = "Enable firewall logging for security monitoring"
            severity = ViolationSeverity.MEDIUM

        return compliant, finding, recommendation, severity

    def _check_generic_compliance(
        self,
        rule: FirewallRule,
        characteristics: Dict[str, Any],
        standard_name: str,
        context: List[Dict[str, Any]]
    ) -> tuple[bool, str, str, ViolationSeverity]:
        """Generic compliance check for unknown standards"""
        compliant = True
        finding = ""
        recommendation = ""
        severity = ViolationSeverity.INFO

        # Basic security checks
        if characteristics['allows_all_traffic']:
            compliant = False
            finding = f"{standard_name}: Rule allows unrestricted access"
            recommendation = "Apply principle of least privilege"
            severity = ViolationSeverity.MEDIUM

        return compliant, finding, recommendation, severity

    def _calculate_risk_score(
        self,
        severity: ViolationSeverity,
        characteristics: Dict[str, Any]
    ) -> float:
        """Calculate risk score based on severity and rule characteristics"""
        base_scores = {
            ViolationSeverity.HIGH: 8.0,
            ViolationSeverity.MEDIUM: 5.0,
            ViolationSeverity.LOW: 2.0,
            ViolationSeverity.INFO: 0.5
        }
        
        score = base_scores.get(severity, 0.0)
        
        # Increase risk if multiple issues
        if characteristics['allows_all_traffic']:
            score += 1.0
        if characteristics['allows_all_ports']:
            score += 0.5
        if not characteristics['has_logging']:
            score += 0.5
        
        return min(score, 10.0)

    def _generate_compliance_summary(
        self,
        checks: List[ComplianceCheck],
        standards: List[str],
        rag_documents: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate summary of compliance results"""
        summary = {
            'total_checks': len(checks),
            'standards_checked': standards,
            'by_severity': {
                'high': sum(1 for c in checks if c.severity == ViolationSeverity.HIGH),
                'medium': sum(1 for c in checks if c.severity == ViolationSeverity.MEDIUM),
                'low': sum(1 for c in checks if c.severity == ViolationSeverity.LOW),
                'info': sum(1 for c in checks if c.severity == ViolationSeverity.INFO)
            },
            'by_standard': {}
        }
        
        # Group by standard
        for standard in standards:
            standard_checks = [c for c in checks if c.standard.name == standard]
            summary['by_standard'][standard] = {
                'total': len(standard_checks),
                'compliant': sum(1 for c in standard_checks if c.compliant),
                'non_compliant': sum(1 for c in standard_checks if not c.compliant)
            }
        
        # Add RAG context info
        if rag_documents:
            summary['rag_sources'] = [
                doc.get('document', {}).get('title', 'Unknown')
                for doc in rag_documents[:5]
            ]
        
        return summary
