#!/bin/bash
# Production Environment Setup Script
# This script helps configure the production environment safely

set -e

echo "🚀 Setting up production environment for Hackathon Trading Bot"
echo "=============================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to prompt for secure input
prompt_secure() {
    local prompt="$1"
    local var_name="$2"
    echo -n -e "${BLUE}$prompt: ${NC}"
    read -s value
    echo ""
    eval "$var_name=\"$value\""
}

# Function to prompt for regular input
prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local default="$3"
    echo -n -e "${BLUE}$prompt${default:+ (default: $default)}: ${NC}"
    read value
    eval "$var_name=\"${value:-$default}\""
}

# Check if .env.production already exists
if [ -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  .env.production already exists!${NC}"
    echo -n -e "${BLUE}Do you want to overwrite it? (y/N): ${NC}"
    read overwrite
    if [ "$overwrite" != "y" ] && [ "$overwrite" != "Y" ]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

echo ""
echo -e "${GREEN}📋 Production Environment Configuration${NC}"
echo "Please provide the following information:"
echo ""

# Recall Network Configuration
echo -e "${GREEN}1. Recall Network API Keys${NC}"
echo "Get your keys from: https://register.recall.network"
prompt_secure "Production API Key" PRODUCTION_API_KEY
prompt_secure "Sandbox API Key" SANDBOX_API_KEY

echo ""

# Vincent AI Configuration  
echo -e "${GREEN}2. Vincent AI Configuration${NC}"
prompt_secure "Vincent Private Key" VINCENT_PRIVATE_KEY
prompt_input "Vincent Address" VINCENT_ADDRESS

echo ""

# Database Configuration
echo -e "${GREEN}3. Database Configuration${NC}"
echo "For production, use MongoDB Atlas (https://www.mongodb.com/atlas)"
prompt_secure "MongoDB URI" MONGODB_URI "mongodb://localhost:27017/hackathon-trading-bot"

echo ""

# External APIs
echo -e "${GREEN}4. External API Keys${NC}"
prompt_secure "CoinRanking API Key" COINRANKING_API_KEY

echo ""

# Competition Settings
echo -e "${GREEN}5. Competition Settings${NC}"
prompt_input "Initial Balance (USD)" INITIAL_BALANCE "10000"
prompt_input "Risk Per Trade (%)" RISK_PER_TRADE "5"
prompt_input "Max Drawdown (%)" MAX_DRAWDOWN "15"
prompt_input "Competition Duration (hours)" COMPETITION_DURATION "24"

echo ""

# Server Configuration
echo -e "${GREEN}6. Server Configuration${NC}"
prompt_input "Domain/URL" DOMAIN "https://your-domain.com"
prompt_input "Port" PORT "3000"

echo ""

# Create .env.production file
echo -e "${GREEN}📝 Creating .env.production file...${NC}"

cat > .env.production << EOF
# Production Environment Configuration
# Generated on $(date)
# CRITICAL: This file contains sensitive information - never commit to git!

# ========================================
# RECALL NETWORK API CONFIGURATION  
# ========================================
RECALL_NETWORK_ENVIRONMENT=production
RECALL_NETWORK_PRODUCTION_API_KEY=$PRODUCTION_API_KEY
RECALL_NETWORK_SANDBOX_API_KEY=$SANDBOX_API_KEY

# ========================================
# VINCENT AI CONFIGURATION
# ========================================
VINCENT_DELEGATEE_PRIVATE_KEY=$VINCENT_PRIVATE_KEY
VINCENT_DELEGATEE_ADDRESS=$VINCENT_ADDRESS
VINCENT_APP_VERSION=1

# ========================================
# BLOCKCHAIN CONFIGURATION
# ========================================
BASE_RPC_URL=https://mainnet.base.org/
COINRANKING_API_KEY=$COINRANKING_API_KEY

# ========================================
# DATABASE CONFIGURATION
# ========================================
MONGODB_URI=$MONGODB_URI

# ========================================
# SERVER CONFIGURATION
# ========================================
ALLOWED_AUDIENCE=$DOMAIN
CORS_ALLOWED_DOMAIN=$DOMAIN
PORT=$PORT
NODE_ENV=production
IS_DEVELOPMENT=false

# ========================================
# LOGGING & MONITORING
# ========================================
DEBUG=express:*
CONSOLA_LEVEL=3
LOG_LEVEL=info

# ========================================
# COMPETITION CONFIGURATION
# ========================================
COMPETITION_MODE=live
COMPETITION_DURATION=$COMPETITION_DURATION
INITIAL_BALANCE=$INITIAL_BALANCE
RISK_PER_TRADE=$RISK_PER_TRADE
MAX_DRAWDOWN=$MAX_DRAWDOWN
ENABLE_MONITORING=true
ENABLE_ALERTS=true

# ========================================
# SECURITY & PERFORMANCE
# ========================================
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=900000
API_TIMEOUT=30000
RETRY_ATTEMPTS=3
RETRY_DELAY=1000

# ========================================
# HEALTH CHECKS & MONITORING
# ========================================
HEALTH_CHECK_ENABLED=true
METRICS_COLLECTION_ENABLED=true
PERFORMANCE_MONITORING=true
ERROR_TRACKING=true

# ========================================
# BACKUP & RECOVERY
# ========================================
AUTO_BACKUP_ENABLED=true
BACKUP_INTERVAL=3600000
BACKUP_RETENTION_DAYS=7
EOF

# Set secure permissions
chmod 600 .env.production

echo ""
echo -e "${GREEN}✅ Production environment configured successfully!${NC}"
echo ""

# Add to .gitignore if not already there
if ! grep -q ".env.production" .gitignore 2>/dev/null; then
    echo ".env.production" >> .gitignore
    echo -e "${GREEN}✅ Added .env.production to .gitignore${NC}"
fi

echo -e "${YELLOW}🔒 Security Checklist:${NC}"
echo "  ✅ .env.production created with secure permissions (600)"  
echo "  ✅ Added to .gitignore to prevent commits"
echo "  ⚠️  Never share this file or commit it to git!"
echo "  ⚠️  Use secure methods to transfer to production server"
echo ""

echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Review the generated .env.production file"
echo "2. Test with sandbox first:"
echo "   export NODE_ENV=production && pnpm tsx src/testRecallNetworkSimple.ts"
echo "3. Deploy to your chosen cloud provider"
echo "4. Transfer .env.production securely to the server"
echo "5. Start the competition bot in production mode"
echo ""

echo -e "${GREEN}🚀 Ready for live competition!${NC}"

# Quick validation test
echo -e "${BLUE}🧪 Running quick validation test...${NC}"
if [ -f "packages/dca-backend/src/testRecallNetworkSimple.ts" ]; then
    echo "Test file found. You can run: pnpm tsx packages/dca-backend/src/testRecallNetworkSimple.ts"
else
    echo "Test file not found at expected location."
fi

echo ""
echo -e "${GREEN}🏆 Production setup complete!${NC}"