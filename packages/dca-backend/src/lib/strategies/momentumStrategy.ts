/**
 * Momentum Trading Strategy
 * Buys assets showing strong upward momentum, sells on reversal signals
 */

import consola from 'consola';

import { BaseStrategy, TradingSignal, MarketData, StrategyConfig } from './index';

interface MomentumParams {
  longPeriod: number;
  momentumThreshold: number;
  shortPeriod: number;
  volumeThreshold: number;
}

export class MomentumStrategy extends BaseStrategy {
  private readonly params: MomentumParams;

  constructor(config: StrategyConfig) {
    super(config);
    this.params = {
      longPeriod: config.params.longPeriod || 20,
      momentumThreshold: config.params.momentumThreshold || 0.02,
      shortPeriod: config.params.shortPeriod || 5,
      volumeThreshold: config.params.volumeThreshold || 1.5,
      ...config.params
    };
  }

  async analyze(currentData: MarketData, historicalData: MarketData[]): Promise<TradingSignal> {
    try {
      if (historicalData.length < this.params.longPeriod) {
        return {
          action: 'HOLD',
          amount: 0,
          confidence: 0,
          reason: 'Insufficient historical data for momentum analysis',
          strategy: this.config.name
        };
      }

      const recentData = historicalData.slice(-this.params.longPeriod);
      const shortMA = this.calculateMA(recentData.slice(-this.params.shortPeriod));
      const longMA = this.calculateMA(recentData);
      
      const priceChange = (currentData.price - recentData[0].price) / recentData[0].price;
      const volumeRatio = currentData.volume24h / this.calculateAverageVolume(recentData);
      
      // Momentum signals
      const trendStrength = (shortMA - longMA) / longMA;
      const isUptrend = shortMA > longMA && priceChange > this.params.momentumThreshold;
      const isHighVolume = volumeRatio > this.params.volumeThreshold;
      
      // Calculate confidence based on multiple factors
      let confidence = 0;
      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let reason = '';

      if (isUptrend && isHighVolume) {
        confidence = Math.min(0.9, Math.abs(trendStrength) * 2 + (volumeRatio - 1) * 0.3);
        action = 'BUY';
        reason = `Strong upward momentum: ${(priceChange * 100).toFixed(2)}% price change, ${volumeRatio.toFixed(2)}x volume`;
      } else if (trendStrength < -this.params.momentumThreshold && shortMA < longMA) {
        confidence = Math.min(0.8, Math.abs(trendStrength) * 1.5);
        action = 'SELL';
        reason = `Momentum reversal detected: trend strength ${(trendStrength * 100).toFixed(2)}%`;
      } else {
        confidence = 0.1;
        reason = `Weak momentum signals: trend ${(trendStrength * 100).toFixed(2)}%, volume ${volumeRatio.toFixed(2)}x`;
      }

      const baseAmount = 100; // Base USD amount
      const amount = this.calculateRiskAdjustedAmount(baseAmount, confidence);

      consola.debug(`Momentum Strategy Analysis: ${action} with ${(confidence * 100).toFixed(1)}% confidence`);

      return {
        action,
        amount,
        confidence,
        reason,
        strategy: this.config.name
      };

    } catch (error) {
      consola.error('Momentum strategy analysis failed:', error);
      return {
        action: 'HOLD',
        amount: 0,
        confidence: 0,
        reason: `Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        strategy: this.config.name
      };
    }
  }

  private calculateMA(data: MarketData[]): number {
    return data.reduce((sum, point) => sum + point.price, 0) / data.length;
  }

  private calculateAverageVolume(data: MarketData[]): number {
    return data.reduce((sum, point) => sum + point.volume24h, 0) / data.length;
  }
}