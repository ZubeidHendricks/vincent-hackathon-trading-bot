/**
 * Arbitrage Trading Agent
 * Autonomous agent specializing in cross-exchange and cross-asset arbitrage
 */

import { BaseAgent, AgentConfig, AgentMessage } from './baseAgent';
import { MarketData, TradingSignal } from '../strategies/index';
import consola from 'consola';

interface ArbitrageParams {
  minProfitThreshold: number;
  maxSlippage: number;
  maxGasCostPercent: number;
  exchanges: string[];
  maxExecutionTime: number;
  triangularThreshold: number;
}

interface ExchangePrice {
  exchange: string;
  price: number;
  liquidity: number;
  gasEstimate: number;
  timestamp: number;
  spread: number;
}

interface ArbitrageOpportunity {
  type: 'SIMPLE' | 'TRIANGULAR' | 'CROSS_CHAIN';
  buyExchange: string;
  sellExchange: string;
  profitPercent: number;
  netProfit: number;
  confidence: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedExecutionTime: number;
}

export class ArbitrageAgent extends BaseAgent {
  private params: ArbitrageParams;
  private exchangePrices: Map<string, ExchangePrice[]> = new Map();
  private gasTracker: Map<string, number> = new Map();
  private opportunityHistory: ArbitrageOpportunity[] = [];
  private executionQueue: ArbitrageOpportunity[] = [];

  constructor(config: AgentConfig) {
    super(config);
    
    this.params = {
      minProfitThreshold: 0.003, // 0.3%
      maxSlippage: 0.01, // 1%
      maxGasCostPercent: 0.002, // 0.2%
      exchanges: ['uniswap', 'sushiswap', 'curve', 'balancer', 'pancakeswap'],
      maxExecutionTime: 30000, // 30 seconds
      triangularThreshold: 0.005 // 0.5%
    };

    // Initialize exchange tracking
    this.params.exchanges.forEach(exchange => {
      this.exchangePrices.set(exchange, []);
      this.gasTracker.set(exchange, 0);
    });

    consola.info(`⚖️ Arbitrage Agent initialized - Focus: Cross-Exchange Opportunities`);
    
    // Start gas price monitoring
    this.startGasMonitoring();
  }

  async analyzeMarket(data: MarketData): Promise<TradingSignal> {
    try {
      // Update exchange prices
      await this.updateExchangePrices(data);
      
      // Find arbitrage opportunities
      const opportunities = await this.scanArbitrageOpportunities(data.symbol);
      
      if (opportunities.length === 0) {
        return this.createHoldSignal('No profitable arbitrage opportunities found');
      }

      // Select best opportunity
      const bestOpportunity = this.selectBestOpportunity(opportunities);
      
      if (!bestOpportunity || bestOpportunity.profitPercent < this.params.minProfitThreshold) {
        return this.createHoldSignal(
          `Best opportunity: ${bestOpportunity ? (bestOpportunity.profitPercent * 100).toFixed(3) : 0}% below threshold`
        );
      }

      // Validate opportunity is still valid
      if (await this.validateOpportunity(bestOpportunity)) {
        return this.generateArbitrageSignal(bestOpportunity, data);
      } else {
        return this.createHoldSignal('Arbitrage opportunity expired during validation');
      }

    } catch (error) {
      consola.error('Arbitrage Agent analysis failed:', error);
      return this.createHoldSignal(`Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processMessage(message: AgentMessage): Promise<void> {
    switch (message.type) {
      case 'COORDINATION':
        await this.handleCoordinationMessage(message);
        break;
      case 'RISK_ALERT':
        await this.handleRiskAlert(message);
        break;
      case 'MARKET_UPDATE':
        await this.handleMarketUpdate(message);
        break;
      default:
        consola.debug(`Arbitrage Agent received unhandled message type: ${message.type}`);
    }
  }

  validateSignal(signal: TradingSignal): boolean {
    // Arbitrage-specific validation
    if (signal.confidence < 0.4) return false;
    if (signal.action === 'HOLD') return true;
    
    // Ensure signal represents a valid arbitrage opportunity
    const hasArbitrageReason = signal.reason.toLowerCase().includes('arbitrage') ||
                              signal.reason.toLowerCase().includes('spread') ||
                              signal.reason.toLowerCase().includes('profit');
    
    // Arbitrage should have high confidence for execution
    if (signal.action !== 'HOLD' && signal.confidence < 0.6) return false;
    
    return hasArbitrageReason;
  }

  private async updateExchangePrices(data: MarketData): Promise<void> {
    const symbol = data.symbol;
    
    for (const exchange of this.params.exchanges) {
      try {
        const exchangePrice = await this.fetchExchangePrice(exchange, symbol, data);
        
        const priceHistory = this.exchangePrices.get(exchange) || [];
        priceHistory.push(exchangePrice);
        
        // Keep only recent prices (last 50 data points)
        if (priceHistory.length > 50) {
          priceHistory.splice(0, priceHistory.length - 50);
        }
        
        this.exchangePrices.set(exchange, priceHistory);
        
      } catch (error) {
        consola.debug(`Failed to fetch price from ${exchange}:`, error);
      }
    }
  }

  private async fetchExchangePrice(exchange: string, symbol: string, baseData: MarketData): Promise<ExchangePrice> {
    // Simulate real exchange price fetching with realistic variations
    const basePrice = baseData.price;
    const spread = this.calculateExchangeSpread(exchange);
    const variation = (Math.random() - 0.5) * spread * 2;
    
    return {
      exchange,
      price: basePrice * (1 + variation),
      liquidity: this.estimateLiquidity(exchange, symbol),
      gasEstimate: this.gasTracker.get(exchange) || 150000,
      timestamp: Date.now(),
      spread
    };
  }

  private calculateExchangeSpread(exchange: string): number {
    // Different exchanges have different typical spreads
    const spreadMap: Record<string, number> = {
      'uniswap': 0.003,    // 0.3%
      'sushiswap': 0.004,  // 0.4%
      'curve': 0.001,      // 0.1% (stablecoins)
      'balancer': 0.005,   // 0.5%
      'pancakeswap': 0.006 // 0.6%
    };
    
    return spreadMap[exchange] || 0.005;
  }

  private estimateLiquidity(exchange: string, symbol: string): number {
    // Simulate liquidity estimation
    const baseLiquidity = Math.random() * 5000000 + 1000000; // 1M - 6M
    const exchangeMultiplier = this.getExchangeLiquidityMultiplier(exchange);
    
    return baseLiquidity * exchangeMultiplier;
  }

  private getExchangeLiquidityMultiplier(exchange: string): number {
    const multipliers: Record<string, number> = {
      'uniswap': 1.5,
      'sushiswap': 1.2,
      'curve': 0.8,
      'balancer': 1.0,
      'pancakeswap': 1.1
    };
    
    return multipliers[exchange] || 1.0;
  }

  private async scanArbitrageOpportunities(symbol: string): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Simple arbitrage (direct buy/sell)
    const simpleOpportunities = await this.findSimpleArbitrage(symbol);
    opportunities.push(...simpleOpportunities);
    
    // Triangular arbitrage (if we have enough pairs)
    if (this.exchangePrices.size >= 3) {
      const triangularOpportunities = await this.findTriangularArbitrage(symbol);
      opportunities.push(...triangularOpportunities);
    }
    
    return opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
  }

  private async findSimpleArbitrage(symbol: string): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    const exchanges = Array.from(this.exchangePrices.keys());
    
    for (let i = 0; i < exchanges.length; i++) {
      for (let j = 0; j < exchanges.length; j++) {
        if (i === j) continue;
        
        const buyExchange = exchanges[i];
        const sellExchange = exchanges[j];
        
        const buyPrices = this.exchangePrices.get(buyExchange) || [];
        const sellPrices = this.exchangePrices.get(sellExchange) || [];
        
        if (buyPrices.length === 0 || sellPrices.length === 0) continue;
        
        const latestBuyPrice = buyPrices[buyPrices.length - 1];
        const latestSellPrice = sellPrices[sellPrices.length - 1];
        
        const opportunity = this.calculateSimpleArbitrage(latestBuyPrice, latestSellPrice);
        
        if (opportunity.profitPercent > 0) {
          opportunities.push(opportunity);
        }
      }
    }
    
    return opportunities;
  }

  private calculateSimpleArbitrage(buyPrice: ExchangePrice, sellPrice: ExchangePrice): ArbitrageOpportunity {
    const grossProfit = sellPrice.price - buyPrice.price;
    const gasCostUSD = this.estimateGasCostUSD(buyPrice.gasEstimate + sellPrice.gasEstimate);
    const slippageCost = (buyPrice.price + sellPrice.price) * this.params.maxSlippage / 2;
    
    const netProfit = grossProfit - gasCostUSD - slippageCost;
    const profitPercent = netProfit / buyPrice.price;
    
    // Calculate confidence based on liquidity and price stability
    const minLiquidity = Math.min(buyPrice.liquidity, sellPrice.liquidity);
    const liquidityScore = Math.min(1, minLiquidity / 1000000); // 1M+ liquidity = full score
    const priceStability = 1 - Math.abs(buyPrice.spread + sellPrice.spread) / 2;
    const confidence = (liquidityScore + priceStability) / 2;
    
    // Determine urgency based on profit magnitude
    let urgency: ArbitrageOpportunity['urgency'] = 'LOW';
    if (profitPercent > 0.02) urgency = 'CRITICAL';
    else if (profitPercent > 0.01) urgency = 'HIGH';
    else if (profitPercent > 0.005) urgency = 'MEDIUM';
    
    return {
      type: 'SIMPLE',
      buyExchange: buyPrice.exchange,
      sellExchange: sellPrice.exchange,
      profitPercent,
      netProfit,
      confidence,
      urgency,
      estimatedExecutionTime: this.estimateExecutionTime(urgency)
    };
  }

  private async findTriangularArbitrage(symbol: string): Promise<ArbitrageOpportunity[]> {
    // Simplified triangular arbitrage detection
    // In production, this would analyze currency triangles like BTC->ETH->USDC->BTC
    const opportunities: ArbitrageOpportunity[] = [];
    
    // This is a placeholder - real triangular arbitrage is complex
    // For now, we'll simulate finding opportunities
    if (Math.random() < 0.1) { // 10% chance of finding triangular opportunity
      const profitPercent = Math.random() * 0.01; // 0-1% profit
      
      if (profitPercent > this.params.triangularThreshold) {
        opportunities.push({
          type: 'TRIANGULAR',
          buyExchange: 'uniswap',
          sellExchange: 'sushiswap',
          profitPercent,
          netProfit: profitPercent * 1000, // Assume $1000 base
          confidence: 0.7,
          urgency: profitPercent > 0.008 ? 'HIGH' : 'MEDIUM',
          estimatedExecutionTime: 45000 // Triangular takes longer
        });
      }
    }
    
    return opportunities;
  }

  private selectBestOpportunity(opportunities: ArbitrageOpportunity[]): ArbitrageOpportunity | null {
    if (opportunities.length === 0) return null;
    
    // Score opportunities based on profit, confidence, and urgency
    const scoredOpportunities = opportunities.map(opp => ({
      opportunity: opp,
      score: this.calculateOpportunityScore(opp)
    }));
    
    scoredOpportunities.sort((a, b) => b.score - a.score);
    
    return scoredOpportunities[0].opportunity;
  }

  private calculateOpportunityScore(opportunity: ArbitrageOpportunity): number {
    const profitWeight = 0.4;
    const confidenceWeight = 0.3;
    const urgencyWeight = 0.2;
    const timeWeight = 0.1;
    
    const urgencyScore = { 'CRITICAL': 1, 'HIGH': 0.8, 'MEDIUM': 0.5, 'LOW': 0.2 }[opportunity.urgency];
    const timeScore = Math.max(0, 1 - (opportunity.estimatedExecutionTime / this.params.maxExecutionTime));
    
    return (opportunity.profitPercent * profitWeight) +
           (opportunity.confidence * confidenceWeight) +
           (urgencyScore * urgencyWeight) +
           (timeScore * timeWeight);
  }

  private async validateOpportunity(opportunity: ArbitrageOpportunity): Promise<boolean> {
    // Check if opportunity is still valid (prices haven't moved too much)
    const ageThreshold = 5000; // 5 seconds
    const now = Date.now();
    
    // Get latest prices for validation
    const buyPrices = this.exchangePrices.get(opportunity.buyExchange) || [];
    const sellPrices = this.exchangePrices.get(opportunity.sellExchange) || [];
    
    if (buyPrices.length === 0 || sellPrices.length === 0) return false;
    
    const latestBuy = buyPrices[buyPrices.length - 1];
    const latestSell = sellPrices[sellPrices.length - 1];
    
    // Check if prices are recent enough
    if (now - latestBuy.timestamp > ageThreshold || now - latestSell.timestamp > ageThreshold) {
      return false;
    }
    
    // Recalculate profit with latest prices
    const updatedOpportunity = this.calculateSimpleArbitrage(latestBuy, latestSell);
    
    // Ensure profit is still above threshold (with some buffer)
    return updatedOpportunity.profitPercent >= this.params.minProfitThreshold * 0.8;
  }

  private generateArbitrageSignal(opportunity: ArbitrageOpportunity, data: MarketData): TradingSignal {
    const amount = this.calculateArbitrageAmount(opportunity);
    
    return {
      action: 'BUY', // Arbitrage always starts with a buy
      confidence: opportunity.confidence,
      amount,
      reason: `${opportunity.type} arbitrage: ${(opportunity.profitPercent * 100).toFixed(3)}% profit (${opportunity.buyExchange} → ${opportunity.sellExchange})`,
      strategy: `arbitrage-${opportunity.type.toLowerCase()}`
    };
  }

  private calculateArbitrageAmount(opportunity: ArbitrageOpportunity): number {
    const baseAmount = 500; // Base USD for arbitrage
    const urgencyMultiplier = { 'CRITICAL': 2.0, 'HIGH': 1.5, 'MEDIUM': 1.0, 'LOW': 0.5 }[opportunity.urgency];
    const profitMultiplier = Math.min(3, opportunity.profitPercent * 100); // Cap at 3x for high profit
    const allocationMultiplier = this.config.allocation / 100;
    
    return baseAmount * urgencyMultiplier * profitMultiplier * allocationMultiplier;
  }

  private estimateGasCostUSD(totalGas: number): number {
    const gasPrice = 20e9; // 20 gwei
    const ethPrice = 2000; // $2000 per ETH
    const gasCostETH = (totalGas * gasPrice) / 1e18;
    return gasCostETH * ethPrice;
  }

  private estimateExecutionTime(urgency: ArbitrageOpportunity['urgency']): number {
    const baseTimes = { 'CRITICAL': 10000, 'HIGH': 15000, 'MEDIUM': 20000, 'LOW': 30000 };
    return baseTimes[urgency];
  }

  private createHoldSignal(reason: string): TradingSignal {
    return {
      action: 'HOLD',
      confidence: 0.1,
      amount: 0,
      reason,
      strategy: 'arbitrage-hold'
    };
  }

  private startGasMonitoring(): void {
    // Simulate gas price monitoring
    setInterval(() => {
      this.params.exchanges.forEach(exchange => {
        const baseGas = 150000;
        const variation = Math.random() * 100000; // 0-100k variation
        this.gasTracker.set(exchange, baseGas + variation);
      });
    }, 30000); // Update every 30 seconds
  }

  private async handleCoordinationMessage(message: AgentMessage): Promise<void> {
    const { data } = message;
    
    if (data.type === 'PORTFOLIO_REBALANCE') {
      this.updateConfig({ allocation: data.newAllocation });
      consola.info(`Arbitrage Agent allocation updated to ${data.newAllocation}%`);
    } else if (data.type === 'GAS_LIMIT_UPDATE') {
      this.params.maxGasCostPercent = data.newGasLimit;
    }
  }

  private async handleRiskAlert(message: AgentMessage): Promise<void> {
    const { data } = message;
    
    if (data.alertType === 'HIGH_SLIPPAGE') {
      this.params.maxSlippage = Math.min(this.params.maxSlippage * 1.2, 0.02); // Cap at 2%
    } else if (data.alertType === 'EXECUTION_FAILURE') {
      this.params.minProfitThreshold *= 1.1; // Require higher profit after failures
    }
  }

  private async handleMarketUpdate(message: AgentMessage): Promise<void> {
    const { data } = message;
    
    if (data.marketCondition === 'HIGH_VOLATILITY') {
      // Arbitrage opportunities increase with volatility
      this.params.minProfitThreshold *= 0.9;
      this.params.maxExecutionTime *= 0.8; // Act faster
    } else if (data.marketCondition === 'LOW_VOLATILITY') {
      // Fewer opportunities in stable markets
      this.params.minProfitThreshold *= 1.1;
    }
  }

  // Public methods for coordinator access
  getStrategySpecificMetrics(): any {
    const recentOpportunities = this.opportunityHistory.slice(-10);
    const avgProfit = recentOpportunities.length > 0 
      ? recentOpportunities.reduce((sum, opp) => sum + opp.profitPercent, 0) / recentOpportunities.length 
      : 0;
    
    return {
      activeExchanges: this.params.exchanges.length,
      avgGasCost: Array.from(this.gasTracker.values()).reduce((a, b) => a + b, 0) / this.gasTracker.size,
      recentOpportunities: recentOpportunities.length,
      avgProfitPercent: avgProfit,
      currentProfitThreshold: this.params.minProfitThreshold,
      executionQueueSize: this.executionQueue.length
    };
  }
}