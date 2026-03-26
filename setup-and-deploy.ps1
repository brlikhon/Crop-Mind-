# CropMind - Complete Setup & Deployment (Windows PowerShell)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CropMind - Complete Setup & Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check prerequisites
Write-Host "Step 1: Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "✗ gcloud CLI not found. Please install it first." -ForegroundColor Red
    exit 1
}
Write-Host "✓ gcloud CLI installed" -ForegroundColor Green

if (!(Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "✗ pnpm not found. Please install it first." -ForegroundColor Red
    exit 1
}
Write-Host "✓ pnpm installed" -ForegroundColor Green

# Step 2: Set up Google Cloud project
Write-Host ""
Write-Host "Step 2: Google Cloud Project Setup" -ForegroundColor Yellow
Write-Host ""

$PROJECT_ID = Read-Host "Enter your Google Cloud Project ID (e.g., cropmind-apac)"
$REGION = Read-Host "Enter your preferred region (e.g., us-central1, asia-southeast1)"

$env:GOOGLE_CLOUD_PROJECT = $PROJECT_ID
$env:GOOGLE_CLOUD_LOCATION = $REGION

Write-Host ""
Write-Host "Setting active project..."
gcloud config set project $PROJECT_ID

Write-Host ""
Write-Host "Enabling required APIs..."
gcloud services enable aiplatform.googleapis.com run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com secretmanager.googleapis.com sqladmin.googleapis.com compute.googleapis.com

Write-Host "✓ APIs enabled" -ForegroundColor Green

# Step 3: Set up authentication for local development
Write-Host ""
Write-Host "Step 3: Setting up local authentication..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Running: gcloud auth application-default login"
gcloud auth application-default login

Write-Host "✓ Authentication configured" -ForegroundColor Green

# Step 4: Create .env file
Write-Host ""
Write-Host "Step 4: Creating .env file..." -ForegroundColor Yellow
Write-Host ""

$envContent = @"
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
"@

Set-Content -Path ".env" -Value $envContent

Write-Host "✓ .env file created" -ForegroundColor Green
Write-Host "Please update DATABASE_URL in .env with your actual database credentials" -ForegroundColor Yellow

# Step 5: Install dependencies
Write-Host ""
Write-Host "Step 5: Installing dependencies..." -ForegroundColor Yellow
Write-Host ""
pnpm install

Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Step 6: Re-seed database with new embeddings
Write-Host ""
Write-Host "Step 6: Re-seeding database with Vertex AI embeddings..." -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠ This will DELETE all existing crop cases and regenerate them with gemini-embedding-001" -ForegroundColor Yellow
$reseed = Read-Host "Continue? (y/n)"

if ($reseed -eq "y" -or $reseed -eq "Y") {
    Write-Host "Pushing database schema..."
    pnpm --filter @workspace/db run push
    
    Write-Host ""
    Write-Host "Seeding database (this may take 5-10 minutes)..."
    npx tsx lib/db/seed-cases.ts
    
    Write-Host "✓ Database seeded with new embeddings" -ForegroundColor Green
} else {
    Write-Host "⚠ Skipping database re-seed" -ForegroundColor Yellow
}

# Step 7: Build the application
Write-Host ""
Write-Host "Step 7: Building application..." -ForegroundColor Yellow
Write-Host ""
pnpm run build

Write-Host "✓ Application built" -ForegroundColor Green

# Step 8: Deploy to Cloud Run
Write-Host ""
Write-Host "Step 8: Deploy to Cloud Run" -ForegroundColor Yellow
Write-Host ""
Write-Host "This will deploy your API to Cloud Run" -ForegroundColor Yellow
$deploy = Read-Host "Continue with deployment? (y/n)"

if ($deploy -eq "y" -or $deploy -eq "Y") {
    Write-Host "Submitting build to Cloud Build..."
    gcloud builds submit --config cloudbuild.yaml
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "✓ DEPLOYMENT COMPLETE!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your API should now be live at:"
    Write-Host "https://cropmind-api-[HASH]-$REGION.a.run.app"
    Write-Host ""
    Write-Host "To get the exact URL, run:"
    Write-Host "gcloud run services describe cropmind-api --region=$REGION --format='value(status.url)'"
} else {
    Write-Host "⚠ Skipping deployment" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To deploy later, run:"
    Write-Host "gcloud builds submit --config cloudbuild.yaml"
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Update DATABASE_URL in .env with your Cloud SQL connection"
Write-Host "2. Test locally: pnpm --filter @workspace/api-server run dev"
Write-Host "3. Deploy frontend: Follow DEPLOYMENT.md Step 5"
Write-Host ""
