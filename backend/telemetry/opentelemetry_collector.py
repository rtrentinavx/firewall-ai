"""
OpenTelemetry-based Telemetry Collector
Wraps OpenTelemetry with a simple interface compatible with existing code
Also maintains in-memory storage for UI visualization
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from collections import defaultdict
import threading

from telemetry.config import get_telemetry_config
from telemetry.opentelemetry_setup import get_tracer, get_meter, OPENTELEMETRY_AVAILABLE

logger = logging.getLogger(__name__)

class TelemetryEvent:
    """Represents a telemetry event for in-memory storage"""
    
    def __init__(
        self,
        event_type: str,
        event_name: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.timestamp = datetime.utcnow().isoformat()
        self.event_type = event_type
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

class OpenTelemetryCollector:
    """Telemetry collector using OpenTelemetry with in-memory storage for UI"""
    
    def __init__(self, max_events: int = 10000):
        self._config = get_telemetry_config()
        self._tracer = get_tracer("firewall-ai") if OPENTELEMETRY_AVAILABLE else None
        self._meter = get_meter("firewall-ai") if OPENTELEMETRY_AVAILABLE else None
        
        # In-memory storage for UI visualization
        self._lock = threading.Lock()
        self._events: List[TelemetryEvent] = []
        self.max_events = max_events
        
        # Create metrics
        if self._meter:
            self._user_action_counter = self._meter.create_counter(
                "user_actions_total",
                description="Total number of user actions"
            )
            self._system_event_counter = self._meter.create_counter(
                "system_events_total",
                description="Total number of system events"
            )
            self._error_counter = self._meter.create_counter(
                "errors_total",
                description="Total number of errors"
            )
            self._performance_histogram = self._meter.create_histogram(
                "performance_metrics",
                description="Performance metrics"
            )
    
    def track_event(
        self,
        event_type: str,
        event_name: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Track a telemetry event using OpenTelemetry"""
        if not self._config.is_enabled() or not OPENTELEMETRY_AVAILABLE:
            return
        
        try:
            metadata = metadata or {}
            
            # Record as metric
            if self._meter:
                if event_type == 'user_action' and self._user_action_counter:
                    self._user_action_counter.add(1, {
                        "action": event_name,
                        **{k: str(v) for k, v in metadata.items()}
                    })
                elif event_type == 'system' and self._system_event_counter:
                    self._system_event_counter.add(1, {
                        "event": event_name,
                        **{k: str(v) for k, v in metadata.items()}
                    })
                elif event_type == 'error' and self._error_counter:
                    self._error_counter.add(1, {
                        "error": event_name,
                        **{k: str(v) for k, v in metadata.items()}
                    })
            
            # Create span for important events
            if self._tracer and event_type in ['user_action', 'error']:
                with self._tracer.start_as_current_span(f"{event_type}.{event_name}") as span:
                    span.set_attribute("event.type", event_type)
                    span.set_attribute("event.name", event_name)
                    for key, value in metadata.items():
                        span.set_attribute(f"event.{key}", str(value))
            
            # Store in memory for UI visualization
            event = TelemetryEvent(event_type, event_name, metadata)
            with self._lock:
                self._events.append(event)
                if len(self._events) > self.max_events:
                    self._events = self._events[-self.max_events:]
            
            logger.debug(f"Tracked OpenTelemetry event: {event_type}.{event_name}")
        except Exception as e:
            logger.error(f"Failed to track OpenTelemetry event: {e}")
    
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
        if not self._config.is_enabled() or not OPENTELEMETRY_AVAILABLE:
            return
        
        try:
            if self._performance_histogram:
                attrs = {"metric": metric}
                if metadata:
                    attrs.update({k: str(v) for k, v in metadata.items()})
                self._performance_histogram.record(value, attrs)
            
            logger.debug(f"Tracked performance metric: {metric}={value}")
        except Exception as e:
            logger.error(f"Failed to track performance metric: {e}")
    
    def get_events(
        self,
        event_type: Optional[str] = None,
        hours: int = 24,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """Get events from in-memory storage"""
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
        """Get telemetry statistics from in-memory storage"""
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
                'backend': 'opentelemetry',
                'exported_to': 'google_cloud_monitoring' if OPENTELEMETRY_AVAILABLE else 'none'
            }
    
    def clear_events(self) -> int:
        """Clear in-memory events"""
        with self._lock:
            count = len(self._events)
            self._events = []
            logger.info(f"Cleared {count} telemetry events from memory")
            return count
