/**
 * Vincent-Enhanced Momentum Trading Agent
 * Autonomous trend following with user-controlled permissions
 */

import { VincentBaseAgent, VincentAgentConfig, VincentTradeExecution } from './vincentBaseAgent';
import { MarketData, TradingSignal } from '../strategies/index';
import consola from 'consola';

interface MomentumParams {
  fastEMA: number;
  slowEMA: number;
  breakoutThreshold: number;
  volumeMultiplier: number;
  trendStrengthMin: number;
  maxPositionHold: number; // hours
}

interface MomentumAnalysis {
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number;
  breakoutSignal: boolean;
  volumeConfirmation: boolean;
  emaSignal: 'BUY' | 'SELL' | 'HOLD';
  momentum: number;
}

export class VincentMomentumAgent extends VincentBaseAgent {
  private params: MomentumParams;
  private priceHistory: number[] = [];
  private volumeHistory: number[] = [];
  private emaFast: number = 0;
  private emaSlow: number = 0;
  private lastBreakout: number = 0;

  constructor(config: VincentAgentConfig) {
    super(config);
    
    this.params = {
      fastEMA: 12,
      slowEMA: 26,
      breakoutThreshold: 0.02, // 2%
      volumeMultiplier: 1.5,
      trendStrengthMin: 0.6,
      maxPositionHold: 24 // 24 hours
    };

    consola.info(`🚀 Vincent Momentum Agent initialized - Focus: Policy-Governed Trend Following`);
  }

  async analyzeMarket(data: MarketData): Promise<TradingSignal> {
    try {
      // Update historical data
      this.updateHistoricalData(data);
      
      if (this.priceHistory.length < this.params.slowEMA) {
        return this.createHoldSignal('Insufficient data for momentum analysis');
      }

      // Perform momentum analysis
      const analysis = this.analyzeMomentum(data);
      
      // Generate trading signal
      const signal = this.generateMomentumSignal(analysis, data);
      
      // Validate against Vincent policies before returning
      const validation = await this.validateSignalWithPolicy(signal);
      
      if (!validation.isValid) {
        return this.createHoldSignal(`Policy violation: ${validation.violations.join(', ')}`);
      }

      if (validation.requiresApproval) {
        signal.reason += ` (User approval required: ${validation.riskAssessment})`;
      }

      return signal;

    } catch (error) {
      consola.error('Vincent Momentum Agent analysis failed:', error);
      return this.createHoldSignal(`Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private updateHistoricalData(data: MarketData): void {
    this.priceHistory.push(data.price);
    this.volumeHistory.push(data.volume24h);
    
    // Keep only required history
    const maxHistory = Math.max(this.params.fastEMA, this.params.slowEMA) * 3;
    
    if (this.priceHistory.length > maxHistory) {
      this.priceHistory = this.priceHistory.slice(-maxHistory);
      this.volumeHistory = this.volumeHistory.slice(-maxHistory);
    }

    // Update EMAs
    this.updateEMAs();
  }

  private updateEMAs(): void {
    if (this.priceHistory.length === 0) return;

    const currentPrice = this.priceHistory[this.priceHistory.length - 1];
    
    if (this.emaFast === 0) {
      this.emaFast = currentPrice;
      this.emaSlow = currentPrice;
      return;
    }

    // Calculate EMA multipliers
    const fastMultiplier = 2 / (this.params.fastEMA + 1);
    const slowMultiplier = 2 / (this.params.slowEMA + 1);
    
    // Update EMAs
    this.emaFast = (currentPrice * fastMultiplier) + (this.emaFast * (1 - fastMultiplier));
    this.emaSlow = (currentPrice * slowMultiplier) + (this.emaSlow * (1 - slowMultiplier));
  }

  private analyzeMomentum(data: MarketData): MomentumAnalysis {
    const currentPrice = data.price;
    const recentPrices = this.priceHistory.slice(-20); // Last 20 periods
    const recentVolumes = this.volumeHistory.slice(-20);
    
    // EMA signal
    let emaSignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (this.emaFast > this.emaSlow * 1.001) { // 0.1% threshold
      emaSignal = 'BUY';
    } else if (this.emaFast < this.emaSlow * 0.999) {
      emaSignal = 'SELL';
    }

    // Trend analysis
    const startPrice = recentPrices[0];
    const endPrice = recentPrices[recentPrices.length - 1];
    const priceChange = (endPrice - startPrice) / startPrice;
    
    let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (priceChange > 0.01) trend = 'BULLISH';
    else if (priceChange < -0.01) trend = 'BEARISH';

    // Trend strength
    const volatility = this.calculateVolatility(recentPrices);
    const strength = Math.min(1, Math.abs(priceChange) / volatility);

    // Breakout detection
    const avgPrice = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
    const breakoutSignal = Math.abs(currentPrice - avgPrice) / avgPrice > this.params.breakoutThreshold;

    // Volume confirmation
    const avgVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
    const volumeConfirmation = data.volume24h > avgVolume * this.params.volumeMultiplier;

    // Momentum calculation
    const momentum = this.calculateMomentum(recentPrices);

    return {
      trend,
      strength,
      breakoutSignal,
      volumeConfirmation,
      emaSignal,
      momentum
    };
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const returns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private calculateMomentum(prices: number[]): number {
    if (prices.length < 10) return 0;
    
    const recentPeriod = prices.slice(-5); // Last 5 periods
    const olderPeriod = prices.slice(-10, -5); // Previous 5 periods
    
    const recentAvg = recentPeriod.reduce((sum, p) => sum + p, 0) / recentPeriod.length;
    const olderAvg = olderPeriod.reduce((sum, p) => sum + p, 0) / olderPeriod.length;
    
    return (recentAvg - olderAvg) / olderAvg;
  }

  private generateMomentumSignal(analysis: MomentumAnalysis, data: MarketData): TradingSignal {
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0.1;
    let reasoning = '';

    // Vincent policy-aware position sizing
    const spendingStatus = this.getSpendingStatus();
    const maxTradeAmount = Math.min(
      spendingStatus.daily.remaining * 0.5, // Use max 50% of remaining daily limit
      this.policyConstraints.spendingLimits.perTradeLimit
    );

    if (maxTradeAmount <= 0) {
      return this.createHoldSignal('Daily spending limit reached');
    }

    // Buy signal conditions
    if (analysis.emaSignal === 'BUY' && 
        analysis.trend === 'BULLISH' && 
        analysis.strength >= this.params.trendStrengthMin &&
        analysis.breakoutSignal &&
        analysis.volumeConfirmation) {
      
      action = 'BUY';
      confidence = Math.min(0.95, 0.6 + analysis.strength * 0.3 + (analysis.momentum > 0 ? 0.1 : 0));
      reasoning = `Strong bullish momentum: EMA crossover, ${(analysis.strength * 100).toFixed(1)}% trend strength, breakout confirmed, volume ${analysis.volumeConfirmation ? 'strong' : 'weak'}`;
      
    } else if (analysis.emaSignal === 'BUY' && 
               analysis.trend === 'BULLISH' && 
               analysis.strength >= 0.4) {
      
      action = 'BUY';
      confidence = Math.min(0.8, 0.4 + analysis.strength * 0.3);
      reasoning = `Moderate bullish momentum: EMA crossover, ${(analysis.strength * 100).toFixed(1)}% trend strength`;
    }

    // Sell signal conditions
    else if (analysis.emaSignal === 'SELL' && 
             analysis.trend === 'BEARISH' && 
             analysis.strength >= this.params.trendStrengthMin &&
             analysis.breakoutSignal) {
      
      action = 'SELL';
      confidence = Math.min(0.95, 0.6 + analysis.strength * 0.3 + (analysis.momentum < 0 ? 0.1 : 0));
      reasoning = `Strong bearish momentum: EMA crossover, ${(analysis.strength * 100).toFixed(1)}% trend strength, breakdown confirmed`;
      
    } else if (analysis.emaSignal === 'SELL' && 
               analysis.trend === 'BEARISH' && 
               analysis.strength >= 0.4) {
      
      action = 'SELL';
      confidence = Math.min(0.8, 0.4 + analysis.strength * 0.3);
      reasoning = `Moderate bearish momentum: EMA crossover, ${(analysis.strength * 100).toFixed(1)}% trend strength`;
    }

    // Calculate amount based on confidence and policy constraints
    let amount = 0;
    if (action !== 'HOLD') {
      const baseAmount = 200; // Base USD amount
      const confidenceMultiplier = confidence;
      const allocationMultiplier = this.config.allocation / 100;
      
      amount = Math.min(
        baseAmount * confidenceMultiplier * allocationMultiplier,
        maxTradeAmount
      );
    }

    // Add Vincent policy context to reasoning
    if (action !== 'HOLD') {
      reasoning += ` | Vincent Policy: $${amount.toFixed(2)} within daily limit $${spendingStatus.daily.remaining.toFixed(2)}`;
    }

    return {
      action,
      confidence,
      amount,
      reason: reasoning,
      strategy: 'vincent-momentum-trading'
    };
  }

  private createHoldSignal(reason: string): TradingSignal {
    return {
      action: 'HOLD',
      confidence: 0.1,
      amount: 0,
      reason,
      strategy: 'vincent-momentum-hold'
    };
  }

  // Vincent-enhanced trade execution
  async executeTrade(signal: TradingSignal): Promise<VincentTradeExecution> {
    consola.info(`🚀 Vincent Momentum Agent executing: ${signal.action} ${signal.amount.toFixed(2)} (${(signal.confidence * 100).toFixed(1)}% confidence)`);
    
    try {
      const execution = await this.executeVincentTrade(signal);
      
      // Update breakout tracking
      if (signal.action !== 'HOLD') {
        this.lastBreakout = Date.now();
      }
      
      return execution;
      
    } catch (error) {
      consola.error('Vincent Momentum Agent trade execution failed:', error);
      throw error;
    }
  }

  // Enhanced metrics for Vincent integration
  getVincentMomentumMetrics(): any {
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
        policyCompliance: vincentHealth.vincent.policyCompliance,
        lastBreakout: this.lastBreakout,
        currentParams: this.params
      },
      momentum: {
        emaFast: this.emaFast,
        emaSlow: this.emaSlow,
        emaSpread: ((this.emaFast - this.emaSlow) / this.emaSlow * 100).toFixed(3) + '%',
        dataPoints: this.priceHistory.length
      }
    };
  }

  // Policy update handling
  async updateTradingParameters(newParams: Partial<MomentumParams>): Promise<void> {
    this.params = { ...this.params, ...newParams };
    consola.info(`🔄 Vincent Momentum Agent parameters updated`);
  }
}