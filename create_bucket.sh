# Set your project ID
export PROJECT_ID="rtrentin-01"  # Replace with your actual project ID
export REGION="us-east1"

# Create the state bucket
gsutil mb -p $PROJECT_ID -l $REGION gs://${PROJECT_ID}-tfstate

# Enable versioning (important for state safety)
gsutil versioning set on gs://${PROJECT_ID}-tfstate

# Verify bucket exists
gsutil ls gs://${PROJECT_ID}-tfstate

echo "✅ State bucket created: gs://${PROJECT_ID}-tfstate"
