#!/bin/bash
set -e

echo "🚀 Vincent Trading Bot - DigitalOcean Auto-Deploy Script"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

print_status "Starting Vincent Trading Bot deployment..."

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 20
print_status "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install pnpm
print_status "Installing pnpm package manager..."
npm install -g pnpm@10.13.1

# Install MongoDB
print_status "Installing MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update
apt-get install -y mongodb-org

# Start and enable MongoDB
print_status "Starting MongoDB service..."
systemctl start mongod
systemctl enable mongod

# Verify MongoDB is running
if systemctl is-active --quiet mongod; then
    print_success "MongoDB is running"
else
    print_error "MongoDB failed to start"
    exit 1
fi

# Install PM2 for process management
print_status "Installing PM2 process manager..."
npm install -g pm2

# Install Git and other utilities
print_status "Installing Git and utilities..."
apt-get install -y git curl wget htop ufw

# Create application directory
print_status "Setting up application directory..."
cd /opt

# Clone or update repository
if [ -d "vincent-hackathon-trading-bot" ]; then
    print_status "Updating existing repository..."
    cd vincent-hackathon-trading-bot
    git pull origin main
else
    print_status "Cloning repository..."
    git clone https://github.com/zubeidhendricks/vincent-hackathon-trading-bot.git
    cd vincent-hackathon-trading-bot
fi

# Install dependencies
print_status "Installing application dependencies..."
cd packages/dca-backend
pnpm install

# Create environment file if it doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating environment configuration..."
    cat > .env << 'EOF'
# Vincent Trading Bot Configuration
PORT=3000
MONGODB_URI=mongodb://localhost:27017/vincent-trading
NODE_ENV=production

# IMPORTANT: Replace with your actual private key
VINCENT_DELEGATEE_PRIVATE_KEY=REPLACE_WITH_YOUR_PRIVATE_KEY

# Optional settings
AUTO_STOP_MINUTES=
CORS_ALLOWED_DOMAIN=*
IS_DEVELOPMENT=false

# Database settings
DB_NAME=vincent-trading
EOF
    print_warning "Created .env file - YOU MUST UPDATE THE PRIVATE KEY!"
else
    print_status "Environment file already exists"
fi

# Build the project
print_status "Building the application..."
pnpm build

# Create PM2 ecosystem file
print_status "Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'vincent-trading-bot',
    script: './dist/production-system-with-dashboard.mjs',
    cwd: '/opt/vincent-hackathon-trading-bot/packages/dca-backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/vincent-trading-bot/error.log',
    out_file: '/var/log/vincent-trading-bot/out.log',
    log_file: '/var/log/vincent-trading-bot/combined.log',
    time: true
  }]
}
EOF

# Create log directory
print_status "Setting up logging..."
mkdir -p /var/log/vincent-trading-bot
chown -R $USER:$USER /var/log/vincent-trading-bot

# Setup firewall
print_status "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 3000/tcp
ufw --force enable

# Setup PM2 startup
print_status "Configuring PM2 startup..."
pm2 startup systemd -u root --hp /root --silent

# Get server IP
SERVER_IP=$(curl -s http://checkip.amazonaws.com/ || curl -s http://ipinfo.io/ip || echo "YOUR_SERVER_IP")

print_success "======================================================"
print_success "🎉 Vincent Trading Bot deployment completed!"
print_success "======================================================"
echo ""
print_warning "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Edit the private key:"
echo "   nano /opt/vincent-hackathon-trading-bot/packages/dca-backend/.env"
echo ""
echo "2. Start the service:"
echo "   cd /opt/vincent-hackathon-trading-bot/packages/dca-backend"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo ""
echo "3. Update your GitHub Pages dashboard with server IP:"
echo "   Replace 'YOUR_DROPLET_IP' with: ${SERVER_IP}"
echo ""
print_success "🌐 Your API will be available at:"
echo "   http://${SERVER_IP}:3000/api/dashboard/agents"
echo "   http://${SERVER_IP}:3000/api/dashboard/performance"
echo "   http://${SERVER_IP}:3000/api/dashboard/vincent-policy"
echo ""
print_success "📊 Management commands:"
echo "   pm2 status           - Check service status"
echo "   pm2 logs vincent-trading-bot - View logs"
echo "   pm2 restart vincent-trading-bot - Restart service"
echo "   pm2 stop vincent-trading-bot - Stop service"
echo ""
print_success "🔧 Useful commands:"
echo "   systemctl status mongod - Check MongoDB"
echo "   ufw status - Check firewall"
echo "   htop - Monitor resources"
echo ""
print_success "Deployment script completed successfully! 🚀"