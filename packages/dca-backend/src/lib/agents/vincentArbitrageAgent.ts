/**
 * Vincent-Enhanced Arbitrage Agent
 * Cross-exchange arbitrage opportunities with user-controlled permissions
 */

import { VincentBaseAgent, VincentAgentConfig, VincentTradeExecution } from './vincentBaseAgent';
import { MarketData, TradingSignal } from '../strategies/index';
import consola from 'consola';

interface ArbitrageOpportunity {
  exchange1: string;
  exchange2: string;
  asset: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  spreadPercentage: number;
  volume: number;
  confidence: number;
}

interface ArbitrageParams {
  minSpreadPercentage: number;
  maxSlippage: number;
  minVolume: number;
  maxPositionSize: number;
  exchangeFees: Map<string, number>;
}

export class VincentArbitrageAgent extends VincentBaseAgent {
  private params: ArbitrageParams;
  private priceFeeds: Map<string, Map<string, MarketData>> = new Map(); // exchange -> asset -> data
  private lastOpportunityTime: number = 0;
  private detectedOpportunities: ArbitrageOpportunity[] = [];

  constructor(config: VincentAgentConfig) {
    super(config);
    
    this.params = {
      minSpreadPercentage: 0.5, // 0.5% minimum spread
      maxSlippage: 0.3, // 0.3% max slippage
      minVolume: 1000, // $1000 minimum volume
      maxPositionSize: 0.1, // 10% max position
      exchangeFees: new Map([
        ['exchange1', 0.001], // 0.1% fee
        ['exchange2', 0.0015], // 0.15% fee
        ['exchange3', 0.002]  // 0.2% fee
      ])
    };

    consola.info(`🔀 Vincent Arbitrage Agent initialized - Focus: Policy-Governed Cross-Exchange Trading`);
  }

  async analyzeMarket(data: MarketData): Promise<TradingSignal> {
    try {
      // Update price feeds
      this.updatePriceFeeds(data);
      
      // Detect arbitrage opportunities
      const opportunities = this.detectArbitrageOpportunities();
      this.detectedOpportunities = opportunities;
      
      if (opportunities.length === 0) {
        return this.createHoldSignal('No profitable arbitrage opportunities detected');
      }

      // Select best opportunity
      const bestOpportunity = this.selectBestOpportunity(opportunities);
      
      // Generate trading signal
      const signal = this.generateArbitrageSignal(bestOpportunity, data);
      
      // Validate against Vincent policies
      const validation = await this.validateSignalWithPolicy(signal);
      
      if (!validation.isValid) {
        return this.createHoldSignal(`Policy violation: ${validation.violations.join(', ')}`);
      }

      if (validation.requiresApproval) {
        signal.reason += ` (User approval required: ${validation.riskAssessment})`;
      }

      return signal;

    } catch (error) {
      consola.error('Vincent Arbitrage Agent analysis failed:', error);
      return this.createHoldSignal(`Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private updatePriceFeeds(data: MarketData): void {
    // Simulate multiple exchange data
    const exchanges = ['binance', 'coinbase', 'kraken'];
    const symbol = data.symbol || 'BTC/USDT';
    
    exchanges.forEach((exchange, index) => {
      if (!this.priceFeeds.has(exchange)) {
        this.priceFeeds.set(exchange, new Map());
      }
      
      // Simulate slight price differences between exchanges
      const priceVariation = (Math.random() - 0.5) * 0.01; // ±0.5% variation
      const adjustedPrice = data.price * (1 + priceVariation);
      
      const exchangeData: MarketData = {
        ...data,
        price: adjustedPrice,
        timestamp: Date.now()
      };
      
      this.priceFeeds.get(exchange)!.set(symbol, exchangeData);
    });
  }

  private detectArbitrageOpportunities(): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    const exchanges = Array.from(this.priceFeeds.keys());
    const symbols = ['BTC/USDT', 'ETH/USDT']; // Limited for demo

    // Check all exchange pairs
    for (let i = 0; i < exchanges.length; i++) {
      for (let j = i + 1; j < exchanges.length; j++) {
        const exchange1 = exchanges[i];
        const exchange2 = exchanges[j];
        
        for (const symbol of symbols) {
          const data1 = this.priceFeeds.get(exchange1)?.get(symbol);
          const data2 = this.priceFeeds.get(exchange2)?.get(symbol);
          
          if (data1 && data2) {
            const opportunity = this.calculateArbitrageOpportunity(
              exchange1, exchange2, symbol, data1, data2
            );
            
            if (opportunity && this.isOpportunityProfitable(opportunity)) {
              opportunities.push(opportunity);
            }
          }
        }
      }
    }

    return opportunities.sort((a, b) => b.spreadPercentage - a.spreadPercentage);
  }

  private calculateArbitrageOpportunity(
    exchange1: string,
    exchange2: string,
    symbol: string,
    data1: MarketData,
    data2: MarketData
  ): ArbitrageOpportunity | null {
    const price1 = data1.price;
    const price2 = data2.price;
    
    // Determine buy/sell exchanges
    let buyExchange, sellExchange, buyPrice, sellPrice;
    if (price1 < price2) {
      buyExchange = exchange1;
      sellExchange = exchange2;
      buyPrice = price1;
      sellPrice = price2;
    } else {
      buyExchange = exchange2;
      sellExchange = exchange1;
      buyPrice = price2;
      sellPrice = price1;
    }

    const rawSpread = sellPrice - buyPrice;
    const spreadPercentage = (rawSpread / buyPrice) * 100;
    
    // Account for fees
    const buyFee = this.params.exchangeFees.get(buyExchange) || 0.001;
    const sellFee = this.params.exchangeFees.get(sellExchange) || 0.001;
    const totalFees = (buyFee + sellFee) * 100; // Convert to percentage
    
    const netSpreadPercentage = spreadPercentage - totalFees - this.params.maxSlippage;
    
    if (netSpreadPercentage <= 0) return null;

    const minVolume = Math.min(data1.volume24h, data2.volume24h);
    const confidence = this.calculateArbitrageConfidence(netSpreadPercentage, minVolume);

    return {
      exchange1: buyExchange,
      exchange2: sellExchange,
      asset: symbol,
      buyPrice,
      sellPrice,
      spread: rawSpread,
      spreadPercentage: netSpreadPercentage,
      volume: minVolume,
      confidence
    };
  }

  private isOpportunityProfitable(opportunity: ArbitrageOpportunity): boolean {
    return opportunity.spreadPercentage >= this.params.minSpreadPercentage &&
           opportunity.volume >= this.params.minVolume &&
           opportunity.confidence > 0.6;
  }

  private calculateArbitrageConfidence(spreadPercentage: number, volume: number): number {
    // Higher spread = higher confidence
    const spreadConfidence = Math.min(1, spreadPercentage / 2); // Max at 2% spread
    
    // Higher volume = higher confidence  
    const volumeConfidence = Math.min(1, volume / 10000); // Max at $10k volume
    
    // Time decay - fresher opportunities are more confident
    const timeFactor = Math.max(0.5, 1 - ((Date.now() - this.lastOpportunityTime) / 60000)); // Decay over 1 minute
    
    return (spreadConfidence * 0.5 + volumeConfidence * 0.3 + timeFactor * 0.2);
  }

  private selectBestOpportunity(opportunities: ArbitrageOpportunity[]): ArbitrageOpportunity {
    // Already sorted by spread percentage, return the best
    return opportunities[0];
  }

  private generateArbitrageSignal(opportunity: ArbitrageOpportunity, data: MarketData): TradingSignal {
    // Vincent policy-aware position sizing
    const spendingStatus = this.getSpendingStatus();
    const maxTradeAmount = Math.min(
      spendingStatus.daily.remaining * 0.3, // Use max 30% of remaining daily limit
      this.policyConstraints.spendingLimits.perTradeLimit
    );

    if (maxTradeAmount <= 0) {
      return this.createHoldSignal('Daily spending limit reached');
    }

    // Calculate optimal position size
    const baseAmount = 500; // Base arbitrage amount
    const confidenceMultiplier = opportunity.confidence;
    const allocationMultiplier = this.config.allocation / 100;
    
    const amount = Math.min(
      baseAmount * confidenceMultiplier * allocationMultiplier,
      maxTradeAmount,
      opportunity.volume * 0.1 // Don't exceed 10% of available volume
    );

    const reasoning = `Arbitrage: Buy ${opportunity.asset} on ${opportunity.exchange1} at $${opportunity.buyPrice.toFixed(2)}, ` +
                     `sell on ${opportunity.exchange2} at $${opportunity.sellPrice.toFixed(2)}. ` +
                     `Net spread: ${opportunity.spreadPercentage.toFixed(2)}% after fees. ` +
                     `Vincent Policy: $${amount.toFixed(2)} within daily limit $${spendingStatus.daily.remaining.toFixed(2)}`;

    return {
      action: 'BUY', // We start with buying on the cheaper exchange
      confidence: opportunity.confidence,
      amount,
      reason: reasoning,
      strategy: 'vincent-arbitrage-trading'
    };
  }

  private createHoldSignal(reason: string): TradingSignal {
    return {
      action: 'HOLD',
      confidence: 0.1,
      amount: 0,
      reason,
      strategy: 'vincent-arbitrage-hold'
    };
  }

  // Vincent-enhanced trade execution for arbitrage
  async executeTrade(signal: TradingSignal): Promise<VincentTradeExecution> {
    consola.info(`🔀 Vincent Arbitrage Agent executing: ${signal.action} ${signal.amount.toFixed(2)} (${(signal.confidence * 100).toFixed(1)}% confidence)`);
    
    try {
      // For arbitrage, we need to execute on multiple exchanges
      const execution = await this.executeVincentTrade(signal);
      
      // Update opportunity tracking
      this.lastOpportunityTime = Date.now();
      
      return execution;
      
    } catch (error) {
      consola.error('Vincent Arbitrage Agent trade execution failed:', error);
      throw error;
    }
  }

  // Enhanced metrics for Vincent arbitrage
  getArbitrageMetrics(): any {
    const baseMetrics = this.getStrategySpecificMetrics();
    const vincentHealth = this.getVincentHealthStatus();
    const spendingStatus = this.getSpendingStatus();
    
    return {
      ...baseMetrics,
      vincent: {
        ...vincentHealth.vincent,
        spendingUtilization: {
          daily: (spendingStatus.daily.used / spendingStatus.daily.limit * 100).toFixed(1) + '%',
          monthly: (spendingStatus.monthly.used / spendingStatus.monthly.limit * 100).toFixed(1) + '%'
        },
        policyCompliance: vincentHealth.vincent.policyCompliance
      },
      arbitrage: {
        opportunitiesDetected: this.detectedOpportunities.length,
        averageSpread: this.detectedOpportunities.length > 0 ? 
          (this.detectedOpportunities.reduce((sum, op) => sum + op.spreadPercentage, 0) / this.detectedOpportunities.length).toFixed(2) + '%' : '0%',
        lastOpportunityTime: this.lastOpportunityTime,
        priceFeeds: this.priceFeeds.size,
        exchangesMonitored: Array.from(this.priceFeeds.keys()),
        currentParams: this.params
      }
    };
  }

  // Update arbitrage parameters
  async updateArbitrageParameters(newParams: Partial<ArbitrageParams>): Promise<void> {
    this.params = { ...this.params, ...newParams };
    consola.info(`🔄 Vincent Arbitrage Agent parameters updated`);
  }
}