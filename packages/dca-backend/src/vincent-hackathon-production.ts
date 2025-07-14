#!/usr/bin/env node
/**
 * Vincent AI Agent Hackathon - Production Entry Point
 * Multi-Agent Trading System with User-Controlled Permissions
 * 
 * Built for Vincent AI Agent Hackathon - Categories:
 * - Best AI Agent ($2,500)
 * - Best New Tool ($2,500)
 */

import { VincentMultiAgentSystem } from './lib/agents/vincentMultiAgentSystem';
import { VincentMCPServer } from './lib/mcp/vincentMCPServer';
import { VincentPolicyConstraints } from './lib/agents/vincentBaseAgent';
import { ethers } from 'ethers';
import { LIT_RPC } from '@lit-protocol/constants';
import consola from 'consola';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vincent Hackathon Configuration
const VINCENT_HACKATHON_CONFIG = {
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
  } as VincentPolicyConstraints,
  
  // Agent configurations with Vincent integration
  agentConfigurations: {
    momentum: {
      agentId: 'vincent-momentum',
      name: 'Vincent Momentum Trader',
      allocation: 60, // Increased for competition focus
      riskTolerance: 0.7,
      updateFrequency: 10000,
      enabled: true,
      maxPositionSize: 0.15,
      vincentAppVersion: 1,
      policyConstraints: {} // Will be populated with adjusted constraints
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

// MCP Server Configuration
const MCP_CONFIG = {
  transport: (process.env.MCP_TRANSPORT as 'stdio' | 'http') || 'http',
  port: parseInt(process.env.MCP_PORT || '8052'),
  host: process.env.MCP_HOST || '0.0.0.0'
};

async function main() {
  consola.info('🏆 Vincent AI Agent Hackathon - Multi-Agent Trading System');
  consola.info('💰 Target: $5,000 Prize Pool (Best AI Agent + Best Tool)');
  consola.info('🔐 User-Controlled Permissions via Vincent Framework');
  
  // Initialize Vincent signer
  const privateKey = process.env.VINCENT_DELEGATEE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('VINCENT_DELEGATEE_PRIVATE_KEY environment variable required');
  }
  
  const vincentWallet = new ethers.Wallet(
    privateKey,
    new ethers.providers.StaticJsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
  );
  
  consola.info(`🔐 Vincent Wallet Address: ${vincentWallet.address}`);
  
  // Distribute policy constraints among agents
  const agentConfigs = VINCENT_HACKATHON_CONFIG.agentConfigurations;
  const globalConstraints = VINCENT_HACKATHON_CONFIG.globalPolicyConstraints;
  
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
  
  // Initialize Vincent Multi-Agent Trading System
  const vincentTradingSystem = new VincentMultiAgentSystem(VINCENT_HACKATHON_CONFIG);
  
  // Initialize Vincent MCP Server (skip for core testing)
  let vincentMCPServer: any = null;
  try {
    vincentMCPServer = new VincentMCPServer({
      wallet: vincentWallet,
      ...MCP_CONFIG
    });
    
    await vincentMCPServer.initialize(vincentTradingSystem);
    consola.success('🔗 Vincent MCP Server initialized successfully');
  } catch (error) {
    consola.warn('⚠️ MCP Server initialization failed, continuing without MCP:', error instanceof Error ? error.message : 'Unknown error');
    vincentMCPServer = {
      start: async () => {},
      stop: async () => {},
      getServerInfo: () => ({ error: 'MCP Server not initialized' })
    };
  }
  
  // Performance tracking
  let sessionStart = Date.now();
  let bestPnL = 0;
  let worstDrawdown = 0;
  let totalApprovals = 0;
  let policyViolations = 0;
  
  // Vincent system event handlers
  vincentTradingSystem.on('vincentSystemStarted', ({ startTime, config, walletAddresses }) => {
    consola.success(`🎯 Vincent Multi-Agent System LIVE at ${new Date(startTime).toISOString()}`);
    consola.info(`🔐 Vincent Wallets: ${walletAddresses.join(', ')}`);
    consola.info(`📊 Configuration: ${config.tradingPairs.length} pairs, $${config.initialBalance} initial balance`);
    consola.info(`🛡️ Policy Protection: $${config.globalPolicyConstraints.spendingLimits.dailyLimit}/day limit`);
  });
  
  vincentTradingSystem.on('vincentTradeExecuted', (trade) => {
    const pnl = trade.execution?.postValidation?.pnlRealized || 0;
    consola.success(`✅ Vincent Trade: ${trade.signal.action} $${trade.signal.amount.toFixed(2)} by ${trade.agentId} | P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
    if (trade.execution.execution.transactionHash) {
      consola.info(`🔗 Transaction: ${trade.execution.execution.transactionHash}`);
    }
  });
  
  vincentTradingSystem.on('vincentPolicyViolation', ({ agentId, violation, timestamp }) => {
    policyViolations++;
    consola.warn(`⚠️ Policy Violation: ${agentId} - ${violation}`);
  });
  
  vincentTradingSystem.on('vincentApprovalRequired', ({ agentId, data, timestamp }) => {
    totalApprovals++;
    consola.warn(`🔐 User Approval Required: ${agentId} - ${data.reason}`);
  });
  
  vincentTradingSystem.on('vincentSystemUpdate', ({ metrics, agentHealth, recentTrades, policyStatus }) => {
    const currentPnL = metrics.totalPnL;
    bestPnL = Math.max(bestPnL, currentPnL);
    worstDrawdown = Math.min(worstDrawdown, metrics.maxDrawdown);
    
    // Log comprehensive status every 2 minutes
    if (Date.now() - sessionStart > 120000) {
      sessionStart = Date.now();
      const spending = metrics.vincentMetrics.totalSpending;
      
      consola.info(`📈 Vincent Performance: Value: $${metrics.totalValue.toFixed(2)} | P&L: ${currentPnL >= 0 ? '+' : ''}$${currentPnL.toFixed(2)} (${(metrics.totalReturn * 100).toFixed(2)}%)`);
      consola.info(`📊 Trading Stats: ${metrics.totalTrades} trades | Win Rate: ${(metrics.winRate * 100).toFixed(1)}% | Drawdown: ${(metrics.maxDrawdown * 100).toFixed(2)}%`);
      consola.info(`🔐 Policy Status: $${spending.daily.toFixed(2)} daily spent | ${policyViolations} violations | ${totalApprovals} approvals`);
      consola.info(`🤖 Vincent Agents: ${metrics.activeAgents} active | Uptime: ${metrics.systemUptime.toFixed(2)}h`);
    }
  });
  
  vincentTradingSystem.on('vincentSystemStopped', ({ duration, finalMetrics, tradeHistory, policyViolations }) => {
    const finalPnL = finalMetrics.totalPnL;
    const finalReturn = finalMetrics.totalReturn;
    
    consola.info(`📊 VINCENT HACKATHON SESSION COMPLETE - Duration: ${duration.toFixed(2)} hours`);
    consola.info(`💰 Final Portfolio Value: $${finalMetrics.totalValue.toFixed(2)}`);
    consola.info(`📈 Total P&L: ${finalPnL >= 0 ? '+' : ''}$${finalPnL.toFixed(2)} (${(finalReturn * 100).toFixed(2)}%)`);
    consola.info(`📊 Total Trades: ${finalMetrics.totalTrades} | Win Rate: ${(finalMetrics.winRate * 100).toFixed(1)}%`);
    consola.info(`📉 Max Drawdown: ${(finalMetrics.maxDrawdown * 100).toFixed(2)}%`);
    consola.info(`⚡ Sharpe Ratio: ${finalMetrics.sharpeRatio.toFixed(3)}`);
    consola.info(`🔐 Policy Compliance: ${policyViolations.length} violations, ${totalApprovals} approval requests`);
    consola.info(`🔗 Vincent Wallets: ${finalMetrics.vincentMetrics.walletAddresses.length} active`);
    
    // Save Vincent hackathon results
    const results = {
      hackathon: {
        event: "Vincent AI Agent Hackathon",
        categories: ["Best AI Agent", "Best Tool"],
        targetPrize: 5000,
        submissionType: "Multi-Agent Trading System with User-Controlled Permissions"
      },
      session: {
        startTime: new Date().toISOString(),
        duration: duration,
        configuration: VINCENT_HACKATHON_CONFIG
      },
      performance: {
        initialBalance: VINCENT_HACKATHON_CONFIG.initialBalance,
        finalValue: finalMetrics.totalValue,
        totalPnL: finalPnL,
        totalReturn: finalReturn,
        maxDrawdown: finalMetrics.maxDrawdown,
        sharpeRatio: finalMetrics.sharpeRatio,
        winRate: finalMetrics.winRate,
        totalTrades: finalMetrics.totalTrades
      },
      vincent: {
        policyCompliance: {
          violations: policyViolations.length,
          violationsList: policyViolations,
          approvalRequests: totalApprovals
        },
        walletAddresses: finalMetrics.vincentMetrics.walletAddresses,
        spendingTracking: finalMetrics.vincentMetrics.totalSpending,
        toolsUsed: Object.fromEntries(finalMetrics.vincentMetrics.toolsUsed)
      },
      trades: tradeHistory,
      systemMetrics: finalMetrics,
      mcpIntegration: vincentMCPServer.getServerInfo()
    };
    
    const resultsPath = path.join(__dirname, `../results/vincent-hackathon-session-${Date.now()}.json`);
    try {
      writeFileSync(resultsPath, JSON.stringify(results, null, 2));
      consola.success(`💾 Vincent Hackathon results saved to: ${resultsPath}`);
    } catch (error) {
      consola.error('Failed to save Vincent results:', error);
    }
    
    // Competition performance assessment
    if (finalReturn > 0.1) { // 10%+ return
      consola.success(`🏆 HACKATHON TARGET ACHIEVED! ${(finalReturn * 100).toFixed(2)}% return demonstrates Vincent's capabilities!`);
    } else if (finalReturn > 0.05) { // 5%+ return
      consola.info(`🎯 Good Vincent performance! ${(finalReturn * 100).toFixed(2)}% return shows policy-governed trading`);
    } else {
      consola.warn(`⚠️ Performance below target: ${(finalReturn * 100).toFixed(2)}% return - policy constraints may be too restrictive`);
    }
    
    // Vincent-specific achievements
    if (policyViolations.length === 0) {
      consola.success(`🛡️ PERFECT POLICY COMPLIANCE! Zero violations demonstrates Vincent sovereignty`);
    }
    
    if (totalApprovals > 0) {
      consola.info(`🔐 USER CONTROL DEMONSTRATED: ${totalApprovals} approval requests show user sovereignty`);
    }
  });
  
  // Graceful shutdown handlers
  process.on('SIGINT', async () => {
    consola.warn('🛑 Received SIGINT - Gracefully shutting down Vincent system...');
    await vincentTradingSystem.stop();
    await vincentMCPServer.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    consola.warn('🛑 Received SIGTERM - Gracefully shutting down Vincent system...');
    await vincentTradingSystem.stop();
    await vincentMCPServer.stop();
    process.exit(0);
  });
  
  // Emergency shutdown on uncaught errors
  process.on('uncaughtException', async (error) => {
    consola.error('💥 Uncaught Exception:', error);
    consola.warn('🚨 Emergency shutdown initiated...');
    await vincentTradingSystem.emergencyHalt();
    await vincentMCPServer.stop();
    process.exit(1);
  });
  
  process.on('unhandledRejection', async (reason, promise) => {
    consola.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    consola.warn('🚨 Emergency shutdown initiated...');
    await vincentTradingSystem.emergencyHalt();
    await vincentMCPServer.stop();
    process.exit(1);
  });
  
  try {
    // Start the Vincent MCP server
    await vincentMCPServer.start();
    
    // Start the Vincent trading system
    await vincentTradingSystem.start();
    
    // Keep running until manually stopped
    consola.info('🔄 Vincent Multi-Agent System running... Press Ctrl+C to stop');
    consola.info('🔗 MCP Server Info:', vincentMCPServer.getServerInfo());
    
    // Optional: Auto-stop after specific duration (for testing)
    if (process.env.AUTO_STOP_MINUTES) {
      const minutes = parseInt(process.env.AUTO_STOP_MINUTES);
      setTimeout(async () => {
        consola.info(`⏰ Auto-stopping after ${minutes} minutes...`);
        await vincentTradingSystem.stop();
        await vincentMCPServer.stop();
      }, minutes * 60 * 1000);
    }
    
  } catch (error) {
    consola.error('❌ Failed to start Vincent Multi-Agent System:', error);
    process.exit(1);
  }
}

// CLI argument handling
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Vincent AI Agent Hackathon - Multi-Agent Trading System

Usage: node vincent-hackathon-production.js [options]

Options:
  --help, -h                 Show this help message
  --balance <amount>         Set initial balance (default: 10000)
  --auto-stop <minutes>      Auto-stop after specified minutes
  --daily-limit <amount>     Set daily spending limit (default: 500)
  --mcp-port <port>          Set MCP server port (default: 8052)
  --mcp-transport <type>     Set MCP transport: stdio|http (default: http)

Environment Variables:
  VINCENT_DELEGATEE_PRIVATE_KEY    Required: Vincent wallet private key
  AUTO_STOP_MINUTES               Auto-stop after specified minutes
  MCP_PORT                        MCP server port
  MCP_TRANSPORT                   MCP transport type
  MCP_HOST                        MCP server host

Hackathon Categories:
  Best AI Agent ($2,500):    Multi-agent coordination with user sovereignty
  Best Tool ($2,500):        Reusable Vincent trading agent framework

Examples:
  node vincent-hackathon-production.js --balance 20000 --daily-limit 1000
  AUTO_STOP_MINUTES=60 node vincent-hackathon-production.js
  MCP_TRANSPORT=stdio node vincent-hackathon-production.js
`);
  process.exit(0);
}

// Parse CLI arguments
const balanceArg = process.argv.indexOf('--balance');
if (balanceArg !== -1 && process.argv[balanceArg + 1]) {
  VINCENT_HACKATHON_CONFIG.initialBalance = parseFloat(process.argv[balanceArg + 1]);
}

const dailyLimitArg = process.argv.indexOf('--daily-limit');
if (dailyLimitArg !== -1 && process.argv[dailyLimitArg + 1]) {
  VINCENT_HACKATHON_CONFIG.globalPolicyConstraints.spendingLimits.dailyLimit = parseFloat(process.argv[dailyLimitArg + 1]);
}

const mcpPortArg = process.argv.indexOf('--mcp-port');
if (mcpPortArg !== -1 && process.argv[mcpPortArg + 1]) {
  MCP_CONFIG.port = parseInt(process.argv[mcpPortArg + 1]);
}

const mcpTransportArg = process.argv.indexOf('--mcp-transport');
if (mcpTransportArg !== -1 && process.argv[mcpTransportArg + 1]) {
  MCP_CONFIG.transport = process.argv[mcpTransportArg + 1] as 'stdio' | 'http';
}

// Only run if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    consola.error('❌ Vincent Hackathon application failed:', error);
    process.exit(1);
  });
}