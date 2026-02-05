FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
COPY requirements-opentelemetry.txt .

# Install Python dependencies (core packages)
RUN pip install --no-cache-dir -r requirements.txt

# Install OpenTelemetry GCP exporters (pre-release packages)
# These are installed but controlled by admin console toggle at runtime
RUN pip install --no-cache-dir --pre -r requirements-opentelemetry.txt || \
    echo "Warning: OpenTelemetry GCP exporters installation failed. App will use custom collector."

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Expose port
EXPOSE 8080

# Run the application
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app
