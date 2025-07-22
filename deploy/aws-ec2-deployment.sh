#!/bin/bash
# AWS EC2 Deployment Script for Hackathon Trading Bot
set -e

echo "🚀 Starting AWS EC2 deployment..."

# Configuration
AWS_ACCOUNT_ID="727417435909"
EC2_INSTANCE_TYPE="t3.medium"  # 2 vCPU, 4GB RAM
EC2_AMI_ID="ami-0c02fb55956c7d316"  # Amazon Linux 2023
EC2_KEY_NAME="hackathon-trading-bot-key"
EC2_SECURITY_GROUP="hackathon-trading-bot-sg"
EC2_INSTANCE_NAME="hackathon-trading-bot-prod"
AWS_REGION="us-east-1"

# Create security group if it doesn't exist
echo "📋 Setting up security group..."
aws ec2 describe-security-groups --group-names "$EC2_SECURITY_GROUP" --region "$AWS_REGION" 2>/dev/null || {
    echo "Creating security group..."
    SECURITY_GROUP_ID=$(aws ec2 create-security-group \
        --group-name "$EC2_SECURITY_GROUP" \
        --description "Security group for hackathon trading bot" \
        --region "$AWS_REGION" \
        --query 'GroupId' \
        --output text)
    
    # Allow SSH access
    aws ec2 authorize-security-group-ingress \
        --group-id "$SECURITY_GROUP_ID" \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0 \
        --region "$AWS_REGION"
    
    # Allow HTTP access for monitoring
    aws ec2 authorize-security-group-ingress \
        --group-id "$SECURITY_GROUP_ID" \
        --protocol tcp \
        --port 3000 \
        --cidr 0.0.0.0/0 \
        --region "$AWS_REGION"
    
    echo "✅ Security group created: $SECURITY_GROUP_ID"
}

# Create key pair if it doesn't exist
echo "🔑 Setting up key pair..."
aws ec2 describe-key-pairs --key-names "$EC2_KEY_NAME" --region "$AWS_REGION" 2>/dev/null || {
    echo "Creating key pair..."
    aws ec2 create-key-pair \
        --key-name "$EC2_KEY_NAME" \
        --region "$AWS_REGION" \
        --query 'KeyMaterial' \
        --output text > "${EC2_KEY_NAME}.pem"
    
    chmod 400 "${EC2_KEY_NAME}.pem"
    echo "✅ Key pair created and saved to ${EC2_KEY_NAME}.pem"
}

# User data script for EC2 instance setup
USER_DATA_SCRIPT=$(cat << 'EOF'
#!/bin/bash
yum update -y
yum install -y docker git

# Start Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Enable pnpm
corepack enable

# Create app directory
mkdir -p /opt/hackathon-trading-bot
cd /opt/hackathon-trading-bot

# Clone the repository (you'll need to update this URL)
# git clone https://github.com/your-username/hackathon-trading-bot.git .

# Create systemd service for the trading bot
cat > /etc/systemd/system/hackathon-trading-bot.service << 'EOL'
[Unit]
Description=Hackathon Trading Bot
After=network.target
Wants=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/hackathon-trading-bot
ExecStart=/usr/bin/docker-compose -f docker-compose.production.yml up
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

# Enable the service
systemctl daemon-reload
systemctl enable hackathon-trading-bot

# Install CloudWatch agent for monitoring
yum install -y amazon-cloudwatch-agent

echo "✅ EC2 instance setup complete!"
EOF
)

# Launch EC2 instance
echo "🚁 Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$EC2_AMI_ID" \
    --instance-type "$EC2_INSTANCE_TYPE" \
    --key-name "$EC2_KEY_NAME" \
    --security-groups "$EC2_SECURITY_GROUP" \
    --user-data "$USER_DATA_SCRIPT" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$EC2_INSTANCE_NAME}]" \
    --region "$AWS_REGION" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "✅ EC2 instance launched: $INSTANCE_ID"

# Wait for instance to be running
echo "⏳ Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$AWS_REGION"

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$AWS_REGION" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "🌐 Instance is running at: $PUBLIC_IP"
echo "🔑 SSH access: ssh -i ${EC2_KEY_NAME}.pem ec2-user@$PUBLIC_IP"

# Create deployment instructions
cat > deployment-info.txt << EOF
# Hackathon Trading Bot - AWS Deployment Info

## Instance Details
- Instance ID: $INSTANCE_ID
- Public IP: $PUBLIC_IP
- Instance Type: $EC2_INSTANCE_TYPE
- Region: $AWS_REGION

## SSH Access
ssh -i ${EC2_KEY_NAME}.pem ec2-user@$PUBLIC_IP

## Deployment Steps
1. SSH into the instance
2. Navigate to /opt/hackathon-trading-bot
3. Clone your repository or upload your code
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

## Competition Commands
# Run 24-hour competition
docker exec -it hackathon-trading-bot-prod pnpm tsx packages/dca-backend/src/bin/competitionRunner.ts --live --duration 24 --balance 10000

## Cleanup
To destroy the instance:
aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $AWS_REGION
EOF

echo "📋 Deployment information saved to deployment-info.txt"
echo ""
echo "🎯 Next Steps:"
echo "1. SSH into the instance: ssh -i ${EC2_KEY_NAME}.pem ec2-user@$PUBLIC_IP"
echo "2. Clone your repository to /opt/hackathon-trading-bot"
echo "3. Set up environment variables"
echo "4. Start the trading bot service"
echo ""
echo "🚀 Your bot will be ready for live competition!"