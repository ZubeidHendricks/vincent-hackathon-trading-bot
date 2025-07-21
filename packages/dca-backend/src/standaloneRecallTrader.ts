#!/usr/bin/env tsx
/**
 * Standalone Vincent Recall Network Trader
 * Independent of the full environment setup - perfect for testing
 */
import { consola } from 'consola';

// Recall Network Configuration
const RECALL_CONFIG = {
  sandbox: {
    baseUrl: 'https://api.sandbox.competitions.recall.network',
    apiKey: 'a3f5a86721cc7b41_980608531aaaa82f'
  },
  production: {
    baseUrl: 'https://api.competitions.recall.network',
    apiKey: '2bf3ce7bdca9b965_e88602a160595172'
  }
};

// Token addresses (Ethereum mainnet - used in sandbox fork)
const TOKENS = {
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
};

class StandaloneRecallTrader {
  private config: { baseUrl: string; apiKey: string };
  private agentId: string | null = null;
  private tradeHistory: any[] = [];

  constructor(environment: 'sandbox' | 'production' = 'sandbox') {
    this.config = RECALL_CONFIG[environment];
    consola.info(`🌐 Using ${environment.toUpperCase()} environment`);
    consola.info(`🔑 API Key: ${this.config.apiKey.substring(0, 8)}...`);
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Vincent-Hackathon-Trading-Bot/1.0.0',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async initialize(): Promise<void> {
    try {
      // Test connection
      const health = await this.makeRequest('/health');
      consola.success('✅ Connected to Recall Network:', health);

      // Do a verification trade to get agent ID
      const verificationTrade = await this.makeRequest('/api/trade/execute', {
        method: 'POST',
        body: JSON.stringify({
          fromToken: TOKENS.USDC,
          toToken: TOKENS.WETH,
          amount: '1',
          reason: 'Vincent Agent Initialization - ID Verification'
        })
      });

      this.agentId = verificationTrade.transaction.agentId;
      consola.success(`🤖 Agent ID: ${this.agentId}`);

    } catch (error) {
      consola.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  async executeTrade(params: {
    fromToken: string;
    toToken: string; 
    amount: string;
    reason: string;
  }): Promise<any> {
    try {
      const fromSymbol = this.getTokenSymbol(params.fromToken);
      const toSymbol = this.getTokenSymbol(params.toToken);

      consola.info(`💱 Executing trade: ${params.amount} ${fromSymbol} → ${toSymbol}`);
      consola.info(`   Reason: ${params.reason}`);

      const result = await this.makeRequest('/api/trade/execute', {
        method: 'POST',
        body: JSON.stringify(params)
      });

      const tx = result.transaction;
      consola.success('✅ Trade successful!');
      consola.info(`   ID: ${tx.id}`);
      consola.info(`   Received: ${tx.toAmount} ${tx.toTokenSymbol}`);
      consola.info(`   Price: ${tx.price}`);
      consola.info(`   USD Value: $${tx.tradeAmountUsd.toFixed(2)}`);

      this.tradeHistory.push(result);
      return result;

    } catch (error) {
      consola.error('❌ Trade failed:', error);
      throw error;
    }
  }

  async executeDCAStrategy(params: {
    fromToken: string;
    toToken: string;
    totalAmount: number;
    intervals: number;
    delayMs: number;
  }): Promise<void> {
    const amountPerTrade = (params.totalAmount / params.intervals).toString();
    const fromSymbol = this.getTokenSymbol(params.fromToken);
    const toSymbol = this.getTokenSymbol(params.toToken);

    consola.info('📊 Starting DCA Strategy:');
    consola.info(`   ${params.totalAmount} ${fromSymbol} → ${toSymbol}`);
    consola.info(`   ${params.intervals} trades of ${amountPerTrade} each`);
    consola.info(`   ${params.delayMs/1000}s between trades`);

    for (let i = 1; i <= params.intervals; i++) {
      try {
        consola.info(`\n🔄 DCA Trade ${i}/${params.intervals}`);
        
        await this.executeTrade({
          fromToken: params.fromToken,
          toToken: params.toToken,
          amount: amountPerTrade,
          reason: `Vincent DCA Strategy - Trade ${i}/${params.intervals}`
        });

        if (i < params.intervals) {
          consola.info(`⏳ Waiting ${params.delayMs/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, params.delayMs));
        }

      } catch (error) {
        consola.warn(`⚠️ DCA trade ${i} failed, continuing...`);
      }
    }

    consola.success('\n🎉 DCA Strategy completed!');
    this.printSummary();
  }

  async executePortfolioStrategy(): Promise<void> {
    const trades = [
      {
        fromToken: TOKENS.USDC,
        toToken: TOKENS.WETH,
        amount: '50',
        reason: 'Portfolio Strategy - ETH Position'
      },
      {
        fromToken: TOKENS.USDC,
        toToken: TOKENS.WBTC,
        amount: '30',
        reason: 'Portfolio Strategy - BTC Position'
      },
      {
        fromToken: TOKENS.USDC,
        toToken: TOKENS.DAI,
        amount: '20',
        reason: 'Portfolio Strategy - Stablecoin Diversification'
      }
    ];

    consola.info('🏛️ Executing Portfolio Strategy...');
    
    for (let i = 0; i < trades.length; i++) {
      try {
        consola.info(`\n📊 Portfolio Trade ${i + 1}/${trades.length}`);
        await this.executeTrade(trades[i]);
        
        if (i < trades.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        consola.warn(`⚠️ Portfolio trade ${i + 1} failed, continuing...`);
      }
    }

    consola.success('\n🎉 Portfolio Strategy completed!');
    this.printSummary();
  }

  printSummary(): void {
    if (this.tradeHistory.length === 0) {
      consola.info('📋 No trades executed');
      return;
    }

    let totalVolume = 0;
    let successfulTrades = 0;

    consola.info('\n📊 TRADING SUMMARY');
    consola.info('═══════════════════════════════════════');

    this.tradeHistory.forEach((trade, index) => {
      const tx = trade.transaction;
      totalVolume += tx.tradeAmountUsd;
      successfulTrades++;

      consola.info(`${index + 1}. ${tx.fromAmount} ${tx.fromTokenSymbol} → ${tx.toAmount} ${tx.toTokenSymbol}`);
      consola.info(`   USD Value: $${tx.tradeAmountUsd.toFixed(2)} | Price: ${tx.price}`);
    });

    consola.info('═══════════════════════════════════════');
    consola.info(`📈 Total Volume: $${totalVolume.toFixed(2)}`);
    consola.info(`✅ Successful Trades: ${successfulTrades}`);
    consola.info(`🤖 Agent ID: ${this.agentId}`);
    consola.info(`🏆 Environment: ${this.config.baseUrl.includes('sandbox') ? 'SANDBOX' : 'PRODUCTION'}`);
  }

  private getTokenSymbol(address: string): string {
    const symbols: { [key: string]: string } = {
      [TOKENS.USDC]: 'USDC',
      [TOKENS.WETH]: 'WETH',
      [TOKENS.USDT]: 'USDT', 
      [TOKENS.DAI]: 'DAI',
      [TOKENS.WBTC]: 'WBTC'
    };
    return symbols[address] || address.substring(0, 6) + '...';
  }
}

// Demo Functions
async function runSimpleDemo() {
  consola.start('🎯 Simple Trade Demo');
  
  const trader = new StandaloneRecallTrader('sandbox');
  await trader.initialize();

  await trader.executeTrade({
    fromToken: TOKENS.USDC,
    toToken: TOKENS.WETH,
    amount: '25',
    reason: 'Vincent Simple Trade Demo'
  });

  trader.printSummary();
}

async function runDCADemo() {
  consola.start('📊 DCA Strategy Demo');
  
  const trader = new StandaloneRecallTrader('sandbox');
  await trader.initialize();

  await trader.executeDCAStrategy({
    fromToken: TOKENS.USDC,
    toToken: TOKENS.WETH,
    totalAmount: 40,
    intervals: 4,
    delayMs: 3000
  });
}

async function runPortfolioDemo() {
  consola.start('🏛️ Portfolio Strategy Demo');
  
  const trader = new StandaloneRecallTrader('sandbox');
  await trader.initialize();

  await trader.executePortfolioStrategy();
}

async function runProductionTest() {
  consola.start('🏭 Production Environment Test');
  
  const trader = new StandaloneRecallTrader('production');
  
  try {
    // Only test connection, no actual trades
    const health = await trader.makeRequest('/health');
    consola.success('✅ Production connection verified:', health);
    
    consola.info('🚨 PRODUCTION READY - Switch to production when you want to compete for real!');
    
  } catch (error) {
    consola.error('❌ Production test failed:', error);
  }
}

// Main execution
async function main() {
  const demo = process.argv[2] || 'simple';
  
  consola.info(`🚀 Vincent Hackathon Trading Bot - Recall Network Integration`);
  consola.info(`📅 ${new Date().toISOString()}`);
  
  try {
    switch (demo) {
      case 'simple':
        await runSimpleDemo();
        break;
      case 'dca':
        await runDCADemo();
        break;
      case 'portfolio':
        await runPortfolioDemo();
        break;
      case 'production':
        await runProductionTest();
        break;
      default:
        consola.error('❌ Unknown demo. Use: simple, dca, portfolio, or production');
        process.exit(1);
    }
    
    consola.success('\n🎉 Demo completed successfully!');
    consola.info('\n🏆 Your agent is ready for the Recall Network competition!');
    
  } catch (error) {
    consola.error('\n❌ Demo failed:', error);
    
    if (error.message.includes('insufficient balance')) {
      consola.info('\n💡 Get test tokens: https://faucet.recall.network');
    }
    
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(consola.error);
}