#!/bin/bash

# CropMind - Google Cloud Setup Script
# This script automates the initial Google Cloud setup for CropMind

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-cropmind-apac}"
REGION="${GOOGLE_CLOUD_LOCATION:-us-central1}"
SERVICE_ACCOUNT="cropmind-sa"
DB_INSTANCE="cropmind-db"
DB_NAME="cropmind"
DB_PASSWORD=""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CropMind - Google Cloud Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

print_status "gcloud CLI found"

# Prompt for project ID
echo ""
read -p "Enter Google Cloud Project ID [$PROJECT_ID]: " input_project
PROJECT_ID="${input_project:-$PROJECT_ID}"

# Prompt for region
echo ""
read -p "Enter region [$REGION]: " input_region
REGION="${input_region:-$REGION}"

# Prompt for database password
echo ""
read -sp "Enter database password (will be stored in Secret Manager): " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    print_error "Database password cannot be empty"
    exit 1
fi

echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Service Account: $SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com"
echo "  Database Instance: $DB_INSTANCE"
echo ""
read -p "Continue with this configuration? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Setup cancelled"
    exit 0
fi

# Step 1: Set active project
echo ""
echo "Step 1: Setting active project..."
gcloud config set project $PROJECT_ID
print_status "Active project set to $PROJECT_ID"

# Step 2: Enable APIs
echo ""
echo "Step 2: Enabling required APIs (this may take a few minutes)..."
gcloud services enable \
  aiplatform.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  compute.googleapis.com \
  --quiet

print_status "All required APIs enabled"

# Step 3: Create service account
echo ""
echo "Step 3: Creating service account..."

if gcloud iam service-accounts describe $SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com &> /dev/null; then
    print_warning "Service account already exists, skipping creation"
else
    gcloud iam service-accounts create $SERVICE_ACCOUNT \
      --display-name="CropMind Service Account" \
      --description="Service account for CropMind application"
    print_status "Service account created"
fi

# Step 4: Grant IAM roles
echo ""
echo "Step 4: Granting IAM roles..."

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user" \
  --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client" \
  --quiet

print_status "IAM roles granted"

# Step 5: Download service account key
echo ""
echo "Step 5: Downloading service account key..."

KEY_FILE="./cropmind-sa-key.json"
if [ -f "$KEY_FILE" ]; then
    print_warning "Service account key already exists at $KEY_FILE"
    read -p "Overwrite? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Skipping key download"
    else
        gcloud iam service-accounts keys create $KEY_FILE \
          --iam-account=$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com
        print_status "Service account key downloaded to $KEY_FILE"
    fi
else
    gcloud iam service-accounts keys create $KEY_FILE \
      --iam-account=$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com
    print_status "Service account key downloaded to $KEY_FILE"
fi

# Step 6: Create Cloud SQL instance
echo ""
echo "Step 6: Creating Cloud SQL instance (this will take 5-10 minutes)..."

if gcloud sql instances describe $DB_INSTANCE &> /dev/null; then
    print_warning "Cloud SQL instance already exists, skipping creation"
else
    gcloud sql instances create $DB_INSTANCE \
      --database-version=POSTGRES_15 \
      --tier=db-f1-micro \
      --region=$REGION \
      --root-password=$DB_PASSWORD \
      --database-flags=cloudsql.enable_pgvector=on \
      --quiet

    print_status "Cloud SQL instance created"
fi

# Step 7: Create database
echo ""
echo "Step 7: Creating database..."

if gcloud sql databases describe $DB_NAME --instance=$DB_INSTANCE &> /dev/null; then
    print_warning "Database already exists, skipping creation"
else
    gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE
    print_status "Database created"
fi

# Step 8: Get connection name
echo ""
echo "Step 8: Getting Cloud SQL connection name..."
CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE --format='value(connectionName)')
print_status "Connection name: $CONNECTION_NAME"

# Step 9: Store database URL in Secret Manager
echo ""
echo "Step 9: Storing database URL in Secret Manager..."

DATABASE_URL="postgresql://postgres:$DB_PASSWORD@/cropmind?host=/cloudsql/$CONNECTION_NAME"

if gcloud secrets describe cropmind-database-url &> /dev/null; then
    print_warning "Secret already exists, updating..."
    echo -n "$DATABASE_URL" | gcloud secrets versions add cropmind-database-url --data-file=-
else
    echo -n "$DATABASE_URL" | gcloud secrets create cropmind-database-url --data-file=-
fi

# Grant access to service account
gcloud secrets add-iam-policy-binding cropmind-database-url \
  --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet

print_status "Database URL stored in Secret Manager"

# Step 10: Create .env file
echo ""
echo "Step 10: Creating .env file for local development..."

cat > .env << EOF
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=$PROJECT_ID
GOOGLE_CLOUD_LOCATION=$REGION
GOOGLE_APPLICATION_CREDENTIALS=./cropmind-sa-key.json

# Database Configuration (for local development with Cloud SQL Proxy)
DATABASE_URL=postgresql://postgres:$DB_PASSWORD@localhost:5432/$DB_NAME

# Embedding Configuration
EMBEDDING_STRICT_AI=false

# Server Configuration
PORT=8080
NODE_ENV=development
EOF

print_status ".env file created"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Initialize database schema:"
echo "   ${YELLOW}./scripts/init-database.sh${NC}"
echo ""
echo "2. Test locally:"
echo "   ${YELLOW}pnpm --filter @workspace/api-server run dev${NC}"
echo ""
echo "3. Deploy to Cloud Run:"
echo "   ${YELLOW}gcloud builds submit --config cloudbuild.yaml${NC}"
echo ""
echo "Important files created:"
echo "  • cropmind-sa-key.json (DO NOT COMMIT)"
echo "  • .env (DO NOT COMMIT)"
echo ""
echo "Cloud Resources:"
echo "  • Project: $PROJECT_ID"
echo "  • Service Account: $SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com"
echo "  • Cloud SQL: $CONNECTION_NAME"
echo "  • Secret: cropmind-database-url"
echo ""
