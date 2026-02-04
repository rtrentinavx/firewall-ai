"""
API Routes
REST API endpoints for the Firewall AI application
"""

import logging
import os
import base64
import asyncio
import time
from flask import request, jsonify, Blueprint, Response
from typing import Dict, Any, List
import json

from models.firewall_rule import FirewallRule, AuditResult, CloudProvider, ComplianceResult
from langgraph.agent import FirewallAuditAgent
from langgraph.compliance_agent import ComplianceAgent
from langgraph.terraform_agent import terraform_agent
from normalization.engine import NormalizationEngine
from caching.context_cache import ContextCache
from caching.semantic_cache import SemanticCache
from utils.terraform_parser import parse_terraform_content, parse_terraform_directory
from tracking.analysis_tracker import get_tracker
from config.model_config import get_model_manager
from rag.knowledge_base import RAGKnowledgeBase
from rag.document_ingester import DocumentIngester
from telemetry.collector import get_telemetry_collector
from telemetry.config import get_telemetry_config

logger = logging.getLogger(__name__)

def register_routes(
    app,
    audit_agent: FirewallAuditAgent,
    normalization_engine: NormalizationEngine,
    context_cache: ContextCache,
    semantic_cache: SemanticCache,
    rag_knowledge_base: RAGKnowledgeBase
):
    # Initialize compliance agent
    compliance_agent = ComplianceAgent(rag_knowledge_base=rag_knowledge_base)
    """Register all API routes"""

    api = Blueprint('api', __name__)
    
    # Verify imports work
    try:
        from config.model_config import get_model_manager
        from tracking.analysis_tracker import get_tracker
        logger.info("Model config and tracking imports successful")
    except Exception as e:
        logger.error(f"Failed to import model config or tracker: {e}", exc_info=True)
        # Continue anyway - routes will fail gracefully

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
        open_paths = {'/api/v1/health', '/api/v1/health/services', '/api/v1/auth/login'}
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
        
        # Track telemetry
        telemetry = get_telemetry_collector()
        data = request.get_json() or {}
        telemetry.track_user_action('audit_firewall_rules', {
            'rules_count': len(data.get('rules', [])),
            'cloud_provider': data.get('cloud_provider', 'gcp')
        })

        try:
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
            start_time = time.time()
            result = None
            error_message = None
            
            try:
                result = await audit_agent.audit_firewall_rules(rules, intent)
                execution_time = time.time() - start_time
                
                # Track successful analysis
                tracker = get_tracker()
                tracker.track_analysis(
                    rule_count=len(rules),
                    intent=intent,
                    cloud_provider=cloud_provider,
                    execution_time_seconds=execution_time,
                    violations_found=result.violations_found,
                    recommendations_count=result.recommendations,
                    cached=result.cached,
                    success=True
                )
                
                # Track telemetry
                telemetry = get_telemetry_collector()
                telemetry.track_performance('audit_execution_time', execution_time, {
                    'rule_count': len(rules),
                    'cached': result.cached
                })
                
                return jsonify({
                    'success': True,
                    'audit_id': result.id,
                    'result': result.dict()
                })
            except Exception as audit_error:
                execution_time = time.time() - start_time
                error_message = str(audit_error)
                
                # Track failed analysis
                tracker = get_tracker()
                tracker.track_analysis(
                    rule_count=len(rules),
                    intent=intent,
                    cloud_provider=cloud_provider,
                    execution_time_seconds=execution_time,
                    violations_found=0,
                    recommendations_count=0,
                    cached=False,
                    success=False,
                    error=error_message
                )
                
                # Track telemetry error
                telemetry = get_telemetry_collector()
                telemetry.track_error('audit_failed', {
                    'error': error_message,
                    'rule_count': len(rules)
                })
                
                logger.error(f"Audit failed: {error_message}")
                return jsonify({'error': 'Audit failed', 'details': error_message}), 500

        except Exception as e:
            logger.error(f"Audit failed: {e}")
            return jsonify({'error': 'Audit failed', 'details': str(e)}), 500

    @api.route('/api/v1/rules/normalize', methods=['POST'])
    async def normalize_rules():
        """Normalize firewall rules endpoint"""
        
        # Track telemetry
        telemetry = get_telemetry_collector()
        data = request.get_json() or {}
        telemetry.track_user_action('normalize_rules', {
            'rules_count': len(data.get('rules', []))
        })

        try:
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
            telemetry.track_error('normalize_failed', {'error': str(e)})
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

    @api.route('/api/v1/analytics/stats', methods=['GET'])
    def get_analysis_stats():
        """Get analysis tracking statistics"""
        
        try:
            hours = request.args.get('hours', 24, type=int)
            tracker = get_tracker()
            stats = tracker.get_stats(hours=hours)
            
            return jsonify({
                'success': True,
                'stats': stats
            })
        
        except Exception as e:
            logger.error(f"Failed to get analysis stats: {e}")
            return jsonify({'error': 'Failed to get analysis stats', 'details': str(e)}), 500

    @api.route('/api/v1/models', methods=['GET'])
    def get_models():
        """Get list of available models and current model"""
        
        try:
            model_manager = get_model_manager()
            current_model = model_manager.get_current_model()
            available_models = model_manager.get_available_models()
            
            logger.info(f"Retrieved models: current={current_model.model_id if current_model else None}, available={len(available_models)}")
            
            return jsonify({
                'success': True,
                'current_model': current_model.to_dict() if current_model else None,
                'available_models': available_models
            })
        
        except Exception as e:
            logger.error(f"Failed to get models: {e}", exc_info=True)
            return jsonify({
                'success': False,
                'error': 'Failed to get models',
                'details': str(e)
            }), 500

    @api.route('/api/v1/models/switch', methods=['POST'])
    def switch_model():
        """Switch to a different model"""
        
        try:
            data = request.get_json()
            
            if not data or 'model_id' not in data:
                return jsonify({'error': 'No model_id provided'}), 400
            
            model_id = data['model_id']
            model_manager = get_model_manager()
            
            # Check if model exists and is available
            model_config = model_manager.get_model_config(model_id)
            if not model_config:
                return jsonify({'error': f'Model {model_id} not found'}), 404
            
            if not model_config.available:
                return jsonify({'error': f'Model {model_id} is not available'}), 400
            
            # Switch the model
            success = model_manager.set_model(model_id)
            if not success:
                return jsonify({'error': 'Failed to switch model'}), 500
            
            # Update the Terraform agent to use the new model
            terraform_agent.update_model()
            
            # Get updated current model
            current_model = model_manager.get_current_model()
            
            return jsonify({
                'success': True,
                'message': f'Model switched to {model_id}',
                'current_model': current_model.to_dict() if current_model else None
            })
        
        except Exception as e:
            logger.error(f"Failed to switch model: {e}")
            return jsonify({'error': 'Failed to switch model', 'details': str(e)}), 500

    @api.route('/api/v1/rag/documents', methods=['GET'])
    def get_rag_documents():
        """Get all documents in the RAG knowledge base"""
        
        try:
            documents = rag_knowledge_base.get_documents()
            stats = rag_knowledge_base.get_stats()
            
            return jsonify({
                'success': True,
                'documents': documents,
                'stats': stats
            })
        
        except Exception as e:
            logger.error(f"Failed to get RAG documents: {e}")
            return jsonify({'error': 'Failed to get documents', 'details': str(e)}), 500

    @api.route('/api/v1/rag/documents/<document_id>', methods=['GET'])
    def get_rag_document(document_id: str):
        """Get a specific document from the RAG knowledge base"""
        
        try:
            document = rag_knowledge_base.get_document(document_id)
            
            if not document:
                return jsonify({'error': 'Document not found'}), 404
            
            return jsonify({
                'success': True,
                'document': document
            })
        
        except Exception as e:
            logger.error(f"Failed to get RAG document: {e}")
            return jsonify({'error': 'Failed to get document', 'details': str(e)}), 500

    @api.route('/api/v1/rag/documents/<document_id>', methods=['DELETE'])
    def delete_rag_document(document_id: str):
        """Delete a document from the RAG knowledge base"""
        
        try:
            success = rag_knowledge_base.delete_document(document_id)
            
            if not success:
                return jsonify({'error': 'Document not found'}), 404
            
            return jsonify({
                'success': True,
                'message': f'Document {document_id} deleted'
            })
        
        except Exception as e:
            logger.error(f"Failed to delete RAG document: {e}")
            return jsonify({'error': 'Failed to delete document', 'details': str(e)}), 500

    @api.route('/api/v1/rag/documents/upload', methods=['POST'])
    def upload_rag_document():
        """Upload a document from a local file"""
        
        try:
            if 'file' not in request.files:
                return jsonify({'error': 'No file provided'}), 400
            
            file = request.files['file']
            title = request.form.get('title', None)
            
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            # Save uploaded file temporarily
            import tempfile
            import os
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
                file.save(tmp_file.name)
                tmp_path = tmp_file.name
            
            try:
                # Ingest the file
                ingester = DocumentIngester()
                title, content, metadata = ingester.ingest_file(tmp_path, title)
                
                # Add to knowledge base
                document_id = rag_knowledge_base.add_document(
                    source=file.filename,
                    source_type='file',
                    title=title,
                    content=content,
                    metadata=metadata
                )
                
                return jsonify({
                    'success': True,
                    'document_id': document_id,
                    'message': f'Document uploaded successfully'
                })
            
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
        
        except Exception as e:
            logger.error(f"Failed to upload document: {e}")
            return jsonify({'error': 'Failed to upload document', 'details': str(e)}), 500

    @api.route('/api/v1/rag/documents/url', methods=['POST'])
    def add_rag_document_from_url():
        """Add a document from a URL"""
        
        try:
            data = request.get_json()
            
            if not data or 'url' not in data:
                return jsonify({'error': 'No URL provided'}), 400
            
            url = data['url']
            title = data.get('title', None)
            
            # Ingest from URL
            ingester = DocumentIngester()
            title, content, metadata = ingester.ingest_url(url, title)
            
            # Add to knowledge base
            document_id = rag_knowledge_base.add_document(
                source=url,
                source_type='url',
                title=title,
                content=content,
                metadata=metadata
            )
            
            return jsonify({
                'success': True,
                'document_id': document_id,
                'message': f'Document added from URL successfully'
            })
        
        except Exception as e:
            logger.error(f"Failed to add document from URL: {e}")
            return jsonify({'error': 'Failed to add document from URL', 'details': str(e)}), 500

    @api.route('/api/v1/rag/search', methods=['POST'])
    def search_rag():
        """Search the RAG knowledge base"""
        
        try:
            data = request.get_json()
            
            if not data or 'query' not in data:
                return jsonify({'error': 'No query provided'}), 400
            
            query = data['query']
            limit = data.get('limit', 5)
            min_score = data.get('min_score', 0.0)
            
            # Search knowledge base
            results = rag_knowledge_base.search(query, limit=limit, min_score=min_score)
            
            return jsonify({
                'success': True,
                'results': results,
                'count': len(results)
            })
        
        except Exception as e:
            logger.error(f"Failed to search RAG: {e}")
            return jsonify({'error': 'Failed to search knowledge base', 'details': str(e)}), 500

    @api.route('/api/v1/rag/stats', methods=['GET'])
    def get_rag_stats():
        """Get RAG knowledge base statistics"""
        
        try:
            stats = rag_knowledge_base.get_stats()
            
            return jsonify({
                'success': True,
                'stats': stats
            })
        
        except Exception as e:
            logger.error(f"Failed to get RAG stats: {e}")
            return jsonify({'error': 'Failed to get RAG stats', 'details': str(e)}), 500

    @api.route('/api/v1/compliance/check', methods=['POST'])
    async def check_compliance():
        """Check firewall rules for compliance with industry standards"""
        
        # Track telemetry
        telemetry = get_telemetry_collector()
        data = request.get_json() or {}
        telemetry.track_user_action('check_compliance', {
            'rules_count': len(data.get('rules', [])),
            'cloud_provider': data.get('cloud_provider', 'gcp')
        })

        try:
            if not data:
                return jsonify({'error': 'No data provided'}), 400

            # Extract parameters
            rules_data = data.get('rules', [])
            cloud_provider_str = data.get('cloud_provider', 'gcp')
            standards = data.get('standards')  # Optional list of specific standards
            use_rag = data.get('use_rag', True)  # Use RAG by default

            if not rules_data:
                return jsonify({'error': 'No rules provided'}), 400

            # Convert cloud provider string to enum
            try:
                cloud_provider = CloudProvider(cloud_provider_str.lower())
            except ValueError:
                return jsonify({'error': f'Invalid cloud provider: {cloud_provider_str}'}), 400

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

            # Execute compliance check
            start_time = time.time()
            result = None
            error_message = None
            
            try:
                result = await compliance_agent.check_compliance(
                    rules=rules,
                    cloud_provider=cloud_provider,
                    standards=standards,
                    use_rag=use_rag
                )
                execution_time = time.time() - start_time
                
                # Track telemetry
                telemetry.track_performance('compliance_check_time', execution_time, {
                    'rule_count': len(rules),
                    'standards_checked': len(result.standards_checked),
                    'rag_used': result.rag_context_used
                })
                
                return jsonify({
                    'success': True,
                    'compliance_id': result.id,
                    'result': result.dict()
                })
            except Exception as compliance_error:
                execution_time = time.time() - start_time
                error_message = str(compliance_error)
                
                # Track telemetry error
                telemetry.track_error('compliance_check_failed', {
                    'error': error_message,
                    'rule_count': len(rules)
                })
                
                logger.error(f"Compliance check failed: {error_message}")
                return jsonify({
                    'success': False,
                    'error': 'Compliance check failed',
                    'details': error_message
                }), 500

        except Exception as e:
            logger.error(f"Compliance check endpoint error: {e}")
            telemetry.track_error('compliance_endpoint_error', {'error': str(e)})
            return jsonify({'error': 'Failed to check compliance', 'details': str(e)}), 500

    @api.route('/api/v1/telemetry/config', methods=['GET'])
    def get_telemetry_config_endpoint():
        """Get telemetry configuration"""
        
        try:
            config = get_telemetry_config()
            return jsonify({
                'success': True,
                'config': config.get_config()
            })
        except Exception as e:
            logger.error(f"Failed to get telemetry config: {e}")
            return jsonify({'error': 'Failed to get telemetry config', 'details': str(e)}), 500

    @api.route('/api/v1/telemetry/config', methods=['POST'])
    def update_telemetry_config():
        """Update telemetry configuration"""
        
        try:
            data = request.get_json()
            enabled = data.get('enabled', True)
            use_opentelemetry = data.get('use_opentelemetry')
            
            config = get_telemetry_config()
            config.set_enabled(enabled)
            
            # Update OpenTelemetry setting if provided
            if use_opentelemetry is not None:
                old_value = config.is_opentelemetry_enabled()
                config.set_opentelemetry_enabled(use_opentelemetry)
                
                # If OpenTelemetry setting changed, reset collector to pick up new config
                if old_value != use_opentelemetry:
                    try:
                        from telemetry import _reset_collector
                        _reset_collector()
                        logger.info(f"Telemetry collector reset due to OpenTelemetry config change: {use_opentelemetry}")
                    except Exception as e:
                        logger.warning(f"Failed to reset collector: {e}")
            
            return jsonify({
                'success': True,
                'config': config.get_config(),
                'message': 'Config updated. Note: OpenTelemetry instrumentation requires server restart for full effect.'
            })
        except Exception as e:
            logger.error(f"Failed to update telemetry config: {e}")
            return jsonify({'error': 'Failed to update telemetry config', 'details': str(e)}), 500

    @api.route('/api/v1/telemetry/events', methods=['GET'])
    def get_telemetry_events():
        """Get telemetry events"""
        
        try:
            collector = get_telemetry_collector()
            
            event_type = request.args.get('event_type')
            hours = int(request.args.get('hours', 24))
            limit = int(request.args.get('limit', 1000))
            
            events = collector.get_events(
                event_type=event_type,
                hours=hours,
                limit=limit
            )
            
            return jsonify({
                'success': True,
                'events': events,
                'count': len(events)
            })
        except Exception as e:
            logger.error(f"Failed to get telemetry events: {e}")
            return jsonify({'error': 'Failed to get telemetry events', 'details': str(e)}), 500

    @api.route('/api/v1/telemetry/stats', methods=['GET'])
    def get_telemetry_stats():
        """Get telemetry statistics"""
        
        try:
            collector = get_telemetry_collector()
            hours = int(request.args.get('hours', 24))
            
            stats = collector.get_stats(hours=hours)
            
            return jsonify({
                'success': True,
                'stats': stats
            })
        except Exception as e:
            logger.error(f"Failed to get telemetry stats: {e}")
            return jsonify({'error': 'Failed to get telemetry stats', 'details': str(e)}), 500

    @api.route('/api/v1/telemetry/events', methods=['DELETE'])
    def clear_telemetry_events():
        """Clear all telemetry events"""
        
        try:
            collector = get_telemetry_collector()
            count = collector.clear_events()
            
            return jsonify({
                'success': True,
                'message': f'Cleared {count} events'
            })
        except Exception as e:
            logger.error(f"Failed to clear telemetry events: {e}")
            return jsonify({'error': 'Failed to clear telemetry events', 'details': str(e)}), 500

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
                logger.debug(f"Terraform content length: {len(terraform_content)} chars")
                result = await terraform_agent.parse_terraform(terraform_content, cloud_provider)
                
                logger.info(f"Parsing result: success={result.success}, rules_count={len(result.rules)}, errors={result.errors}")
                
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

        # Get embedding model information
        embedding_model_info = {}
        try:
            embedding_model_info = semantic_cache.get_model_info()
        except Exception as e:
            logger.warning(f"Failed to get embedding model info: {e}")

        return jsonify({
            'status': overall,
            'version': '1.0.0',
            'components': components,
            'supported_providers': [CloudProvider.AVIATRIX.value],
            'embedding_model': embedding_model_info
        })

    @api.route('/api/v1/health/services', methods=['GET'])
    def services_health_check():
        """Check connectivity to all GCP services"""
        import os
        from google.cloud import firestore, storage, secretmanager
        
        services = {}
        
        # Check Firestore
        try:
            db = firestore.Client()
            # Try to access a collection
            db.collection('health_check').limit(1).get()
            services['firestore'] = {'status': 'connected', 'message': 'Successfully connected to Firestore'}
        except Exception as e:
            services['firestore'] = {'status': 'error', 'message': str(e)}
        
        # Check Cloud Storage
        try:
            storage_client = storage.Client()
            project_id = os.getenv('GOOGLE_CLOUD_PROJECT', 'rtrentin-01')
            bucket_name = f"{project_id}-firewall-configs"
            bucket = storage_client.bucket(bucket_name)
            # Check if bucket exists
            bucket.exists()
            services['storage'] = {'status': 'connected', 'message': f'Successfully connected to bucket: {bucket_name}'}
        except Exception as e:
            services['storage'] = {'status': 'error', 'message': str(e)}
        
        # Check Secret Manager
        try:
            secrets_client = secretmanager.SecretManagerServiceClient()
            project_id = os.getenv('GOOGLE_CLOUD_PROJECT', 'rtrentin-01')
            # Try to access a secret (gemini-api-key)
            name = f"projects/{project_id}/secrets/gemini-api-key/versions/latest"
            response = secrets_client.access_secret_version(request={"name": name})
            services['secret_manager'] = {'status': 'connected', 'message': 'Successfully accessed Secret Manager'}
        except Exception as e:
            services['secret_manager'] = {'status': 'error', 'message': str(e)}
        
        # Check Vertex AI (if configured)
        try:
            from langchain_google_vertexai import ChatVertexAI
            project_id = os.getenv('GOOGLE_CLOUD_PROJECT')
            if project_id:
                llm = ChatVertexAI(
                    model="gemini-1.5-flash",
                    project=project_id,
                    temperature=0
                )
                services['vertex_ai'] = {'status': 'connected', 'message': 'Vertex AI configured'}
            else:
                services['vertex_ai'] = {'status': 'not_configured', 'message': 'GOOGLE_CLOUD_PROJECT not set'}
        except Exception as e:
            services['vertex_ai'] = {'status': 'error', 'message': str(e)}
        
        # Overall status
        error_count = sum(1 for s in services.values() if s['status'] == 'error')
        overall = 'healthy' if error_count == 0 else 'degraded' if error_count < len(services) else 'unhealthy'
        
        return jsonify({
            'status': overall,
            'services': services,
            'project_id': os.getenv('GOOGLE_CLOUD_PROJECT', 'not_set'),
            'region': os.getenv('GCP_REGION', 'not_set')
        })

    # Register blueprint
    try:
        app.register_blueprint(api)
        logger.info("API blueprint registered successfully")
        # Log registered routes for debugging
        registered_routes = [rule.rule for rule in app.url_map.iter_rules() if '/api/v1/' in rule.rule]
        logger.info(f"Registered {len(registered_routes)} API routes: {', '.join(registered_routes[:10])}")
    except Exception as e:
        logger.error(f"Failed to register API blueprint: {e}", exc_info=True)
        raise

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