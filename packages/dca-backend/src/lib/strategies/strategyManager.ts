/**
 * Strategy Manager
 * Orchestrates multiple trading strategies and combines their signals
 */

import consola from 'consola';

import { ArbitrageStrategy } from './arbitrageStrategy';
import { BaseStrategy, TradingSignal, MarketData, StrategyConfig } from './index';
import { MeanReversionStrategy } from './meanReversionStrategy';
import { MomentumStrategy } from './momentumStrategy';


interface PortfolioSignal {
  confidence: number;
  finalAction: 'BUY' | 'SELL' | 'HOLD';
  reasoning: string;
  signals: TradingSignal[];
  totalAmount: number;
}

export class StrategyManager {
  private strategies: BaseStrategy[] = [];

  private marketDataHistory: MarketData[] = [];

  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    const configs: StrategyConfig[] = [
      {
        allocation: 40,
        enabled: true,
        name: 'momentum', 
        params: {
          longPeriod: 20,
          momentumThreshold: 0.02,
          shortPeriod: 5,
          volumeThreshold: 1.5
        },
        // 40% of portfolio
riskLevel: 'MEDIUM'
      },
      {
        allocation: 35,
        enabled: true,
        name: 'arbitrage', 
        params: {
          
exchanges: ['uniswap', 'sushiswap', 'curve'], 
          
gasLimit: 300000,
          // 0.3%
maxSlippage: 0.01,
          minProfitThreshold: 0.003
        },
        // 35% of portfolio  
riskLevel: 'LOW'
      },
      {
        allocation: 25,
        enabled: true,
        name: 'meanReversion', 
        params: {
          minVolumeRatio: 0.8,
          overboughtThreshold: 75,
          oversoldThreshold: 25,
          period: 20,
          rsiPeriod: 14,
          stdDevMultiplier: 2
        },
        // 25% of portfolio
riskLevel: 'HIGH'
      }
    ];

    for (const config of configs) {
      if (!config.enabled) continue;

      switch (config.name) {
        case 'momentum':
          this.strategies.push(new MomentumStrategy(config));
          break;
        case 'arbitrage':
          this.strategies.push(new ArbitrageStrategy(config));
          break;
        case 'meanReversion':
          this.strategies.push(new MeanReversionStrategy(config));
          break;
        default:
          consola.warn(`Unknown strategy: ${config.name}`);
      }
    }

    consola.info(`Initialized ${this.strategies.length} trading strategies`);
  }

  async analyzeMarket(currentData: MarketData): Promise<PortfolioSignal> {
    try {
      // Add current data to history
      this.marketDataHistory.push(currentData);
      
      // Keep only last 100 data points for efficiency
      if (this.marketDataHistory.length > 100) {
        this.marketDataHistory = this.marketDataHistory.slice(-100);
      }

      // Get signals from all strategies
      const signals: TradingSignal[] = [];
      
      for (const strategy of this.strategies) {
        try {
          const signal = await strategy.analyze(currentData, this.marketDataHistory);
          signals.push(signal);
          consola.debug(`${signal.strategy}: ${signal.action} (${(signal.confidence * 100).toFixed(1)}%)`);
        } catch (error) {
          consola.error(`Strategy ${strategy.constructor.name} failed:`, error);
        }
      }

      // Combine signals into portfolio decision
      const portfolioSignal = this.combineSignals(signals);
      
      consola.info(`Portfolio Decision: ${portfolioSignal.finalAction} $${portfolioSignal.totalAmount.toFixed(2)} (${(portfolioSignal.confidence * 100).toFixed(1)}% confidence)`);
      
      return portfolioSignal;

    } catch (error) {
      consola.error('Market analysis failed:', error);
      return {
        confidence: 0,
        finalAction: 'HOLD',
        reasoning: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        signals: [],
        totalAmount: 0
      };
    }
  }

  private combineSignals(signals: TradingSignal[]): PortfolioSignal {
    if (signals.length === 0) {
      return {
        confidence: 0,
        finalAction: 'HOLD',
        reasoning: 'No strategy signals available',
        signals: [],
        totalAmount: 0
      };
    }

    // Calculate weighted scores
    let buyScore = 0;
    let sellScore = 0;
    let totalAmount = 0;
    let weightSum = 0;

    const activeSignals = signals.filter(s => s.confidence > 0.1);

    for (const signal of activeSignals) {
      const weight = signal.confidence;
      weightSum += weight;

      if (signal.action === 'BUY') {
        buyScore += weight;
        totalAmount += signal.amount;
      } else if (signal.action === 'SELL') {
        sellScore += weight;
        totalAmount += signal.amount; // For sell signals, treat as sell amount
      }
    }

    // Determine final action
    let finalAction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0;

    if (buyScore > sellScore && buyScore > 0.3) {
      finalAction = 'BUY';
      confidence = Math.min(0.95, buyScore / Math.max(weightSum, 1));
    } else if (sellScore > buyScore && sellScore > 0.3) {
      finalAction = 'SELL';
      confidence = Math.min(0.95, sellScore / Math.max(weightSum, 1));
    } else {
      finalAction = 'HOLD';
      confidence = 0.1;
    }

    // Consensus bonus - if multiple strategies agree, boost confidence
    const actionCounts = { BUY: 0, HOLD: 0, SELL: 0 };
    for (const signal of activeSignals) {
      actionCounts[signal.action]++;
    }

    const maxActionCount = Math.max(...Object.values(actionCounts));
    if (maxActionCount >= 2 && activeSignals.length >= 2) {
      confidence = Math.min(0.98, confidence * 1.2); // 20% boost for consensus
    }

    // Generate reasoning
    const reasoning = this.generateReasoning(signals, finalAction, confidence);

    return {
      confidence,
      finalAction,
      reasoning,
      signals,
      totalAmount: finalAction === 'HOLD' ? 0 : totalAmount
    };
  }

  private generateReasoning(signals: TradingSignal[], action: string, confidence: number): string {
    const activeSignals = signals.filter(s => s.confidence > 0.1);
    
    if (activeSignals.length === 0) {
      return 'No strong signals from any strategy';
    }

    const reasons = activeSignals.map(s => `${s.strategy}: ${s.reason}`).join('; ');
    const consensus = activeSignals.filter(s => s.action === action).length;
    
    return `${action} decision with ${(confidence * 100).toFixed(1)}% confidence. ${consensus}/${activeSignals.length} strategies agree. Signals: ${reasons}`;
  }

  getStrategySummary(): string {
    const summary = this.strategies.map(s => s.constructor.name).join(', ');
    return `Active strategies: ${summary}`;
  }

  updateStrategyConfig(strategyName: string, newParams: Record<string, any>): boolean {
    // This would allow dynamic strategy updates during competition
    consola.info(`Strategy config update requested for ${strategyName}:`, newParams);
    return true;
  }
}