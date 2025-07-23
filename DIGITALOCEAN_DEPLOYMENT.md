# DigitalOcean Deployment Guide - Vincent Trading Bot

## 🚀 Quick Deploy to DigitalOcean

### Step 1: Create Droplet
1. Log into DigitalOcean Console
2. Create new Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Basic ($24/month, 2 vCPUs, 4GB RAM, 80GB SSD)
   - **Region**: New York 3 (or closest to you)
   - **Authentication**: SSH Key (recommended) or Password
   - **Hostname**: `vincent-trading-bot`

### Step 2: Connect to Droplet
```bash
# Replace with your droplet IP
ssh root@YOUR_DROPLET_IP
```

### Step 3: Run Auto-Setup Script
Copy and paste this entire script into your droplet:

```bash
#!/bin/bash
set -e

echo "🚀 Setting up Vincent Trading Bot Backend on DigitalOcean"

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

# Start and enable MongoDB
systemctl start mongod
systemctl enable mongod

# Install PM2 for process management
npm install -g pm2

# Install Git
apt-get install -y git

# Clone the repository
cd /opt
git clone https://github.com/zubeidhendricks/vincent-hackathon-trading-bot.git
cd vincent-hackathon-trading-bot

# Install dependencies
cd packages/dca-backend
pnpm install

# Create environment file
cat > .env << 'EOF'
# Vincent Trading Bot Configuration
PORT=3000
MONGODB_URI=mongodb://localhost:27017/vincent-trading
NODE_ENV=production

# Replace with your actual private key for production
VINCENT_DELEGATEE_PRIVATE_KEY=your-private-key-here

# Optional settings
AUTO_STOP_MINUTES=
CORS_ALLOWED_DOMAIN=*
IS_DEVELOPMENT=false

# Database settings
DB_NAME=vincent-trading
EOF

echo "📝 Environment file created at /opt/vincent-hackathon-trading-bot/packages/dca-backend/.env"
echo "⚠️  IMPORTANT: Edit the .env file to add your VINCENT_DELEGATEE_PRIVATE_KEY"

# Build the project
pnpm build

# Create PM2 ecosystem file
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
mkdir -p /var/log/vincent-trading-bot

# Setup firewall
ufw allow 22/tcp
ufw allow 3000/tcp
ufw --force enable

# Create systemd service for PM2
pm2 startup systemd -u root --hp /root

echo "✅ Setup complete!"
echo ""
echo "🔧 Next steps:"
echo "1. Edit the private key: nano /opt/vincent-hackathon-trading-bot/packages/dca-backend/.env"
echo "2. Start the service: pm2 start ecosystem.config.js"
echo "3. Save PM2 config: pm2 save"
echo "4. Check status: pm2 status"
echo "5. View logs: pm2 logs vincent-trading-bot"
echo ""
echo "🌐 Your API will be available at: http://YOUR_DROPLET_IP:3000"
echo "📊 Dashboard endpoints at: http://YOUR_DROPLET_IP:3000/api/dashboard/agents"
```

### Step 4: Configure Private Key
```bash
# Edit environment file
nano /opt/vincent-hackathon-trading-bot/packages/dca-backend/.env

# Add your actual private key
VINCENT_DELEGATEE_PRIVATE_KEY=0x1234567890abcdef...
```

### Step 5: Start the Service
```bash
cd /opt/vincent-hackathon-trading-bot/packages/dca-backend

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status
```

### Step 6: Update Dashboard URL
Update your GitHub Pages dashboard to use the DigitalOcean backend:

```javascript
// In docs/dashboard.html, update this line:
this.apiBase = 'http://YOUR_DROPLET_IP:3000';
```

## 🔧 Management Commands

### Check Service Status
```bash
pm2 status
pm2 logs vincent-trading-bot
pm2 restart vincent-trading-bot
```

### Monitor System Resources
```bash
htop
df -h
free -h
```

### Update Application
```bash
cd /opt/vincent-hackathon-trading-bot
git pull origin main
cd packages/dca-backend
pnpm install
pnpm build
pm2 restart vincent-trading-bot
```

### MongoDB Management
```bash
# Check MongoDB status
systemctl status mongod

# MongoDB shell
mongosh

# View trading data
mongosh vincent-trading --eval "db.trades.find().limit(5)"
```

### Backup Database
```bash
# Create backup
mongodump --db vincent-trading --out /opt/backups/$(date +%Y%m%d)

# Restore backup
mongorestore --db vincent-trading /opt/backups/20240120/vincent-trading/
```

## 🌐 SSL/HTTPS Setup (Optional)

### Install Nginx and Certbot
```bash
apt install -y nginx certbot python3-certbot-nginx

# Configure Nginx
cat > /etc/nginx/sites-available/vincent-trading << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/vincent-trading /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Get SSL certificate (if using domain)
certbot --nginx -d YOUR_DOMAIN
```

## 🔍 Troubleshooting

### Service Won't Start
```bash
# Check logs
pm2 logs vincent-trading-bot

# Check environment
cat /opt/vincent-hackathon-trading-bot/packages/dca-backend/.env

# Test MongoDB connection
mongosh --eval "db.adminCommand('ping')"
```

### Port Issues
```bash
# Check what's using port 3000
lsof -i :3000

# Check firewall
ufw status
```

### Memory Issues
```bash
# Check memory usage
free -h

# Restart if needed
pm2 restart vincent-trading-bot
```

## 📊 Testing the Deployment

### API Endpoints
```bash
# Replace YOUR_DROPLET_IP with actual IP
curl http://YOUR_DROPLET_IP:3000/api/dashboard/agents
curl http://YOUR_DROPLET_IP:3000/api/dashboard/performance
curl http://YOUR_DROPLET_IP:3000/api/dashboard/vincent-policy
```

### Dashboard URLs
- **Agent Status**: http://YOUR_DROPLET_IP:3000/api/dashboard/agents
- **Performance**: http://YOUR_DROPLET_IP:3000/api/dashboard/performance
- **Policy Status**: http://YOUR_DROPLET_IP:3000/api/dashboard/vincent-policy

## 🎯 Final Steps

1. **Get your droplet IP** from DigitalOcean console
2. **Update dashboard.html** with the IP address
3. **Commit and push** the updated dashboard
4. **Test the live dashboard** at your GitHub Pages URL

Your Vincent Trading Bot will now be running 24/7 on DigitalOcean with live data feeding into your GitHub Pages dashboard!

## 💰 Cost Estimate
- **Basic Droplet**: $24/month (2 vCPUs, 4GB RAM)
- **Bandwidth**: Included (1TB transfer)
- **Total**: ~$24/month for full production setup

## 🔒 Security Notes
- Change default SSH port: `Port 2222` in `/etc/ssh/sshd_config`
- Use SSH keys instead of passwords
- Keep your private keys secure and never commit them to Git
- Consider using DigitalOcean's VPC for additional security
- Regular security updates: `apt update && apt upgrade -y`