#!/bin/bash
# Quick Deploy to DigitalOcean - Vincent Trading Bot
# Server IP: 162.243.162.248

echo "🚀 Deploying Vincent Trading Bot to DigitalOcean"
echo "Server IP: 162.243.162.248"
echo ""

# Check if SSH key exists or if we need password
echo "⚠️  IMPORTANT: You'll need to connect to your DigitalOcean server"
echo "Run this command to connect:"
echo ""
echo "ssh root@162.243.162.248"
echo ""
echo "If this is your first time connecting, you'll need the root password from DigitalOcean console."
echo ""
echo "Once connected, run this complete setup script:"
echo ""

cat << 'EOL'
# ============================================
# COPY AND PASTE THIS ENTIRE SCRIPT INTO YOUR DROPLET
# ============================================

#!/bin/bash
set -e

echo "🚀 Setting up Vincent Trading Bot on DigitalOcean"

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install pnpm
npm install -g pnpm@10.13.1

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update
apt-get install -y mongodb-org

# Start MongoDB
systemctl start mongod
systemctl enable mongod

# Install PM2
npm install -g pm2

# Install Git
apt-get install -y git

# Clone repository
cd /opt
git clone https://github.com/zubeidhendricks/vincent-hackathon-trading-bot.git
cd vincent-hackathon-trading-bot/packages/dca-backend

# Install dependencies
pnpm install

# Create environment file
cat > .env << 'EOF'
PORT=3000
MONGODB_URI=mongodb://localhost:27017/vincent-trading
NODE_ENV=production
VINCENT_DELEGATEE_PRIVATE_KEY=REPLACE_WITH_YOUR_PRIVATE_KEY
CORS_ALLOWED_DOMAIN=*
IS_DEVELOPMENT=false
EOF

echo "⚠️  EDIT THE PRIVATE KEY:"
echo "nano .env"
echo "Replace REPLACE_WITH_YOUR_PRIVATE_KEY with your actual Vincent wallet private key"

# Build project
pnpm build

# Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'vincent-trading-bot',
    script: './dist/production-system-with-dashboard.mjs',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Setup firewall
ufw allow 22/tcp
ufw allow 3000/tcp
ufw --force enable

# Setup PM2 startup
pm2 startup systemd -u root --hp /root

echo "✅ Setup complete!"
echo ""
echo "🔧 Next steps:"
echo "1. Edit private key: nano .env"
echo "2. Start service: pm2 start ecosystem.config.js"
echo "3. Save PM2 config: pm2 save"
echo ""
echo "🌐 Your API will be at: http://162.243.162.248:3000"
echo "📊 Dashboard will connect automatically from GitHub Pages"

EOL

echo ""
echo "============================================"
echo "🎯 QUICK CONNECT COMMAND:"
echo "ssh root@162.243.162.248"
echo ""
echo "📝 After setup, test your API:"
echo "curl http://162.243.162.248:3000/api/dashboard/agents"
echo ""
echo "🌐 Your dashboard will be live at:"
echo "https://zubeidhendricks.github.io/vincent-hackathon-trading-bot/dashboard.html"
echo "============================================"