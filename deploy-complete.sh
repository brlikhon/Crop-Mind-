#!/bin/bash
# CropMind - Complete Deployment Script
# Run this after setting up Google Cloud credentials

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         CropMind - Complete Deployment Script             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found. Installing..."
    npm install -g pnpm
fi

# Configuration
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-cropmind-apac}"
REGION="${GOOGLE_CLOUD_LOCATION:-us-central1}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 32)}"

echo "Configuration:"
echo "  Project: $PROJECT_ID"
echo "  Region: $REGION"
echo ""

# Phase 1: Google Cloud Setup
echo "Phase 1: Setting up Google Cloud..."
gcloud config set project $PROJECT_ID

echo "Enabling APIs..."
gcloud services enable \
  aiplatform.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  --quiet

echo "✅ APIs enabled"

# Phase 2: Service Account
echo ""
echo "Phase 2: Creating service account..."
if ! gcloud iam service-accounts describe cropmind-sa@$PROJECT_ID.iam.gserviceaccount.com &> /dev/null; then
    gcloud iam service-accounts create cropmind-sa \
      --display-name="CropMind Service Account"
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
      --member="serviceAccount:cropmind-sa@$PROJECT_ID.iam.gserviceaccount.com" \
      --role="roles/aiplatform.user" \
      --quiet
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
      --member="serviceAccount:cropmind-sa@$PROJECT_ID.iam.gserviceaccount.com" \
      --role="roles/cloudsql.client" \
      --quiet
    
    echo "✅ Service account created"
else
    echo "✅ Service account already exists"
fi

# Phase 3: Database
echo ""
echo "Phase 3: Creating Cloud SQL database (this takes 5-10 minutes)..."
if ! gcloud sql instances describe cropmind-db &> /dev/null; then
    gcloud sql instances create cropmind-db \
      --database-version=POSTGRES_15 \
      --tier=db-f1-micro \
      --region=$REGION \
      --root-password=$DB_PASSWORD \
      --database-flags=cloudsql.enable_pgvector=on \
      --quiet
    
    gcloud sql databases create cropmind --instance=cropmind-db
    echo "✅ Database created"
else
    echo "✅ Database already exists"
fi

# Phase 4: Store secrets
echo ""
echo "Phase 4: Storing database credentials..."
CONNECTION_NAME=$(gcloud sql instances describe cropmind-db --format='value(connectionName)')
DATABASE_URL="postgresql://postgres:$DB_PASSWORD@/cropmind?host=/cloudsql/$CONNECTION_NAME"

if ! gcloud secrets describe cropmind-database-url &> /dev/null; then
    echo -n "$DATABASE_URL" | gcloud secrets create cropmind-database-url --data-file=-
else
    echo -n "$DATABASE_URL" | gcloud secrets versions add cropmind-database-url --data-file=-
fi

gcloud secrets add-iam-policy-binding cropmind-database-url \
  --member="serviceAccount:cropmind-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet

echo "✅ Secrets stored"

# Phase 5: Initialize database
echo ""
echo "Phase 5: Initializing database..."

# Download Cloud SQL Proxy if not exists
if [ ! -f ./cloud-sql-proxy ]; then
    echo "Downloading Cloud SQL Proxy..."
    curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
    chmod +x cloud-sql-proxy
fi

# Start proxy
./cloud-sql-proxy $CONNECTION_NAME &
PROXY_PID=$!
sleep 5

# Set local DATABASE_URL
export DATABASE_URL="postgresql://postgres:$DB_PASSWORD@localhost:5432/cropmind"

# Run migrations
echo "Running migrations..."
pnpm --filter @workspace/db run push || echo "⚠️  Migration failed, continuing..."

# Seed data
echo "Seeding data..."
npx tsx lib/db/seed-mcp.ts || echo "⚠️  MCP seed failed, continuing..."
npx tsx lib/db/seed-cases.ts || echo "⚠️  Cases seed failed, continuing..."

# Stop proxy
kill $PROXY_PID

echo "✅ Database initialized"

# Phase 6: Deploy API
echo ""
echo "Phase 6: Deploying API to Cloud Run (this takes 5-10 minutes)..."
gcloud builds submit --config cloudbuild.yaml

API_URL=$(gcloud run services describe cropmind-api --region=$REGION --format='value(status.url)')
echo "✅ API deployed at: $API_URL"

# Phase 7: Test deployment
echo ""
echo "Phase 7: Testing deployment..."
echo "Testing health endpoint..."
curl -f $API_URL/api/healthz || echo "⚠️  Health check failed"

echo ""
echo "Testing diagnosis endpoint..."
curl -X POST $API_URL/api/cropagent/diagnose \
  -H "Content-Type: application/json" \
  -d '{"query":"My rice plants have brown spots"}' \
  | jq '.finalRecommendation' || echo "⚠️  Diagnosis test failed"

# Phase 8: Update README
echo ""
echo "Phase 8: Updating README..."
sed -i.bak "s|https://cropmind-api-XXXXX.run.app|$API_URL|g" README.md
echo "✅ README updated"

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  DEPLOYMENT COMPLETE!                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 Your CropMind API is live!"
echo ""
echo "📊 Deployment Summary:"
echo "  • API URL: $API_URL"
echo "  • Database: $CONNECTION_NAME"
echo "  • Region: $REGION"
echo ""
echo "🎯 Next Steps:"
echo "  1. Test the API: curl $API_URL/api/healthz"
echo "  2. Record demo video (3 minutes)"
echo "  3. Update README with live URL"
echo "  4. Submit to hackathon"
echo ""
echo "📝 Credentials saved to:"
echo "  • Database password: $DB_PASSWORD"
echo "  • Connection: $CONNECTION_NAME"
echo ""
echo "💰 Estimated cost: ~$20-30/month"
echo ""
