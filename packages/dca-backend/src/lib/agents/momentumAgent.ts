/**
 * Momentum Trading Agent
 * Autonomous agent specializing in trend-following and momentum trading
 */

import { BaseAgent, AgentConfig, AgentMessage } from './baseAgent';
import { MarketData, TradingSignal } from '../strategies/index';
import consola from 'consola';

interface MomentumParams {
  shortPeriod: number;
  longPeriod: number;
  volumeThreshold: number;
  momentumThreshold: number;
  breakoutThreshold: number;
  trendStrengthMultiplier: number;
}

export class MomentumAgent extends BaseAgent {
  private params: MomentumParams;
  private recentHighs: number[] = [];
  private recentLows: number[] = [];
  private volumeProfile: number[] = [];

  constructor(config: AgentConfig) {
    super(config);
    
    this.params = {
      shortPeriod: 5,
      longPeriod: 20,
      volumeThreshold: 1.5,
      momentumThreshold: 0.02,
      breakoutThreshold: 0.03,
      trendStrengthMultiplier: 2.0
    };

    consola.info(`🚀 Momentum Agent initialized - Focus: Trend Following & Breakouts`);
  }

  async analyzeMarket(data: MarketData): Promise<TradingSignal> {
    try {
      if (this.marketData.length < this.params.longPeriod) {
        return this.createHoldSignal('Insufficient data for momentum analysis');
      }

      // Update price and volume profiles
      this.updateProfiles(data);

      // Calculate momentum indicators
      const recentData = this.marketData.slice(-this.params.longPeriod);
      const shortMA = this.calculateMA(recentData.slice(-this.params.shortPeriod));
      const longMA = this.calculateMA(recentData);
      
      const currentPrice = data.price;
      const priceChange = (currentPrice - recentData[0].price) / recentData[0].price;
      const volumeRatio = data.volume24h / this.calculateAverageVolume(recentData);
      
      // Advanced momentum calculations
      const trendStrength = (shortMA - longMA) / longMA;
      const pricePosition = this.calculatePricePosition(currentPrice);
      const breakoutSignal = this.detectBreakout(currentPrice, data.volume24h);
      const momentumScore = this.calculateMomentumScore(data, recentData);

      // Generate trading signal
      return this.generateMomentumSignal({
        currentPrice,
        priceChange,
        volumeRatio,
        trendStrength,
        pricePosition,
        breakoutSignal,
        momentumScore,
        data
      });

    } catch (error) {
      consola.error('Momentum Agent analysis failed:', error);
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
        consola.debug(`Momentum Agent received unhandled message type: ${message.type}`);
    }
  }

  validateSignal(signal: TradingSignal): boolean {
    // Momentum-specific validation
    if (signal.confidence < 0.3) return false;
    if (signal.action === 'HOLD') return true;
    
    // Ensure signal aligns with momentum principles
    if (signal.action === 'BUY') {
      // For buy signals, we need positive momentum indicators
      return signal.reason.includes('momentum') || signal.reason.includes('breakout') || signal.reason.includes('trend');
    } else if (signal.action === 'SELL') {
      // For sell signals, we need reversal indicators
      return signal.reason.includes('reversal') || signal.reason.includes('weakness') || signal.reason.includes('breakdown');
    }
    
    return false;
  }

  private updateProfiles(data: MarketData): void {
    // Update price extremes for breakout detection
    this.recentHighs.push(data.price);
    this.recentLows.push(data.price);
    this.volumeProfile.push(data.volume24h);
    
    // Keep only recent history
    const keepPeriod = this.params.longPeriod * 2;
    if (this.recentHighs.length > keepPeriod) {
      this.recentHighs = this.recentHighs.slice(-keepPeriod);
      this.recentLows = this.recentLows.slice(-keepPeriod);
      this.volumeProfile = this.volumeProfile.slice(-keepPeriod);
    }
  }

  private calculateMA(data: MarketData[]): number {
    return data.reduce((sum, point) => sum + point.price, 0) / data.length;
  }

  private calculateAverageVolume(data: MarketData[]): number {
    return data.reduce((sum, point) => sum + point.volume24h, 0) / data.length;
  }

  private calculatePricePosition(currentPrice: number): number {
    if (this.recentHighs.length === 0) return 0;
    
    const periodHigh = Math.max(...this.recentHighs.slice(-this.params.longPeriod));
    const periodLow = Math.min(...this.recentLows.slice(-this.params.longPeriod));
    
    if (periodHigh === periodLow) return 0.5;
    
    return (currentPrice - periodLow) / (periodHigh - periodLow);
  }

  private detectBreakout(currentPrice: number, currentVolume: number): {
    isBreakout: boolean;
    strength: number;
    direction: 'UP' | 'DOWN' | 'NONE';
  } {
    if (this.recentHighs.length < this.params.longPeriod) {
      return { isBreakout: false, strength: 0, direction: 'NONE' };
    }

    const recentHigh = Math.max(...this.recentHighs.slice(-this.params.longPeriod));
    const recentLow = Math.min(...this.recentLows.slice(-this.params.longPeriod));
    const avgVolume = this.volumeProfile.slice(-this.params.longPeriod).reduce((a, b) => a + b, 0) / this.params.longPeriod;
    
    const highBreakout = currentPrice > recentHigh * (1 + this.params.breakoutThreshold);
    const lowBreakdown = currentPrice < recentLow * (1 - this.params.breakoutThreshold);
    const volumeConfirmation = currentVolume > avgVolume * this.params.volumeThreshold;

    if (highBreakout && volumeConfirmation) {
      const strength = ((currentPrice - recentHigh) / recentHigh) * (currentVolume / avgVolume);
      return { isBreakout: true, strength, direction: 'UP' };
    } else if (lowBreakdown && volumeConfirmation) {
      const strength = ((recentLow - currentPrice) / recentLow) * (currentVolume / avgVolume);
      return { isBreakout: true, strength, direction: 'DOWN' };
    }

    return { isBreakout: false, strength: 0, direction: 'NONE' };
  }

  private calculateMomentumScore(current: MarketData, historical: MarketData[]): number {
    // Rate of change momentum
    const roc5 = (current.price - historical[historical.length - 5].price) / historical[historical.length - 5].price;
    const roc10 = (current.price - historical[historical.length - 10].price) / historical[historical.length - 10].price;
    const roc20 = (current.price - historical[historical.length - 20].price) / historical[historical.length - 20].price;

    // Volume momentum
    const volumeMA = this.calculateAverageVolume(historical.slice(-10));
    const volumeMomentum = current.volume24h / volumeMA;

    // Composite momentum score
    const priceMomentum = (roc5 * 0.5) + (roc10 * 0.3) + (roc20 * 0.2);
    const compositeMomentum = priceMomentum * Math.min(volumeMomentum, 3); // Cap volume boost

    return compositeMomentum;
  }

  private generateMomentumSignal(analysis: {
    currentPrice: number;
    priceChange: number;
    volumeRatio: number;
    trendStrength: number;
    pricePosition: number;
    breakoutSignal: any;
    momentumScore: number;
    data: MarketData;
  }): TradingSignal {
    const { priceChange, volumeRatio, trendStrength, pricePosition, breakoutSignal, momentumScore } = analysis;

    // Strong momentum buy conditions
    if (breakoutSignal.isBreakout && breakoutSignal.direction === 'UP') {
      const confidence = Math.min(0.95, 0.7 + (breakoutSignal.strength * 0.3));
      const amount = this.calculatePositionSize(confidence, 'HIGH');
      
      return {
        action: 'BUY',
        confidence,
        amount,
        reason: `Upward breakout detected: ${(priceChange * 100).toFixed(2)}% price move with ${volumeRatio.toFixed(2)}x volume`,
        strategy: 'momentum-breakout'
      };
    }

    // Strong trend following
    if (trendStrength > this.params.momentumThreshold && volumeRatio > this.params.volumeThreshold && momentumScore > 0.02) {
      const confidence = Math.min(0.9, 0.6 + (Math.abs(trendStrength) * this.params.trendStrengthMultiplier));
      const amount = this.calculatePositionSize(confidence, 'MEDIUM');
      
      return {
        action: 'BUY',
        confidence,
        amount,
        reason: `Strong momentum: ${(trendStrength * 100).toFixed(2)}% trend strength, momentum score ${momentumScore.toFixed(3)}`,
        strategy: 'momentum-trend'
      };
    }

    // Momentum reversal sell
    if (breakoutSignal.isBreakout && breakoutSignal.direction === 'DOWN') {
      const confidence = Math.min(0.85, 0.6 + (breakoutSignal.strength * 0.3));
      const amount = this.calculatePositionSize(confidence, 'MEDIUM');
      
      return {
        action: 'SELL',
        confidence,
        amount,
        reason: `Downward breakdown: momentum reversal with ${volumeRatio.toFixed(2)}x volume confirmation`,
        strategy: 'momentum-reversal'
      };
    }

    // Trend weakness sell
    if (trendStrength < -this.params.momentumThreshold && pricePosition > 0.8) {
      const confidence = Math.min(0.8, 0.5 + Math.abs(trendStrength));
      const amount = this.calculatePositionSize(confidence, 'LOW');
      
      return {
        action: 'SELL',
        confidence,
        amount,
        reason: `Momentum weakness at high prices: trend strength ${(trendStrength * 100).toFixed(2)}%`,
        strategy: 'momentum-weakness'
      };
    }

    // Default hold
    return this.createHoldSignal(`Waiting for momentum: trend ${(trendStrength * 100).toFixed(2)}%, volume ${volumeRatio.toFixed(2)}x`);
  }

  private calculatePositionSize(confidence: number, urgency: 'LOW' | 'MEDIUM' | 'HIGH'): number {
    const baseAmount = 200; // Base USD amount for momentum trades
    const urgencyMultiplier = { 'LOW': 0.5, 'MEDIUM': 1.0, 'HIGH': 1.5 }[urgency];
    const allocationMultiplier = this.config.allocation / 100;
    
    return baseAmount * confidence * urgencyMultiplier * allocationMultiplier;
  }

  private createHoldSignal(reason: string): TradingSignal {
    return {
      action: 'HOLD',
      confidence: 0.1,
      amount: 0,
      reason,
      strategy: 'momentum-hold'
    };
  }

  private async handleCoordinationMessage(message: AgentMessage): Promise<void> {
    const { data } = message;
    
    if (data.type === 'PORTFOLIO_REBALANCE') {
      // Adjust allocation based on coordinator input
      this.updateConfig({ allocation: data.newAllocation });
      consola.info(`Momentum Agent allocation updated to ${data.newAllocation}%`);
    } else if (data.type === 'STRATEGY_ADJUSTMENT') {
      // Adjust momentum parameters based on market conditions
      if (data.marketCondition === 'HIGH_VOLATILITY') {
        this.params.momentumThreshold *= 1.2;
        this.params.breakoutThreshold *= 1.1;
      } else if (data.marketCondition === 'LOW_VOLATILITY') {
        this.params.momentumThreshold *= 0.8;
        this.params.breakoutThreshold *= 0.9;
      }
    }
  }

  private async handleRiskAlert(message: AgentMessage): Promise<void> {
    const { data } = message;
    
    if (data.alertType === 'HIGH_DRAWDOWN') {
      // Reduce risk temporarily
      this.params.momentumThreshold *= 1.5; // Require stronger signals
      consola.warn('Momentum Agent: Reducing risk due to portfolio drawdown');
    } else if (data.alertType === 'POSITION_LIMIT') {
      // Pause new positions
      this.state.currentSignal = this.createHoldSignal('Position limits reached');
    }
  }

  private async handleMarketUpdate(message: AgentMessage): Promise<void> {
    const { data } = message;
    
    if (data.marketRegime === 'TRENDING') {
      // Increase momentum sensitivity in trending markets
      this.params.momentumThreshold *= 0.9;
      this.params.trendStrengthMultiplier *= 1.1;
    } else if (data.marketRegime === 'RANGING') {
      // Reduce momentum sensitivity in ranging markets
      this.params.momentumThreshold *= 1.2;
      this.params.trendStrengthMultiplier *= 0.9;
    }
  }

  // Public methods for coordinator access
  getStrategySpecificMetrics(): any {
    return {
      currentTrendStrength: this.marketData.length > 0 ? this.calculateMA(this.marketData.slice(-5)) / this.calculateMA(this.marketData.slice(-20)) - 1 : 0,
      recentBreakouts: this.recentHighs.length > 0 ? this.detectBreakout(this.marketData[this.marketData.length - 1]?.price || 0, this.marketData[this.marketData.length - 1]?.volume24h || 0) : null,
      momentumScore: this.marketData.length > 20 ? this.calculateMomentumScore(this.marketData[this.marketData.length - 1], this.marketData) : 0,
      pricePosition: this.calculatePricePosition(this.marketData[this.marketData.length - 1]?.price || 0)
    };
  }
}