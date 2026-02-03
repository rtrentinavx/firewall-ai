"""
Terraform HCL parser for firewall rules.
Extracts firewall rules from Terraform configurations.
"""

import re
import json
from typing import List, Dict, Any, Optional
from pathlib import Path


def parse_terraform_content(content: str, cloud_provider: str = 'aviatrix') -> List[Dict[str, Any]]:
    """
    Parse Terraform HCL content and extract firewall rules.
    
    Args:
        content: Raw Terraform HCL content
        cloud_provider: Target cloud provider (aviatrix, gcp, azure, etc.)
    
    Returns:
        List of parsed firewall rules
    """
    import logging
    logger = logging.getLogger(__name__)
    
    rules = []
    
    logger.info(f"Parsing Terraform content for provider: {cloud_provider}, content length: {len(content)}")
    
    # Parse based on provider
    if cloud_provider == 'gcp':
        rules.extend(_parse_gcp_firewall_rules(content))
    elif cloud_provider == 'azure':
        rules.extend(_parse_azure_nsg_rules(content))
    elif cloud_provider == 'aviatrix':
        rules.extend(_parse_aviatrix_rules(content))
    elif cloud_provider in ['cisco', 'palo_alto']:
        rules.extend(_parse_generic_firewall_rules(content, cloud_provider))
    else:
        # Try generic parsing
        rules.extend(_parse_generic_firewall_rules(content, cloud_provider))
    
    logger.info(f"Parsed {len(rules)} rules from Terraform content")
    
    return rules


def parse_terraform_directory(directory_path: str, cloud_provider: str = 'aviatrix') -> List[Dict[str, Any]]:
    """
    Parse all Terraform files in a directory.
    
    Args:
        directory_path: Path to directory containing .tf files
        cloud_provider: Target cloud provider
    
    Returns:
        List of parsed firewall rules from all files
    """
    all_rules = []
    dir_path = Path(directory_path)
    
    if not dir_path.exists() or not dir_path.is_dir():
        raise ValueError(f"Directory not found: {directory_path}")
    
    # Find all .tf files
    tf_files = list(dir_path.rglob("*.tf"))
    
    for tf_file in tf_files:
        try:
            content = tf_file.read_text(encoding='utf-8')
            rules = parse_terraform_content(content, cloud_provider)
            all_rules.extend(rules)
        except Exception as e:
            print(f"Error parsing {tf_file}: {e}")
            continue
    
    return all_rules


def _parse_gcp_firewall_rules(content: str) -> List[Dict[str, Any]]:
    """Parse GCP compute firewall rules from Terraform."""
    rules = []
    
    # Pattern to match google_compute_firewall resources
    pattern = r'resource\s+"google_compute_firewall"\s+"([^"]+)"\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}'
    
    matches = re.finditer(pattern, content, re.DOTALL)
    
    for match in matches:
        resource_name = match.group(1)
        resource_body = match.group(2)
        
        rule = {
            'id': f'gcp-{resource_name}-{hash(resource_body) % 10000}',
            'name': _extract_value(resource_body, 'name') or resource_name,
            'description': _extract_value(resource_body, 'description'),
            'cloud_provider': 'gcp',
            'direction': _extract_value(resource_body, 'direction') or 'ingress',
            'action': 'allow' if 'allow' in resource_body else 'deny',
            'priority': int(_extract_value(resource_body, 'priority') or 1000),
            'source_ranges': _extract_list(resource_body, 'source_ranges'),
            'destination_ranges': _extract_list(resource_body, 'destination_ranges'),
            'source_tags': _extract_list(resource_body, 'source_tags'),
            'target_tags': _extract_list(resource_body, 'target_tags'),
            'protocols': _extract_protocols_gcp(resource_body),
            'ports': _extract_ports_gcp(resource_body),
            'network': _extract_value(resource_body, 'network'),
            'disabled': _extract_value(resource_body, 'disabled') == 'true',
        }
        
        rules.append(rule)
    
    return rules


def _parse_azure_nsg_rules(content: str) -> List[Dict[str, Any]]:
    """Parse Azure NSG rules from Terraform."""
    rules = []
    
    # Pattern for azurerm_network_security_rule
    pattern = r'resource\s+"azurerm_network_security_rule"\s+"([^"]+)"\s*\{([^}]+)\}'
    
    matches = re.finditer(pattern, content, re.DOTALL)
    
    for match in matches:
        resource_name = match.group(1)
        resource_body = match.group(2)
        
        rule = {
            'id': f'azure-{resource_name}-{hash(resource_body) % 10000}',
            'name': _extract_value(resource_body, 'name') or resource_name,
            'description': _extract_value(resource_body, 'description'),
            'cloud_provider': 'azure',
            'direction': _extract_value(resource_body, 'direction') or 'Inbound',
            'action': _extract_value(resource_body, 'access') or 'Allow',
            'priority': int(_extract_value(resource_body, 'priority') or 100),
            'source_ranges': [_extract_value(resource_body, 'source_address_prefix') or 'Any'],
            'destination_ranges': [_extract_value(resource_body, 'destination_address_prefix') or 'Any'],
            'protocols': [_extract_value(resource_body, 'protocol') or 'TCP'],
            'ports': _extract_azure_ports(resource_body),
        }
        
        rules.append(rule)
    
    return rules


def _parse_aviatrix_rules(content: str) -> List[Dict[str, Any]]:
    """Parse Aviatrix firewall rules from Terraform."""
    import logging
    logger = logging.getLogger(__name__)
    rules = []
    
    # Pattern for aviatrix_dcf_ruleset resources (new DCF format)
    # Use a simpler pattern and extract the resource body by counting braces
    resource_pattern = r'resource\s+"aviatrix_dcf_ruleset"\s+"([^"]+)"\s*\{'
    resource_matches = list(re.finditer(resource_pattern, content, re.DOTALL))
    
    logger.info(f"Found {len(resource_matches)} aviatrix_dcf_ruleset resources")
    
    for res_match in resource_matches:
        resource_name = res_match.group(1)
        start_pos = res_match.end()
        
        # Find matching closing brace by counting
        brace_count = 1
        pos = start_pos
        while pos < len(content) and brace_count > 0:
            if content[pos] == '{':
                brace_count += 1
            elif content[pos] == '}':
                brace_count -= 1
            pos += 1
        
        if brace_count != 0:
            logger.warning(f"Could not find matching braces for resource {resource_name}")
            continue
            
        resource_body = content[start_pos:pos-1]
        logger.info(f"Found aviatrix_dcf_ruleset resource: {resource_name}, body length: {len(resource_body)}")
        
        ruleset_name = _extract_value(resource_body, 'name') or resource_name
        
        # Extract rules blocks from DCF ruleset using brace counting
        rules_pattern = r'rules\s*\{'
        rules_matches = list(re.finditer(rules_pattern, resource_body, re.DOTALL))
        logger.info(f"Found {len(rules_matches)} rules blocks in resource {resource_name}")
        
        for rule_match_idx, rule_match in enumerate(rules_matches):
            rule_start = rule_match.end()
            
            # Find matching closing brace for this rules block
            brace_count = 1
            rule_pos = rule_start
            while rule_pos < len(resource_body) and brace_count > 0:
                if resource_body[rule_pos] == '{':
                    brace_count += 1
                elif resource_body[rule_pos] == '}':
                    brace_count -= 1
                rule_pos += 1
            
            if brace_count != 0:
                logger.warning(f"Could not find matching braces for rules block {rule_match_idx}")
                continue
                
            rule_body = resource_body[rule_start:rule_pos-1]
            logger.debug(f"Extracted rule body length: {len(rule_body)}")
            
            # Extract action and map to standard format
            action_value = _extract_value(rule_body, 'action') or 'PERMIT'
            action_map = {
                'PERMIT': 'allow',
                'DENY': 'deny',
                'DEEP_PACKET_INSPECTION_PERMIT': 'allow',
                'INTRUSION_DETECTION_PERMIT': 'allow'
            }
            action = action_map.get(action_value, 'allow')
            
            # Extract protocol
            protocol_value = _extract_value(rule_body, 'protocol') or 'ANY'
            protocol = protocol_value.lower() if protocol_value != 'ANY' else 'all'
            
            # Extract smart groups (UUIDs)
            src_smart_groups = _extract_list(rule_body, 'src_smart_groups')
            dst_smart_groups = _extract_list(rule_body, 'dst_smart_groups')
            
            # Extract port ranges
            ports = _extract_dcf_port_ranges(rule_body)
            
            rule_name = _extract_value(rule_body, 'name') or f'{ruleset_name}-rule-{rule_match_idx}'
            
            rule = {
                'id': f'aviatrix-dcf-{resource_name}-{hash(rule_body) % 10000}',
                'name': rule_name,
                'description': f'Ruleset: {ruleset_name}, Action: {action_value}, Protocol: {protocol_value}',
                'cloud_provider': 'aviatrix',
                'direction': 'ingress',
                'action': action,
                'priority': int(_extract_value(rule_body, 'priority') or 0),
                'source_ranges': src_smart_groups if src_smart_groups else ['Any'],
                'destination_ranges': dst_smart_groups if dst_smart_groups else ['Any'],
                'protocols': [protocol],
                'ports': ports,
                'logging_enabled': _extract_value(rule_body, 'logging') == 'true',
                'provider_specific': {
                    'ruleset_name': ruleset_name,
                    'watch': _extract_value(rule_body, 'watch') == 'true',
                    'web_groups': _extract_list(rule_body, 'web_groups'),
                    'flow_app_requirement': _extract_value(rule_body, 'flow_app_requirement'),
                    'decrypt_policy': _extract_value(rule_body, 'decrypt_policy'),
                    'tls_profile': _extract_value(rule_body, 'tls_profile'),
                    'log_profile': _extract_value(rule_body, 'log_profile'),
                }
            }
            
            rules.append(rule)
    
    # Also parse legacy aviatrix_firewall resources
    legacy_pattern = r'resource\s+"aviatrix_firewall(?:_policy)?"\s+"([^"]+)"\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}'
    legacy_matches = re.finditer(legacy_pattern, content, re.DOTALL)
    
    for match in legacy_matches:
        resource_name = match.group(1)
        resource_body = match.group(2)
        
        # Extract policy blocks
        policy_pattern = r'policy\s*\{([^}]+)\}'
        policy_matches = re.finditer(policy_pattern, resource_body, re.DOTALL)
        
        for policy_match in policy_matches:
            policy_body = policy_match.group(1)
            
            rule = {
                'id': f'aviatrix-{resource_name}-{hash(policy_body) % 10000}',
                'name': _extract_value(policy_body, 'description') or f'{resource_name}-policy',
                'description': _extract_value(policy_body, 'description'),
                'cloud_provider': 'aviatrix',
                'direction': 'ingress',
                'action': _extract_value(policy_body, 'action') or 'allow',
                'source_ranges': [_extract_value(policy_body, 'src_ip') or 'Any'],
                'destination_ranges': [_extract_value(policy_body, 'dst_ip') or 'Any'],
                'protocols': [_extract_value(policy_body, 'protocol') or 'all'],
                'ports': _extract_aviatrix_port(policy_body),
                'priority': int(_extract_value(policy_body, 'priority') or 0),
            }
            
            rules.append(rule)
    
    return rules


def _parse_generic_firewall_rules(content: str, cloud_provider: str) -> List[Dict[str, Any]]:
    """Generic parser for firewall rules."""
    rules = []
    
    # Look for common resource patterns
    patterns = [
        r'resource\s+"[^"]*firewall[^"]*"\s+"([^"]+)"\s*\{([^}]+)\}',
        r'resource\s+"[^"]*security[^"]*"\s+"([^"]+)"\s*\{([^}]+)\}',
        r'resource\s+"[^"]*rule[^"]*"\s+"([^"]+)"\s*\{([^}]+)\}',
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, content, re.DOTALL | re.IGNORECASE)
        
        for match in matches:
            resource_name = match.group(1)
            resource_body = match.group(2)
            
            rule = {
                'id': f'{cloud_provider}-{resource_name}-{hash(resource_body) % 10000}',
                'name': _extract_value(resource_body, 'name') or resource_name,
                'description': _extract_value(resource_body, 'description'),
                'cloud_provider': cloud_provider,
                'direction': _detect_direction(resource_body),
                'action': _detect_action(resource_body),
                'source_ranges': _extract_list(resource_body, 'source') or ['Any'],
                'destination_ranges': _extract_list(resource_body, 'destination') or ['Any'],
                'protocols': _extract_list(resource_body, 'protocol') or ['tcp'],
                'ports': _extract_list(resource_body, 'port') or [],
            }
            
            rules.append(rule)
    
    return rules


def _extract_value(content: str, key: str) -> Optional[str]:
    """Extract a single value from HCL content."""
    pattern = rf'{key}\s*=\s*"([^"]*)"'
    match = re.search(pattern, content)
    if match:
        return match.group(1)
    
    # Try without quotes (for booleans, numbers)
    pattern = rf'{key}\s*=\s*([^\s\n]+)'
    match = re.search(pattern, content)
    if match:
        return match.group(1).strip()
    
    return None


def _extract_list(content: str, key: str) -> List[str]:
    """Extract a list value from HCL content."""
    pattern = rf'{key}\s*=\s*\[([^\]]*)\]'
    match = re.search(pattern, content)
    if match:
        items = match.group(1)
        # Remove quotes and whitespace, split by comma
        return [item.strip().strip('"') for item in items.split(',') if item.strip()]
    return []


def _extract_protocols_gcp(content: str) -> List[str]:
    """Extract protocols from GCP firewall rule."""
    protocols = []
    
    # Look for allow/deny blocks
    allow_deny_pattern = r'(allow|deny)\s*\{([^}]+)\}'
    matches = re.finditer(allow_deny_pattern, content, re.DOTALL)
    
    for match in matches:
        block_content = match.group(2)
        protocol = _extract_value(block_content, 'protocol')
        if protocol:
            protocols.append(protocol)
    
    return protocols or ['tcp']


def _extract_ports_gcp(content: str) -> List[str]:
    """Extract ports from GCP firewall rule."""
    ports = []
    
    # Look for allow/deny blocks
    allow_deny_pattern = r'(allow|deny)\s*\{([^}]+)\}'
    matches = re.finditer(allow_deny_pattern, content, re.DOTALL)
    
    for match in matches:
        block_content = match.group(2)
        port_list = _extract_list(block_content, 'ports')
        ports.extend(port_list)
    
    return ports


def _extract_azure_ports(content: str) -> List[str]:
    """Extract ports from Azure NSG rule."""
    dest_port = _extract_value(content, 'destination_port_range')
    if dest_port and dest_port != '*':
        return [dest_port]
    
    dest_ports = _extract_list(content, 'destination_port_ranges')
    if dest_ports:
        return dest_ports
    
    return []


def _extract_aviatrix_port(content: str) -> List[str]:
    """Extract port from Aviatrix legacy rule."""
    port = _extract_value(content, 'port')
    if port and port != '0-65535':
        return [port]
    return []


def _extract_dcf_port_ranges(content: str) -> List[str]:
    """Extract port ranges from Aviatrix DCF rule."""
    ports = []
    
    # Look for port_ranges blocks
    port_ranges_pattern = r'port_ranges\s*\{([^}]+)\}'
    matches = re.finditer(port_ranges_pattern, content, re.DOTALL)
    
    for match in matches:
        range_body = match.group(1)
        lo = _extract_value(range_body, 'lo')
        hi = _extract_value(range_body, 'hi')
        
        if lo:
            if hi and hi != lo:
                ports.append(f'{lo}-{hi}')
            else:
                ports.append(lo)
    
    return ports


def _detect_direction(content: str) -> str:
    """Detect direction from content."""
    content_lower = content.lower()
    if 'egress' in content_lower or 'outbound' in content_lower:
        return 'egress'
    return 'ingress'


def _detect_action(content: str) -> str:
    """Detect action from content."""
    content_lower = content.lower()
    if 'deny' in content_lower or 'block' in content_lower or 'drop' in content_lower:
        return 'deny'
    if 'redirect' in content_lower:
        return 'redirect'
    return 'allow'
