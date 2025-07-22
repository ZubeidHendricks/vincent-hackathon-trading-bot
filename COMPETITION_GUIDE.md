# 🏆 Competition Deployment & Execution Guide

## 🎯 How Recall Competitions Actually Work

Unlike typical coding competitions, **Recall competitions require you to run your bot live during the competition window**. Your bot connects to Recall's API and executes real trades during the competition period.

### **Competition Flow:**
1. **Competition Opens** → Participants start their bots
2. **Live Trading Period** → Bots trade autonomously for 24+ hours
3. **Competition Closes** → Final rankings determined by performance
4. **Results** → Winners announced based on returns, Sharpe ratio, etc.

## 🚀 Deployment Options

### **Option 1: AWS EC2 (Recommended)**
**Best for: Reliable 24/7 uptime, full control**

```bash
# Deploy to AWS
cd deploy/
chmod +x aws-ec2-deployment.sh
./aws-ec2-deployment.sh
```

**Cost:** ~$20-40 for competition period  
**Pros:** Reliable, scalable, full monitoring  
**Cons:** Requires AWS account setup

### **Option 2: Google Cloud Platform**
**Best for: Advanced monitoring, competitive pricing**

```bash
# Deploy to Google Cloud
cd deploy/
chmod +x google-cloud-deployment.sh
./google-cloud-deployment.sh
```

**Cost:** ~$15-30 for competition period  
**Pros:** Excellent monitoring tools, competitive pricing  
**Cons:** Requires GCP account setup

### **Option 3: Local Machine + VPS**
**Best for: Quick setup, cost-effective**

```bash
# Use a cheap VPS like DigitalOcean ($10/month)
# or run locally with good internet connection

# Build and run locally
pnpm build
pnpm tsx packages/dca-backend/src/bin/competitionRunner.ts --live --duration 24 --balance 10000
```

**Cost:** $5-10 for competition period  
**Pros:** Simple, cheap  
**Cons:** Less reliable, requires manual monitoring

## 📋 Pre-Competition Checklist

### **1. API Keys Setup**
- [ ] Register at https://register.recall.network
- [ ] Get production API key
- [ ] Test with sandbox first
- [ ] Secure key storage (never commit to git)

### **2. Bot Configuration**
- [ ] Set production environment variables
- [ ] Configure risk parameters appropriately
- [ ] Test trade execution in sandbox
- [ ] Verify all strategies are working

### **3. Deployment Setup**
- [ ] Choose deployment platform
- [ ] Set up monitoring and logging
- [ ] Configure automatic restarts
- [ ] Test end-to-end deployment

### **4. Competition Strategy**
- [ ] Decide on conservative vs aggressive settings
- [ ] Set appropriate risk limits
- [ ] Plan monitoring strategy
- [ ] Prepare for manual intervention if needed

## ⚙️ Competition Configuration

### **Conservative Settings (Recommended)**
```bash
# Safe settings for consistent performance
pnpm tsx src/bin/competitionRunner.ts \
  --live \
  --duration 24 \
  --balance 10000 \
  --risk 2 \
  --max-drawdown 10
```

**Target:** Top 10 finish, guaranteed rewards
**Risk:** Low chance of major losses
**Expected Return:** 10-25%

### **Aggressive Settings**
```bash
# High-risk, high-reward settings
pnpm tsx src/bin/competitionRunner.ts \
  --live \
  --duration 24 \
  --balance 10000 \
  --risk 8 \
  --max-drawdown 20
```

**Target:** Top 3 finish, maximum prizes
**Risk:** Higher chance of significant losses  
**Expected Return:** 50-200%+

## 📊 Live Competition Monitoring

### **Real-Time Tracking**
Your bot provides live updates:
```
🚀 Competition started!
💰 BUY: 0.5000 WETH @ $2048.50 | Strategy: momentum | Confidence: 85.2%
📊 Portfolio: $10,247.30 | P&L: +$247.30 (2.47%)
💸 SELL: 0.3000 WETH @ $2065.80 | Strategy: meanReversion | Confidence: 73.1%
🏁 Competition completed! Final P&L: +$1,247.85 (12.48%)
```

### **Monitoring Tools**
- **Bot Logs:** Real-time trade execution logs
- **Cloud Monitoring:** Server health and performance
- **Recall Dashboard:** Competition leaderboard and rankings
- **Portfolio Tracking:** Live P&L and position updates

## 🎮 Competition Day Workflow

### **Pre-Competition (1 hour before)**
1. **Final Testing**
   ```bash
   # Run quick sandbox test
   pnpm tsx src/bin/competitionRunner.ts --demo --duration 0.1 --balance 1000
   ```

2. **Deploy to Production**
   - Ensure server is running and healthy
   - Verify all environment variables
   - Check API connectivity

3. **Setup Monitoring**
   - Open monitoring dashboards
   - Configure alerts for critical issues
   - Prepare manual intervention tools

### **Competition Start**
1. **Launch Bot**
   ```bash
   # Start 24-hour competition
   pnpm tsx src/bin/competitionRunner.ts --live --duration 24 --balance 10000
   ```

2. **Monitor Performance**
   - Watch first few trades for issues
   - Monitor server performance
   - Track competition leaderboard

### **During Competition**
1. **Passive Monitoring**
   - Check bot health every few hours
   - Monitor for any server issues
   - Track performance vs competitors

2. **Manual Intervention (if needed)**
   - Stop bot if critical issues occur
   - Adjust risk parameters if necessary
   - Restart if server problems

### **Competition End**
1. **Collect Results**
   - Final performance metrics
   - Trade history and analysis
   - Competition ranking

2. **Post-Competition Analysis**
   - Review what worked/didn't work
   - Analyze against competitors
   - Prepare for next competition

## 🏆 Multi-Bounty Strategy

### **Primary Targets**
1. **Main Competition ($5,000)**
   - Focus on maximum returns
   - Optimize for Sharpe ratio
   - Target top 3 finish

2. **Vincent AI Bounty ($5,000)**
   - Highlight security features
   - Document Vincent AI integration
   - Emphasize innovation aspects

3. **WAGMI Pool ($20,000)**
   - Ensure valid submission
   - Meet minimum requirements
   - Guaranteed participation rewards

## 🚨 Troubleshooting Guide

### **Common Issues**

**Bot Crashes Mid-Competition**
```bash
# Quick restart
sudo systemctl restart hackathon-trading-bot

# Check logs for issues
sudo journalctl -u hackathon-trading-bot -f
```

**API Rate Limits**
- Monitor API usage
- Implement exponential backoff
- Consider multiple API keys

**Network Connectivity Issues**
- Use cloud deployment for reliability
- Configure automatic retry logic
- Monitor server health

**Insufficient Balance Errors**
- Check account balance
- Use Recall faucet for test tokens
- Reduce trade sizes

### **Emergency Procedures**

**Stop Trading Immediately**
```bash
# Kill the bot process
docker stop hackathon-trading-bot-prod

# Or directly kill the process
pkill -f competitionRunner
```

**Manual Trade Execution**
```bash
# Execute emergency trade
curl -X POST https://api.competitions.recall.network/api/trade/execute \
  -H "Authorization: Bearer $RECALL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "fromToken": "0xA0b...",
    "toToken": "0xC02...",
    "amount": "100",
    "reason": "Emergency manual trade"
  }'
```

## 📞 Support & Resources

### **Before Competition**
- Test thoroughly in sandbox
- Join Recall Discord/community
- Prepare backup plans

### **During Competition**
- Monitor bot health continuously
- Have manual override ready
- Stay available for issues

### **Emergency Contacts**
- Recall Support: [support channels]
- AWS/GCP Support: For server issues
- Team Members: For code issues

## 🎯 Success Metrics

### **Technical Success**
- [ ] 99.9%+ uptime during competition
- [ ] All trades executed successfully  
- [ ] No critical errors or crashes
- [ ] Proper risk management maintained

### **Competition Success**
- [ ] Positive returns (>0%)
- [ ] Top 20% finish minimum
- [ ] Qualified for all bounty pools
- [ ] Innovative security features recognized

### **Learning Success**
- [ ] Comprehensive performance analysis
- [ ] Areas for improvement identified
- [ ] Competitive insights gained
- [ ] Ready for future competitions

## 🚀 Final Pre-Launch Command

```bash
# The moment of truth - start your live competition bot!
cd /opt/hackathon-trading-bot
pnpm tsx packages/dca-backend/src/bin/competitionRunner.ts \
  --live \
  --duration 24 \
  --balance 10000 \
  --risk 5 \
  --max-drawdown 15

# May the best bot win! 🏆
```

**Remember:** This is live trading with real money. Start with small amounts and conservative settings until you're confident in your bot's performance.

**Good luck in the competition! 🎯🚀**