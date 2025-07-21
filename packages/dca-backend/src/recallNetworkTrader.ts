#!/usr/bin/env tsx
/**
 * Vincent Hackathon Trading Bot - Recall Network Integration
 * Simple trading script for the competition
 */
import { recallNetworkClient } from './lib/recallNetwork/index.js';
import { consola } from 'consola';

// Common token addresses (Ethereum mainnet, used in sandbox fork)
const TOKENS = {
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
};

interface TradeStrategy {
  name: string;
  fromToken: string;
  toToken: string;
  amount: string;
  reason: string;
}

class VincentRecallNetworkTrader {
  private agentId: string | null = null;
  private tradeHistory: any[] = [];

  constructor(
    private environment: 'sandbox' | 'production' = 'sandbox'
  ) {
    if (environment === 'production') {
      recallNetworkClient.switchToProduction();
    } else {
      recallNetworkClient.switchToSandbox();
    }
  }

  /**
   * Initialize the trading agent
   */
  async initialize(): Promise<void> {
    consola.info('🚀 Initializing Vincent Recall Network Trader...');
    
    try {
      // Health check
      const health = await recallNetworkClient.healthCheck();
      consola.success('✅ Connected to Recall Network:', health);

      // Register agent
      const registration = await recallNetworkClient.registerAgent([
        'autonomous-trading',
        'dca-strategy',
        'momentum-trading',
        'risk-management'
      ]);

      this.agentId = registration.agentId;
      consola.success(`✅ Agent registered: ${this.agentId}`);
      consola.info(`🏆 Environment: ${recallNetworkClient.getCurrentEnvironment()}`);

    } catch (error) {
      consola.error('❌ Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Execute a single trade
   */
  async executeTrade(strategy: TradeStrategy): Promise<any> {
    try {
      consola.info(`💱 Executing ${strategy.name}...`);
      consola.info(`   From: ${strategy.amount} ${this.getTokenSymbol(strategy.fromToken)}`);
      consola.info(`   To: ${this.getTokenSymbol(strategy.toToken)}`);

      const result = await recallNetworkClient.executeTrade({
        fromToken: strategy.fromToken,
        toToken: strategy.toToken,
        amount: strategy.amount,
        reason: strategy.reason
      });

      // Log trade result
      const transaction = result.transaction;
      consola.success('✅ Trade executed successfully!');
      consola.info(`   Transaction ID: ${transaction.id}`);
      consola.info(`   Amount received: ${transaction.toAmount} ${transaction.toTokenSymbol}`);
      consola.info(`   Price: ${transaction.price}`);
      consola.info(`   USD Value: $${transaction.tradeAmountUsd.toFixed(2)}`);

      this.tradeHistory.push(result);
      return result;

    } catch (error) {
      consola.error(`❌ Trade failed:`, error);
      throw error;
    }
  }

  /**
   * Execute a DCA (Dollar Cost Averaging) strategy
   */
  async executeDCAStrategy(params: {
    fromToken: string;
    toToken: string;
    totalAmount: number;
    intervals: number;
    intervalDelay: number; // milliseconds
  }): Promise<void> {
    const amountPerTrade = (params.totalAmount / params.intervals).toString();
    
    consola.info('📊 Starting DCA Strategy:');
    consola.info(`   Total Amount: ${params.totalAmount} ${this.getTokenSymbol(params.fromToken)}`);
    consola.info(`   Intervals: ${params.intervals}`);
    consola.info(`   Amount per trade: ${amountPerTrade}`);

    for (let i = 1; i <= params.intervals; i++) {
      const strategy: TradeStrategy = {
        name: `DCA Trade ${i}/${params.intervals}`,
        fromToken: params.fromToken,
        toToken: params.toToken,
        amount: amountPerTrade,
        reason: `Vincent DCA Strategy - Interval ${i}/${params.intervals}`
      };

      try {
        await this.executeTrade(strategy);
        
        // Wait before next trade (except for the last one)
        if (i < params.intervals) {
          consola.info(`⏳ Waiting ${params.intervalDelay/1000}s before next trade...`);
          await new Promise(resolve => setTimeout(resolve, params.intervalDelay));
        }
      } catch (error) {
        consola.error(`❌ DCA trade ${i} failed, continuing with next...`);
      }
    }

    consola.success('🎉 DCA Strategy completed!');
    this.printTradeHistory();
  }

  /**
   * Execute multiple trading strategies
   */
  async executePortfolioStrategy(): Promise<void> {
    const strategies: TradeStrategy[] = [
      {
        name: 'USDC → WETH (Large)',
        fromToken: TOKENS.USDC,
        toToken: TOKENS.WETH,
        amount: '100',
        reason: 'Vincent Portfolio Strategy - ETH Allocation'
      },
      {
        name: 'USDC → WBTC (Medium)',
        fromToken: TOKENS.USDC,
        toToken: TOKENS.WBTC,
        amount: '50',
        reason: 'Vincent Portfolio Strategy - BTC Allocation'
      },
      {
        name: 'USDC → DAI (Small)',
        fromToken: TOKENS.USDC,
        toToken: TOKENS.DAI,
        amount: '25',
        reason: 'Vincent Portfolio Strategy - Stablecoin Diversification'
      }
    ];

    consola.info('📊 Executing Portfolio Strategy...');
    
    for (const strategy of strategies) {
      try {
        await this.executeTrade(strategy);
        // Small delay between trades
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        consola.warn(`⚠️ Skipping failed trade: ${strategy.name}`);
      }
    }

    consola.success('🎉 Portfolio Strategy completed!');
    this.printTradeHistory();
  }

  /**
   * Print trade history summary
   */
  printTradeHistory(): void {
    if (this.tradeHistory.length === 0) {
      consola.info('📋 No trades executed yet');
      return;
    }

    consola.info('📋 Trade History Summary:');
    let totalUSDValue = 0;

    this.tradeHistory.forEach((trade, index) => {
      const tx = trade.transaction;
      totalUSDValue += tx.tradeAmountUsd;
      
      consola.info(`   ${index + 1}. ${tx.fromTokenSymbol} → ${tx.toTokenSymbol}`);
      consola.info(`      Amount: ${tx.fromAmount} → ${tx.toAmount}`);
      consola.info(`      USD Value: $${tx.tradeAmountUsd.toFixed(2)}`);
    });

    consola.info(`📊 Total Trading Volume: $${totalUSDValue.toFixed(2)}`);
    consola.info(`🤖 Agent ID: ${this.agentId}`);
    consola.info(`🏆 Environment: ${recallNetworkClient.getCurrentEnvironment()}`);
  }

  /**
   * Get token symbol for display
   */
  private getTokenSymbol(address: string): string {
    const symbols: { [key: string]: string } = {
      [TOKENS.USDC]: 'USDC',
      [TOKENS.WETH]: 'WETH', 
      [TOKENS.USDT]: 'USDT',
      [TOKENS.DAI]: 'DAI',
      [TOKENS.WBTC]: 'WBTC'
    };
    return symbols[address] || address.substring(0, 8) + '...';
  }
}

/**
 * Demo functions for different trading scenarios
 */

async function runSimpleTradeDemo() {
  consola.start('🎯 Running Simple Trade Demo');
  
  const trader = new VincentRecallNetworkTrader('sandbox');
  await trader.initialize();

  // Execute a simple trade
  await trader.executeTrade({
    name: 'Simple USDC → WETH Trade',
    fromToken: TOKENS.USDC,
    toToken: TOKENS.WETH,
    amount: '20',
    reason: 'Vincent Simple Trade Demo'
  });
}

async function runDCADemo() {
  consola.start('📊 Running DCA Strategy Demo');
  
  const trader = new VincentRecallNetworkTrader('sandbox');
  await trader.initialize();

  // Execute DCA strategy
  await trader.executeDCAStrategy({
    fromToken: TOKENS.USDC,
    toToken: TOKENS.WETH,
    totalAmount: 50, // $50 total
    intervals: 5,    // 5 trades
    intervalDelay: 3000 // 3 seconds between trades
  });
}

async function runPortfolioDemo() {
  consola.start('🏛️ Running Portfolio Strategy Demo');
  
  const trader = new VincentRecallNetworkTrader('sandbox');
  await trader.initialize();

  await trader.executePortfolioStrategy();
}

// Main execution
async function main() {
  const strategy = process.argv[2] || 'simple';
  
  try {
    switch (strategy) {
      case 'simple':
        await runSimpleTradeDemo();
        break;
      case 'dca':
        await runDCADemo();
        break;
      case 'portfolio':
        await runPortfolioDemo();
        break;
      default:
        consola.error('❌ Unknown strategy. Use: simple, dca, or portfolio');
        process.exit(1);
    }
    
    consola.success('🎉 Trading demo completed successfully!');
    
  } catch (error) {
    consola.error('❌ Trading demo failed:', error);
    process.exit(1);
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(consola.error);
}