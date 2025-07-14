/**
 * Mean Reversion Trading Agent
 * Autonomous agent specializing in contrarian trading and mean reversion strategies
 */

import { BaseAgent, AgentConfig, AgentMessage } from './baseAgent';
import { MarketData, TradingSignal } from '../strategies/index';
import consola from 'consola';

interface MeanReversionParams {
  lookbackPeriod: number;
  stdDevMultiplier: number;
  rsiPeriod: number;
  oversoldThreshold: number;
  overboughtThreshold: number;
  minVolumeRatio: number;
  meanReversionStrength: number;
  maxDeviationFromMean: number;
}

interface StatisticalMetrics {
  mean: number;
  stdDev: number;
  currentDeviation: number;
  zScore: number;
  rsi: number;
  volumeProfile: number;
  meanReversionProbability: number;
}

interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
  width: number;
  position: number; // 0-1, where price is within bands
}

export class MeanReversionAgent extends BaseAgent {
  private params: MeanReversionParams;
  private priceHistory: number[] = [];
  private volumeHistory: number[] = [];
  private deviationHistory: number[] = [];
  private rsiHistory: number[] = [];

  constructor(config: AgentConfig) {
    super(config);
    
    this.params = {
      lookbackPeriod: 20,
      stdDevMultiplier: 2.0,
      rsiPeriod: 14,
      oversoldThreshold: 25,
      overboughtThreshold: 75,
      minVolumeRatio: 0.8,
      meanReversionStrength: 0.7, // How strongly we expect reversion
      maxDeviationFromMean: 3.0 // Maximum standard deviations to consider
    };

    consola.info(`📈 Mean Reversion Agent initialized - Focus: Contrarian Trading & Statistical Arbitrage`);
  }

  async analyzeMarket(data: MarketData): Promise<TradingSignal> {
    try {
      // Update historical data
      this.updateHistoricalData(data);
      
      if (this.priceHistory.length < this.params.lookbackPeriod) {
        return this.createHoldSignal('Insufficient historical data for mean reversion analysis');
      }

      // Calculate statistical metrics
      const metrics = this.calculateStatisticalMetrics(data);
      const bollingerBands = this.calculateBollingerBands();
      const meanReversionSignal = this.detectMeanReversionOpportunity(metrics, bollingerBands, data);
      
      // Enhanced analysis with multiple timeframes
      const shortTermMetrics = this.calculateStatisticalMetrics(data, 10); // 10-period short term
      const longTermMetrics = this.calculateStatisticalMetrics(data, 50); // 50-period long term
      
      return this.generateMeanReversionSignal(metrics, bollingerBands, meanReversionSignal, {
        shortTerm: shortTermMetrics,
        longTerm: longTermMetrics,
        currentData: data
      });

    } catch (error) {
      consola.error('Mean Reversion Agent analysis failed:', error);
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
        consola.debug(`Mean Reversion Agent received unhandled message type: ${message.type}`);
    }
  }

  validateSignal(signal: TradingSignal): boolean {
    // Mean reversion specific validation
    if (signal.confidence < 0.3) return false;
    if (signal.action === 'HOLD') return true;
    
    // Ensure signal represents valid mean reversion logic
    const hasMeanReversionReason = signal.reason.toLowerCase().includes('oversold') ||
                                  signal.reason.toLowerCase().includes('overbought') ||
                                  signal.reason.toLowerCase().includes('reversion') ||
                                  signal.reason.toLowerCase().includes('deviation') ||
                                  signal.reason.toLowerCase().includes('bollinger');
    
    // Mean reversion should have reasonable confidence levels
    if (signal.action !== 'HOLD' && signal.confidence < 0.4) return false;
    
    return hasMeanReversionReason;
  }

  private updateHistoricalData(data: MarketData): void {
    this.priceHistory.push(data.price);
    this.volumeHistory.push(data.volume24h);
    
    // Keep only required history
    const maxHistory = Math.max(this.params.lookbackPeriod, this.params.rsiPeriod) * 3;
    
    if (this.priceHistory.length > maxHistory) {
      this.priceHistory = this.priceHistory.slice(-maxHistory);
      this.volumeHistory = this.volumeHistory.slice(-maxHistory);
      this.deviationHistory = this.deviationHistory.slice(-maxHistory);
      this.rsiHistory = this.rsiHistory.slice(-maxHistory);
    }
  }

  private calculateStatisticalMetrics(data: MarketData, period?: number): StatisticalMetrics {
    const lookback = period || this.params.lookbackPeriod;
    const recentPrices = this.priceHistory.slice(-lookback);
    const recentVolumes = this.volumeHistory.slice(-lookback);
    
    // Calculate mean and standard deviation
    const mean = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / recentPrices.length;
    const stdDev = Math.sqrt(variance);
    
    // Current price metrics
    const currentPrice = data.price;
    const currentDeviation = currentPrice - mean;
    const zScore = stdDev > 0 ? currentDeviation / stdDev : 0;
    
    // RSI calculation
    const rsi = this.calculateRSI(recentPrices);
    
    // Volume profile
    const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
    const volumeProfile = data.volume24h / avgVolume;
    
    // Mean reversion probability based on historical patterns
    const meanReversionProbability = this.calculateMeanReversionProbability(zScore, rsi);
    
    return {
      mean,
      stdDev,
      currentDeviation,
      zScore,
      rsi,
      volumeProfile,
      meanReversionProbability
    };
  }

  private calculateRSI(prices: number[]): number {
    if (prices.length < 2) return 50; // Neutral RSI
    
    const period = Math.min(this.params.rsiPeriod, prices.length - 1);
    let gains = 0;
    let losses = 0;
    
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateBollingerBands(): BollingerBands {
    const recentPrices = this.priceHistory.slice(-this.params.lookbackPeriod);
    const mean = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    const stdDev = Math.sqrt(
      recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / recentPrices.length
    );
    
    const multiplier = this.params.stdDevMultiplier;
    const upper = mean + (stdDev * multiplier);
    const lower = mean - (stdDev * multiplier);
    const width = (upper - lower) / mean; // Relative width
    
    const currentPrice = this.priceHistory[this.priceHistory.length - 1];
    const position = (currentPrice - lower) / (upper - lower); // 0-1 position within bands
    
    return {
      upper,
      middle: mean,
      lower,
      width,
      position: Math.max(0, Math.min(1, position))
    };
  }

  private calculateMeanReversionProbability(zScore: number, rsi: number): number {
    // Probability increases with extreme Z-scores and RSI values
    const zScoreComponent = Math.min(1, Math.abs(zScore) / this.params.maxDeviationFromMean);
    
    const rsiComponent = rsi < this.params.oversoldThreshold 
      ? (this.params.oversoldThreshold - rsi) / this.params.oversoldThreshold
      : rsi > this.params.overboughtThreshold
        ? (rsi - this.params.overboughtThreshold) / (100 - this.params.overboughtThreshold)
        : 0;
    
    // Combined probability with weighted components
    return (zScoreComponent * 0.6) + (rsiComponent * 0.4);
  }

  private detectMeanReversionOpportunity(
    metrics: StatisticalMetrics, 
    bands: BollingerBands, 
    data: MarketData
  ): { type: 'BUY' | 'SELL' | 'NONE'; strength: number; reason: string } {
    
    // Strong oversold conditions
    if (metrics.zScore < -this.params.stdDevMultiplier && 
        metrics.rsi < this.params.oversoldThreshold &&
        bands.position < 0.1 &&
        metrics.volumeProfile > this.params.minVolumeRatio) {
      
      const strength = Math.min(0.95, Math.abs(metrics.zScore) / this.params.maxDeviationFromMean + 0.3);
      return {
        type: 'BUY',
        strength,
        reason: `Strong oversold: ${metrics.zScore.toFixed(2)} std dev, RSI ${metrics.rsi.toFixed(1)}, below lower Bollinger band`
      };
    }
    
    // Strong overbought conditions
    if (metrics.zScore > this.params.stdDevMultiplier && 
        metrics.rsi > this.params.overboughtThreshold &&
        bands.position > 0.9 &&
        metrics.volumeProfile > this.params.minVolumeRatio) {
      
      const strength = Math.min(0.95, Math.abs(metrics.zScore) / this.params.maxDeviationFromMean + 0.3);
      return {
        type: 'SELL',
        strength,
        reason: `Strong overbought: ${metrics.zScore.toFixed(2)} std dev, RSI ${metrics.rsi.toFixed(1)}, above upper Bollinger band`
      };
    }
    
    // Moderate oversold (less volume required)
    if (metrics.zScore < -1.5 && metrics.rsi < 35 && bands.position < 0.2) {
      const strength = Math.min(0.8, Math.abs(metrics.zScore) / 2 + 0.2);
      return {
        type: 'BUY',
        strength,
        reason: `Moderate oversold: ${metrics.zScore.toFixed(2)} std dev, RSI ${metrics.rsi.toFixed(1)}`
      };
    }
    
    // Moderate overbought
    if (metrics.zScore > 1.5 && metrics.rsi > 65 && bands.position > 0.8) {
      const strength = Math.min(0.8, Math.abs(metrics.zScore) / 2 + 0.2);
      return {
        type: 'SELL',
        strength,
        reason: `Moderate overbought: ${metrics.zScore.toFixed(2)} std dev, RSI ${metrics.rsi.toFixed(1)}`
      };
    }
    
    return { type: 'NONE', strength: 0, reason: 'No significant mean reversion opportunity' };
  }

  private generateMeanReversionSignal(
    metrics: StatisticalMetrics,
    bands: BollingerBands,
    opportunity: any,
    context: any
  ): TradingSignal {
    
    if (opportunity.type === 'NONE') {
      return this.createHoldSignal(
        `Price near mean: ${metrics.zScore.toFixed(2)} std dev, RSI ${metrics.rsi.toFixed(1)}, Bollinger position ${(bands.position * 100).toFixed(1)}%`
      );
    }
    
    // Calculate position size based on conviction
    const baseAmount = 180; // Base USD amount for mean reversion
    const convictionMultiplier = opportunity.strength;
    const probabilityMultiplier = metrics.meanReversionProbability;
    const volumeMultiplier = Math.min(1.5, metrics.volumeProfile);
    
    // Multi-timeframe confirmation
    const timeframeAlignment = this.checkTimeframeAlignment(context, opportunity.type);
    const alignmentMultiplier = timeframeAlignment ? 1.2 : 0.8;
    
    const amount = baseAmount * convictionMultiplier * probabilityMultiplier * volumeMultiplier * alignmentMultiplier * (this.config.allocation / 100);
    
    // Final confidence calculation
    let confidence = opportunity.strength * metrics.meanReversionProbability;
    
    // Boost confidence for volume confirmation
    if (metrics.volumeProfile > this.params.minVolumeRatio) {
      confidence *= 1.1;
    }
    
    // Boost for timeframe alignment
    if (timeframeAlignment) {
      confidence *= 1.15;
    }
    
    // Boost for extreme conditions
    if (Math.abs(metrics.zScore) > 2.5) {
      confidence *= 1.2;
    }
    
    confidence = Math.min(0.95, confidence);
    
    // Enhanced reasoning
    let enhancedReason = opportunity.reason;
    if (metrics.volumeProfile > this.params.minVolumeRatio) {
      enhancedReason += `, volume confirmation ${metrics.volumeProfile.toFixed(2)}x`;
    }
    if (timeframeAlignment) {
      enhancedReason += `, multi-timeframe alignment`;
    }
    if (metrics.meanReversionProbability > 0.7) {
      enhancedReason += `, high reversion probability ${(metrics.meanReversionProbability * 100).toFixed(1)}%`;
    }
    
    return {
      action: opportunity.type,
      confidence,
      amount,
      reason: enhancedReason,
      strategy: 'mean-reversion-statistical'
    };
  }

  private checkTimeframeAlignment(context: any, signalType: 'BUY' | 'SELL'): boolean {
    const { shortTerm, longTerm } = context;
    
    if (signalType === 'BUY') {
      // For buy signals, check if both short and long term show oversold
      return shortTerm.rsi < 40 && longTerm.rsi < 50 && 
             shortTerm.zScore < -1 && longTerm.zScore < 0;
    } else {
      // For sell signals, check if both timeframes show overbought
      return shortTerm.rsi > 60 && longTerm.rsi > 50 && 
             shortTerm.zScore > 1 && longTerm.zScore > 0;
    }
  }

  private createHoldSignal(reason: string): TradingSignal {
    return {
      action: 'HOLD',
      confidence: 0.1,
      amount: 0,
      reason,
      strategy: 'mean-reversion-hold'
    };
  }

  private async handleCoordinationMessage(message: AgentMessage): Promise<void> {
    const { data } = message;
    
    if (data.type === 'PORTFOLIO_REBALANCE') {
      this.updateConfig({ allocation: data.newAllocation });
      consola.info(`Mean Reversion Agent allocation updated to ${data.newAllocation}%`);
    } else if (data.type === 'VOLATILITY_REGIME_CHANGE') {
      // Adjust parameters based on volatility regime
      if (data.regime === 'HIGH_VOLATILITY') {
        this.params.stdDevMultiplier *= 1.2; // Require more extreme moves
        this.params.oversoldThreshold = 20; // More extreme RSI levels
        this.params.overboughtThreshold = 80;
      } else if (data.regime === 'LOW_VOLATILITY') {
        this.params.stdDevMultiplier *= 0.8; // More sensitive to smaller moves
        this.params.oversoldThreshold = 30;
        this.params.overboughtThreshold = 70;
      }
    }
  }

  private async handleRiskAlert(message: AgentMessage): Promise<void> {
    const { data } = message;
    
    if (data.alertType === 'TREND_CHANGE') {
      // In trending markets, mean reversion is less reliable
      this.params.meanReversionStrength *= 0.8;
      this.params.stdDevMultiplier *= 1.3; // Require stronger signals
    } else if (data.alertType === 'HIGH_CORRELATION') {
      // When markets are highly correlated, mean reversion works better
      this.params.meanReversionStrength *= 1.1;
    }
  }

  private async handleMarketUpdate(message: AgentMessage): Promise<void> {
    const { data } = message;
    
    if (data.marketRegime === 'RANGING') {
      // Mean reversion works best in ranging markets
      this.params.meanReversionStrength = 0.8;
      this.params.stdDevMultiplier = 1.8; // More sensitive
    } else if (data.marketRegime === 'TRENDING') {
      // Reduce mean reversion sensitivity in trending markets
      this.params.meanReversionStrength = 0.5;
      this.params.stdDevMultiplier = 2.5; // Less sensitive
    } else if (data.marketRegime === 'VOLATILE') {
      // In volatile markets, be more cautious
      this.params.minVolumeRatio *= 1.2;
      this.params.maxDeviationFromMean = 2.5;
    }
  }

  // Public methods for coordinator access
  getStrategySpecificMetrics(): any {
    if (this.priceHistory.length === 0) return null;
    
    const latestMetrics = this.calculateStatisticalMetrics(this.marketData[this.marketData.length - 1] || { price: 0, volume24h: 0, priceChange24h: 0, timestamp: 0, symbol: '' });
    const bands = this.calculateBollingerBands();
    
    return {
      currentZScore: latestMetrics.zScore,
      currentRSI: latestMetrics.rsi,
      bollingerPosition: bands.position,
      bollingerWidth: bands.width,
      meanReversionProbability: latestMetrics.meanReversionProbability,
      volumeProfile: latestMetrics.volumeProfile,
      priceVsMean: {
        deviation: latestMetrics.currentDeviation,
        percentage: (latestMetrics.currentDeviation / latestMetrics.mean) * 100
      },
      currentParameters: {
        lookbackPeriod: this.params.lookbackPeriod,
        stdDevMultiplier: this.params.stdDevMultiplier,
        oversoldThreshold: this.params.oversoldThreshold,
        overboughtThreshold: this.params.overboughtThreshold
      }
    };
  }
}