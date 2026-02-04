"""
Telemetry Collector - Collects and stores application usage telemetry
"""

import logging
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import threading

from telemetry.config import get_telemetry_config

logger = logging.getLogger(__name__)

class TelemetryEvent:
    """Represents a telemetry event"""
    
    def __init__(
        self,
        event_type: str,
        event_name: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.timestamp = datetime.utcnow().isoformat()
        self.event_type = event_type  # 'user_action', 'system', 'error', 'performance'
        self.event_name = event_name
        self.metadata = metadata or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'timestamp': self.timestamp,
            'event_type': self.event_type,
            'event_name': self.event_name,
            'metadata': self.metadata
        }

class TelemetryCollector:
    """Collects and stores telemetry data"""
    
    def __init__(self, max_events: int = 10000):
        self.max_events = max_events
        self._lock = threading.Lock()
        self._events: List[TelemetryEvent] = []
        self._config = get_telemetry_config()
    
    def track_event(
        self,
        event_type: str,
        event_name: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Track a telemetry event"""
        if not self._config.is_enabled():
            return
        
        try:
            event = TelemetryEvent(event_type, event_name, metadata)
            
            with self._lock:
                self._events.append(event)
                
                # Trim if exceeds max
                if len(self._events) > self.max_events:
                    self._events = self._events[-self.max_events:]
            
            logger.debug(f"Tracked telemetry event: {event_type}.{event_name}")
        except Exception as e:
            logger.error(f"Failed to track telemetry event: {e}")
    
    def track_user_action(self, action: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Track a user action"""
        self.track_event('user_action', action, metadata)
    
    def track_system_event(self, event: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Track a system event"""
        self.track_event('system', event, metadata)
    
    def track_error(self, error: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Track an error"""
        self.track_event('error', error, metadata)
    
    def track_performance(self, metric: str, value: float, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Track a performance metric"""
        perf_metadata = {'value': value, **(metadata or {})}
        self.track_event('performance', metric, perf_metadata)
    
    def get_events(
        self,
        event_type: Optional[str] = None,
        hours: int = 24,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """Get events filtered by type and time range"""
        with self._lock:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            filtered = [
                event.to_dict()
                for event in self._events
                if (event_type is None or event.event_type == event_type)
                and datetime.fromisoformat(event.timestamp) >= cutoff_time
            ]
            
            return filtered[-limit:]
    
    def get_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get telemetry statistics"""
        with self._lock:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            recent_events = [
                event for event in self._events
                if datetime.fromisoformat(event.timestamp) >= cutoff_time
            ]
            
            # Count by type
            by_type = defaultdict(int)
            by_name = defaultdict(int)
            
            for event in recent_events:
                by_type[event.event_type] += 1
                by_name[f"{event.event_type}.{event.event_name}"] += 1
            
            # Performance metrics
            perf_events = [e for e in recent_events if e.event_type == 'performance']
            perf_metrics = {}
            for event in perf_events:
                metric_name = event.event_name
                if metric_name not in perf_metrics:
                    perf_metrics[metric_name] = []
                if 'value' in event.metadata:
                    perf_metrics[metric_name].append(event.metadata['value'])
            
            # Calculate averages
            perf_averages = {
                name: sum(values) / len(values) if values else 0
                for name, values in perf_metrics.items()
            }
            
            return {
                'total_events': len(recent_events),
                'events_by_type': dict(by_type),
                'events_by_name': dict(by_name),
                'performance_metrics': perf_averages,
                'time_range_hours': hours,
                'backend': 'custom',
                'exported_to': 'none'
            }
    
    def clear_events(self) -> int:
        """Clear all events"""
        with self._lock:
            count = len(self._events)
            self._events = []
            logger.info(f"Cleared {count} telemetry events")
            return count

# Global instance
_telemetry_collector: Optional[TelemetryCollector] = None

def get_telemetry_collector() -> TelemetryCollector:
    """Get the global telemetry collector instance"""
    global _telemetry_collector
    if _telemetry_collector is None:
        _telemetry_collector = TelemetryCollector()
    return _telemetry_collector
