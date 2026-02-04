"""
Model Configuration Manager
Manages AI model selection and configuration for analysis agents
"""

import logging
import os
import threading
from typing import Dict, List, Optional, Any
from enum import Enum

logger = logging.getLogger(__name__)

class ModelProvider(str, Enum):
    """Supported model providers"""
    VERTEX_AI = "vertex_ai"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"

class ModelConfig:
    """Configuration for a specific model"""
    
    def __init__(
        self,
        name: str,
        provider: ModelProvider,
        model_id: str,
        temperature: float = 0.1,
        max_tokens: int = 8192,
        description: str = "",
        available: bool = True
    ):
        self.name = name
        self.provider = provider
        self.model_id = model_id
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.description = description
        self.available = available
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'name': self.name,
            'provider': self.provider.value,
            'model_id': self.model_id,
            'temperature': self.temperature,
            'max_tokens': self.max_tokens,
            'description': self.description,
            'available': self.available
        }

class ModelConfigManager:
    """Manages model configuration and selection"""
    
    # Available models
    AVAILABLE_MODELS = {
        'gemini-1.5-flash': ModelConfig(
            name='Gemini 1.5 Flash',
            provider=ModelProvider.VERTEX_AI,
            model_id='gemini-1.5-flash',
            temperature=0.1,
            max_tokens=8192,
            description='Fast and efficient model for quick analysis'
        ),
        'gemini-1.5-pro': ModelConfig(
            name='Gemini 1.5 Pro',
            provider=ModelProvider.VERTEX_AI,
            model_id='gemini-1.5-pro',
            temperature=0.1,
            max_tokens=8192,
            description='Advanced model with superior reasoning capabilities'
        ),
        'gemini-1.5-flash-8b': ModelConfig(
            name='Gemini 1.5 Flash 8B',
            provider=ModelProvider.VERTEX_AI,
            model_id='gemini-1.5-flash-8b',
            temperature=0.1,
            max_tokens=8192,
            description='Lightweight 8B parameter model for cost-effective analysis'
        ),
    }
    
    def __init__(self):
        self._lock = threading.Lock()
        # Default model from environment or first available
        default_model_id = os.getenv('DEFAULT_MODEL', 'gemini-1.5-flash')
        self._current_model_id = default_model_id if default_model_id in self.AVAILABLE_MODELS else 'gemini-1.5-flash'
        self._check_model_availability()
    
    def _check_model_availability(self) -> None:
        """Check which models are actually available"""
        # For now, assume Vertex AI models are available if GCP is configured
        project_id = os.getenv('GOOGLE_CLOUD_PROJECT')
        vertex_ai_available = project_id is not None
        
        for model_id, config in self.AVAILABLE_MODELS.items():
            if config.provider == ModelProvider.VERTEX_AI:
                config.available = vertex_ai_available
            else:
                config.available = False
    
    def get_current_model(self) -> Optional[ModelConfig]:
        """Get the currently selected model configuration"""
        with self._lock:
            return self.AVAILABLE_MODELS.get(self._current_model_id)
    
    def get_current_model_id(self) -> str:
        """Get the current model ID"""
        with self._lock:
            return self._current_model_id
    
    def set_model(self, model_id: str) -> bool:
        """Set the current model"""
        with self._lock:
            if model_id not in self.AVAILABLE_MODELS:
                logger.warning(f"Model {model_id} not found in available models")
                return False
            
            config = self.AVAILABLE_MODELS[model_id]
            if not config.available:
                logger.warning(f"Model {model_id} is not available")
                return False
            
            self._current_model_id = model_id
            logger.info(f"Model changed to {model_id}")
            return True
    
    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of all available models"""
        with self._lock:
            return [
                config.to_dict()
                for model_id, config in self.AVAILABLE_MODELS.items()
            ]
    
    def get_model_config(self, model_id: str) -> Optional[ModelConfig]:
        """Get configuration for a specific model"""
        with self._lock:
            return self.AVAILABLE_MODELS.get(model_id)

# Global instance
_model_manager: Optional[ModelConfigManager] = None

def get_model_manager() -> ModelConfigManager:
    """Get the global model configuration manager"""
    global _model_manager
    if _model_manager is None:
        _model_manager = ModelConfigManager()
    return _model_manager
