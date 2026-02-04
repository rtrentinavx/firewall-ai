"""
Terraform Import Agent - AI-powered Terraform parsing and validation
Uses LLM to intelligently parse and validate Terraform firewall configurations
"""

import logging
import json
from typing import Dict, List, Any, Optional, cast
from pydantic import BaseModel

from config.model_config import get_model_manager

logger = logging.getLogger(__name__)


class TerraformParseResult(BaseModel):
    """Result from Terraform parsing"""
    success: bool
    rules: List[Dict[str, Any]] = []
    errors: List[str] = []
    warnings: List[str] = []
    metadata: Dict[str, Any] = {}


class TerraformImportAgent:
    """AI-powered agent for parsing and validating Terraform configurations"""

    def __init__(self):
        """Initialize the Terraform import agent"""
        self.model_manager = get_model_manager()
        self.llm = None
        self.model_available = False
        self._initialize_llm()
    
    def _initialize_llm(self) -> None:
        """Initialize or reinitialize the LLM based on current model configuration"""
        model_config = self.model_manager.get_current_model()
        if not model_config or not model_config.available:
            self.model_available = False
            self.llm = None
            logger.info("Model not available, falling back to regex-based parsing")
            return
        
        try:
            if model_config.provider.value == "vertex_ai":
                from langchain_google_vertexai import VertexAI
                self.llm = VertexAI(
                    model_name=model_config.model_id,
                    temperature=model_config.temperature,
                    max_tokens=model_config.max_tokens
                )
                self.model_available = True
                logger.info(f"Terraform Import Agent initialized with {model_config.name} ({model_config.model_id})")
            else:
                logger.warning(f"Provider {model_config.provider.value} not yet implemented")
                self.model_available = False
                self.llm = None
        except Exception as e:
            logger.warning(f"Could not initialize LLM for Terraform agent: {e}")
            logger.info("Falling back to regex-based parsing")
            self.llm = None
            self.model_available = False
    
    def update_model(self) -> bool:
        """Update the LLM to use the current model configuration"""
        self._initialize_llm()
        return bool(self.model_available)

    async def parse_terraform(
        self,
        content: str,
        cloud_provider: str = 'aviatrix'
    ) -> TerraformParseResult:
        """
        Parse Terraform HCL content and extract firewall rules using AI
        
        Args:
            content: Raw Terraform HCL content
            cloud_provider: Target cloud provider (aviatrix, gcp, azure, etc.)
        
        Returns:
            TerraformParseResult with parsed rules and validation results
        """
        if not self.model_available:
            # Fallback to regex parsing
            return await self._fallback_parse(content, cloud_provider)
        
        try:
            # Use LLM to parse and validate
            return await self._ai_parse(content, cloud_provider)
        except Exception as e:
            logger.error(f"AI parsing failed: {e}, falling back to regex")
            return await self._fallback_parse(content, cloud_provider)

    async def _ai_parse(
        self,
        content: str,
        cloud_provider: str
    ) -> TerraformParseResult:
        """Use AI to parse Terraform content"""
        
        prompt = self._build_parsing_prompt(content, cloud_provider)
        
        try:
            # Invoke LLM
            response = await self.llm.ainvoke(prompt)
            
            # Parse JSON response
            result_data = self._extract_json_from_response(response)
            
            return TerraformParseResult(
                success=True,
                rules=result_data.get('rules', []),
                errors=result_data.get('errors', []),
                warnings=result_data.get('warnings', []),
                metadata=result_data.get('metadata', {})
            )
            
        except Exception as e:
            logger.error(f"AI parsing error: {e}")
            return TerraformParseResult(
                success=False,
                errors=[f"AI parsing failed: {str(e)}"]
            )

    def _build_parsing_prompt(self, content: str, cloud_provider: str) -> str:
        """Build the prompt for LLM-based parsing"""
        
        schema_examples = self._get_provider_schema_examples(cloud_provider)
        
        prompt = f"""You are an expert Terraform parser specializing in firewall configurations.

**Task**: Parse the following Terraform HCL code and extract ALL firewall rules into a structured JSON format.

**Provider**: {cloud_provider}

**Output Requirements**:
1. Return ONLY valid JSON (no markdown, no explanations)
2. Each rule must have these fields:
   - id (string): unique identifier
   - name (string): rule name
   - description (string): rule description
   - cloud_provider (string): "{cloud_provider}"
   - direction (string): "ingress" or "egress"
   - action (string): "allow", "deny", or "redirect"
   - priority (number): rule priority
   - source_ranges (array of strings): source IP ranges or smart group IDs
   - destination_ranges (array of strings): destination IP ranges or smart group IDs
   - protocols (array of strings): protocols (tcp, udp, icmp, all)
   - ports (array of strings): port ranges
   - logging_enabled (boolean): whether logging is enabled
   - provider_specific (object): any provider-specific fields

3. Validate the rules and include:
   - errors: List of critical issues that prevent parsing
   - warnings: List of non-critical issues or recommendations
   - metadata: Resource names, attachment points, etc.

**Provider-Specific Patterns**:
{schema_examples}

**Terraform HCL Code**:
```hcl
{content}
```

**Output JSON Format**:
{{
  "rules": [
    {{
      "id": "unique-id",
      "name": "rule-name",
      "description": "rule description",
      "cloud_provider": "{cloud_provider}",
      "direction": "ingress",
      "action": "allow",
      "priority": 0,
      "source_ranges": ["10.0.0.0/8"],
      "destination_ranges": ["192.168.0.0/16"],
      "protocols": ["tcp"],
      "ports": ["80", "443"],
      "logging_enabled": true,
      "provider_specific": {{}}
    }}
  ],
  "errors": [],
  "warnings": [],
  "metadata": {{
    "resource_names": [],
    "total_rules": 0
  }}
}}

Parse the code now and return ONLY the JSON output:"""
        
        return prompt

    def _get_provider_schema_examples(self, cloud_provider: str) -> str:
        """Get provider-specific schema examples"""
        
        examples = {
            'aviatrix': """
- aviatrix_dcf_ruleset: Distributed Cloud Firewall rulesets
  - rules.name: Rule name
  - rules.action: PERMIT, DENY, DEEP_PACKET_INSPECTION_PERMIT, INTRUSION_DETECTION_PERMIT
  - rules.protocol: TCP, UDP, ICMP, ANY
  - rules.src_smart_groups: List of source smart group UUIDs
  - rules.dst_smart_groups: List of destination smart group UUIDs
  - rules.port_ranges: Port range blocks with lo/hi fields
  - rules.web_groups: Web group UUIDs for URL filtering
  - rules.logging: Boolean for logging
  - rules.watch: Boolean for watch mode""",
            
            'gcp': """
- google_compute_firewall: VPC firewall rules
  - name: Firewall rule name
  - direction: INGRESS or EGRESS
  - allow/deny blocks: protocol and ports
  - source_ranges: CIDR blocks for source
  - target_tags: Target VM tags""",
            
            'azure': """
- azurerm_network_security_rule: NSG rules
  - name: Rule name
  - direction: Inbound or Outbound
  - access: Allow or Deny
  - protocol: TCP, UDP, ICMP, or *
  - source_address_prefix: Source CIDR
  - destination_port_range: Port or port range"""
        }
        
        return examples.get(cloud_provider, "Generic firewall resource patterns")

    def _extract_json_from_response(self, response: str) -> Dict[str, Any]:
        """Extract JSON from LLM response"""
        
        # Try to find JSON in the response
        response_str = str(response)
        
        # Remove markdown code blocks if present
        if '```json' in response_str:
            start = response_str.find('```json') + 7
            end = response_str.find('```', start)
            response_str = response_str[start:end].strip()
        elif '```' in response_str:
            start = response_str.find('```') + 3
            end = response_str.find('```', start)
            response_str = response_str[start:end].strip()
        
        # Find JSON object
        start_idx = response_str.find('{')
        end_idx = response_str.rfind('}') + 1
        
        if start_idx >= 0 and end_idx > start_idx:
            json_str = response_str[start_idx:end_idx]
            return cast(Dict[str, Any], json.loads(json_str))
        
        # If no JSON found, try to parse the whole response
        return cast(Dict[str, Any], json.loads(response_str))

    async def _fallback_parse(
        self,
        content: str,
        cloud_provider: str
    ) -> TerraformParseResult:
        """Fallback to regex-based parsing"""
        
        try:
            from utils.terraform_parser import parse_terraform_content
            
            rules = parse_terraform_content(content, cloud_provider)
            
            return TerraformParseResult(
                success=True,
                rules=rules,
                warnings=["Using regex-based parsing (AI unavailable)"],
                metadata={
                    "parser": "regex",
                    "total_rules": len(rules)
                }
            )
            
        except Exception as e:
            logger.error(f"Fallback parsing failed: {e}")
            return TerraformParseResult(
                success=False,
                errors=[f"Parsing failed: {str(e)}"]
            )

    async def validate_terraform(
        self,
        content: str,
        cloud_provider: str
    ) -> Dict[str, Any]:
        """
        Validate Terraform content before parsing
        
        Returns validation results with syntax checks and recommendations
        """
        
        if not self.model_available:
            return {
                "valid": True,
                "warnings": ["AI validation unavailable, using basic checks"]
            }
        
        validation_prompt = f"""You are a Terraform validation expert.

**Task**: Validate the following Terraform HCL code for {cloud_provider} firewall rules.

**Check for**:
1. Syntax errors
2. Missing required fields
3. Invalid values
4. Security issues
5. Best practice violations

**Terraform Code**:
```hcl
{content}
```

Return JSON with validation results:
{{
  "valid": true/false,
  "syntax_errors": [],
  "missing_fields": [],
  "security_issues": [],
  "recommendations": []
}}"""

        try:
            response = await self.llm.ainvoke(validation_prompt)
            result = self._extract_json_from_response(response)
            return result
        except Exception as e:
            logger.error(f"Validation failed: {e}")
            return {
                "valid": True,
                "errors": [f"Validation error: {str(e)}"]
            }


# Global instance
terraform_agent = TerraformImportAgent()
