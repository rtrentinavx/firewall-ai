# Scripts Directory

This directory contains utility scripts organized by purpose.

## 📁 Directory Structure

### 🔧 Setup Scripts (`setup/`)
Scripts for initial setup and configuration:

- **`setup-gcp-local.sh`** - Sets up Google Cloud services for local development
  - Installs GCP libraries
  - Configures authentication
  - Creates Cloud Storage buckets for RAG
  - Generates `.env` file

- **`create_bucket.sh`** - Creates Terraform state bucket in GCP
  - Creates a versioned bucket for Terraform state storage
  - Usage: Update PROJECT_ID and REGION variables, then run

- **`install-dev-tools.sh`** - Installs development tools and dependencies
  - Sets up Python virtual environment
  - Installs backend dependencies
  - Installs frontend dependencies

### 🚀 Development Scripts (`development/`)
Scripts for running the application in development mode:

- **`start-dev.sh`** - Full-featured development startup script (Linux/macOS)
  - Checks port availability
  - Validates dependencies
  - Starts backend and frontend with health checks
  - Provides service URLs and cleanup instructions

- **`start-dev.bat`** - Development startup script for Windows
  - Starts backend and frontend in separate windows
  - Usage: Run from repository root

- **`start-simple.sh`** - Simplified development startup script (Linux/macOS)
  - Quick start without extensive checks
  - Starts backend and frontend concurrently

### 🧪 Testing Scripts (`testing/`)
Scripts for testing and validation:

- **`test-services.sh`** - Tests connectivity to deployed services
  - Tests backend health endpoint
  - Tests frontend availability
  - Validates API endpoints
  - Usage: `./scripts/testing/test-services.sh [BACKEND_URL] [FRONTEND_URL]`

## 📝 Usage Examples

### Setup for Local Development
```bash
# Install development tools
./scripts/setup/install-dev-tools.sh

# Setup GCP services (optional)
./scripts/setup/setup-gcp-local.sh
```

### Start Development Environment
```bash
# Full-featured startup (recommended)
./scripts/development/start-dev.sh

# Simple startup
./scripts/development/start-simple.sh
```

### Test Services
```bash
# Test default Cloud Run URLs
./scripts/testing/test-services.sh

# Test custom URLs
./scripts/testing/test-services.sh https://backend.example.com https://frontend.example.com
```

## 🔍 Notes

- All scripts assume they are run from the repository root
- Scripts automatically detect their location and navigate to the repo root
- Make sure scripts are executable: `chmod +x scripts/**/*.sh`
- Windows batch files should be run from the repository root directory
