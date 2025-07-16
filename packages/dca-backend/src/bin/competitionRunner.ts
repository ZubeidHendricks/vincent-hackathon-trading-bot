#!/usr/bin/env node

/**
 * Competition Runner
 * Main entry point for hackathon trading competition
 */

import { program } from 'commander';
import consola from 'consola';

import { CompetitionTrader } from '../lib/competitionEngine/competitionTrader';

async function main() {
  program
    .name('competition-runner')
    .description('Autonomous Apes Hackathon Trading Bot')
    .version('1.0.0')
    .option('-d, --duration <hours>', 'Competition duration in hours', '24')
    .option('-b, --balance <amount>', 'Starting balance in USD', '10000')
    .option('-r, --risk <percent>', 'Risk per trade as percentage', '5')
    .option('--max-drawdown <percent>', 'Maximum allowed drawdown', '15')
    .option('--demo', 'Run in demo mode with simulated data')
    .option('--live', 'Run with live trading (DANGER: uses real money)')
    .parse();

  const options = program.opts();
  
  // Parse command line options
  const config = {
    competitionDuration: parseFloat(options.duration),
    initialBalance: parseFloat(options.balance),
    isDemo: options.demo === true || !options.live,
    isLive: options.live === true,
    maxDrawdown: parseFloat(options.maxDrawdown) / 100,
    riskPerTrade: parseFloat(options.risk) / 100
  };

  consola.info('🤖 Autonomous Apes Trading Bot - Competition Mode');
  consola.info('=' .repeat(50));
  consola.info(`Mode: ${config.isLive ? '🔴 LIVE TRADING' : '🟡 DEMO MODE'}`);
  consola.info(`Duration: ${config.competitionDuration} hours`);
  consola.info(`Starting Balance: $${config.initialBalance.toLocaleString()}`);
  consola.info(`Risk per Trade: ${(config.riskPerTrade * 100).toFixed(1)}%`);
  consola.info(`Max Drawdown: ${(config.maxDrawdown * 100).toFixed(1)}%`);
  consola.info('=' .repeat(50));

  if (config.isLive) {
    consola.warn('⚠️  LIVE TRADING MODE ENABLED');
    consola.warn('⚠️  This will use real money and execute real trades');
    consola.warn('⚠️  Make sure you understand the risks');
    
    // In production, add confirmation prompt here
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Create and configure the competition trader
  const trader = new CompetitionTrader({
    competitionDuration: config.competitionDuration,
    initialBalance: config.initialBalance,
    maxDrawdown: config.maxDrawdown,
    riskPerTrade: config.riskPerTrade,
    tradingPairs: ['WETH', 'WBTC', 'UNI', 'LINK', 'AAVE'],
    updateFrequency: 10000 // 10 seconds
  });

  // Set up event listeners for real-time monitoring
  trader.on('competitionStarted', ({ config, startTime }) => {
    consola.success('🚀 Competition started!');
    consola.info(`Start time: ${new Date(startTime).toISOString()}`);
  });

  trader.on('tradeExecuted', (trade) => {
    const emoji = trade.action === 'BUY' ? '💰' : '💸';
    consola.info(`${emoji} ${trade.action}: ${trade.amount.toFixed(4)} ${trade.symbol} @ $${trade.price.toFixed(4)}`);
    consola.info(`   Strategy: ${trade.strategy} | Confidence: ${(trade.confidence * 100).toFixed(1)}%`);
    consola.info(`   TX: ${trade.txHash}`);
  });

  trader.on('tradeFailed', ({ error, trade }) => {
    consola.error(`❌ Trade failed: ${trade.symbol} ${trade.action}`, error.message);
  });

  trader.on('portfolioUpdate', ({ portfolioValue, positions }) => {
    const snapshot = trader.getPortfolioSnapshot();
    const pnlColor = snapshot.pnl >= 0 ? 'green' : 'red';
    
    // Log portfolio update every minute
    if (Date.now() % 60000 < 10000) { // Roughly every minute
      consola.info(`📊 Portfolio: $${portfolioValue.toFixed(2)} | P&L: ${snapshot.pnl >= 0 ? '+' : ''}$${snapshot.pnl.toFixed(2)} (${(snapshot.pnlPercent * 100).toFixed(2)}%)`);
      
      if (Object.keys(positions).length > 0) {
        consola.info(`   Positions: ${Object.entries(positions).map(([symbol, qty]) => `${symbol}: ${qty.toFixed(4)}`).join(', ')}`);
      }
    }
  });

  trader.on('competitionEnded', async ({ duration, finalSnapshot, tradeHistory }) => {
    consola.success('🏁 Competition completed!');
    consola.info('=' .repeat(50));
    consola.info('FINAL RESULTS');
    consola.info('=' .repeat(50));
    
    const metrics = trader.getPerformanceMetrics();
    
    consola.info(`Duration: ${duration.toFixed(2)} hours`);
    consola.info(`Final Value: $${finalSnapshot.totalValue.toFixed(2)}`);
    consola.info(`Total P&L: ${finalSnapshot.pnl >= 0 ? '+' : ''}$${finalSnapshot.pnl.toFixed(2)}`);
    consola.info(`Return: ${(finalSnapshot.pnlPercent * 100).toFixed(2)}%`);
    consola.info(`Max Drawdown: ${(finalSnapshot.maxDrawdown * 100).toFixed(2)}%`);
    consola.info(`Win Rate: ${(finalSnapshot.winRate * 100).toFixed(1)}%`);
    consola.info(`Total Trades: ${finalSnapshot.tradeCount}`);
    consola.info(`Sharpe Ratio: ${metrics.sharpeRatio.toFixed(3)}`);
    consola.info(`Profit Factor: ${metrics.profitFactor.toFixed(2)}`);
    
    consola.info('=' .repeat(50));
    
    // Performance rating
    const rating = getRatingFromReturn(finalSnapshot.pnlPercent);
    consola.info(`Performance Rating: ${rating.emoji} ${rating.text}`);
    
    // Save results to file
    await saveResultsToFile({
      config,
      duration,
      finalSnapshot,
      metrics,
      tradeHistory
    });
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    consola.info('\n🛑 Received shutdown signal, stopping competition...');
    await trader.stopCompetition();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    consola.info('\n🛑 Received termination signal, stopping competition...');
    await trader.stopCompetition();
    process.exit(0);
  });

  // Start the competition
  try {
    await trader.startCompetition();
    
    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    consola.error('Failed to start competition:', error);
    process.exit(1);
  }
}

function getRatingFromReturn(returnPercent: number): { emoji: string; text: string } {
  if (returnPercent >= 0.5) return { emoji: '🚀', text: 'EXCEPTIONAL (50%+)' };
  if (returnPercent >= 0.2) return { emoji: '🏆', text: 'EXCELLENT (20%+)' };
  if (returnPercent >= 0.1) return { emoji: '⭐', text: 'GREAT (10%+)' };
  if (returnPercent >= 0.05) return { emoji: '👍', text: 'GOOD (5%+)' };
  if (returnPercent >= 0) return { emoji: '✅', text: 'POSITIVE' };
  if (returnPercent >= -0.05) return { emoji: '😐', text: 'SLIGHT LOSS' };
  if (returnPercent >= -0.1) return { emoji: '😬', text: 'MODERATE LOSS' };
  return { emoji: '💥', text: 'SIGNIFICANT LOSS' };
}

async function saveResultsToFile(results: any): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `competition-results-${timestamp}.json`;
  
  try {
    const { writeFileSync } = await import('fs');
    writeFileSync(filename, JSON.stringify(results, null, 2));
    consola.success(`📁 Results saved to: ${filename}`);
  } catch (error) {
    consola.error('Failed to save results:', error);
  }
}

// Run the main function (ES module style)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    consola.error('Unhandled error:', error);
    process.exit(1);
  });
}