# Telemetry Migration to OpenTelemetry

## Current State

We have a custom-built telemetry system that:
- Stores events in-memory
- Tracks user actions, system events, errors, and performance metrics
- Has a simple enable/disable toggle

## Why OpenTelemetry?

OpenTelemetry provides:
1. **Standardization**: Industry-standard observability framework
2. **Vendor-neutral**: Works with multiple backends (GCP, AWS, Azure, Prometheus, etc.)
3. **Production-ready**: Battle-tested in production environments
4. **Rich features**: Metrics, traces, and logs in one framework
5. **Google Cloud Integration**: Native support for Google Cloud Monitoring/Logging
6. **Better tooling**: Rich ecosystem of exporters and tools

## Proposed Architecture

### Components

1. **OpenTelemetry SDK** (`opentelemetry-sdk`)
   - Core SDK for instrumentation

2. **OpenTelemetry Instrumentation** (`opentelemetry-instrumentation-flask`)
   - Automatic Flask instrumentation
   - HTTP request/response tracking

3. **Google Cloud Exporter** (`opentelemetry-exporter-gcp-monitoring`)
   - Export metrics to Google Cloud Monitoring
   - Export logs to Google Cloud Logging

4. **Custom Metrics & Spans**
   - Custom metrics for application-specific events
   - Custom spans for important operations

### Integration Points

- **Metrics**: Track performance, usage, errors
- **Traces**: Track request flows through the application
- **Logs**: Structured logging with correlation IDs

## Migration Plan

1. Install OpenTelemetry packages
2. Initialize OpenTelemetry in `app.py`
3. Replace custom telemetry calls with OpenTelemetry
4. Configure Google Cloud exporters
5. Update frontend to use OpenTelemetry data
6. Keep toggle for enabling/disabling telemetry

## Benefits

- Standard observability format
- Better integration with GCP monitoring
- Automatic instrumentation for Flask
- Rich querying and visualization in GCP Console
- Can export to multiple backends simultaneously
