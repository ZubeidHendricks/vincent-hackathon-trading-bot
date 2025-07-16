#!/usr/bin/env node
/**
 * Production Multi-Agent Trading System Entry Point
 * Autonomous Apes Trading Competition - Production Mode
 */

import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import consola from 'consola';

import { MultiAgentTradingSystem } from './lib/agents/multiAgentSystem';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  // 8 seconds
competitionMode: true,
  
initialBalance: 10000,
  
riskLimits: {
    // 10%
maxDailyLoss: 0.05,     
    
maxDrawdown: 0.15, 
    // 15%
maxPositionSize: 0.10     // 5%
  }, 
  tradingPairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
  updateFrequency: 8000
};

async function main() {
  consola.info('🚀 Starting Production Multi-Agent Trading System');
  consola.info('💰 Target: $33,500+ Autonomous Apes Trading Competition');
  
  const tradingSystem = new MultiAgentTradingSystem(config);
  
  // Performance tracking
  let sessionStart = Date.now();
  let bestPnL = 0;
  let worstDrawdown = 0;
  
  // System event handlers
  tradingSystem.on('systemStarted', ({ config, startTime }) => {
    consola.success(`🎯 Multi-Agent System LIVE at ${new Date(startTime).toISOString()}`);
    consola.info(`📊 Configuration: ${config.tradingPairs.length} pairs, $${config.initialBalance} initial balance`);
  });
  
  tradingSystem.on('tradeExecuted', (trade) => {
    const pnl = trade.pnl || 0;
    consola.success(`✅ Trade executed: ${trade.action} ${trade.amount.toFixed(2)} @ ${trade.price.toFixed(4)} | P&L: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`);
  });
  
  tradingSystem.on('systemUpdate', ({ agentHealth, metrics, recentTrades }) => {
    const currentPnL = metrics.totalPnL;
    bestPnL = Math.max(bestPnL, currentPnL);
    worstDrawdown = Math.min(worstDrawdown, metrics.maxDrawdown);
    
    // Log comprehensive status every minute
    if (Date.now() - sessionStart > 60000) {
      sessionStart = Date.now();
      consola.info(`📈 Performance: Total Value: $${metrics.totalValue.toFixed(2)} | P&L: ${currentPnL >= 0 ? '+' : ''}$${currentPnL.toFixed(2)} (${(metrics.totalReturn * 100).toFixed(2)}%)`);
      consola.info(`📊 Trades: ${metrics.totalTrades} | Win Rate: ${(metrics.winRate * 100).toFixed(1)}% | Drawdown: ${(metrics.maxDrawdown * 100).toFixed(2)}%`);
      consola.info(`🤖 Agents: ${metrics.activeAgents} active | Uptime: ${(metrics.systemUptime).toFixed(2)}h`);
    }
  });
  
  tradingSystem.on('healthIssues', (issues) => {
    consola.warn('🏥 Agent health issues detected:', issues);
  });
  
  tradingSystem.on('systemStopped', ({ duration, finalMetrics, tradeHistory }) => {
    const finalPnL = finalMetrics.totalPnL;
    const finalReturn = finalMetrics.totalReturn;
    
    consola.info(`📊 SESSION COMPLETE - Duration: ${duration.toFixed(2)} hours`);
    consola.info(`💰 Final Portfolio Value: $${finalMetrics.totalValue.toFixed(2)}`);
    consola.info(`📈 Total P&L: ${finalPnL >= 0 ? '+' : ''}$${finalPnL.toFixed(2)} (${(finalReturn * 100).toFixed(2)}%)`);
    consola.info(`📊 Total Trades: ${finalMetrics.totalTrades} | Win Rate: ${(finalMetrics.winRate * 100).toFixed(1)}%`);
    consola.info(`📉 Max Drawdown: ${(finalMetrics.maxDrawdown * 100).toFixed(2)}%`);
    consola.info(`⚡ Sharpe Ratio: ${finalMetrics.sharpeRatio.toFixed(3)}`);
    
    // Save results
    const results = {
      performance: {
        finalValue: finalMetrics.totalValue,
        initialBalance: config.initialBalance,
        maxDrawdown: finalMetrics.maxDrawdown,
        sharpeRatio: finalMetrics.sharpeRatio,
        totalPnL: finalPnL,
        totalReturn: finalReturn,
        totalTrades: finalMetrics.totalTrades,
        winRate: finalMetrics.winRate
      },
      session: {
        duration,
        configuration: config,
        startTime: new Date().toISOString()
      },
      systemMetrics: finalMetrics,
      trades: tradeHistory
    };
    
    const resultsPath = path.join(__dirname, `../results/multi-agent-session-${Date.now()}.json`);
    try {
      writeFileSync(resultsPath, JSON.stringify(results, null, 2));
      consola.success(`💾 Results saved to: ${resultsPath}`);
    } catch (error) {
      consola.error('Failed to save results:', error);
    }
    
    // Competition summary
    if (finalReturn > 0.1) { // 10%+ return
      consola.success(`🏆 COMPETITION TARGET ACHIEVED! ${(finalReturn * 100).toFixed(2)}% return qualifies for multiple prize pools!`);
    } else if (finalReturn > 0.05) { // 5%+ return
      consola.info(`🎯 Good performance! ${(finalReturn * 100).toFixed(2)}% return - optimization needed for top prizes`);
    } else {
      consola.warn(`⚠️ Performance below target: ${(finalReturn * 100).toFixed(2)}% return - strategy adjustment needed`);
    }
  });
  
  // Graceful shutdown handlers
  process.on('SIGINT', async () => {
    consola.warn('🛑 Received SIGINT - Gracefully shutting down...');
    await tradingSystem.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    consola.warn('🛑 Received SIGTERM - Gracefully shutting down...');
    await tradingSystem.stop();
    process.exit(0);
  });
  
  // Emergency shutdown on uncaught errors
  process.on('uncaughtException', async (error) => {
    consola.error('💥 Uncaught Exception:', error);
    consola.warn('🚨 Emergency shutdown initiated...');
    await tradingSystem.emergencyStop();
    process.exit(1);
  });
  
  process.on('unhandledRejection', async (reason, promise) => {
    consola.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    consola.warn('🚨 Emergency shutdown initiated...');
    await tradingSystem.emergencyStop();
    process.exit(1);
  });
  
  try {
    // Start the trading system
    await tradingSystem.start();
    
    // Keep running until manually stopped
    consola.info('🔄 Multi-Agent Trading System running... Press Ctrl+C to stop');
    
    // Optional: Auto-stop after specific duration (for testing)
    if (process.env.AUTO_STOP_MINUTES) {
      const minutes = parseInt(process.env.AUTO_STOP_MINUTES);
      setTimeout(async () => {
        consola.info(`⏰ Auto-stopping after ${minutes} minutes...`);
        await tradingSystem.stop();
      }, minutes * 60 * 1000);
    }
    
  } catch (error) {
    consola.error('❌ Failed to start Multi-Agent Trading System:', error);
    process.exit(1);
  }
}

// CLI argument handling
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Multi-Agent Trading System - Production Mode

Usage: node multi-agent-production.js [options]

Options:
  --help, -h                 Show this help message
  --balance <amount>         Set initial balance (default: 10000)
  --auto-stop <minutes>      Auto-stop after specified minutes
  --risk-level <low|med|high> Set risk level (default: medium)

Environment Variables:
  AUTO_STOP_MINUTES         Auto-stop after specified minutes
  INITIAL_BALANCE          Set initial portfolio balance
  RISK_LEVEL               Set risk level (low, medium, high)

Examples:
  node multi-agent-production.js --balance 20000
  AUTO_STOP_MINUTES=60 node multi-agent-production.js
  RISK_LEVEL=high node multi-agent-production.js
`);
  process.exit(0);
}

// Parse CLI arguments
const balanceArg = process.argv.indexOf('--balance');
if (balanceArg !== -1 && process.argv[balanceArg + 1]) {
  config.initialBalance = parseFloat(process.argv[balanceArg + 1]);
}

const riskArg = process.argv.indexOf('--risk-level');
if (riskArg !== -1 && process.argv[riskArg + 1]) {
  const riskLevel = process.argv[riskArg + 1].toLowerCase();
  if (riskLevel === 'low') {
    config.riskLimits.maxDrawdown = 0.08;
    config.riskLimits.maxPositionSize = 0.05;
    config.riskLimits.maxDailyLoss = 0.03;
  } else if (riskLevel === 'high') {
    config.riskLimits.maxDrawdown = 0.25;
    config.riskLimits.maxPositionSize = 0.20;
    config.riskLimits.maxDailyLoss = 0.08;
  }
}

// Environment variable overrides
if (process.env.INITIAL_BALANCE) {
  config.initialBalance = parseFloat(process.env.INITIAL_BALANCE);
}

if (process.env.RISK_LEVEL) {
  const riskLevel = process.env.RISK_LEVEL.toLowerCase();
  if (riskLevel === 'low') {
    config.riskLimits.maxDrawdown = 0.08;
    config.riskLimits.maxPositionSize = 0.05;
    config.riskLimits.maxDailyLoss = 0.03;
  } else if (riskLevel === 'high') {
    config.riskLimits.maxDrawdown = 0.25;
    config.riskLimits.maxPositionSize = 0.20;
    config.riskLimits.maxDailyLoss = 0.08;
  }
}

// Only run if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    consola.error('❌ Application failed:', error);
    process.exit(1);
  });
}