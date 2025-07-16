/**
 * Mean Reversion Strategy
 * Identifies oversold/overbought conditions and trades on price reversals
 */

import consola from 'consola';

import { BaseStrategy, TradingSignal, MarketData, StrategyConfig } from './index';

interface MeanReversionParams {
  minVolumeRatio: number;
  overboughtThreshold: number;
  oversoldThreshold: number;
  period: number;
  rsiPeriod: number;
  stdDevMultiplier: number;
}

export class MeanReversionStrategy extends BaseStrategy {
  private readonly params: MeanReversionParams;

  constructor(config: StrategyConfig) {
    super(config);
    this.params = {
      minVolumeRatio: config.params.minVolumeRatio || 0.8,
      overboughtThreshold: config.params.overboughtThreshold || 70,
      oversoldThreshold: config.params.oversoldThreshold || 30,
      period: config.params.period || 20,
      rsiPeriod: config.params.rsiPeriod || 14,
      stdDevMultiplier: config.params.stdDevMultiplier || 2,
      ...config.params
    };
  }

  async analyze(currentData: MarketData, historicalData: MarketData[]): Promise<TradingSignal> {
    try {
      if (historicalData.length < Math.max(this.params.period, this.params.rsiPeriod)) {
        return {
          action: 'HOLD',
          amount: 0,
          confidence: 0,
          reason: 'Insufficient historical data for mean reversion analysis',
          strategy: this.config.name
        };
      }

      const recentData = historicalData.slice(-this.params.period);
      const rsiData = historicalData.slice(-this.params.rsiPeriod);
      
      const { mean, stdDev } = this.calculateMeanAndStdDev(recentData);
      const rsi = this.calculateRSI(rsiData.concat([currentData]));
      const bollingerBands = this.calculateBollingerBands(mean, stdDev);
      
      const currentPrice = currentData.price;
      const pricePosition = (currentPrice - mean) / stdDev;
      const volumeRatio = currentData.volume24h / this.calculateAverageVolume(recentData);

      // Mean reversion signals
      const isOversold = rsi < this.params.oversoldThreshold && currentPrice < bollingerBands.lower;
      const isOverbought = rsi > this.params.overboughtThreshold && currentPrice > bollingerBands.upper;
      const hasVolume = volumeRatio > this.params.minVolumeRatio;

      let confidence = 0;
      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let reason = '';

      if (isOversold && hasVolume) {
        // Strong buy signal - oversold with volume
        confidence = Math.min(0.9, (this.params.oversoldThreshold - rsi) / 30 + Math.abs(pricePosition) * 0.2);
        action = 'BUY';
        reason = `Oversold condition: RSI ${rsi.toFixed(1)}, ${Math.abs(pricePosition).toFixed(2)} std devs below mean`;
      } else if (isOverbought && hasVolume) {
        // Strong sell signal - overbought with volume
        confidence = Math.min(0.85, (rsi - this.params.overboughtThreshold) / 30 + Math.abs(pricePosition) * 0.2);
        action = 'SELL';
        reason = `Overbought condition: RSI ${rsi.toFixed(1)}, ${Math.abs(pricePosition).toFixed(2)} std devs above mean`;
      } else if (Math.abs(pricePosition) > 1.5) {
        // Moderate signal - price significantly away from mean
        const isExtreme = Math.abs(pricePosition) > this.params.stdDevMultiplier;
        confidence = isExtreme ? 0.6 : 0.3;
        action = pricePosition > 0 ? 'SELL' : 'BUY';
        reason = `Price ${Math.abs(pricePosition).toFixed(2)} std devs from mean, expecting reversion`;
      } else {
        confidence = 0.1;
        reason = `Price near mean: RSI ${rsi.toFixed(1)}, ${pricePosition.toFixed(2)} std devs from mean`;
      }

      // Reduce confidence if volume is low
      if (volumeRatio < this.params.minVolumeRatio) {
        confidence *= 0.7;
        reason += ` (low volume: ${volumeRatio.toFixed(2)}x)`;
      }

      const baseAmount = 150; // Base USD amount
      const amount = this.calculateRiskAdjustedAmount(baseAmount, confidence);

      consola.debug(`Mean Reversion Analysis: ${action} with ${(confidence * 100).toFixed(1)}% confidence`);

      return {
        action,
        amount,
        confidence,
        reason,
        strategy: this.config.name
      };

    } catch (error) {
      consola.error('Mean reversion strategy analysis failed:', error);
      return {
        action: 'HOLD',
        amount: 0,
        confidence: 0,
        reason: `Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        strategy: this.config.name
      };
    }
  }

  private calculateMeanAndStdDev(data: MarketData[]): { mean: number; stdDev: number } {
    const prices = data.map(d => d.price);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    const variance = prices.reduce((sum, price) => {
      const diff = price - mean;
      return sum + (diff * diff);
    }, 0) / prices.length;
    
    const stdDev = Math.sqrt(variance);
    
    return { mean, stdDev };
  }

  private calculateRSI(data: MarketData[]): number {
    if (data.length < 2) return 50; // Neutral RSI
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < data.length; i++) {
      const change = data[i].price - data[i - 1].price;
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    const avgGain = gains / (data.length - 1);
    const avgLoss = losses / (data.length - 1);
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  }

  private calculateBollingerBands(mean: number, stdDev: number): { lower: number, upper: number; } {
    return {
      lower: mean - (this.params.stdDevMultiplier * stdDev),
      upper: mean + (this.params.stdDevMultiplier * stdDev)
    };
  }

  private calculateAverageVolume(data: MarketData[]): number {
    return data.reduce((sum, point) => sum + point.volume24h, 0) / data.length;
  }
}