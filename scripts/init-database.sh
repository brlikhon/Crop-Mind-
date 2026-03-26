#!/bin/bash

# CropMind - Database Initialization Script
# Initializes the database schema and seeds data

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CropMind - Database Initialization${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Run setup-google-cloud.sh first"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if Cloud SQL Proxy is running
if ! pgrep -f "cloud-sql-proxy" > /dev/null; then
    print_warning "Cloud SQL Proxy not running. Starting it now..."
    
    # Download Cloud SQL Proxy if not exists
    if [ ! -f ./cloud-sql-proxy ]; then
        echo "Downloading Cloud SQL Proxy..."
        curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
        chmod +x cloud-sql-proxy
    fi
    
    # Get connection name
    CONNECTION_NAME=$(gcloud sql instances describe cropmind-db --format='value(connectionName)')
    
    # Start proxy in background
    ./cloud-sql-proxy $CONNECTION_NAME &
    PROXY_PID=$!
    
    echo "Waiting for proxy to start..."
    sleep 5
    
    print_status "Cloud SQL Proxy started (PID: $PROXY_PID)"
else
    print_status "Cloud SQL Proxy already running"
fi

# Step 1: Enable pgvector extension
echo ""
echo "Step 1: Enabling pgvector extension..."

PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p') \
psql -h localhost -U postgres -d cropmind -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || {
    print_warning "Could not enable pgvector via psql. Trying via gcloud..."
    gcloud sql connect cropmind-db --user=postgres --database=cropmind << EOF
CREATE EXTENSION IF NOT EXISTS vector;
\q
EOF
}

print_status "pgvector extension enabled"

# Step 2: Push schema
echo ""
echo "Step 2: Pushing database schema..."
pnpm --filter @workspace/db run push
print_status "Database schema pushed"

# Step 3: Seed MCP data
echo ""
echo "Step 3: Seeding MCP data (crop alerts, market prices, subsidies)..."
npx tsx lib/db/seed-mcp.ts
print_status "MCP data seeded"

# Step 4: Seed vector cases
echo ""
echo "Step 4: Seeding vector cases (550 historical cases)..."
npx tsx lib/db/seed-cases.ts
print_status "Vector cases seeded"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Database Initialization Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Database is ready with:"
echo "  • pgvector extension enabled"
echo "  • Schema tables created"
echo "  • 12 crop alerts seeded"
echo "  • 20 market prices seeded"
echo "  • 12 subsidy programs seeded"
echo "  • 550 vector cases seeded"
echo ""
echo "You can now start the API server:"
echo "  ${YELLOW}pnpm --filter @workspace/api-server run dev${NC}"
echo ""
