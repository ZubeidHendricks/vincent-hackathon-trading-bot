/**
 * Vincent-Enhanced Mean Reversion Agent
 * Statistical mean reversion trading with user-controlled permissions
 */

import { VincentBaseAgent, VincentAgentConfig, VincentTradeExecution } from './vincentBaseAgent';
import { MarketData, TradingSignal } from '../strategies/index';
import consola from 'consola';

interface MeanReversionParams {
  lookbackPeriod: number;
  standardDeviations: number;
  minPriceDeviation: number;
  reversion: number;
  maxHoldTime: number; // hours
  volumeThreshold: number;
}

interface MeanReversionAnalysis {
  currentPrice: number;
  meanPrice: number;
  standardDeviation: number;
  zScore: number;
  deviation: number;
  signal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
  confidence: number;
  timeToRevert: number; // estimated hours
}

interface Position {
  entryPrice: number;
  entryTime: number;
  expectedReversion: number;
  maxHoldTime: number;
}

export class VincentMeanReversionAgent extends VincentBaseAgent {
  private params: MeanReversionParams;
  private priceHistory: number[] = [];
  private volumeHistory: number[] = [];
  private currentPosition: Position | null = null;
  private lastSignalTime: number = 0;
  private recentAnalyses: MeanReversionAnalysis[] = [];

  constructor(config: VincentAgentConfig) {
    super(config);
    
    this.params = {
      lookbackPeriod: 50, // 50 periods for mean calculation
      standardDeviations: 2.0, // 2 standard deviations for signals
      minPriceDeviation: 0.02, // 2% minimum deviation
      reversion: 0.8, // 80% mean reversion expected
      maxHoldTime: 48, // 48 hours max hold
      volumeThreshold: 1.2 // 20% above average volume
    };

    consola.info(`📊 Vincent Mean Reversion Agent initialized - Focus: Policy-Governed Statistical Trading`);
  }

  async analyzeMarket(data: MarketData): Promise<TradingSignal> {
    try {
      // Update historical data
      this.updateHistoricalData(data);
      
      if (this.priceHistory.length < this.params.lookbackPeriod) {
        return this.createHoldSignal('Insufficient data for mean reversion analysis');
      }

      // Check if we need to exit existing position
      if (this.currentPosition) {
        const exitSignal = this.checkPositionExit(data);
        if (exitSignal) return exitSignal;
      }

      // Perform mean reversion analysis
      const analysis = this.analyzeMeanReversion(data);
      this.recentAnalyses.push(analysis);
      
      // Keep only recent analyses
      if (this.recentAnalyses.length > 10) {
        this.recentAnalyses = this.recentAnalyses.slice(-10);
      }
      
      // Generate trading signal
      const signal = this.generateMeanReversionSignal(analysis, data);
      
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
      consola.error('Vincent Mean Reversion Agent analysis failed:', error);
      return this.createHoldSignal(`Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private updateHistoricalData(data: MarketData): void {
    this.priceHistory.push(data.price);
    this.volumeHistory.push(data.volume24h);
    
    // Keep only required history
    const maxHistory = this.params.lookbackPeriod * 2;
    
    if (this.priceHistory.length > maxHistory) {
      this.priceHistory = this.priceHistory.slice(-maxHistory);
      this.volumeHistory = this.volumeHistory.slice(-maxHistory);
    }
  }

  private checkPositionExit(data: MarketData): TradingSignal | null {
    if (!this.currentPosition) return null;

    const currentPrice = data.price;
    const holdTime = (Date.now() - this.currentPosition.entryTime) / (1000 * 60 * 60); // hours
    
    // Check max hold time
    if (holdTime >= this.currentPosition.maxHoldTime) {
      this.currentPosition = null;
      return this.createExitSignal('Maximum hold time reached', currentPrice);
    }

    // Check reversion completion
    const entryPrice = this.currentPosition.entryPrice;
    const expectedReversion = this.currentPosition.expectedReversion;
    const currentReversion = Math.abs(currentPrice - entryPrice) / entryPrice;
    
    if (currentReversion >= expectedReversion * 0.8) { // 80% of expected reversion
      this.currentPosition = null;
      return this.createExitSignal('Mean reversion target achieved', currentPrice);
    }

    // Check stop loss (negative reversion)
    const stopLoss = 0.03; // 3% stop loss
    if (currentReversion < -stopLoss) {
      this.currentPosition = null;
      return this.createExitSignal('Stop loss triggered', currentPrice);
    }

    return null; // Hold position
  }

  private analyzeMeanReversion(data: MarketData): MeanReversionAnalysis {
    const currentPrice = data.price;
    const recentPrices = this.priceHistory.slice(-this.params.lookbackPeriod);
    
    // Calculate mean and standard deviation
    const meanPrice = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - meanPrice, 2), 0) / recentPrices.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate z-score and deviation
    const zScore = (currentPrice - meanPrice) / standardDeviation;
    const deviation = (currentPrice - meanPrice) / meanPrice;
    
    // Determine signal
    let signal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL' = 'NEUTRAL';
    if (zScore > this.params.standardDeviations) {
      signal = 'OVERBOUGHT';
    } else if (zScore < -this.params.standardDeviations) {
      signal = 'OVERSOLD';
    }
    
    // Calculate confidence based on deviation and volume
    const deviationConfidence = Math.min(1, Math.abs(deviation) / 0.1); // Max at 10% deviation
    const volumeConfidence = this.calculateVolumeConfidence(data);
    const historicalConfidence = this.calculateHistoricalConfidence();
    
    const confidence = (deviationConfidence * 0.5 + volumeConfidence * 0.3 + historicalConfidence * 0.2);
    
    // Estimate time to revert (simplified model)
    const timeToRevert = this.estimateReversionTime(Math.abs(zScore));

    return {
      currentPrice,
      meanPrice,
      standardDeviation,
      zScore,
      deviation,
      signal,
      confidence: Math.max(0.1, Math.min(0.95, confidence)),
      timeToRevert
    };
  }

  private calculateVolumeConfidence(data: MarketData): number {
    if (this.volumeHistory.length < 10) return 0.5;
    
    const recentVolumes = this.volumeHistory.slice(-10);
    const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
    const volumeRatio = data.volume24h / avgVolume;
    
    // Higher volume = higher confidence in mean reversion
    return Math.min(1, volumeRatio / this.params.volumeThreshold);
  }

  private calculateHistoricalConfidence(): number {
    if (this.recentAnalyses.length < 5) return 0.5;
    
    // Check consistency of recent signals
    const recentSignals = this.recentAnalyses.slice(-5);
    const signalTypes = recentSignals.map(a => a.signal);
    const uniqueSignals = new Set(signalTypes);
    
    // More consistent signals = higher confidence
    if (uniqueSignals.size === 1) return 0.9;
    if (uniqueSignals.size === 2) return 0.7;
    return 0.5;
  }

  private estimateReversionTime(absZScore: number): number {
    // Simplified model: higher deviation = longer reversion time
    const baseTime = 4; // 4 hours base
    const deviationFactor = Math.min(3, absZScore / this.params.standardDeviations);
    return baseTime * deviationFactor;
  }

  private generateMeanReversionSignal(analysis: MeanReversionAnalysis, data: MarketData): TradingSignal {
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let reasoning = '';

    // Vincent policy-aware position sizing
    const spendingStatus = this.getSpendingStatus();
    const maxTradeAmount = Math.min(
      spendingStatus.daily.remaining * 0.4, // Use max 40% of remaining daily limit
      this.policyConstraints.spendingLimits.perTradeLimit
    );

    if (maxTradeAmount <= 0) {
      return this.createHoldSignal('Daily spending limit reached');
    }

    // Check minimum deviation requirement
    if (Math.abs(analysis.deviation) < this.params.minPriceDeviation) {
      return this.createHoldSignal(`Insufficient price deviation: ${(analysis.deviation * 100).toFixed(2)}%`);
    }

    // Generate signals based on analysis
    if (analysis.signal === 'OVERSOLD' && analysis.confidence > 0.6) {
      action = 'BUY';
      reasoning = `Oversold condition: ${(analysis.deviation * 100).toFixed(2)}% below mean (${analysis.meanPrice.toFixed(2)}), ` +
                 `Z-score: ${analysis.zScore.toFixed(2)}, expected reversion in ${analysis.timeToRevert.toFixed(1)}h`;
      
      // Create position tracking
      this.currentPosition = {
        entryPrice: analysis.currentPrice,
        entryTime: Date.now(),
        expectedReversion: Math.abs(analysis.deviation) * this.params.reversion,
        maxHoldTime: Math.min(this.params.maxHoldTime, analysis.timeToRevert * 2)
      };
      
    } else if (analysis.signal === 'OVERBOUGHT' && analysis.confidence > 0.6) {
      action = 'SELL';
      reasoning = `Overbought condition: ${(analysis.deviation * 100).toFixed(2)}% above mean (${analysis.meanPrice.toFixed(2)}), ` +
                 `Z-score: ${analysis.zScore.toFixed(2)}, expected reversion in ${analysis.timeToRevert.toFixed(1)}h`;
      
      // Create position tracking
      this.currentPosition = {
        entryPrice: analysis.currentPrice,
        entryTime: Date.now(),
        expectedReversion: Math.abs(analysis.deviation) * this.params.reversion,
        maxHoldTime: Math.min(this.params.maxHoldTime, analysis.timeToRevert * 2)
      };
    }

    // Calculate amount based on confidence and policy constraints
    let amount = 0;
    if (action !== 'HOLD') {
      const baseAmount = 300; // Base USD amount for mean reversion
      const confidenceMultiplier = analysis.confidence;
      const deviationMultiplier = Math.min(2, Math.abs(analysis.deviation) / 0.05); // Scale with deviation
      const allocationMultiplier = this.config.allocation / 100;
      
      amount = Math.min(
        baseAmount * confidenceMultiplier * deviationMultiplier * allocationMultiplier,
        maxTradeAmount
      );
    }

    // Add Vincent policy context to reasoning
    if (action !== 'HOLD') {
      reasoning += ` | Vincent Policy: $${amount.toFixed(2)} within daily limit $${spendingStatus.daily.remaining.toFixed(2)}`;
    }

    return {
      action,
      confidence: analysis.confidence,
      amount,
      reason: reasoning,
      strategy: 'vincent-mean-reversion-trading'
    };
  }

  private createHoldSignal(reason: string): TradingSignal {
    return {
      action: 'HOLD',
      confidence: 0.1,
      amount: 0,
      reason,
      strategy: 'vincent-mean-reversion-hold'
    };
  }

  private createExitSignal(reason: string, currentPrice: number): TradingSignal {
    const spendingStatus = this.getSpendingStatus();
    const amount = 200; // Standard exit amount

    return {
      action: 'SELL', // Simplified - in practice would be opposite of entry
      confidence: 0.8,
      amount: Math.min(amount, spendingStatus.daily.remaining),
      reason: `Position exit: ${reason} at $${currentPrice.toFixed(2)}`,
      strategy: 'vincent-mean-reversion-exit'
    };
  }

  // Vincent-enhanced trade execution
  async executeTrade(signal: TradingSignal): Promise<VincentTradeExecution> {
    consola.info(`📊 Vincent Mean Reversion Agent executing: ${signal.action} ${signal.amount.toFixed(2)} (${(signal.confidence * 100).toFixed(1)}% confidence)`);
    
    try {
      const execution = await this.executeVincentTrade(signal);
      
      // Update signal tracking
      this.lastSignalTime = Date.now();
      
      return execution;
      
    } catch (error) {
      consola.error('Vincent Mean Reversion Agent trade execution failed:', error);
      throw error;
    }
  }

  // Enhanced metrics for Vincent mean reversion
  getMeanReversionMetrics(): any {
    const baseMetrics = this.getStrategySpecificMetrics();
    const vincentHealth = this.getVincentHealthStatus();
    const spendingStatus = this.getSpendingStatus();
    
    const currentAnalysis = this.recentAnalyses.length > 0 ? this.recentAnalyses[this.recentAnalyses.length - 1] : null;
    
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
      meanReversion: {
        currentPosition: this.currentPosition ? {
          entryPrice: this.currentPosition.entryPrice,
          holdTime: ((Date.now() - this.currentPosition.entryTime) / (1000 * 60 * 60)).toFixed(1) + 'h',
          expectedReversion: (this.currentPosition.expectedReversion * 100).toFixed(2) + '%',
          maxHoldTime: this.currentPosition.maxHoldTime + 'h'
        } : null,
        currentAnalysis: currentAnalysis ? {
          signal: currentAnalysis.signal,
          zScore: currentAnalysis.zScore.toFixed(2),
          deviation: (currentAnalysis.deviation * 100).toFixed(2) + '%',
          confidence: (currentAnalysis.confidence * 100).toFixed(1) + '%',
          timeToRevert: currentAnalysis.timeToRevert.toFixed(1) + 'h'
        } : null,
        dataPoints: this.priceHistory.length,
        lastSignalTime: this.lastSignalTime,
        currentParams: this.params
      }
    };
  }

  // Update mean reversion parameters
  async updateMeanReversionParameters(newParams: Partial<MeanReversionParams>): Promise<void> {
    this.params = { ...this.params, ...newParams };
    consola.info(`🔄 Vincent Mean Reversion Agent parameters updated`);
  }
}