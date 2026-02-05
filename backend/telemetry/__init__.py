"""Telemetry module for application usage tracking"""

import os
from typing import Optional
from telemetry.config import TelemetryConfig, get_telemetry_config

# Lazy loading of collector - will be initialized on first use
_collector_instance: Optional[object] = None
_collector_type: Optional[type] = None

def _get_collector_instance():
    """Get or create the telemetry collector instance (lazy initialization)"""
    global _collector_instance, _collector_type
    
    # If already initialized, return it
    if _collector_instance is not None:
        return _collector_instance
    
    # Check config to determine which collector to use
    config = get_telemetry_config()
    use_opentelemetry = config.is_opentelemetry_enabled()
    
    if use_opentelemetry:
        try:
            from telemetry.opentelemetry_collector import OpenTelemetryCollector
            _collector_instance = OpenTelemetryCollector()
            _collector_type = OpenTelemetryCollector
            return _collector_instance
        except ImportError:
            # Fall back to custom collector if OpenTelemetry not available
            from telemetry.collector import TelemetryCollector
            _collector_instance = TelemetryCollector()
            _collector_type = TelemetryCollector
            return _collector_instance
    else:
        from telemetry.collector import TelemetryCollector
        _collector_instance = TelemetryCollector()
        _collector_type = TelemetryCollector
        return _collector_instance

def get_telemetry_collector():
    """Get the telemetry collector instance"""
    return _get_collector_instance()

def _reset_collector():
    """Reset the collector instance (for testing or config changes)"""
    global _collector_instance, _collector_type
    _collector_instance = None
    _collector_type = None

# Import types for type hints
try:
    from telemetry.opentelemetry_collector import OpenTelemetryCollector as _OTCollector
    from telemetry.collector import TelemetryCollector as _CustomCollector
    TelemetryCollector = _OTCollector  # Default export
except ImportError:
    from telemetry.collector import TelemetryCollector

__all__ = ['TelemetryCollector', 'get_telemetry_collector', 'TelemetryConfig', 'get_telemetry_config', '_reset_collector']
