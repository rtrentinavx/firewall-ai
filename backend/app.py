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
from api.routes import register_routes

# Initialize core components
audit_agent = FirewallAuditAgent()
normalization_engine = NormalizationEngine()
context_cache = ContextCache()
semantic_cache = SemanticCache()

# Register API routes
register_routes(app, audit_agent, normalization_engine, context_cache, semantic_cache)

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