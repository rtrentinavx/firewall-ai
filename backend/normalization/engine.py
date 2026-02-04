"""
Normalization Engine
Converts vendor-specific firewall rules to universal JSON schema
"""

import logging
import re
from typing import Dict, Any, List, Optional
from datetime import datetime

from models.firewall_rule import FirewallRule, NormalizedRule, CloudProvider

logger = logging.getLogger(__name__)

class NormalizationEngine:
    """Engine for normalizing firewall rules across different vendors"""

    def __init__(self):
        self.schema_version = "1.0"
        self.normalizers = {
            CloudProvider.GCP: self._normalize_gcp_rule,
            CloudProvider.AZURE: self._normalize_azure_rule,
            CloudProvider.AVIATRIX: self._normalize_aviatrix_rule,
            CloudProvider.CISCO: self._normalize_cisco_rule,
            CloudProvider.PALO_ALTO: self._normalize_palo_alto_rule,
        }

    async def normalize_rule(self, rule: FirewallRule) -> NormalizedRule:
        """Normalize a single firewall rule"""

        logger.info(f"Normalizing rule {rule.id} for provider {rule.cloud_provider}")

        try:
            normalizer = self.normalizers.get(rule.cloud_provider)
            if not normalizer:
                raise ValueError(f"Unsupported cloud provider: {rule.cloud_provider}")

            normalized_data = await normalizer(rule)

            return NormalizedRule(
                original_rule=rule,
                normalized_data=normalized_data,
                schema_version=self.schema_version,
                confidence_score=self._calculate_confidence_score(rule, normalized_data)
            )

        except Exception as e:
            logger.error(f"Failed to normalize rule {rule.id}: {e}")
            # Return basic normalized data on failure
            return NormalizedRule(
                original_rule=rule,
                normalized_data=self._create_fallback_normalization(rule),
                schema_version=self.schema_version,
                confidence_score=0.1
            )

    async def normalize_rules_batch(self, rules: List[FirewallRule]) -> List[NormalizedRule]:
        """Normalize multiple rules in batch"""
        return [await self.normalize_rule(rule) for rule in rules]

    async def _normalize_gcp_rule(self, rule: FirewallRule) -> Dict[str, Any]:
        """Normalize GCP firewall rule"""

        # GCP rules have specific field mappings
        normalized = {
            "rule_type": "vpc_firewall",
            "direction": rule.direction,
            "action": rule.action,
            "priority": rule.priority or 1000,
            "source_ranges": rule.source_ranges,
            "destination_ranges": rule.destination_ranges,
            "source_tags": rule.source_tags,
            "target_tags": rule.target_tags,
            "source_service_accounts": rule.source_service_accounts,
            "target_service_accounts": rule.target_service_accounts,
            "protocols": self._parse_gcp_protocols(rule.protocols, rule.ports),
            "network": rule.network,
            "disabled": rule.disabled,
            "logging": rule.logging_enabled,
            "metadata": {
                "provider": "gcp",
                "resource_type": "compute.googleapis.com/Firewall",
                "compliance_frameworks": ["NIST", "CIS GCP"]
            }
        }

        return normalized

    async def _normalize_azure_rule(self, rule: FirewallRule) -> Dict[str, Any]:
        """Normalize Azure NSG rule"""

        normalized = {
            "rule_type": "network_security_group",
            "direction": rule.direction,
            "action": rule.action,
            "priority": rule.priority or 100,
            "source_address_prefixes": rule.source_ranges,
            "destination_address_prefixes": rule.destination_ranges,
            "source_port_ranges": rule.ports,
            "destination_port_ranges": rule.ports,
            "protocols": rule.protocols,
            "source_application_security_groups": rule.source_tags,
            "destination_application_security_groups": rule.target_tags,
            "metadata": {
                "provider": "azure",
                "resource_type": "Microsoft.Network/networkSecurityGroups",
                "compliance_frameworks": ["NIST", "CIS Azure"]
            }
        }

        return normalized

    async def _normalize_aviatrix_rule(self, rule: FirewallRule) -> Dict[str, Any]:
        """Normalize Aviatrix Distributed Cloud Firewall rule"""

        # Aviatrix has SmartGroups and WebGroups
        normalized = {
            "rule_type": "distributed_cloud_firewall",
            "direction": rule.direction,
            "action": rule.action,
            "priority": rule.priority or 100,
            "source_smart_groups": self._extract_smart_groups(rule.source_tags),
            "destination_smart_groups": self._extract_smart_groups(rule.target_tags),
            "source_web_groups": self._extract_web_groups(rule.source_tags),
            "destination_web_groups": self._extract_web_groups(rule.target_tags),
            "protocols": rule.protocols,
            "ports": rule.ports,
            "logging": rule.logging_enabled,
            "metadata": {
                "provider": "aviatrix",
                "resource_type": "aviatrix.DistributedFirewallPolicy",
                "compliance_frameworks": ["NIST", "Cloud Security Alliance"]
            }
        }

        return normalized

    async def _normalize_cisco_rule(self, rule: FirewallRule) -> Dict[str, Any]:
        """Normalize Cisco ASA rule"""

        normalized = {
            "rule_type": "asa_access_list",
            "direction": rule.direction,
            "action": rule.action,
            "line_number": rule.priority,
            "source_networks": rule.source_ranges,
            "destination_networks": rule.destination_ranges,
            "protocols": rule.protocols,
            "ports": rule.ports,
            "logging": rule.logging_enabled,
            "metadata": {
                "provider": "cisco",
                "resource_type": "cisco.asa.AccessList",
                "compliance_frameworks": ["NIST", "PCI DSS"]
            }
        }

        return normalized

    async def _normalize_palo_alto_rule(self, rule: FirewallRule) -> Dict[str, Any]:
        """Normalize Palo Alto Networks rule"""

        normalized = {
            "rule_type": "pan_security_policy",
            "direction": rule.direction,
            "action": rule.action,
            "priority": rule.priority or 100,
            "source_zones": rule.source_tags,
            "destination_zones": rule.target_tags,
            "source_addresses": rule.source_ranges,
            "destination_addresses": rule.destination_ranges,
            "applications": rule.protocols,
            "services": rule.ports,
            "logging": rule.logging_enabled,
            "metadata": {
                "provider": "palo_alto",
                "resource_type": "pan.SecurityPolicy",
                "compliance_frameworks": ["NIST", "PCI DSS"]
            }
        }

        return normalized

    def _parse_gcp_protocols(self, protocols: List[str], ports: List[str]) -> List[Dict[str, Any]]:
        """Parse GCP protocol:port combinations"""

        parsed_protocols: List[Dict[str, Any]] = []

        for i, protocol in enumerate(protocols):
            protocol_data: Dict[str, Any] = {"protocol": protocol}

            # Try to match with corresponding port
            if i < len(ports):
                port = ports[i]
                if port and port != "all":
                    protocol_data["ports"] = [port]

            parsed_protocols.append(protocol_data)

        return parsed_protocols

    def _extract_smart_groups(self, tags: List[str]) -> List[str]:
        """Extract Aviatrix SmartGroups from tags"""
        return [tag for tag in tags if tag.startswith("smartgroup:")]

    def _extract_web_groups(self, tags: List[str]) -> List[str]:
        """Extract Aviatrix WebGroups from tags"""
        return [tag for tag in tags if tag.startswith("webgroup:")]

    def _calculate_confidence_score(self, original_rule: FirewallRule, normalized_data: Dict[str, Any]) -> float:
        """Calculate confidence score for normalization"""

        score = 1.0

        # Reduce score for missing critical fields
        critical_fields = ["direction", "action", "protocols"]
        for field in critical_fields:
            if field not in normalized_data or not normalized_data[field]:
                score -= 0.2

        # Reduce score for provider-specific complexities
        if original_rule.cloud_provider == CloudProvider.AVIATRIX:
            score -= 0.1  # Aviatrix has complex group structures

        return max(0.1, min(1.0, score))

    def _create_fallback_normalization(self, rule: FirewallRule) -> Dict[str, Any]:
        """Create basic normalization when detailed parsing fails"""

        return {
            "rule_type": "unknown",
            "direction": rule.direction,
            "action": rule.action,
            "source_ranges": rule.source_ranges,
            "destination_ranges": rule.destination_ranges,
            "protocols": rule.protocols,
            "ports": rule.ports,
            "metadata": {
                "provider": rule.cloud_provider,
                "normalization_status": "fallback",
                "error": "Detailed normalization failed"
            }
        }