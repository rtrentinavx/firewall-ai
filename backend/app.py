"""
Firewall AI - Agentic SDLC for Multi-Cloud Security
Main Flask application with LangGraph orchestration
"""

import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Import core components
from langgraph.agent import FirewallAuditAgent
from normalization.engine import NormalizationEngine
from caching.context_cache import ContextCache
from caching.semantic_cache import SemanticCache
from rag.knowledge_base import RAGKnowledgeBase
from rag.persistent_storage import PersistentRAGStorage
from api.routes import register_routes
import atexit
import logging

logger = logging.getLogger(__name__)

# Initialize persistent storage for RAG
persistent_storage = PersistentRAGStorage(
    project_id=None,  # Will use environment variable
    documents_bucket=None,  # Will use environment variable
    indices_bucket=None,  # Will use environment variable
    enable_persistence=True
)

# Initialize core components
normalization_engine = NormalizationEngine()
context_cache = ContextCache()
semantic_cache = SemanticCache()
rag_knowledge_base = RAGKnowledgeBase(persistent_storage=persistent_storage)
audit_agent = FirewallAuditAgent(rag_knowledge_base=rag_knowledge_base)

# Register shutdown hook to save RAG state
def save_rag_state():
    """Save RAG knowledge base state on shutdown"""
    try:
        if rag_knowledge_base:
            rag_knowledge_base.save_state()
            logger.info("RAG knowledge base state saved on shutdown")
    except Exception as e:
        logger.error(f"Failed to save RAG state on shutdown: {e}")

atexit.register(save_rag_state)

# Register API routes
register_routes(app, audit_agent, normalization_engine, context_cache, semantic_cache, rag_knowledge_base)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0',
        'components': {
            'agent': 'ready',
            'normalization': 'ready',
            'context_cache': 'ready',
            'semantic_cache': 'ready'
        }
    })

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    debug = os.environ.get('FLASK_ENV') == 'development'

    logger.info(f"Starting Firewall AI on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)