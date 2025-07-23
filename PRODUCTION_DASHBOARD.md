# Vincent Trading Bot - Production Dashboard

## 🚀 Quick Start

Start the production trading system with live dashboard:

```bash
cd packages/dca-backend
pnpm production-dashboard:dev
```

## 📊 Dashboard URLs

- **Local Development**: http://localhost:3000/api/dashboard/agents
- **Live Dashboard**: https://zubeidhendricks.github.io/vincent-hackathon-trading-bot/dashboard.html
- **API Health Check**: http://localhost:3000/api/dashboard/performance

## 🔧 Available Commands

```bash
# Development with hot reload
pnpm production-dashboard:dev

# Production build
pnpm production-dashboard

# Test run (1 minute)
pnpm production-dashboard:test

# Custom configuration
pnpm production-dashboard:dev --balance 20000 --port 8080
```

## 📈 Dashboard Features

### Real-time Data
- ✅ Live agent status and performance
- ✅ Portfolio value and P&L tracking
- ✅ Vincent policy compliance monitoring
- ✅ Recent trade history
- ✅ Market data feeds
- ✅ Auto-refresh every 10 seconds

### Agent Monitoring
- **Momentum Agent**: Trend-following strategy
- **Arbitrage Agent**: Cross-exchange opportunities
- **Mean Reversion Agent**: Statistical arbitrage

### Vincent Policy Compliance
- Daily/Monthly spending limits
- Risk management thresholds
- Approval requirement tracking
- Policy violation monitoring

## 🔗 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/dashboard/agents` | Agent status and metrics |
| `GET /api/dashboard/performance` | Portfolio performance data |
| `GET /api/dashboard/vincent-policy` | Policy compliance status |
| `GET /api/dashboard/trades` | Recent trade history |
| `GET /api/dashboard/market-data` | Live market data |

## 🛠️ Configuration

### Environment Variables
```bash
PORT=3000                           # API server port
MONGODB_URI=mongodb://localhost/vincent  # Database connection
AUTO_STOP_MINUTES=60               # Auto-stop after X minutes
CORS_ALLOWED_DOMAIN=localhost:3000 # Allowed CORS domain
```

### Policy Constraints
```javascript
{
  spendingLimits: {
    dailyLimit: 500,      // $500 daily limit
    perTradeLimit: 100,   // $100 per trade
    monthlyLimit: 5000    // $5000 monthly limit
  },
  riskLimits: {
    maxDrawdown: 0.15,     // 15% max drawdown
    maxPositionSize: 0.10, // 10% max position
    maxDailyLoss: 0.05,    // 5% max daily loss
  }
}
```

## 🏗️ Architecture

```
┌─────────────────────┐    ┌───────────────────┐    ┌─────────────────┐
│   Dashboard UI      │    │   Express API     │    │  Trading System │
│  (GitHub Pages)     │◄──►│   (Port 3000)     │◄──►│  (Background)   │
│                     │    │                   │    │                 │
│ • Real-time Charts  │    │ • CORS Enabled    │    │ • 3 AI Agents   │
│ • Agent Status      │    │ • Dashboard Routes│    │ • Policy Engine │
│ • Policy Compliance │    │ • Live Data       │    │ • Risk Manager  │
└─────────────────────┘    └───────────────────┘    └─────────────────┘
```

## 🔍 Monitoring

### System Status
- **Online**: All agents active, API responding
- **Offline**: System not running or unreachable
- **Degraded**: Some agents inactive or errors

### Performance Metrics
- Portfolio value and P&L
- Win rate and trade count
- Sharpe ratio and max drawdown
- System uptime

### Policy Compliance
- Real-time spending tracking
- Risk limit monitoring
- Approval requirements
- Violation alerts

## 🐛 Troubleshooting

### Dashboard Shows "System Offline"
1. Ensure the backend is running: `pnpm production-dashboard:dev`
2. Check API endpoints: `curl http://localhost:3000/api/dashboard/agents`
3. Verify CORS configuration
4. Check browser console for errors

### No Data in Charts
1. Confirm agents are active
2. Check trade execution logs
3. Verify database connection
4. Review policy constraints

### API Errors
1. Check MongoDB connection
2. Verify environment variables
3. Review server logs
4. Test individual endpoints

## 📝 Example Response

```json
{
  "timestamp": 1703980800000,
  "status": "online",
  "agents": {
    "momentum": {
      "active": true,
      "currentSignal": "BUY",
      "pnl": 125.50,
      "trades": 15,
      "winRate": 0.73
    }
  },
  "systemUptime": 3600,
  "activeAgents": 3,
  "totalAgents": 3
}
```

## 🎯 Demo Instructions

For hackathon demo:

1. Start system: `pnpm production-dashboard:dev`
2. Open dashboard: https://zubeidhendricks.github.io/vincent-hackathon-trading-bot/dashboard.html
3. Show real-time data updates
4. Demonstrate policy compliance
5. Highlight multi-agent coordination

## 🔒 Security Notes

- API endpoints are public for demo purposes
- In production, implement authentication
- Use environment variables for secrets
- Enable HTTPS for production deployment