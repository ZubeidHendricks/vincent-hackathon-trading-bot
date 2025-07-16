# 🤖 Multi-Agent Trading System - Autonomous Apes Competition

**Production-Ready Autonomous Trading Bot for $33,500+ Prize Pool**

## 🎯 Competition Overview

- **Target Event**: Autonomous Apes Trading Competition
- **Prize Pool**: $33,500+ across multiple tracks
- **Competition Start**: July 13, 2025
- **Deadline**: July 22, 2025 (9 days)
- **Strategy**: Multi-agent autonomous trading system

## 🏗️ Architecture

### Core Multi-Agent System

The system consists of **5 specialized autonomous agents**:

1. **🚀 Momentum Agent (35% allocation)**
   - Focus: Trend following & breakout detection
   - Strategies: EMA crossovers, breakout patterns, trend strength analysis
   - Risk Level: Medium-High

2. **⚖️ Arbitrage Agent (40% allocation)**
   - Focus: Cross-exchange price differences
   - Strategies: Simple arbitrage, triangular arbitrage, cross-chain opportunities
   - Risk Level: Low-Medium

3. **📈 Mean Reversion Agent (25% allocation)**
   - Focus: Contrarian trading & statistical arbitrage
   - Strategies: RSI, Bollinger Bands, Z-score analysis
   - Risk Level: High

4. **🎯 Portfolio Coordinator**
   - Master decision maker coordinating all trading agents
   - Weighted signal aggregation with performance-based adjustments
   - Market regime analysis and risk assessment

5. **🛡️ Risk Manager**
   - Real-time portfolio protection and risk monitoring
   - VaR calculation, drawdown monitoring, position size limits
   - Emergency halt capabilities

### Inter-Agent Communication

- **Message Routing System**: Agents communicate via typed messages
- **Priority Queues**: Critical risk alerts get immediate processing
- **Signal Aggregation**: Coordinator weighs signals by confidence and performance
- **Consensus Building**: Multiple agent agreement boosts trade confidence

## 🚀 Quick Start

### Prerequisites

- Node.js 20.11.1+
- pnpm 10.7.0+
- Vincent AI integration (included)

### Installation

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build
```

### Running the Multi-Agent System

#### Production Mode
```bash
# Start with default settings
pnpm multi-agent

# Custom balance and risk level
INITIAL_BALANCE=20000 RISK_LEVEL=high pnpm multi-agent

# Auto-stop after 1 hour for testing
AUTO_STOP_MINUTES=60 pnpm multi-agent
```

#### Development Mode (Live Reload)
```bash
pnpm multi-agent:dev
```

#### CLI Options
```bash
# Show help
node ./dist/multi-agent-production.mjs --help

# Custom balance
node ./dist/multi-agent-production.mjs --balance 15000

# Set risk level
node ./dist/multi-agent-production.mjs --risk-level high

# Auto-stop for testing
AUTO_STOP_MINUTES=30 node ./dist/multi-agent-production.mjs
```

## 📊 Performance Monitoring

### Real-Time Metrics

The system provides comprehensive real-time monitoring:

- **Portfolio Value**: Current total portfolio worth
- **P&L Tracking**: Profit/Loss in USD and percentage
- **Trade Statistics**: Win rate, total trades, average execution time
- **Agent Health**: Individual agent performance and status
- **Risk Metrics**: Drawdown, VaR, position sizes, volatility

### Session Reporting

After each session, detailed results are saved to `results/`:

```json
{
  "session": {
    "startTime": "2025-07-13T21:38:49.542Z",
    "duration": 2.5,
    "configuration": { /* system config */ }
  },
  "performance": {
    "initialBalance": 10000,
    "finalValue": 11250,
    "totalPnL": 1250,
    "totalReturn": 0.125,
    "maxDrawdown": 0.08,
    "sharpeRatio": 1.85,
    "winRate": 0.72,
    "totalTrades": 25
  },
  "trades": [ /* complete trade history */ ],
  "systemMetrics": { /* detailed agent metrics */ }
}
```

## ⚙️ Configuration

### Risk Levels

**Low Risk** (Conservative)
```bash
RISK_LEVEL=low pnpm multi-agent
```
- Max Drawdown: 8%
- Max Position Size: 5%
- Max Daily Loss: 3%

**Medium Risk** (Default)
```bash
pnpm multi-agent
```
- Max Drawdown: 15%
- Max Position Size: 10%
- Max Daily Loss: 5%

**High Risk** (Aggressive)
```bash
RISK_LEVEL=high pnpm multi-agent
```
- Max Drawdown: 25%
- Max Position Size: 20%
- Max Daily Loss: 8%

### Agent Allocation

Default allocation optimized for competition:
- **Arbitrage**: 40% (low risk, consistent profits)
- **Momentum**: 35% (medium risk, trend following)
- **Mean Reversion**: 25% (high risk, contrarian plays)

### Trading Pairs

Currently configured for major crypto pairs:
- BTC/USDT
- ETH/USDT  
- SOL/USDT

## 🔧 Advanced Features

### Emergency Controls

```bash
# Emergency stop (preserves state)
Ctrl+C

# Force termination
Ctrl+C (twice)

# Programmatic emergency halt
# (Risk manager triggers automatically on limit breaches)
```

### Agent Management

Agents can be dynamically controlled:
- **Pause/Resume**: Individual agents can be stopped/started
- **Allocation Adjustment**: Real-time allocation changes
- **Parameter Tuning**: Risk limits and strategy parameters
- **Performance Weighting**: High-performing agents get more influence

### Market Regime Adaptation

The system adapts to different market conditions:
- **Bull Markets**: Increased momentum allocation
- **Bear Markets**: Enhanced risk management, mean reversion focus
- **High Volatility**: Reduced position sizes, tighter stops
- **Low Volatility**: Increased arbitrage opportunities

## 🏆 Competition Strategy

### Multi-Track Approach

Targeting multiple prize categories:
1. **Highest Returns**: Aggressive momentum strategies
2. **Best Risk-Adjusted Returns**: Balanced multi-agent approach
3. **Most Consistent**: Low-volatility arbitrage focus
4. **Innovation Award**: Novel multi-agent architecture

### Competitive Advantages

1. **Diversification**: 3 uncorrelated trading strategies
2. **Risk Management**: Sophisticated portfolio protection
3. **Adaptability**: Dynamic market regime detection
4. **Execution Speed**: Sub-second decision making
5. **Transparency**: Complete audit trail and reporting

## 🔍 Monitoring & Debugging

### Live System Status

Monitor real-time system health:
```bash
# System shows live updates every minute:
📊 System Status: 5 agents active, 12 trades, 2.3min uptime, $10,250.00 portfolio value
📈 Performance: Total Value: $10250.00 | P&L: +$250.00 (2.50%)
📊 Trades: 12 | Win Rate: 75.0% | Drawdown: 3.20%
🤖 Agents: 5 active | Uptime: 2.30h
```

### Agent Health Checks

Individual agent monitoring:
- **Heartbeat Monitoring**: Agents report every 10 seconds
- **Performance Tracking**: Real-time win rate and P&L attribution
- **Error Recovery**: Automatic restart on agent failures
- **Signal Quality**: Confidence scoring and validation

### Trade Execution Tracking

Complete trade lifecycle monitoring:
```bash
✅ Trade executed: BUY 250.00 @ 43250.4000 | P&L: +$12.50
📡 Signal from momentum: BUY momentum-breakout (78.5%)
⚠️ Risk Alert: Position BTC (8.2%) approaching size limit
🔄 Portfolio Coordinator: Rebalancing agent allocations
```

## 📈 Performance Optimization

### Strategy Optimization

- **Dynamic Parameter Adjustment**: Strategies adapt to market conditions
- **Performance-Based Weighting**: Successful agents get more allocation
- **Signal Filtering**: Low-confidence signals are filtered out
- **Execution Optimization**: Minimize slippage and gas costs

### Technical Optimizations

- **Parallel Processing**: Agents run concurrently
- **Efficient Data Structures**: Optimized for real-time processing
- **Memory Management**: Prevents memory leaks during long runs
- **Error Handling**: Comprehensive exception management

## 🛡️ Security & Safety

### Risk Management

- **Position Limits**: Maximum 10% portfolio per position
- **Drawdown Protection**: Emergency halt at 15% drawdown
- **Daily Loss Limits**: Stop trading at 5% daily loss
- **Volatility Monitoring**: Reduce exposure in volatile markets

### Code Security

- **No API Key Exposure**: Secure credential management
- **Input Validation**: All signals validated before execution
- **Audit Logging**: Complete transaction history
- **Error Boundaries**: Isolated agent failures don't crash system

## 🚨 Troubleshooting

### Common Issues

**System won't start:**
```bash
# Check dependencies
pnpm install

# Rebuild if needed
pnpm build

# Check logs for specific errors
```

**Agents not trading:**
- Check market data connection
- Verify risk limits aren't too restrictive
- Ensure sufficient balance for minimum position sizes

**Performance issues:**
- Monitor memory usage with long runs
- Check for network connectivity issues
- Verify system resources aren't exhausted

### Support & Debugging

For detailed debugging, check the complete log output and saved session files in the `results/` directory.

## 🎯 Competition Preparation

### Final Checklist

- [ ] ✅ Multi-agent system implemented and tested
- [ ] ✅ Risk management active and validated
- [ ] ✅ Real-time monitoring and reporting
- [ ] ✅ Production entry point created
- [ ] ✅ Emergency controls tested
- [ ] ✅ Performance tracking implemented
- [ ] ✅ Session results saving

### Ready for Competition! 🏆

The system is **production-ready** for the Autonomous Apes Trading Competition with:
- **5 autonomous agents** working in coordination
- **Comprehensive risk management** with emergency controls
- **Real-time performance monitoring** and reporting
- **Adaptive strategies** for different market conditions
- **Professional-grade** error handling and recovery

**Target**: Achieve 10%+ returns to qualify for top prize pools in the $33,500+ competition!

---

**⚡ Launch Command:**
```bash
pnpm multi-agent
```

**🎯 Competition Mode Active - Good Luck!**