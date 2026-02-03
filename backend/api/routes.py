"""
API Routes
REST API endpoints for the Firewall AI application
"""

import logging
import os
import base64
import asyncio
from flask import request, jsonify, Blueprint, Response
from typing import Dict, Any, List
import json

from models.firewall_rule import FirewallRule, AuditResult, CloudProvider
from langgraph.agent import FirewallAuditAgent
from langgraph.terraform_agent import terraform_agent
from normalization.engine import NormalizationEngine
from caching.context_cache import ContextCache
from caching.semantic_cache import SemanticCache
from utils.terraform_parser import parse_terraform_content, parse_terraform_directory

logger = logging.getLogger(__name__)

def register_routes(
    app,
    audit_agent: FirewallAuditAgent,
    normalization_engine: NormalizationEngine,
    context_cache: ContextCache,
    semantic_cache: SemanticCache
):
    """Register all API routes"""

    api = Blueprint('api', __name__)

    admin_user = os.getenv('ADMIN_USERNAME', 'admin')
    admin_password = os.getenv('ADMIN_PASSWORD', 'admin123')

    def _unauthorized():
        return Response(
            'Unauthorized',
            401,
            {'WWW-Authenticate': 'Basic realm="Firewall AI"'}
        )

    def _is_authorized() -> bool:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Basic '):
            return False
        try:
            encoded = auth_header.split(' ', 1)[1]
            decoded = base64.b64decode(encoded).decode('utf-8')
            username, password = decoded.split(':', 1)
            return username == admin_user and password == admin_password
        except Exception:
            return False

    @api.before_request
    def require_basic_auth():
        open_paths = {'/api/v1/health', '/api/v1/auth/login'}
        if request.path in open_paths:
            return None
        if not _is_authorized():
            return _unauthorized()
        return None

    @api.route('/api/v1/auth/login', methods=['POST'])
    def login():
        if not _is_authorized():
            return _unauthorized()
        return jsonify({'success': True})

    @api.route('/api/v1/audit', methods=['POST'])
    async def audit_firewall_rules():
        """Audit firewall rules endpoint"""

        try:
            data = request.get_json()

            if not data:
                return jsonify({'error': 'No data provided'}), 400

            # Extract parameters
            rules_data = data.get('rules', [])
            intent = data.get('intent', '')
            cloud_provider = data.get('cloud_provider', 'aviatrix')

            if not rules_data:
                return jsonify({'error': 'No rules provided'}), 400

            if not intent:
                return jsonify({'error': 'No security intent provided'}), 400

            # Convert to FirewallRule objects
            rules = []
            for rule_data in rules_data:
                try:
                    rule = FirewallRule(**rule_data)
                    rules.append(rule)
                except Exception as e:
                    logger.warning(f"Invalid rule data: {e}")
                    continue

            if not rules:
                return jsonify({'error': 'No valid rules found'}), 400

            # Execute audit
            result = await audit_agent.audit_firewall_rules(rules, intent)

            return jsonify({
                'success': True,
                'audit_id': result.id,
                'result': result.dict()
            })

        except Exception as e:
            logger.error(f"Audit failed: {e}")
            return jsonify({'error': 'Audit failed', 'details': str(e)}), 500

    @api.route('/api/v1/rules/normalize', methods=['POST'])
    async def normalize_rules():
        """Normalize firewall rules endpoint"""

        try:
            data = request.get_json()

            if not data or 'rules' not in data:
                return jsonify({'error': 'No rules provided'}), 400

            rules_data = data['rules']
            rules = []

            for rule_data in rules_data:
                try:
                    rule = FirewallRule(**rule_data)
                    rules.append(rule)
                except Exception as e:
                    logger.warning(f"Invalid rule data: {e}")
                    continue

            # Normalize rules
            normalized_rules = await normalization_engine.normalize_rules_batch(rules)

            return jsonify({
                'success': True,
                'normalized_rules': [rule.dict() for rule in normalized_rules]
            })

        except Exception as e:
            logger.error(f"Normalization failed: {e}")
            return jsonify({'error': 'Normalization failed', 'details': str(e)}), 500

    @api.route('/api/v1/cache/stats', methods=['GET'])
    async def get_cache_stats():
        """Get cache statistics"""

        try:
            context_stats = await context_cache.get_stats()
            semantic_stats = await semantic_cache.get_stats()

            return jsonify({
                'success': True,
                'context_cache': context_stats,
                'semantic_cache': semantic_stats
            })

        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return jsonify({'error': 'Failed to get cache stats'}), 500

    @api.route('/api/v1/cache/clear', methods=['POST'])
    async def clear_cache():
        """Clear all caches"""

        try:
            await context_cache.clear()
            # Note: Semantic cache clearing would be implemented if needed

            return jsonify({
                'success': True,
                'message': 'Caches cleared successfully'
            })

        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")
            return jsonify({'error': 'Failed to clear cache'}), 500

    @api.route('/api/v1/recommendations/similar', methods=['POST'])
    async def get_similar_recommendations():
        """Get similar historical recommendations"""

        try:
            data = request.get_json()

            if not data or 'issue_description' not in data:
                return jsonify({'error': 'No issue description provided'}), 400

            issue_description = data['issue_description']
            limit = data.get('limit', 5)

            similar_issues = await semantic_cache.find_similar_issues(issue_description, limit)

            return jsonify({
                'success': True,
                'similar_issues': similar_issues
            })

        except Exception as e:
            logger.error(f"Failed to get similar recommendations: {e}")
            return jsonify({'error': 'Failed to get similar recommendations'}), 500

    @api.route('/api/v1/feedback', methods=['POST'])
    async def submit_feedback():
        """Submit user feedback for learning"""

        try:
            data = request.get_json()

            if not data:
                return jsonify({'error': 'No feedback data provided'}), 400

            original_issue = data.get('original_issue', '')
            approved_fix = data.get('approved_fix', {})

            if not original_issue or not approved_fix:
                return jsonify({'error': 'Missing required fields: original_issue, approved_fix'}), 400

            # Learn from the feedback
            await semantic_cache.learn_from_feedback(original_issue, approved_fix)

            return jsonify({
                'success': True,
                'message': 'Feedback submitted successfully'
            })

        except Exception as e:
            logger.error(f"Failed to submit feedback: {e}")
            return jsonify({'error': 'Failed to submit feedback'}), 500

    @api.route('/api/v1/providers', methods=['GET'])
    def get_supported_providers():
        """Get list of supported cloud providers"""

        providers = [
            {
                'id': CloudProvider.AVIATRIX.value,
                'name': CloudProvider.AVIATRIX.value.upper(),
                'description': get_provider_description(CloudProvider.AVIATRIX)
            }
        ]

        return jsonify({
            'success': True,
            'providers': providers
        })

    @api.route('/api/v1/terraform/parse', methods=['POST'])
    async def parse_terraform():
        """Parse Terraform HCL content and extract firewall rules using AI agent"""
        
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            terraform_content = data.get('content', '')
            cloud_provider = data.get('cloud_provider', 'aviatrix')
            use_ai = data.get('use_ai', True)  # Enable AI by default
            
            if not terraform_content:
                return jsonify({'error': 'No Terraform content provided'}), 400
            
            # Use AI agent if available and requested
            if use_ai:
                logger.info(f"Using AI agent to parse Terraform for {cloud_provider}")
                result = await terraform_agent.parse_terraform(terraform_content, cloud_provider)
                
                if not result.success:
                    return jsonify({
                        'success': False,
                        'error': 'Terraform parsing failed',
                        'errors': result.errors,
                        'warnings': result.warnings
                    }), 400
                
                return jsonify({
                    'success': True,
                    'rules': result.rules,
                    'count': len(result.rules),
                    'warnings': result.warnings,
                    'metadata': result.metadata,
                    'parser': 'ai' if terraform_agent.model_available else 'regex'
                })
            else:
                # Use regex parser directly
                logger.info(f"Using regex parser for {cloud_provider}")
                rules = parse_terraform_content(terraform_content, cloud_provider)
                
                return jsonify({
                    'success': True,
                    'rules': rules,
                    'count': len(rules),
                    'parser': 'regex'
                })
        
        except Exception as e:
            logger.error(f"Terraform parsing failed: {e}")
            return jsonify({'error': 'Failed to parse Terraform', 'details': str(e)}), 500

    @api.route('/api/v1/terraform/validate', methods=['POST'])
    async def validate_terraform():
        """Validate Terraform content using AI agent"""
        
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            terraform_content = data.get('content', '')
            cloud_provider = data.get('cloud_provider', 'aviatrix')
            
            if not terraform_content:
                return jsonify({'error': 'No Terraform content provided'}), 400
            
            # Validate using AI agent
            validation_result = await terraform_agent.validate_terraform(
                terraform_content,
                cloud_provider
            )
            
            return jsonify({
                'success': True,
                'validation': validation_result
            })
        
        except Exception as e:
            logger.error(f"Terraform validation failed: {e}")
            return jsonify({'error': 'Failed to validate Terraform', 'details': str(e)}), 500

    @api.route('/api/v1/terraform/parse-directory', methods=['POST'])
    def parse_terraform_dir():
        """Parse Terraform files from a local directory"""
        
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            directory_path = data.get('path', '')
            cloud_provider = data.get('cloud_provider', 'aviatrix')
            
            if not directory_path:
                return jsonify({'error': 'No directory path provided'}), 400
            
            # Validate path exists and is a directory
            if not os.path.exists(directory_path):
                return jsonify({'error': f'Directory not found: {directory_path}'}), 404
            
            if not os.path.isdir(directory_path):
                return jsonify({'error': f'Path is not a directory: {directory_path}'}), 400
            
            # Parse all .tf files in directory
            rules = parse_terraform_directory(directory_path, cloud_provider)
            
            return jsonify({
                'success': True,
                'rules': rules,
                'count': len(rules),
                'directory': directory_path
            })
        
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            logger.error(f"Terraform directory parsing failed: {e}")
            return jsonify({'error': 'Failed to parse Terraform directory', 'details': str(e)}), 500

    @api.route('/api/v1/health', methods=['GET'])
    def health_check():
        """Detailed health check with core service probes"""

        def run_async(coro):
            try:
                return asyncio.run(coro)
            except RuntimeError:
                loop = asyncio.new_event_loop()
                try:
                    asyncio.set_event_loop(loop)
                    return loop.run_until_complete(coro)
                finally:
                    loop.close()

        def check_agent() -> str:
            try:
                has_method = callable(getattr(audit_agent, 'audit_firewall_rules', None))
                has_deps = hasattr(audit_agent, 'normalization_engine') and hasattr(audit_agent, 'context_cache')
                return 'operational' if has_method and has_deps else 'degraded'
            except Exception:
                return 'error'

        def check_normalization() -> str:
            try:
                normalizers = getattr(normalization_engine, 'normalizers', {})
                return 'operational' if normalizers else 'degraded'
            except Exception:
                return 'error'

        def check_context_cache() -> str:
            try:
                stats = run_async(context_cache.get_stats())
                return 'operational' if isinstance(stats, dict) else 'degraded'
            except Exception:
                return 'error'

        def check_semantic_cache() -> str:
            try:
                stats = run_async(semantic_cache.get_stats())
                has_index = getattr(semantic_cache, 'index', None) is not None
                return 'operational' if isinstance(stats, dict) and has_index else 'degraded'
            except Exception:
                return 'error'

        components = {
            'agent': check_agent(),
            'normalization': check_normalization(),
            'context_cache': check_context_cache(),
            'semantic_cache': check_semantic_cache()
        }

        overall = 'healthy' if all(status == 'operational' for status in components.values()) else 'degraded'

        return jsonify({
            'status': overall,
            'version': '1.0.0',
            'components': components,
            'supported_providers': [CloudProvider.AVIATRIX.value]
        })

    # Register blueprint
    app.register_blueprint(api)

def get_provider_description(provider: CloudProvider) -> str:
    """Get description for a cloud provider"""

    descriptions = {
        CloudProvider.GCP: "Google Cloud Platform - VPC Firewalls, Cloud Armor",
        CloudProvider.AZURE: "Microsoft Azure - Network Security Groups, Azure Firewall",
        CloudProvider.AVIATRIX: "Aviatrix Distributed Cloud Firewall - SmartGroups, WebGroups",
        CloudProvider.CISCO: "Cisco ASA - Access Control Lists",
        CloudProvider.PALO_ALTO: "Palo Alto Networks - Security Policies"
    }

    return descriptions.get(provider, "Firewall rules")