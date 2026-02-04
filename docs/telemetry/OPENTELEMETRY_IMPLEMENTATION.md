# OpenTelemetry Implementation

## Overview

The application now uses **OpenTelemetry** as the primary telemetry system, with a hybrid approach that:
- Exports metrics and traces to **Google Cloud Monitoring/Logging** (production)
- Maintains in-memory storage for **UI visualization** (development/debugging)

## Architecture

### Components

1. **OpenTelemetry SDK** (`opentelemetry-sdk`)
   - Core observability framework
   - Standard metrics, traces, and logs

2. **Google Cloud Exporters**
   - `opentelemetry-exporter-gcp-monitoring` - Exports metrics to GCP Monitoring
   - `opentelemetry-exporter-gcp-trace` - Exports traces to GCP Cloud Trace

3. **Automatic Instrumentation**
   - `opentelemetry-instrumentation-flask` - Auto-instruments Flask requests
   - `opentelemetry-instrumentation-requests` - Auto-instruments HTTP requests

4. **Hybrid Storage**
   - OpenTelemetry exports to GCP (production)
   - In-memory storage for UI visualization (last 10k events)

## What Gets Tracked

### Metrics (exported to GCP Monitoring)
- `user_actions_total` - Counter for user actions
- `system_events_total` - Counter for system events  
- `errors_total` - Counter for errors
- `performance_metrics` - Histogram for performance data

### Traces (exported to GCP Cloud Trace)
- Request flows through Flask
- User actions and errors
- Distributed tracing across services

### In-Memory Events (for UI)
- All events stored locally for visualization
- Filterable by type and time range
- Statistics and aggregations

## Configuration

### Environment Variables

- `USE_OPENTELEMETRY=true` - Enable/disable OpenTelemetry (default: true)
- `GCP_PROJECT` or `GOOGLE_CLOUD_PROJECT` - GCP project ID (required for export)

### Toggle Control

The telemetry toggle in the admin panel controls:
- OpenTelemetry export (if enabled)
- In-memory event collection (always enabled for UI)

## Benefits

1. **Standard Observability**: Industry-standard OpenTelemetry format
2. **GCP Integration**: Native integration with Google Cloud Monitoring/Logging
3. **Automatic Instrumentation**: Flask requests automatically tracked
4. **UI Visualization**: In-memory storage allows real-time log viewing
5. **Production Ready**: Exports to GCP for production monitoring
6. **Flexible**: Can export to multiple backends simultaneously

## Viewing Telemetry

### In Application UI
- Go to **System Control Center** → **Telemetry & Logs**
- View events, statistics, and performance metrics
- Filter by type and time range

### In Google Cloud Console
- **Cloud Monitoring**: View metrics and dashboards
- **Cloud Trace**: View distributed traces
- **Cloud Logging**: View structured logs

## Migration Notes

- Existing code continues to work (same API)
- OpenTelemetry is used automatically if available
- Falls back to custom collector if OpenTelemetry not installed
- No breaking changes to existing telemetry calls
