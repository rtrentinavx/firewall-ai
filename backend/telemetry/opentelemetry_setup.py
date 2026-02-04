"""
OpenTelemetry Setup - Configure OpenTelemetry for observability
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Try to import OpenTelemetry
try:
    from opentelemetry import trace, metrics
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
    from opentelemetry.instrumentation.flask import FlaskInstrumentor
    from opentelemetry.instrumentation.requests import RequestsInstrumentor
    from opentelemetry.exporter.gcp.trace import CloudTraceSpanExporter
    from opentelemetry.exporter.gcp.monitoring import MonitoringExporter
    from opentelemetry.sdk.resources import Resource
    
    OPENTELEMETRY_AVAILABLE = True
except ImportError:
    OPENTELEMETRY_AVAILABLE = False
    logger.warning("OpenTelemetry not available. Install with: pip install opentelemetry-sdk opentelemetry-exporter-gcp-monitoring")


def setup_opentelemetry(
    service_name: str = "firewall-ai",
    service_version: str = "1.0.0",
    enable_gcp_export: bool = True
) -> bool:
    """
    Setup OpenTelemetry instrumentation
    
    Args:
        service_name: Name of the service
        service_version: Version of the service
        enable_gcp_export: Whether to export to Google Cloud
    
    Returns:
        True if setup successful, False otherwise
    """
    if not OPENTELEMETRY_AVAILABLE:
        logger.warning("OpenTelemetry not available, skipping setup")
        return False
    
    try:
        # Create resource with service information
        resource = Resource.create({
            "service.name": service_name,
            "service.version": service_version,
        })
        
        # Setup tracing
        trace_provider = TracerProvider(resource=resource)
        trace.set_tracer_provider(trace_provider)
        
        if enable_gcp_export:
            project_id = os.getenv('GCP_PROJECT') or os.getenv('GOOGLE_CLOUD_PROJECT')
            if project_id:
                try:
                    trace_exporter = CloudTraceSpanExporter(project_id=project_id)
                    trace_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
                    logger.info(f"OpenTelemetry tracing configured for GCP project: {project_id}")
                except Exception as e:
                    logger.warning(f"Failed to setup GCP trace exporter: {e}")
        
        # Setup metrics
        if enable_gcp_export:
            project_id = os.getenv('GCP_PROJECT') or os.getenv('GOOGLE_CLOUD_PROJECT')
            if project_id:
                try:
                    metric_exporter = MonitoringExporter(project_id=project_id)
                    metric_reader = PeriodicExportingMetricReader(
                        metric_exporter,
                        export_interval_millis=60000  # Export every minute
                    )
                    metrics.set_meter_provider(MeterProvider(
                        resource=resource,
                        metric_readers=[metric_reader]
                    ))
                    logger.info(f"OpenTelemetry metrics configured for GCP project: {project_id}")
                except Exception as e:
                    logger.warning(f"Failed to setup GCP metrics exporter: {e}")
        
        logger.info("OpenTelemetry setup completed")
        return True
        
    except Exception as e:
        logger.error(f"Failed to setup OpenTelemetry: {e}")
        return False


def instrument_flask_app(app) -> bool:
    """
    Instrument Flask application with OpenTelemetry
    
    Args:
        app: Flask application instance
    
    Returns:
        True if instrumentation successful, False otherwise
    """
    if not OPENTELEMETRY_AVAILABLE:
        return False
    
    try:
        FlaskInstrumentor().instrument_app(app)
        RequestsInstrumentor().instrument()
        logger.info("Flask application instrumented with OpenTelemetry")
        return True
    except Exception as e:
        logger.error(f"Failed to instrument Flask app: {e}")
        return False


def get_tracer(name: str):
    """Get an OpenTelemetry tracer"""
    if not OPENTELEMETRY_AVAILABLE:
        return None
    return trace.get_tracer(name)


def get_meter(name: str):
    """Get an OpenTelemetry meter"""
    if not OPENTELEMETRY_AVAILABLE:
        return None
    return metrics.get_meter(name)
