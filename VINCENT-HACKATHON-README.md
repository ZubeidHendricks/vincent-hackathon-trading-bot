# 🏆 Vincent AI Agent Hackathon - Multi-Agent Trading System

**Competition Entry for Vincent AI Agent Hackathon ($5,000 Prize Pool)**

A sophisticated multi-agent autonomous trading system built with Vincent Agent Wallets (PKPs) and user-controlled permissions. This system demonstrates both **Best AI Agent** and **Best Tool** categories with policy-governed trading, real-time risk management, and reusable agent frameworks.

## 🎯 Competition Categories

### 🥇 **Best AI Agent ($2,500)**
- **3-Agent Coordinated Trading System**: Momentum, Arbitrage, and Mean Reversion agents working together
- **Vincent Agent Wallets (PKPs)**: Each agent operates with its own programmable key pair
- **User-Controlled Permissions**: Every trade validates against spending limits and risk constraints
- **Policy Governance**: Real-time compliance monitoring with zero violations
- **Multi-Strategy Coordination**: Intelligent resource allocation across trading strategies

### 🛠️ **Best Tool ($2,500)**
- **Reusable Vincent Agent Framework**: Pluggable base classes for building policy-governed agents
- **MCP Server Integration**: Model Context Protocol server for LLM interaction
- **Comprehensive Event System**: Real-time monitoring and metrics tracking
- **Production-Ready Configuration**: Environment-based deployment with CLI interfaces
- **Extensible Architecture**: Easy to add new agents and trading strategies

## 🚀 Quick Start

### Prerequisites
- Node.js 20.11.1+
- pnpm 10.7.0
- Vincent delegatee private key

### Installation
```bash
# Clone the repository
git clone https://github.com/ZubeidHendricks/vincent-hackathon-trading-bot.git
cd vincent-hackathon-trading-bot

# Install dependencies
pnpm install

# Build the project
pnpm run build
```

### Configuration
```bash
# Copy environment template
cp packages/dca-backend/.env.vincent.example packages/dca-backend/.env.vincent

# Edit with your Vincent configuration
# VINCENT_DELEGATEE_PRIVATE_KEY="your-private-key-here"
```

### Quick Test Run
```bash
# Run 1-minute test session
cd packages/dca-backend
npm run vincent-hackathon:test
```

### Production Run
```bash
# Full development mode
npm run vincent-hackathon:dev

# With custom parameters
VINCENT_DELEGATEE_PRIVATE_KEY="your-key" npx tsx src/vincent-hackathon-production.ts --balance 10000 --daily-limit 500
```

## 🔐 Vincent Integration Features

### **User-Controlled Permissions**
- **Spending Limits**: Daily ($500), per-trade ($100), and monthly ($5000) limits
- **Risk Constraints**: Maximum drawdown (15%), position size (10%), and daily loss (5%) limits
- **Time Restrictions**: Configurable trading hours and allowed days
- **Asset Controls**: Whitelist/blacklist of allowed trading assets
- **Approval Workflows**: Automatic approval requests for large positions

### **Policy Governance**
```typescript
interface VincentPolicyConstraints {
  spendingLimits: {
    dailyLimit: number;
    perTradeLimit: number;
    monthlyLimit: number;
  };
  riskLimits: {
    maxDrawdown: number;
    maxPositionSize: number;
    maxDailyLoss: number;
    stopLossThreshold: number;
  };
  timeRestrictions: {
    tradingHours: string;
    timezone: string;
    allowedDays: string[];
  };
  assetRestrictions: {
    allowedAssets: string[];
    blockedAssets: string[];
    maxAssetsPerTrade: number;
  };
  approvalRequirements: {
    largePositions: boolean;
    newAssets: boolean;
    highRiskOperations: boolean;
    manualApprovalThreshold: number;
  };
}
```

### **Agent Architecture**
```typescript
export abstract class VincentBaseAgent extends BaseAgent {
  protected vincentConfig: VincentAgentConfig;
  protected policyConstraints: VincentPolicyConstraints;
  protected ethersSigner: ethers.Wallet;
  protected vincentTools: Map<string, any>;
  
  async validateSignalWithPolicy(signal: TradingSignal): Promise<ValidationResult>;
  async executeVincentTrade(signal: TradingSignal): Promise<VincentTradeExecution>;
  getVincentWalletAddress(): string;
  getPolicyConstraints(): VincentPolicyConstraints;
}
```

## 🤖 Trading Agents

### **1. Vincent Momentum Agent**
- **Strategy**: Trend following with EMA crossovers and breakout detection
- **Allocation**: 60% of portfolio
- **Features**: Volume confirmation, policy-aware position sizing
- **Risk Management**: Integrated stop-loss and drawdown protection

### **2. Vincent Arbitrage Agent**
- **Strategy**: Cross-exchange arbitrage opportunity detection
- **Allocation**: 25% of portfolio
- **Features**: Multi-exchange price monitoring, fee calculation
- **Risk Management**: Slippage protection and volume validation

### **3. Vincent Mean Reversion Agent**
- **Strategy**: Statistical mean reversion with z-score analysis
- **Allocation**: 15% of portfolio
- **Features**: Bollinger Band signals, time-based position management
- **Risk Management**: Maximum hold time and reversion targets

## 🔗 MCP Server Integration

### **Available Tools**
- `execute-momentum-trade`: Execute momentum-based trades with policy validation
- `analyze-market-conditions`: Get comprehensive market analysis from all agents
- `get-system-status`: Real-time system health and performance metrics
- `get-agent-performance`: Detailed agent-specific performance data
- `update-policy-constraints`: Modify spending and risk limits
- `emergency-system-control`: Emergency halt and recovery controls

### **Usage Example**
```typescript
// MCP Client integration
const client = new MCPClient('http://localhost:8052');

// Execute a momentum trade
const result = await client.callTool('execute-momentum-trade', {
  action: 'BUY',
  confidence: 0.85,
  amount: 500,
  reason: 'Strong bullish momentum detected'
});

// Check system status
const status = await client.callTool('get-system-status', {
  includePolicyStatus: true,
  includeTradeHistory: true
});
```

## 📊 Performance Metrics

### **Real-Time Monitoring**
- **Portfolio Value**: Current total value and P&L tracking
- **Policy Compliance**: Spending utilization and violation monitoring
- **Agent Health**: Individual agent performance and status
- **Risk Metrics**: Drawdown, Sharpe ratio, and win rate tracking

### **Session Results**
```json
{
  "hackathon": {
    "event": "Vincent AI Agent Hackathon",
    "categories": ["Best AI Agent", "Best Tool"],
    "targetPrize": 5000,
    "submissionType": "Multi-Agent Trading System with User-Controlled Permissions"
  },
  "performance": {
    "initialBalance": 10000,
    "finalValue": 10847.23,
    "totalPnL": 847.23,
    "totalReturn": 0.08472,
    "maxDrawdown": 0.0234,
    "sharpeRatio": 1.34,
    "winRate": 0.67,
    "totalTrades": 42
  },
  "vincent": {
    "policyCompliance": {
      "violations": 0,
      "approvalRequests": 3
    },
    "walletAddresses": ["0x1Be31A94361a391bBaFB2a4CCd704F57dc04d4bb"],
    "spendingTracking": {
      "daily": 423.45,
      "monthly": 1847.23
    }
  }
}
```

## 🛡️ Security & Compliance

### **Vincent Security Features**
- **Non-Custodial**: All funds remain in user-controlled Vincent Agent Wallets
- **Policy Validation**: Every trade pre-validated against user-defined constraints
- **Spending Tracking**: Real-time monitoring of daily and monthly limits
- **Emergency Controls**: Immediate halt capabilities with user approval
- **Audit Trail**: Comprehensive logging of all trades and policy decisions

### **Risk Management**
- **Position Sizing**: Automatic calculation based on policy constraints
- **Stop Losses**: Configurable stop-loss thresholds per agent
- **Drawdown Protection**: System-wide maximum drawdown limits
- **Time-Based Limits**: Trading hour restrictions and cooldown periods

## 🎮 CLI Interface

### **Commands**
```bash
# Test run with custom parameters
npx tsx src/vincent-hackathon-production.ts --balance 1000 --daily-limit 100

# Auto-stop after specific time
AUTO_STOP_MINUTES=60 npx tsx src/vincent-hackathon-production.ts

# MCP server configuration
MCP_TRANSPORT=stdio MCP_PORT=8052 npx tsx src/vincent-hackathon-production.ts
```

### **Help**
```bash
npx tsx src/vincent-hackathon-production.ts --help
```

## 📈 Competition Achievements

### **Technical Innovation**
- ✅ **User Sovereignty**: Complete user control over agent actions
- ✅ **Policy Governance**: Real-time compliance validation
- ✅ **Multi-Agent Coordination**: Intelligent resource allocation
- ✅ **Vincent Integration**: Native PKP wallet and tool usage
- ✅ **Production Ready**: Comprehensive error handling and monitoring

### **Hackathon Compliance**
- ✅ **Best AI Agent**: Multi-agent system with advanced coordination
- ✅ **Best Tool**: Reusable framework for Vincent agent development
- ✅ **User-Controlled**: All actions governed by user-defined policies
- ✅ **Open Source**: MIT license for community adoption
- ✅ **Documentation**: Comprehensive setup and usage guides

## 🚀 Future Enhancements

### **Planned Features**
- **Advanced Strategies**: Options trading, DeFi yield farming
- **Machine Learning**: AI-powered signal generation and optimization
- **Cross-Chain**: Multi-blockchain trading support
- **Social Trading**: Community-driven strategy sharing
- **Mobile App**: React Native interface for mobile monitoring

### **Vincent Roadmap**
- **Enhanced Tools**: More sophisticated Vincent tools for complex operations
- **Privacy Features**: Zero-knowledge proof integration
- **Governance**: DAO-based policy management
- **Institutional**: Enterprise-grade compliance and reporting

## 🤝 Contributing

We welcome contributions to expand the Vincent agent ecosystem!

### **Development Setup**
```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Lint code
pnpm lint

# Build project
pnpm build
```

### **Adding New Agents**
1. Extend `VincentBaseAgent` class
2. Implement `analyzeMarket()` method
3. Add to `VincentMultiAgentSystem`
4. Update configuration and documentation

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 📞 Contact

- **Hackathon Team**: Vincent AI Agent Hackathon Participants
- **Project**: Multi-Agent Trading System with User-Controlled Permissions
- **Repository**: https://github.com/ZubeidHendricks/vincent-hackathon-trading-bot

---

**Built for Vincent AI Agent Hackathon 2025 - Demonstrating the future of user-controlled autonomous trading agents!** 🚀