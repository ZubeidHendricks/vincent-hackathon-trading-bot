/**
 * Enhanced Trading Strategies for Hackathon Competition
 * Extends the DCA framework with competitive trading algorithms
 */

export interface TradingSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  // 0-1
  amount: number; 
  confidence: number; // USD amount
  reason: string;
  strategy: string;
}

export interface MarketData {
  price: number;
  priceChange24h: number;
  symbol: string;
  timestamp: number;
  volume24h: number;
}

export interface StrategyConfig {
  allocation: number;
  enabled: boolean;
  name: string; 
  params: Record<string, any>;
  // percentage of portfolio
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export abstract class BaseStrategy {
  protected config: StrategyConfig;

  protected marketData: MarketData[] = [];

  constructor(config: StrategyConfig) {
    this.config = config;
  }

  abstract analyze(currentData: MarketData, historicalData: MarketData[]): Promise<TradingSignal>;
  
  protected calculateRiskAdjustedAmount(baseAmount: number, confidence: number): number {
    const riskMultiplier = {
      'HIGH': 1.5,
      'LOW': 0.5,
      'MEDIUM': 1.0
    }[this.config.riskLevel];
    
    return baseAmount * confidence * riskMultiplier * (this.config.allocation / 100);
  }
}