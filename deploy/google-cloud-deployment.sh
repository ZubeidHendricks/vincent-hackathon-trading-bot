#!/bin/bash
# Google Cloud Platform Deployment Script for Hackathon Trading Bot
set -e

echo "🚀 Starting Google Cloud deployment..."

# Configuration
PROJECT_ID="hackathon-trading-bot-$(date +%s)"
INSTANCE_NAME="hackathon-trading-bot-prod"
ZONE="us-central1-a"
MACHINE_TYPE="e2-standard-2"  # 2 vCPU, 8GB RAM
IMAGE_FAMILY="ubuntu-2204-lts"
IMAGE_PROJECT="ubuntu-os-cloud"

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install Google Cloud SDK."
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Create project if it doesn't exist
echo "📋 Setting up Google Cloud project..."
gcloud projects create "$PROJECT_ID" --name="Hackathon Trading Bot" 2>/dev/null || {
    echo "Project might already exist, continuing..."
}

# Set project
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable compute.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com

# Create firewall rule for HTTP traffic
echo "🔥 Setting up firewall rules..."
gcloud compute firewall-rules create hackathon-trading-bot-http \
    --allow tcp:3000 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HTTP traffic for hackathon trading bot" 2>/dev/null || {
    echo "Firewall rule might already exist, continuing..."
}

# Startup script for the VM
STARTUP_SCRIPT=$(cat << 'EOF'
#!/bin/bash
# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker $USER

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Enable pnpm
corepack enable

# Install git
apt-get install -y git curl

# Create app directory
mkdir -p /opt/hackathon-trading-bot
cd /opt/hackathon-trading-bot

# Create systemd service for the trading bot
cat > /etc/systemd/system/hackathon-trading-bot.service << 'EOL'
[Unit]
Description=Hackathon Trading Bot
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/hackathon-trading-bot
ExecStartPre=/bin/sleep 30
ExecStart=/usr/local/bin/docker-compose -f docker-compose.production.yml up
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

# Enable the service
systemctl daemon-reload
systemctl enable hackathon-trading-bot

# Install Google Cloud Ops Agent for monitoring
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
bash add-google-cloud-ops-agent-repo.sh --also-install

echo "✅ Google Cloud VM setup complete!"
EOF
)

# Create the VM instance
echo "🚁 Creating VM instance..."
gcloud compute instances create "$INSTANCE_NAME" \
    --zone="$ZONE" \
    --machine-type="$MACHINE_TYPE" \
    --image-family="$IMAGE_FAMILY" \
    --image-project="$IMAGE_PROJECT" \
    --boot-disk-size=20GB \
    --boot-disk-type=pd-standard \
    --tags=http-server \
    --metadata=startup-script="$STARTUP_SCRIPT" \
    --scopes=https://www.googleapis.com/auth/cloud-platform

# Wait for instance to be running
echo "⏳ Waiting for instance to be ready..."
sleep 60

# Get external IP
EXTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" \
    --zone="$ZONE" \
    --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

echo "🌐 Instance is running at: $EXTERNAL_IP"
echo "🔑 SSH access: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"

# Create deployment instructions
cat > gcp-deployment-info.txt << EOF
# Hackathon Trading Bot - Google Cloud Deployment Info

## Instance Details
- Project ID: $PROJECT_ID
- Instance Name: $INSTANCE_NAME
- External IP: $EXTERNAL_IP
- Zone: $ZONE
- Machine Type: $MACHINE_TYPE

## SSH Access
gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID

## Deployment Steps
1. SSH into the instance
2. Navigate to /opt/hackathon-trading-bot
3. Clone your repository:
   git clone https://github.com/your-username/hackathon-trading-bot.git .

4. Create .env file with your API keys:
   
   RECALL_NETWORK_ENVIRONMENT=production
   RECALL_NETWORK_PRODUCTION_API_KEY=your_production_api_key
   RECALL_NETWORK_SANDBOX_API_KEY=your_sandbox_api_key
   VINCENT_DELEGATEE_PRIVATE_KEY=your_private_key
   # ... other environment variables

5. Start the service:
   sudo systemctl start hackathon-trading-bot

## Monitoring
- Service status: sudo systemctl status hackathon-trading-bot
- Logs: sudo journalctl -u hackathon-trading-bot -f
- Application logs: docker logs hackathon-trading-bot-prod
- Google Cloud Logging: https://console.cloud.google.com/logs

## Competition Commands
# Run 24-hour competition
docker exec -it hackathon-trading-bot-prod pnpm tsx packages/dca-backend/src/bin/competitionRunner.ts --live --duration 24 --balance 10000

## Cloud Monitoring
- Metrics: https://console.cloud.google.com/monitoring
- Dashboards: Create custom dashboards for trading performance

## Cleanup
To destroy the instance:
gcloud compute instances delete $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID

To delete the project:
gcloud projects delete $PROJECT_ID
EOF

echo "📋 Deployment information saved to gcp-deployment-info.txt"
echo ""
echo "🎯 Next Steps:"
echo "1. SSH into the instance: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID"
echo "2. Navigate to /opt/hackathon-trading-bot"
echo "3. Clone your repository and set up environment variables"
echo "4. Start the trading bot service"
echo ""
echo "💰 Estimated cost: ~\$50-100/month for continuous running"
echo "🚀 Your bot will be ready for live competition!"