# CropMind - Google Cloud Deployment Guide

This guide walks you through deploying CropMind to Google Cloud Platform using Vertex AI and Cloud Run.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and configured
3. **Docker** installed locally (for testing)
4. **Node.js 24+** and pnpm installed

## Step 1: Google Cloud Project Setup

### 1.1 Create a New Project

```bash
# Set your project ID
export PROJECT_ID="cropmind-apac"
export REGION="us-central1"

# Create the project
gcloud projects create $PROJECT_ID --name="CropMind APAC"

# Set as active project
gcloud config set project $PROJECT_ID

# Link billing account (replace BILLING_ACCOUNT_ID with your actual billing account)
gcloud billing projects link $PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

### 1.2 Enable Required APIs

```bash
# Enable all required Google Cloud APIs
gcloud services enable \
  aiplatform.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  compute.googleapis.com
```

### 1.3 Create Service Account

```bash
# Create service account for the application
gcloud iam service-accounts create cropmind-sa \
  --display-name="CropMind Service Account" \
  --description="Service account for CropMind application"

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:cropmind-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:cropmind-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Download service account key (for local development)
gcloud iam service-accounts keys create ./cropmind-sa-key.json \
  --iam-account=cropmind-sa@$PROJECT_ID.iam.gserviceaccount.com

# IMPORTANT: Add this file to .gitignore and never commit it
echo "cropmind-sa-key.json" >> .gitignore
```

## Step 2: Database Setup (Cloud SQL PostgreSQL)

### 2.1 Create Cloud SQL Instance

```bash
# Create PostgreSQL instance with pgvector support
gcloud sql instances create cropmind-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password=CHANGE_THIS_PASSWORD \
  --database-flags=cloudsql.enable_pgvector=on

# Create database
gcloud sql databases create cropmind \
  --instance=cropmind-db

# Get connection name
gcloud sql instances describe cropmind-db --format='value(connectionName)'
```

### 2.2 Store Database URL in Secret Manager

```bash
# Create the database URL secret
# Format: postgresql://postgres:PASSWORD@/cropmind?host=/cloudsql/CONNECTION_NAME
echo -n "postgresql://postgres:YOUR_PASSWORD@/cropmind?host=/cloudsql/$PROJECT_ID:$REGION:cropmind-db" | \
  gcloud secrets create cropmind-database-url --data-file=-

# Grant Cloud Run service account access to the secret
gcloud secrets add-iam-policy-binding cropmind-database-url \
  --member="serviceAccount:cropmind-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 2.3 Initialize Database Schema

```bash
# Connect to Cloud SQL instance
gcloud sql connect cropmind-db --user=postgres --database=cropmind

# In the PostgreSQL shell, enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

# Exit the shell
\q

# Run migrations from local machine (with Cloud SQL Proxy)
# First, download Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# Start proxy in background
./cloud-sql-proxy $PROJECT_ID:$REGION:cropmind-db &

# Set local DATABASE_URL
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/cropmind"

# Run migrations
pnpm --filter @workspace/db run push

# Seed data
npx tsx lib/db/seed-mcp.ts
npx tsx lib/db/seed-cases.ts

# Stop proxy
killall cloud-sql-proxy
```

## Step 3: Local Testing with Vertex AI

### 3.1 Set Up Local Environment

```bash
# Set environment variables
export GOOGLE_CLOUD_PROJECT=$PROJECT_ID
export GOOGLE_CLOUD_LOCATION=$REGION
export GOOGLE_APPLICATION_CREDENTIALS="./cropmind-sa-key.json"
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/cropmind"

# Start Cloud SQL Proxy for local database access
./cloud-sql-proxy $PROJECT_ID:$REGION:cropmind-db &

# Install dependencies
pnpm install

# Run API server locally
pnpm --filter @workspace/api-server run dev
```

### 3.2 Test Vertex AI Integration

```bash
# Test health check
curl http://localhost:8080/api/healthz

# Test diagnosis endpoint
curl -X POST http://localhost:8080/api/cropagent/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "query": "My rice plants in Punjab have brown spots on leaves and yellowing. Planted 6 weeks ago."
  }'
```

## Step 4: Deploy to Cloud Run

### 4.1 Build and Deploy Using Cloud Build

```bash
# Submit build to Cloud Build
gcloud builds submit --config cloudbuild.yaml

# This will:
# 1. Build Docker image
# 2. Push to Container Registry
# 3. Deploy to Cloud Run
# 4. Configure environment variables and secrets
```

### 4.2 Get Cloud Run URL

```bash
# Get the deployed service URL
export API_URL=$(gcloud run services describe cropmind-api \
  --region=$REGION \
  --format='value(status.url)')

echo "API deployed at: $API_URL"
```

### 4.3 Test Deployed API

```bash
# Test health check
curl $API_URL/api/healthz

# Test diagnosis
curl -X POST $API_URL/api/cropagent/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "query": "My tomato plants in Maharashtra have wilting leaves and brown stems"
  }'
```

## Step 5: Deploy Frontend to Cloud Run

### 5.1 Create Frontend Dockerfile

```bash
# Create Dockerfile for frontend
cat > artifacts/cropmind/Dockerfile << 'EOF'
FROM node:24-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/cropmind run build

FROM nginx:alpine AS runner
COPY --from=builder /app/artifacts/cropmind/dist /usr/share/nginx/html
COPY artifacts/cropmind/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
EOF
```

### 5.2 Create Nginx Configuration

```bash
# Create nginx config
cat > artifacts/cropmind/nginx.conf << EOF
server {
    listen 8080;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass $API_URL;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
```

### 5.3 Deploy Frontend

```bash
# Build and deploy frontend
gcloud run deploy cropmind-frontend \
  --source ./artifacts/cropmind \
  --region=$REGION \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1

# Get frontend URL
export FRONTEND_URL=$(gcloud run services describe cropmind-frontend \
  --region=$REGION \
  --format='value(status.url)')

echo "Frontend deployed at: $FRONTEND_URL"
```

## Step 6: Verification

### 6.1 Check All Services

```bash
# List all Cloud Run services
gcloud run services list --region=$REGION

# Check API logs
gcloud run services logs read cropmind-api --region=$REGION --limit=50

# Check frontend logs
gcloud run services logs read cropmind-frontend --region=$REGION --limit=50
```

### 6.2 Test End-to-End

1. Open frontend URL in browser: `echo $FRONTEND_URL`
2. Submit a test query
3. Verify agent traces appear
4. Check that results are displayed

## Step 7: Monitoring and Optimization

### 7.1 Set Up Monitoring

```bash
# Enable Cloud Monitoring
gcloud services enable monitoring.googleapis.com

# Create uptime check
gcloud monitoring uptime-checks create cropmind-api-health \
  --resource-type=uptime-url \
  --host=$API_URL \
  --path=/api/healthz
```

### 7.2 Configure Alerts

```bash
# Create alert policy for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="CropMind High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s
```

## Cost Optimization

### Expected Monthly Costs (Low Traffic)

- **Cloud Run API**: ~$5-10 (2M requests free tier)
- **Cloud Run Frontend**: ~$0-5 (mostly static)
- **Cloud SQL**: ~$10-15 (db-f1-micro)
- **Vertex AI**: ~$5-20 (depends on usage)
- **Total**: ~$20-50/month for hackathon testing

### Free Tier Coverage

- Cloud Run: 2M requests/month free
- Vertex AI: $300 free credit for new accounts
- Cloud SQL: No free tier, but db-f1-micro is cheapest

## Troubleshooting

### Issue: "Permission denied" errors

```bash
# Ensure service account has correct roles
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:cropmind-sa@$PROJECT_ID.iam.gserviceaccount.com"
```

### Issue: Database connection fails

```bash
# Check Cloud SQL instance status
gcloud sql instances describe cropmind-db

# Test connection
gcloud sql connect cropmind-db --user=postgres
```

### Issue: Vertex AI quota exceeded

```bash
# Check quotas
gcloud compute project-info describe --project=$PROJECT_ID

# Request quota increase if needed
# Go to: https://console.cloud.google.com/iam-admin/quotas
```

## Cleanup (After Hackathon)

```bash
# Delete Cloud Run services
gcloud run services delete cropmind-api --region=$REGION --quiet
gcloud run services delete cropmind-frontend --region=$REGION --quiet

# Delete Cloud SQL instance
gcloud sql instances delete cropmind-db --quiet

# Delete secrets
gcloud secrets delete cropmind-database-url --quiet

# Delete service account
gcloud iam service-accounts delete cropmind-sa@$PROJECT_ID.iam.gserviceaccount.com --quiet

# Delete project (if you want to remove everything)
gcloud projects delete $PROJECT_ID --quiet
```

## Submission Checklist

- [ ] API deployed to Cloud Run with public URL
- [ ] Frontend deployed to Cloud Run with public URL
- [ ] Vertex AI Gemini models working (not OpenAI)
- [ ] Vertex AI embeddings working
- [ ] Database seeded with test data
- [ ] Health check endpoint returns 200
- [ ] Test diagnosis query works end-to-end
- [ ] Logs show Vertex AI calls (not OpenAI)
- [ ] README updated with Cloud Run URLs
- [ ] Video demo recorded showing live deployment

## Support

For issues during deployment:
1. Check Cloud Run logs: `gcloud run services logs read cropmind-api --region=$REGION`
2. Check Cloud Build history: `gcloud builds list --limit=5`
3. Verify Vertex AI quota: https://console.cloud.google.com/iam-admin/quotas
