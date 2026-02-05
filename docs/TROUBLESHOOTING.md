# Troubleshooting Guide

## Missing Python Dependencies

### OpenTelemetry Packages Not Installed

**Symptom:**
```
WARNING:telemetry.opentelemetry_setup:OpenTelemetry core packages not available. 
Install with: pip install opentelemetry-sdk
```

**Cause:**
The OpenTelemetry packages are listed in `backend/requirements.txt` but haven't been installed in your virtual environment.

**Solution:**

1. **Activate your virtual environment:**
   ```bash
   source venv/bin/activate
   ```

2. **Install all requirements (recommended):**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Or install OpenTelemetry packages specifically:**
   ```bash
   pip install opentelemetry-api>=1.24.0 opentelemetry-sdk>=1.24.0 \
     opentelemetry-instrumentation-flask>=0.45b0 \
     opentelemetry-instrumentation-requests>=0.45b0 \
     opentelemetry-semantic-conventions>=0.45b0
   ```

4. **Verify installation:**
   ```bash
   python -c "import opentelemetry; print('OpenTelemetry installed successfully')"
   ```

**Note:** The application will continue to work without OpenTelemetry, but it will fall back to the custom telemetry collector. OpenTelemetry provides better observability and integration with Google Cloud Monitoring/Trace.

### Quick Fix for All Missing Dependencies

If you see multiple warnings about missing packages, install all requirements at once:

```bash
# Activate virtual environment
source venv/bin/activate

# Install all backend dependencies
cd backend
pip install -r requirements.txt

# This will install:
# - OpenTelemetry packages
# - Google Cloud libraries
# - LangChain/LangGraph
# - All other dependencies
```

## Network Connectivity Issues

If you encounter network errors when installing packages:

1. **Check internet connection**
2. **Try using a different network or VPN**
3. **Use pip cache if available:**
   ```bash
   pip install --cache-dir ~/.pip-cache -r requirements.txt
   ```

## Virtual Environment Issues

### Virtual Environment Not Found

If scripts complain about missing virtual environment:

1. **Create a new virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

### Wrong Python Version

Ensure you're using Python 3.11+:
```bash
python3 --version
```

If you need to create a venv with a specific Python version:
```bash
python3.11 -m venv venv
```

## Backend Not Starting

### Port Already in Use

If you see "Port 8080 is already in use":

1. **Find the process using the port:**
   ```bash
   lsof -i :8080
   ```

2. **Kill the process:**
   ```bash
   kill <PID>
   ```

3. **Or use a different port:**
   ```bash
   export PORT=8081
   python backend/app.py
   ```

### Missing Dependencies

If backend fails to start with import errors:

1. **Ensure virtual environment is activated**
2. **Install all requirements:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

## Frontend Issues

### Node Modules Not Found

```bash
cd frontend
npm install
```

### Build Errors

Clear Next.js cache and rebuild:
```bash
cd frontend
rm -rf .next
npm run build
```

## GCP Configuration Issues

### Missing GCP Libraries

**Symptom:**
```
WARNING:rag.persistent_storage:Google Cloud libraries not available. RAG persistence will be disabled.
```

**Cause:**
The Google Cloud libraries are listed in `backend/requirements.txt` but haven't been installed in your virtual environment.

**Solution:**

1. **Activate your virtual environment:**
   ```bash
   source venv/bin/activate
   ```

2. **Install all requirements (recommended):**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Or install GCP libraries specifically:**
   ```bash
   pip install google-cloud-storage>=2.17.0 \
     google-cloud-firestore==2.14.0 \
     google-cloud-aiplatform>=1.56.0 \
     google-cloud-secret-manager==2.17.0
   ```

4. **Verify installation:**
   ```bash
   python -c "from google.cloud import storage, firestore; print('GCP libraries installed successfully')"
   ```

**Note:** The application will work without GCP libraries, but RAG persistence will be disabled. For local development with GCP services, use the setup script:

```bash
./scripts/setup/setup-gcp-local.sh
```

### Authentication Errors

If GCP libraries are installed but you see authentication errors:

1. **Set up Application Default Credentials:**
   ```bash
   gcloud auth application-default login
   ```

2. **Or use a Service Account Key:**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
   ```

3. **Set GCP Project ID:**
   ```bash
   export GOOGLE_CLOUD_PROJECT=your-project-id
   # Or add to .env file:
   # GOOGLE_CLOUD_PROJECT=your-project-id
   ```

4. **Create required buckets (if using RAG persistence):**
   ```bash
   # Set your project ID first
   export PROJECT_ID=your-project-id
   
   # Create buckets
   gsutil mb -p $PROJECT_ID -l us-central1 gs://${PROJECT_ID}-rag-documents
   gsutil mb -p $PROJECT_ID -l us-central1 gs://${PROJECT_ID}-rag-indices
   ```

## Getting Help

- Check the [Contributing Guide](CONTRIBUTING.md) for development workflow
- Review the [Roadmap](ROADMAP.md) for planned improvements
- Open an issue on GitHub for bugs or feature requests
