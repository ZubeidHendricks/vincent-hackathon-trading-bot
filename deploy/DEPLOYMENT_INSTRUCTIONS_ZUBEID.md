# 🚀 AWS Deployment Instructions for Zubeid

**AWS Account ID:** 727417435909

## 📋 Prerequisites Setup

### 1. Install AWS CLI
```bash
# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version
```

### 2. Configure AWS Credentials
```bash
# Configure AWS CLI with your credentials
aws configure

# When prompted, enter:
# AWS Access Key ID: [Your access key from AWS console]
# AWS Secret Access Key: [Your secret key from AWS console]
# Default region name: us-east-1
# Default output format: json
```

### 3. Verify AWS Connection
```bash
# Test connection
aws sts get-caller-identity

# Should return something like:
# {
#     "UserId": "...",
#     "Account": "727417435909",
#     "Arn": "arn:aws:iam::727417435909:user/your-username"
# }
```

## 🚁 Deploy Your Trading Bot

### Quick Deployment (One Command)
```bash
cd /home/zubeid/autoapeHackathon/ZUBAID/hackathon-trading-bot/deploy/
chmod +x aws-ec2-deployment.sh
./aws-ec2-deployment.sh
```

This script will:
- ✅ Create security groups
- ✅ Generate SSH key pair
- ✅ Launch EC2 instance (t3.medium)
- ✅ Install Docker, Node.js, and all dependencies
- ✅ Set up the trading bot service
- ✅ Provide connection details

### Expected Output:
```
🚀 Starting AWS EC2 deployment...
📋 Setting up security group...
🔑 Setting up key pair...
🚁 Launching EC2 instance...
✅ EC2 instance launched: i-1234567890abcdef0
⏳ Waiting for instance to be running...
🌐 Instance is running at: 54.123.456.789
🔑 SSH access: ssh -i hackathon-trading-bot-key.pem ec2-user@54.123.456.789
```

## 🔧 Post-Deployment Setup

### 1. SSH into Your Instance
```bash
# Use the key file created by the deployment script
ssh -i hackathon-trading-bot-key.pem ec2-user@YOUR_INSTANCE_IP

# If you get permission denied, fix key permissions:
chmod 400 hackathon-trading-bot-key.pem
```

### 2. Setup Your Trading Bot
```bash
# Once SSH'd into the instance
cd /opt/hackathon-trading-bot

# Clone your repository
git clone https://github.com/your-username/hackathon-trading-bot.git .

# Or upload your code if private repository
# You can use scp to copy files:
# scp -i hackathon-trading-bot-key.pem -r ./hackathon-trading-bot/* ec2-user@YOUR_IP:/opt/hackathon-trading-bot/
```

### 3. Configure Environment Variables
```bash
# Create production environment file
cp .env.example .env.production

# Edit with your actual API keys
nano .env.production

# Add your keys:
RECALL_NETWORK_PRODUCTION_API_KEY=your_production_key_here
RECALL_NETWORK_SANDBOX_API_KEY=your_sandbox_key_here  
VINCENT_DELEGATEE_PRIVATE_KEY=your_vincent_key_here
# ... other keys
```

### 4. Build and Start the Service
```bash
# Install dependencies and build
pnpm install
pnpm build

# Start the trading bot service
sudo systemctl start hackathon-trading-bot

# Check service status
sudo systemctl status hackathon-trading-bot

# View logs
sudo journalctl -u hackathon-trading-bot -f
```

## 🎮 Run Competition

### Test First (Sandbox)
```bash
# SSH into your instance
ssh -i hackathon-trading-bot-key.pem ec2-user@YOUR_INSTANCE_IP

# Navigate to bot directory
cd /opt/hackathon-trading-bot

# Run a quick sandbox test
docker exec -it hackathon-trading-bot-prod pnpm tsx packages/dca-backend/src/bin/competitionRunner.ts --demo --duration 0.1 --balance 5000
```

### Live Competition Launch
```bash
# When competition starts, run this command:
docker exec -it hackathon-trading-bot-prod pnpm tsx packages/dca-backend/src/bin/competitionRunner.ts --live --duration 24 --balance 10000 --risk 5 --max-drawdown 15

# Or for more aggressive settings:
docker exec -it hackathon-trading-bot-prod pnpm tsx packages/dca-backend/src/bin/competitionRunner.ts --live --duration 24 --balance 10000 --risk 8 --max-drawdown 20
```

## 📊 Monitoring Your Bot

### Real-Time Monitoring
```bash
# Watch live logs
sudo journalctl -u hackathon-trading-bot -f

# Check Docker container status
docker ps
docker logs hackathon-trading-bot-prod -f

# Monitor system resources
htop
df -h  # disk space
free -h  # memory usage
```

### Performance Tracking
- **Live Logs:** Your bot will output real-time trade information
- **Competition Leaderboard:** Monitor your ranking on Recall's platform
- **System Health:** Use CloudWatch (optional) for advanced monitoring

## 🛠️ Troubleshooting

### Common Issues:

**Service Won't Start**
```bash
# Check service logs
sudo journalctl -u hackathon-trading-bot -xe

# Restart service
sudo systemctl restart hackathon-trading-bot
```

**Out of Memory**
```bash
# Check memory usage
free -h

# Restart Docker if needed
sudo systemctl restart docker
```

**Connection Issues**
```bash
# Test API connectivity
curl -H "Authorization: Bearer $RECALL_API_KEY" https://api.competitions.recall.network/health
```

**Emergency Stop**
```bash
# Stop the trading bot immediately
sudo systemctl stop hackathon-trading-bot
# or
docker stop hackathon-trading-bot-prod
```

## 💰 Cost Management

**Estimated Costs:**
- **t3.medium instance:** ~$0.04/hour = ~$1/day = ~$25/month
- **Storage (20GB):** ~$2/month
- **Data transfer:** ~$1-5/month
- **Total for competition:** ~$20-40

**Cost Optimization:**
```bash
# Stop instance when not needed
aws ec2 stop-instances --instance-ids i-1234567890abcdef0

# Start instance for competition
aws ec2 start-instances --instance-ids i-1234567890abcdef0

# Terminate when completely done (destroys instance)
aws ec2 terminate-instances --instance-ids i-1234567890abcdef0
```

## 🏆 Competition Day Checklist

**Pre-Competition (1 hour before):**
- [ ] SSH into instance and verify everything is running
- [ ] Run sandbox test to confirm bot functionality
- [ ] Check all environment variables are set correctly
- [ ] Verify API keys are working
- [ ] Monitor system health (CPU, memory, disk)

**Competition Start:**
- [ ] Execute live competition command
- [ ] Monitor first few trades for issues
- [ ] Set up monitoring dashboard
- [ ] Take note of initial balance and timestamp

**During Competition:**
- [ ] Check bot health every few hours
- [ ] Monitor performance vs other competitors
- [ ] Watch for any error alerts
- [ ] Be ready for manual intervention if needed

**After Competition:**
- [ ] Collect final performance metrics
- [ ] Download logs and trade history
- [ ] Analyze results for future improvements

## 📞 Support & Resources

**AWS Console:** https://console.aws.amazon.com  
**Your Account ID:** 727417435909  
**Region:** us-east-1 (N. Virginia)

**Instance Details (after deployment):**
- Instance Type: t3.medium (2 vCPU, 4GB RAM)
- Operating System: Amazon Linux 2023
- Storage: 20GB SSD
- Security Group: hackathon-trading-bot-sg

**Key Files:**
- SSH Key: `hackathon-trading-bot-key.pem`
- Deployment Info: `deployment-info.txt` (created by script)
- Bot Location: `/opt/hackathon-trading-bot/`

## 🚀 Ready to Win!

Once deployed, your bot will have:
- ✅ **Professional cloud infrastructure** 
- ✅ **24/7 uptime and monitoring**
- ✅ **Automatic restarts and error recovery**
- ✅ **Low-latency connection to trading APIs**
- ✅ **Complete logging and performance tracking**

**Good luck in the competition! 🏆💰**