#!/bin/bash
set -e

echo "=========================================="
echo "CropMind - Complete Setup & Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo "Step 1: Checking prerequisites..."
echo ""

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}✗ gcloud CLI not found. Please install it first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ gcloud CLI installed${NC}"

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}✗ pnpm not found. Please install it first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ pnpm installed${NC}"

# Step 2: Set up Google Cloud project
echo ""
echo "Step 2: Google Cloud Project Setup"
echo ""

read -p "Enter your Google Cloud Project ID (e.g., cropmind-apac): " PROJECT_ID
read -p "Enter your preferred region (e.g., us-central1, asia-southeast1): " REGION

export GOOGLE_CLOUD_PROJECT=$PROJECT_ID
export GOOGLE_CLOUD_LOCATION=$REGION

echo ""
echo "Setting active project..."
gcloud config set project $PROJECT_ID

echo ""
echo "Enabling required APIs..."
gcloud services enable \
  aiplatform.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  compute.googleapis.com

echo -e "${GREEN}✓ APIs enabled${NC}"

# Step 3: Set up authentication for local development
echo ""
echo "Step 3: Setting up local authentication..."
echo ""
echo "Running: gcloud auth application-default login"
gcloud auth application-default login

echo -e "${GREEN}✓ Authentication configured${NC}"

# Step 4: Create .env file
echo ""
echo "Step 4: Creating .env file..."
echo ""

cat > .env << EOF
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=$PROJECT_ID
GOOGLE_CLOUD_LOCATION=$REGION

# Database Configuration (update with your Cloud SQL details)
DATABASE_URL=postgresql://user:password@localhost:5432/cropmind

# Embedding Configuration
EMBEDDING_STRICT_AI=false

# Server Configuration
PORT=8080
NODE_ENV=development
EOF

echo -e "${GREEN}✓ .env file created${NC}"
echo "Please update DATABASE_URL in .env with your actual database credentials"

# Step 5: Install dependencies
echo ""
echo "Step 5: Installing dependencies..."
echo ""
pnpm install

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 6: Re-seed database with new embeddings
echo ""
echo "Step 6: Re-seeding database with Vertex AI embeddings..."
echo ""
echo -e "${YELLOW}⚠ This will DELETE all existing crop cases and regenerate them with gemini-embedding-001${NC}"
read -p "Continue? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Pushing database schema..."
    pnpm --filter @workspace/db run push
    
    echo ""
    echo "Seeding database (this may take 5-10 minutes)..."
    npx tsx lib/db/seed-cases.ts
    
    echo -e "${GREEN}✓ Database seeded with new embeddings${NC}"
else
    echo -e "${YELLOW}⚠ Skipping database re-seed${NC}"
fi

# Step 7: Build the application
echo ""
echo "Step 7: Building application..."
echo ""
pnpm run build

echo -e "${GREEN}✓ Application built${NC}"

# Step 8: Deploy to Cloud Run
echo ""
echo "Step 8: Deploy to Cloud Run"
echo ""
echo -e "${YELLOW}This will deploy your API to Cloud Run${NC}"
read -p "Continue with deployment? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Submitting build to Cloud Build..."
    gcloud builds submit --config cloudbuild.yaml
    
    echo ""
    echo -e "${GREEN}=========================================="
    echo "✓ DEPLOYMENT COMPLETE!"
    echo "==========================================${NC}"
    echo ""
    echo "Your API should now be live at:"
    echo "https://cropmind-api-[HASH]-$REGION.a.run.app"
    echo ""
    echo "To get the exact URL, run:"
    echo "gcloud run services describe cropmind-api --region=$REGION --format='value(status.url)'"
else
    echo -e "${YELLOW}⚠ Skipping deployment${NC}"
    echo ""
    echo "To deploy later, run:"
    echo "gcloud builds submit --config cloudbuild.yaml"
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update DATABASE_URL in .env with your Cloud SQL connection"
echo "2. Test locally: pnpm --filter @workspace/api-server run dev"
echo "3. Deploy frontend: Follow DEPLOYMENT.md Step 5"
echo ""
