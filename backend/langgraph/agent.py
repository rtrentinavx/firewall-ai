"""
Firewall Audit Agent - LangGraph Orchestration
Implements the Agentic SDLC workflow for firewall rule analysis
"""

import logging
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

from models.firewall_rule import FirewallRule, AuditResult
from normalization.engine import NormalizationEngine
from caching.context_cache import ContextCache
from caching.semantic_cache import SemanticCache
from langgraph.graph import END, StateGraph

logger = logging.getLogger(__name__)


def _get_vertex_llm():
    """Initialize Vertex AI chat model when credentials and project are available."""
    try:
        from langchain_google_vertexai import ChatVertexAI
        import os
        if not os.environ.get("GOOGLE_CLOUD_PROJECT"):
            logger.warning("Vertex AI: GOOGLE_CLOUD_PROJECT not set")
            return None
        return ChatVertexAI(
            model_name="gemini-1.5-pro",
            temperature=0.1,
            max_output_tokens=4096,
        )
    except Exception as e:
        logger.warning("Vertex AI not available: %s", e)
        return None

class AuditState(BaseModel):
    """State object for the audit workflow"""
    rules: List[FirewallRule] = []
    normalized_rules: List[Dict[str, Any]] = []
    intent: str = ""
    violations: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []
    audit_result: Optional[AuditResult] = None
    context_cached: bool = False
    semantic_cached: bool = False

class FirewallAuditAgent:
    """Main agent orchestrating the firewall audit workflow using LangGraph"""

    def __init__(self):
        self.llm = _get_vertex_llm()
        self.vertex_available = self.llm is not None
        if self.vertex_available:
            logger.info("Firewall audit agent: Vertex AI (Gemini) enabled")
        else:
            logger.info("Firewall audit agent: running without Vertex AI (mock/cache only)")

        self.normalization_engine = NormalizationEngine()
        self.context_cache = ContextCache()
        self.semantic_cache = SemanticCache()

        # Build the audit workflow graph (None until full node implementations exist)
        self.workflow = self._build_workflow()

    def _build_workflow(self):
        """Build a simplified workflow for firewall auditing"""
        # For now, return a mock workflow that doesn't use LangGraph
        # This allows the server to start while we resolve dependency issues
        return None
        """Build the LangGraph workflow for firewall auditing"""

        workflow = StateGraph(AuditState)

        # Add nodes
        workflow.add_node("ingest_and_normalize", self._ingest_and_normalize)
        workflow.add_node("check_semantic_cache", self._check_semantic_cache)
        workflow.add_node("analyze_intent", self._analyze_intent)
        workflow.add_node("detect_violations", self._detect_violations)
        workflow.add_node("generate_recommendations", self._generate_recommendations)
        workflow.add_node("create_audit_result", self._create_audit_result)

        # Define the workflow edges
        workflow.set_entry_point("ingest_and_normalize")

        workflow.add_edge("ingest_and_normalize", "check_semantic_cache")
        workflow.add_edge("check_semantic_cache", "analyze_intent")
        workflow.add_edge("analyze_intent", "detect_violations")
        workflow.add_edge("detect_violations", "generate_recommendations")
        workflow.add_edge("generate_recommendations", "create_audit_result")
        workflow.add_edge("create_audit_result", END)

        return workflow.compile()

    async def audit_firewall_rules(
        self,
        rules: List[FirewallRule],
        intent: str,
        cloud_provider: str = "gcp"
    ) -> AuditResult:
        """Main entry point for firewall rule auditing - Simplified version for testing"""

        logger.info(f"Starting audit for {len(rules)} rules with intent: {intent}")

        # Check context cache first
        cache_key = self.context_cache.generate_key(rules, intent)
        cached_result = await self.context_cache.get(cache_key)

        if cached_result:
            logger.info("Returning cached audit result")
            return cached_result

        # For now, return mock audit results to allow server to start
        # TODO: Re-enable full LangGraph workflow once pandas compatibility is resolved
        mock_violations = [
            {
                "rule_id": "mock-rule-1",
                "severity": "medium",
                "description": "Mock security violation for testing",
                "recommendation": "Review and tighten firewall rules"
            }
        ]

        mock_recommendations = [
            {
                "type": "security",
                "priority": "high",
                "description": "Implement principle of least privilege",
                "action": "Restrict source IP ranges to specific subnets"
            }
        ]

        audit_result = AuditResult(
            timestamp=datetime.now(),
            rules_analyzed=len(rules),
            violations_found=len(mock_violations),
            violations=mock_violations,
            recommendations=mock_recommendations,
            compliance_score=85.0,
            risk_level="medium"
        )

        # Cache the result
        await self.context_cache.set(cache_key, audit_result)

        return audit_result