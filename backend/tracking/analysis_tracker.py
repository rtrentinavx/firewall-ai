"""
Analysis Tracker - Track usage of analysis agent calls
Tracks audit calls, rule counts, providers, and timing information
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from collections import defaultdict
import threading

logger = logging.getLogger(__name__)

class AnalysisTracker:
    """Tracks analysis agent calls and usage statistics"""
    
    def __init__(self):
        self._lock = threading.Lock()
        self._calls: List[Dict[str, Any]] = []
        self._max_entries = 10000  # Keep last 10k calls
        
    def track_analysis(
        self,
        rule_count: int,
        intent: str,
        cloud_provider: str,
        execution_time_seconds: float,
        violations_found: int = 0,
        recommendations_count: int = 0,
        cached: bool = False,
        success: bool = True,
        error: Optional[str] = None
    ) -> None:
        """Track an analysis call"""
        
        call_record = {
            'timestamp': datetime.utcnow().isoformat(),
            'rule_count': rule_count,
            'intent': intent,
            'cloud_provider': cloud_provider,
            'execution_time_seconds': execution_time_seconds,
            'violations_found': violations_found,
            'recommendations_count': recommendations_count,
            'cached': cached,
            'success': success,
            'error': error
        }
        
        with self._lock:
            self._calls.append(call_record)
            
            # Trim if we exceed max entries
            if len(self._calls) > self._max_entries:
                self._calls = self._calls[-self._max_entries:]
        
        logger.debug(f"Tracked analysis call: {rule_count} rules, provider: {cloud_provider}, cached: {cached}")
    
    def get_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get statistics for the last N hours"""
        
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        with self._lock:
            recent_calls = [
                call for call in self._calls
                if datetime.fromisoformat(call['timestamp']) >= cutoff_time
            ]
        
        if not recent_calls:
            return {
                'total_calls': 0,
                'successful_calls': 0,
                'failed_calls': 0,
                'cached_calls': 0,
                'total_rules_analyzed': 0,
                'total_violations_found': 0,
                'total_recommendations': 0,
                'avg_execution_time_seconds': 0.0,
                'total_execution_time_seconds': 0.0,
                'calls_by_provider': {},
                'calls_by_hour': [],
                'recent_calls': []
            }
        
        successful_calls = [c for c in recent_calls if c['success']]
        failed_calls = [c for c in recent_calls if not c['success']]
        cached_calls = [c for c in recent_calls if c['cached']]
        
        # Calculate totals
        total_rules = sum(c['rule_count'] for c in recent_calls)
        total_violations = sum(c['violations_found'] for c in recent_calls)
        total_recommendations = sum(c['recommendations_count'] for c in recent_calls)
        total_execution_time = sum(c['execution_time_seconds'] for c in recent_calls)
        avg_execution_time = total_execution_time / len(recent_calls) if recent_calls else 0.0
        
        # Group by provider
        calls_by_provider: Dict[str, int] = defaultdict(int)
        for call in recent_calls:
            calls_by_provider[call['cloud_provider']] += 1
        
        # Group by hour
        calls_by_hour: Dict[str, int] = defaultdict(int)
        for call in recent_calls:
            call_time = datetime.fromisoformat(call['timestamp'])
            hour_key = call_time.strftime('%Y-%m-%d %H:00')
            calls_by_hour[hour_key] += 1
        
        # Sort hourly data
        sorted_hours = sorted(calls_by_hour.items())
        
        # Get recent calls (last 20)
        recent_calls_list = sorted(
            recent_calls,
            key=lambda x: x['timestamp'],
            reverse=True
        )[:20]
        
        return {
            'total_calls': len(recent_calls),
            'successful_calls': len(successful_calls),
            'failed_calls': len(failed_calls),
            'cached_calls': len(cached_calls),
            'total_rules_analyzed': total_rules,
            'total_violations_found': total_violations,
            'total_recommendations': total_recommendations,
            'avg_execution_time_seconds': round(avg_execution_time, 3),
            'total_execution_time_seconds': round(total_execution_time, 3),
            'calls_by_provider': dict(calls_by_provider),
            'calls_by_hour': [{'hour': hour, 'count': count} for hour, count in sorted_hours],
            'recent_calls': recent_calls_list,
            'time_range_hours': hours
        }
    
    def get_all_time_stats(self) -> Dict[str, Any]:
        """Get statistics for all tracked calls"""
        return self.get_stats(hours=24 * 365)  # 1 year
    
    def clear(self) -> None:
        """Clear all tracking data"""
        with self._lock:
            self._calls.clear()
        logger.info("Analysis tracking data cleared")

# Global instance
_analysis_tracker: Optional[AnalysisTracker] = None

def get_tracker() -> AnalysisTracker:
    """Get the global analysis tracker instance"""
    global _analysis_tracker
    if _analysis_tracker is None:
        _analysis_tracker = AnalysisTracker()
    return _analysis_tracker
