"""
Telemetry Configuration - Manage telemetry settings
"""

import logging
import os
import json
from typing import Dict, Any, Optional
from pathlib import Path
import threading

logger = logging.getLogger(__name__)

class TelemetryConfig:
    """Manages telemetry configuration and settings"""
    
    def __init__(self, config_file: Optional[str] = None):
        # Use container-friendly path: /tmp for containers, ~/.firewall-ai for local
        # Check for container environment (Cloud Run sets K_SERVICE, Docker sets /.dockerenv)
        is_container = (
            os.path.exists('/.dockerenv') or 
            os.getenv('CONTAINER_ENV') == 'true' or 
            os.getenv('K_SERVICE') is not None
        )
        
        if config_file:
            self.config_file = config_file
        elif os.getenv('TELEMETRY_CONFIG_FILE'):
            self.config_file = os.getenv('TELEMETRY_CONFIG_FILE')
        elif is_container:
            # Use /tmp in containers (writable, persists during container lifetime)
            self.config_file = '/tmp/.firewall-ai/telemetry.json'
        else:
            # Use home directory for local development
            self.config_file = os.path.join(os.path.expanduser('~'), '.firewall-ai', 'telemetry.json')
        self._lock = threading.Lock()
        self._enabled = True  # Default to enabled
        self._use_opentelemetry = os.getenv('USE_OPENTELEMETRY', 'true').lower() == 'true'
        self._load_config()
    
    def _load_config(self) -> None:
        """Load configuration from file"""
        try:
            config_path = Path(self.config_file)
            if config_path.exists():
                with open(config_path, 'r') as f:
                    config = json.load(f)
                    self._enabled = config.get('enabled', True)
                    # Load OpenTelemetry setting from file, but env var takes precedence
                    if 'use_opentelemetry' in config:
                        self._use_opentelemetry = config.get('use_opentelemetry', True)
                    logger.info(f"Loaded telemetry config: enabled={self._enabled}, opentelemetry={self._use_opentelemetry}")
            else:
                # Create default config
                self._save_config()
        except Exception as e:
            logger.warning(f"Failed to load telemetry config: {e}. Using defaults.")
            self._enabled = True
            self._use_opentelemetry = os.getenv('USE_OPENTELEMETRY', 'true').lower() == 'true'
    
    def _save_config(self) -> None:
        """Save configuration to file"""
        try:
            config_path = Path(self.config_file)
            config_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(config_path, 'w') as f:
                json.dump({
                    'enabled': self._enabled,
                    'use_opentelemetry': self._use_opentelemetry,
                    'version': '1.0'
                }, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save telemetry config: {e}")
    
    def is_enabled(self) -> bool:
        """Check if telemetry is enabled"""
        with self._lock:
            return self._enabled
    
    def set_enabled(self, enabled: bool) -> bool:
        """Enable or disable telemetry"""
        with self._lock:
            self._enabled = enabled
            self._save_config()
            logger.info(f"Telemetry {'enabled' if enabled else 'disabled'}")
            return True
    
    def get_config(self) -> Dict[str, Any]:
        """Get current configuration"""
        with self._lock:
            return {
                'enabled': self._enabled,
                'use_opentelemetry': self._use_opentelemetry,
                'config_file': self.config_file
            }
    
    def is_opentelemetry_enabled(self) -> bool:
        """Check if OpenTelemetry is enabled"""
        with self._lock:
            return self._use_opentelemetry
    
    def set_opentelemetry_enabled(self, enabled: bool) -> bool:
        """Enable or disable OpenTelemetry"""
        with self._lock:
            self._use_opentelemetry = enabled
            # Update environment variable (affects current process only)
            os.environ['USE_OPENTELEMETRY'] = 'true' if enabled else 'false'
            # Save to config file
            self._save_config()
            logger.info(f"OpenTelemetry {'enabled' if enabled else 'disabled'}")
            return True

# Global instance
_telemetry_config: Optional[TelemetryConfig] = None

def get_telemetry_config() -> TelemetryConfig:
    """Get the global telemetry config instance"""
    global _telemetry_config
    if _telemetry_config is None:
        _telemetry_config = TelemetryConfig()
    return _telemetry_config
