#!/usr/bin/env node
/**
 * Production Multi-Agent Trading System with Live Dashboard
 * Integrates VincentMultiAgentSystem with Express API for dashboard
 */

import express from 'express';
import cors from 'cors';
import { VincentMultiAgentSystem } from './lib/agents/vincentMultiAgentSystem';
import { setTradingSystemReference } from './lib/express/dashboard';
import { registerRoutes } from './lib/express';
import { connectToMongoDB } from './lib/mongo/mongoose';
import { env } from './lib/env';
import { serviceLogger } from './lib/logger';
import consola from 'consola';

const PRODUCTION_CONFIG = {
  initialBalance: 10000,
  tradingPairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
  updateFrequency: 8000, // 8 seconds
  competitionMode: true,
  vincentAppVersion: 1,
  
  // User-controlled policy constraints
  globalPolicyConstraints: {
    spendingLimits: {
      dailyLimit: 500,      // $500 daily limit
      perTradeLimit: 100,   // $100 per trade
      monthlyLimit: 5000    // $5000 monthly limit
    },
    riskLimits: {
      maxDrawdown: 0.15,     // 15% max drawdown
      maxPositionSize: 0.10, // 10% max position
      maxDailyLoss: 0.05,    // 5% max daily loss
      stopLossThreshold: 0.02 // 2% stop loss
    },
    timeRestrictions: {
      tradingHours: "0-23",   // 24/7 trading for competition
      timezone: "UTC",
      allowedDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    },
    assetRestrictions: {
      allowedAssets: ["BTC", "ETH", "SOL", "USDT"],
      blockedAssets: [],
      maxAssetsPerTrade: 2
    },
    approvalRequirements: {
      largePositions: true,
      newAssets: false,
      highRiskOperations: true,
      manualApprovalThreshold: 200 // $200+ requires approval
    }
  },
  
  // Agent configurations
  agentConfigurations: {
    momentum: {
      agentId: 'vincent-momentum',
      name: 'Vincent Momentum Trader',
      allocation: 60,
      riskTolerance: 0.7,
      updateFrequency: 10000,
      enabled: true,
      maxPositionSize: 0.15,
      vincentAppVersion: 1,
      policyConstraints: {}
    },
    arbitrage: {
      agentId: 'vincent-arbitrage',
      name: 'Vincent Arbitrage Hunter',
      allocation: 25,
      riskTolerance: 0.3,
      updateFrequency: 5000,
      enabled: true,
      maxPositionSize: 0.10,
      vincentAppVersion: 1,
      policyConstraints: {}
    },
    meanReversion: {
      agentId: 'vincent-mean-reversion',
      name: 'Vincent Mean Reversion Specialist',
      allocation: 15,
      riskTolerance: 0.8,
      updateFrequency: 15000,
      enabled: true,
      maxPositionSize: 0.08,
      vincentAppVersion: 1,
      policyConstraints: {}
    }
  }
};

async function startProductionSystem() {
  consola.info('🚀 Starting Production Trading System with Live Dashboard');
  
  // Initialize Express app
  const app = express();
  
  // Configure CORS for dashboard
  app.use(cors({
    origin: [
      'http://localhost:3000',
      'https://zubeidhendricks.github.io',
      'https://hackathon-trading-bot.vercel.app'
    ],
    credentials: true
  }));
  
  // Register all routes (including dashboard routes)
  registerRoutes(app);
  
  // Distribute policy constraints among agents
  const agentConfigs = PRODUCTION_CONFIG.agentConfigurations;
  const globalConstraints = PRODUCTION_CONFIG.globalPolicyConstraints;
  
  // Allocate spending limits proportionally
  agentConfigs.momentum.policyConstraints = {
    ...globalConstraints,
    spendingLimits: {
      dailyLimit: globalConstraints.spendingLimits.dailyLimit * 0.6,
      perTradeLimit: globalConstraints.spendingLimits.perTradeLimit * 0.6,
      monthlyLimit: globalConstraints.spendingLimits.monthlyLimit * 0.6
    }
  };
  
  agentConfigs.arbitrage.policyConstraints = {
    ...globalConstraints,
    spendingLimits: {
      dailyLimit: globalConstraints.spendingLimits.dailyLimit * 0.25,
      perTradeLimit: globalConstraints.spendingLimits.perTradeLimit * 0.25,
      monthlyLimit: globalConstraints.spendingLimits.monthlyLimit * 0.25
    }
  };
  
  agentConfigs.meanReversion.policyConstraints = {
    ...globalConstraints,
    spendingLimits: {
      dailyLimit: globalConstraints.spendingLimits.dailyLimit * 0.15,
      perTradeLimit: globalConstraints.spendingLimits.perTradeLimit * 0.15,
      monthlyLimit: globalConstraints.spendingLimits.monthlyLimit * 0.15
    }
  };
  
  // Initialize trading system
  const tradingSystem = new VincentMultiAgentSystem(PRODUCTION_CONFIG);
  
  // Connect dashboard API to trading system
  setTradingSystemReference(tradingSystem);
  
  // Performance tracking variables
  let sessionStart = Date.now();
  let totalApprovals = 0;
  let policyViolations = 0;
  
  // Setup trading system event handlers
  tradingSystem.on('vincentSystemStarted', ({ startTime, config, walletAddresses }) => {
    consola.success(`🎯 Vincent Multi-Agent System LIVE at ${new Date(startTime).toISOString()}`);
    consola.info(`🔐 Vincent Wallets: ${walletAddresses.join(', ')}`);
    consola.info(`📊 Configuration: ${config.tradingPairs.length} pairs, $${config.initialBalance} initial balance`);
    consola.info(`🛡️ Policy Protection: $${config.globalPolicyConstraints.spendingLimits.dailyLimit}/day limit`);
  });
  
  tradingSystem.on('vincentTradeExecuted', (trade) => {
    const pnl = trade.execution?.postValidation?.pnlRealized || 0;
    consola.success(`✅ Vincent Trade: ${trade.signal.action} $${trade.signal.amount.toFixed(2)} by ${trade.agentId} | P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
  });
  
  tradingSystem.on('vincentPolicyViolation', ({ agentId, violation, timestamp }) => {
    policyViolations++;
    consola.warn(`⚠️ Policy Violation: ${agentId} - ${violation}`);
  });
  
  tradingSystem.on('vincentApprovalRequired', ({ agentId, data, timestamp }) => {
    totalApprovals++;
    consola.warn(`🔐 User Approval Required: ${agentId} - ${data.reason}`);
  });
  
  tradingSystem.on('vincentSystemUpdate', ({ metrics, agentHealth, recentTrades, policyStatus }) => {
    const currentPnL = metrics.totalPnL;
    
    // Log comprehensive status every 2 minutes
    if (Date.now() - sessionStart > 120000) {
      sessionStart = Date.now();
      const spending = metrics.vincentMetrics.totalSpending;
      
      consola.info(`📈 Vincent Performance: Value: $${metrics.totalValue.toFixed(2)} | P&L: ${currentPnL >= 0 ? '+' : ''}$${currentPnL.toFixed(2)} (${(metrics.totalReturn * 100).toFixed(2)}%)`);
      consola.info(`📊 Trading Stats: ${metrics.totalTrades} trades | Win Rate: ${(metrics.winRate * 100).toFixed(1)}% | Drawdown: ${(metrics.maxDrawdown * 100).toFixed(2)}%`);
      consola.info(`🔐 Policy Status: $${spending.daily.toFixed(2)} daily spent | ${policyViolations} violations | ${totalApprovals} approvals`);
      consola.info(`🤖 Vincent Agents: ${metrics.activeAgents} active | Uptime: ${metrics.systemUptime.toFixed(2)}h`);
      consola.info(`🌐 Dashboard: http://localhost:${env.PORT}/api/dashboard/agents`);
    }
  });
  
  // Graceful shutdown handlers
  const shutdown = async () => {
    consola.warn('🛑 Gracefully shutting down production system...');
    await tradingSystem.stop();
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  process.on('uncaughtException', async (error) => {
    consola.error('💥 Uncaught Exception:', error);
    await tradingSystem.emergencyHalt();
    process.exit(1);
  });
  
  try {
    // Connect to MongoDB
    await connectToMongoDB(env.MONGODB_URI);
    serviceLogger.info('MongoDB connected for production system');
    
    // Start Express server
    const server = app.listen(env.PORT, () => {
      consola.success(`🌐 Dashboard API Server running on port ${env.PORT}`);
      consola.info(`📊 Dashboard URL: http://localhost:${env.PORT}/api/dashboard/agents`);
      consola.info(`🔗 Live Dashboard: https://zubeidhendricks.github.io/vincent-hackathon-trading-bot/dashboard.html`);
    });
    
    // Start trading system
    await tradingSystem.start();
    
    consola.success('🎯 Production Trading System with Dashboard ACTIVE');
    consola.info('🔄 System running... Press Ctrl+C to stop');
    
    // Optional: Auto-stop after specific duration (for testing)
    if (process.env.AUTO_STOP_MINUTES) {
      const minutes = parseInt(process.env.AUTO_STOP_MINUTES);
      setTimeout(async () => {
        consola.info(`⏰ Auto-stopping after ${minutes} minutes...`);
        await tradingSystem.stop();
        server.close();
      }, minutes * 60 * 1000);
    }
    
  } catch (error) {
    consola.error('❌ Failed to start production system:', error);
    process.exit(1);
  }
}

// CLI argument handling
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Production Trading System with Live Dashboard

Usage: node production-system-with-dashboard.js [options]

Options:
  --help, -h                 Show this help message
  --balance <amount>         Set initial balance (default: 10000)
  --auto-stop <minutes>      Auto-stop after specified minutes
  --port <port>              Set API server port (default: 3000)

Environment Variables:
  PORT                      API server port
  MONGODB_URI              MongoDB connection string
  AUTO_STOP_MINUTES        Auto-stop after specified minutes
  CORS_ALLOWED_DOMAIN      Allowed CORS domain

Features:
  ✅ Vincent Multi-Agent Trading System
  ✅ Live Dashboard API Endpoints
  ✅ Real-time Performance Metrics
  ✅ Policy Compliance Monitoring
  ✅ Cross-Origin Resource Sharing (CORS)
  ✅ Graceful Shutdown Handling

Dashboard Endpoints:
  GET /api/dashboard/agents              - Agent status and metrics
  GET /api/dashboard/performance         - Portfolio performance data
  GET /api/dashboard/vincent-policy      - Vincent policy compliance
  GET /api/dashboard/trades              - Recent trade history
  GET /api/dashboard/market-data         - Live market data

Examples:
  node production-system-with-dashboard.js --balance 20000
  PORT=8080 node production-system-with-dashboard.js
  AUTO_STOP_MINUTES=60 node production-system-with-dashboard.js
`);
  process.exit(0);
}

// Parse CLI arguments
const balanceArg = process.argv.indexOf('--balance');
if (balanceArg !== -1 && process.argv[balanceArg + 1]) {
  PRODUCTION_CONFIG.initialBalance = parseFloat(process.argv[balanceArg + 1]);
}

const portArg = process.argv.indexOf('--port');
if (portArg !== -1 && process.argv[portArg + 1]) {
  process.env.PORT = process.argv[portArg + 1];
}

// Only run if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  startProductionSystem().catch(error => {
    consola.error('❌ Production system failed:', error);
    process.exit(1);
  });
}