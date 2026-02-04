#!/bin/bash
# Setup script to enable Google Cloud services for local development

set -e

echo "🔧 Setting up Google Cloud services for local development"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID
read -p "Enter your GCP Project ID: " PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID is required"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

echo ""
echo "📦 Installing Google Cloud libraries..."
pip install -q google-cloud-storage google-cloud-firestore google-cloud-aiplatform google-cloud-secret-manager

echo ""
echo "🔐 Setting up authentication..."
echo "Choose authentication method:"
echo "1) Use Application Default Credentials (gcloud auth application-default login)"
echo "2) Use Service Account Key File"
read -p "Enter choice (1 or 2): " AUTH_CHOICE

if [ "$AUTH_CHOICE" = "1" ]; then
    echo "Running: gcloud auth application-default login"
    gcloud auth application-default login
    echo "✅ Using Application Default Credentials"
elif [ "$AUTH_CHOICE" = "2" ]; then
    read -p "Enter path to service account key file: " KEY_FILE
    if [ ! -f "$KEY_FILE" ]; then
        echo "❌ Key file not found: $KEY_FILE"
        exit 1
    fi
    export GOOGLE_APPLICATION_CREDENTIALS="$KEY_FILE"
    echo "✅ Using service account key file: $KEY_FILE"
else
    echo "❌ Invalid choice"
    exit 1
fi

echo ""
echo "🪣 Creating Cloud Storage buckets for RAG..."
STORAGE_BUCKET="${PROJECT_ID}-rag-documents"
INDICES_BUCKET="${PROJECT_ID}-rag-indices"

# Create buckets if they don't exist
if ! gsutil ls -b gs://$STORAGE_BUCKET &> /dev/null; then
    echo "Creating bucket: $STORAGE_BUCKET"
    gsutil mb -p $PROJECT_ID -l us-central1 gs://$STORAGE_BUCKET || true
else
    echo "Bucket already exists: $STORAGE_BUCKET"
fi

if ! gsutil ls -b gs://$INDICES_BUCKET &> /dev/null; then
    echo "Creating bucket: $INDICES_BUCKET"
    gsutil mb -p $PROJECT_ID -l us-central1 gs://$INDICES_BUCKET || true
else
    echo "Bucket already exists: $INDICES_BUCKET"
fi

echo ""
echo "🔥 Setting up Firestore..."
echo "Note: Firestore will be created automatically on first use if it doesn't exist"
echo "To create Firestore database manually, run:"
echo "  gcloud firestore databases create --region=us-central1"

echo ""
echo "📝 Creating .env file with GCP configuration..."
cat > .env << EOF
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=$PROJECT_ID
GCP_PROJECT=$PROJECT_ID

# RAG Persistence
RAG_STORAGE_BUCKET=$STORAGE_BUCKET
RAG_INDICES_BUCKET=$INDICES_BUCKET

# Admin Credentials (for local development)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
EOF

if [ "$AUTH_CHOICE" = "2" ]; then
    echo "GOOGLE_APPLICATION_CREDENTIALS=$KEY_FILE" >> .env
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Environment variables have been set in .env file"
echo ""
echo "To use these settings, make sure to:"
echo "1. Source the .env file or restart your terminal"
echo "2. Or export variables manually:"
echo "   export GOOGLE_CLOUD_PROJECT=$PROJECT_ID"
echo "   export RAG_STORAGE_BUCKET=$STORAGE_BUCKET"
echo "   export RAG_INDICES_BUCKET=$INDICES_BUCKET"
if [ "$AUTH_CHOICE" = "2" ]; then
    echo "   export GOOGLE_APPLICATION_CREDENTIALS=$KEY_FILE"
fi
echo ""
echo "The application will now use:"
echo "  ✅ Vertex AI models (Gemini)"
echo "  ✅ RAG persistence (Cloud Storage + Firestore)"
echo "  ✅ OpenTelemetry GCP export (if enabled)"
