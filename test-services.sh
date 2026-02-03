#!/bin/bash
# Service Connectivity Test Script

set -e

BACKEND_URL="${1:-https://firewall-ai-backend-mwb6av3rma-ue.a.run.app}"
FRONTEND_URL="${2:-https://firewall-ai-frontend-mwb6av3rma-ue.a.run.app}"

echo "🔍 Testing Firewall AI Services"
echo "================================"
echo ""

# Test Backend Health
echo "1️⃣  Testing Backend Basic Health..."
HEALTH=$(curl -s "$BACKEND_URL/api/v1/health")
echo "$HEALTH" | jq '.'
BACKEND_STATUS=$(echo "$HEALTH" | jq -r '.status')

if [ "$BACKEND_STATUS" = "healthy" ] || [ "$BACKEND_STATUS" = "degraded" ]; then
    echo "✅ Backend is responding"
else
    echo "❌ Backend health check failed"
    exit 1
fi
echo ""

# Test GCP Services Connectivity
echo "2️⃣  Testing GCP Services Connectivity..."
SERVICES=$(curl -s "$BACKEND_URL/api/v1/health/services")
echo "$SERVICES" | jq '.'

# Check each service
FIRESTORE_STATUS=$(echo "$SERVICES" | jq -r '.services.firestore.status')
STORAGE_STATUS=$(echo "$SERVICES" | jq -r '.services.storage.status')
SECRET_STATUS=$(echo "$SERVICES" | jq -r '.services.secret_manager.status')
VERTEX_STATUS=$(echo "$SERVICES" | jq -r '.services.vertex_ai.status')

echo ""
echo "Service Status:"
echo "  Firestore:      $FIRESTORE_STATUS"
echo "  Storage:        $STORAGE_STATUS"
echo "  Secret Manager: $SECRET_STATUS"
echo "  Vertex AI:      $VERTEX_STATUS"
echo ""

# Test Frontend
echo "3️⃣  Testing Frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend is responding (HTTP $FRONTEND_STATUS)"
else
    echo "❌ Frontend returned HTTP $FRONTEND_STATUS"
fi
echo ""

# Test Frontend -> Backend connectivity
echo "4️⃣  Testing Frontend -> Backend connectivity..."
echo "   (Check browser console at $FRONTEND_URL)"
echo ""

# Summary
echo "📊 Summary"
echo "=========="
if [ "$BACKEND_STATUS" = "healthy" ] && [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ All core services operational"
    
    if [ "$FIRESTORE_STATUS" = "connected" ] && [ "$STORAGE_STATUS" = "connected" ]; then
        echo "✅ All GCP services connected"
        exit 0
    else
        echo "⚠️  Some GCP services have issues (check logs above)"
        exit 0
    fi
else
    echo "❌ Core services have issues"
    exit 1
fi
