/**
 * VincentAdaptiveStrategistAgent - AI agent with reinforcement learning capabilities
 * Adapts trading strategies based on market conditions and performance feedback
 */

import consola from 'consola';
import { VincentSelfImprovingAgent } from './vincentSelfImprovingAgent.js';
import type { TradingSignal, UserPolicyConstraints } from '../types/trading.js';

export interface StrategyAction {
  type: 'entry' | 'exit' | 'hold' | 'scale_in' | 'scale_out';
  symbol: string;
  quantity: number;
  price: number;
  confidence: number;
  reasoning: string;
  timestamp: number;
}

export interface MarketState {
  symbol: string;
  price: number;
  volume: number;
  volatility: number;
  trend: 'bullish' | 'bearish' | 'sideways';
  momentum: number;
  support: number;
  resistance: number;
  timestamp: number;
}

export interface StrategyModel {
  modelId: string;
  version: string;
  type: 'momentum' | 'mean_reversion' | 'breakout' | 'arbitrage' | 'grid' | 'dca';
  parameters: Map<string, number>;
  performance: {
    totalTrades: number;
    winRate: number;
    avgReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    calmarRatio: number;
  };
  marketConditions: string[];
  lastUpdate: number;
}

export interface ReinforcementLearningState {
  state: number[];
  action: number;
  reward: number;
  nextState: number[];
  done: boolean;
  timestamp: number;
}

export interface QTable {
  [stateAction: string]: number;
}

export interface AdaptiveStrategy {
  name: string;
  model: StrategyModel;
  qTable: QTable;
  explorationRate: number;
  learningRate: number;
  discountFactor: number;
  rewardFunction: (state: MarketState, action: StrategyAction, result: any) => number;
  isActive: boolean;
  performanceHistory: number[];
}

export class VincentAdaptiveStrategistAgent extends VincentSelfImprovingAgent {
  private strategies: Map<string, AdaptiveStrategy> = new Map();
  private qTable: QTable = {};
  private explorationRate: number = 0.1;
  private learningRate: number = 0.1;
  private discountFactor: number = 0.95;
  private stateHistory: ReinforcementLearningState[] = [];
  private currentStrategy: string | null = null;
  private marketStateCache: Map<string, MarketState> = new Map();
  
  private readonly stateUpdateInterval = 30 * 1000; // 30 seconds
  private readonly strategyEvaluationInterval = 5 * 60 * 1000; // 5 minutes
  private readonly maxStateHistory = 1000;
  private readonly minTradesForEvaluation = 10;

  constructor(
    agentId: string,
    userPolicyConstraints: UserPolicyConstraints,
    config?: any
  ) {
    super(agentId, userPolicyConstraints, config);
    
    // Initialize default strategies
    this.initializeStrategies();
    
    // Start strategy evaluation
    this.startStrategyEvaluation();
    
    // Start market state monitoring
    this.startMarketStateMonitoring();
    
    consola.info(`🧠 Adaptive Strategist Agent initialized: ${agentId}`);
  }

  /**
   * Generate trading signal using adaptive strategy selection
   */
  protected async generateBaseSignal(): Promise<TradingSignal | null> {
    try {
      // Get current market state
      const symbols = await this.getMonitoredSymbols();
      const marketStates = await Promise.all(symbols.map(symbol => this.getMarketState(symbol)));
      
      // Select best strategy for current market conditions
      const selectedStrategy = await this.selectOptimalStrategy(marketStates);
      
      if (!selectedStrategy) {
        consola.warn(`No suitable strategy found for current market conditions`);
        return null;
      }

      this.currentStrategy = selectedStrategy.name;
      
      // Generate signal using selected strategy
      const signal = await this.generateSignalWithStrategy(selectedStrategy, marketStates);
      
      if (signal) {
        // Record the action for reinforcement learning
        await this.recordStrategyAction(selectedStrategy, marketStates, signal);
      }

      return signal;
      
    } catch (error) {
      consola.error(`Strategy signal generation failed:`, error);
      await this.recordPerformance('strategy_signal', 'failure', 0, 0, { error: error.message });
      return null;
    }
  }

  /**
   * Initialize default trading strategies
   */
  private initializeStrategies(): void {
    // Momentum Strategy
    this.strategies.set('momentum', {
      name: 'momentum',
      model: {
        modelId: 'momentum_v1',
        version: '1.0.0',
        type: 'momentum',
        parameters: new Map([
          ['momentum_threshold', 0.02],
          ['volume_threshold', 1.5],
          ['stop_loss', 0.05],
          ['take_profit', 0.1]
        ]),
        performance: {
          totalTrades: 0,
          winRate: 0,
          avgReturn: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          calmarRatio: 0
        },
        marketConditions: ['trending', 'high_volume'],
        lastUpdate: Date.now()
      },
      qTable: {},
      explorationRate: 0.1,
      learningRate: 0.1,
      discountFactor: 0.95,
      rewardFunction: this.momentumRewardFunction.bind(this),
      isActive: true,
      performanceHistory: []
    });

    // Mean Reversion Strategy
    this.strategies.set('mean_reversion', {
      name: 'mean_reversion',
      model: {
        modelId: 'mean_reversion_v1',
        version: '1.0.0',
        type: 'mean_reversion',
        parameters: new Map([
          ['deviation_threshold', 2.0],
          ['lookback_period', 20],
          ['stop_loss', 0.03],
          ['take_profit', 0.08]
        ]),
        performance: {
          totalTrades: 0,
          winRate: 0,
          avgReturn: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          calmarRatio: 0
        },
        marketConditions: ['sideways', 'low_volatility'],
        lastUpdate: Date.now()
      },
      qTable: {},
      explorationRate: 0.1,
      learningRate: 0.1,
      discountFactor: 0.95,
      rewardFunction: this.meanReversionRewardFunction.bind(this),
      isActive: true,
      performanceHistory: []
    });

    // Breakout Strategy
    this.strategies.set('breakout', {
      name: 'breakout',
      model: {
        modelId: 'breakout_v1',
        version: '1.0.0',
        type: 'breakout',
        parameters: new Map([
          ['breakout_threshold', 0.02],
          ['volume_confirmation', 2.0],
          ['stop_loss', 0.04],
          ['take_profit', 0.12]
        ]),
        performance: {
          totalTrades: 0,
          winRate: 0,
          avgReturn: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          calmarRatio: 0
        },
        marketConditions: ['consolidation', 'high_volume'],
        lastUpdate: Date.now()
      },
      qTable: {},
      explorationRate: 0.1,
      learningRate: 0.1,
      discountFactor: 0.95,
      rewardFunction: this.breakoutRewardFunction.bind(this),
      isActive: true,
      performanceHistory: []
    });

    consola.info(`📊 Initialized ${this.strategies.size} adaptive strategies`);
  }

  /**
   * Select optimal strategy based on current market conditions
   */
  private async selectOptimalStrategy(marketStates: MarketState[]): Promise<AdaptiveStrategy | null> {
    const activeStrategies = Array.from(this.strategies.values()).filter(s => s.isActive);
    
    if (activeStrategies.length === 0) {
      return null;
    }

    // Calculate strategy scores based on market conditions and performance
    const strategyScores = await Promise.all(
      activeStrategies.map(async (strategy) => {
        const marketScore = this.calculateMarketCompatibility(strategy, marketStates);
        const performanceScore = this.calculatePerformanceScore(strategy);
        const qValue = this.getQValue(strategy, marketStates);
        
        const totalScore = (marketScore * 0.4) + (performanceScore * 0.4) + (qValue * 0.2);
        
        return {
          strategy,
          score: totalScore,
          marketScore,
          performanceScore,
          qValue
        };
      })
    );

    // Sort by score and select the best strategy
    strategyScores.sort((a, b) => b.score - a.score);
    
    // Apply epsilon-greedy exploration
    if (Math.random() < this.explorationRate) {
      // Explore: randomly select a strategy
      const randomIndex = Math.floor(Math.random() * strategyScores.length);
      return strategyScores[randomIndex].strategy;
    } else {
      // Exploit: select the best strategy
      return strategyScores[0].strategy;
    }
  }

  /**
   * Calculate market compatibility score for a strategy
   */
  private calculateMarketCompatibility(strategy: AdaptiveStrategy, marketStates: MarketState[]): number {
    const marketConditions = this.analyzeMarketConditions(marketStates);
    const strategyConditions = strategy.model.marketConditions;
    
    let compatibilityScore = 0;
    let totalConditions = strategyConditions.length;
    
    strategyConditions.forEach(condition => {
      if (marketConditions.includes(condition)) {
        compatibilityScore += 1;
      }
    });
    
    return totalConditions > 0 ? compatibilityScore / totalConditions : 0.5;
  }

  /**
   * Calculate performance score for a strategy
   */
  private calculatePerformanceScore(strategy: AdaptiveStrategy): number {
    const performance = strategy.model.performance;
    
    if (performance.totalTrades < this.minTradesForEvaluation) {
      return 0.5; // Neutral score for insufficient data
    }
    
    // Weighted performance score
    const winRateScore = performance.winRate;
    const returnScore = Math.max(0, Math.min(1, (performance.avgReturn + 0.1) / 0.2));
    const drawdownScore = Math.max(0, 1 - (performance.maxDrawdown / 0.2));
    const sharpeScore = Math.max(0, Math.min(1, (performance.sharpeRatio + 1) / 3));
    
    return (winRateScore * 0.3) + (returnScore * 0.3) + (drawdownScore * 0.2) + (sharpeScore * 0.2);
  }

  /**
   * Get Q-value for strategy-state combination
   */
  private getQValue(strategy: AdaptiveStrategy, marketStates: MarketState[]): number {
    const stateKey = this.encodeMarketState(marketStates);
    const actionKey = strategy.name;
    const qKey = `${stateKey}_${actionKey}`;
    
    return strategy.qTable[qKey] || 0;
  }

  /**
   * Generate trading signal using selected strategy
   */
  private async generateSignalWithStrategy(
    strategy: AdaptiveStrategy, 
    marketStates: MarketState[]
  ): Promise<TradingSignal | null> {
    const primaryMarket = marketStates[0]; // Use first market for primary signal
    
    if (!primaryMarket) {
      return null;
    }

    const action = await this.selectStrategyAction(strategy, primaryMarket);
    
    if (!action || action.type === 'hold') {
      return null;
    }

    // Convert strategy action to trading signal
    const signal: TradingSignal = {
      type: action.type === 'entry' ? 'BUY' : 'SELL',
      symbol: action.symbol,
      price: action.price,
      positionSize: this.calculatePositionSize(action, strategy),
      confidence: action.confidence,
      timestamp: Date.now(),
      metadata: {
        strategy: strategy.name,
        strategyVersion: strategy.model.version,
        reasoning: action.reasoning,
        marketConditions: this.analyzeMarketConditions(marketStates),
        qValue: this.getQValue(strategy, marketStates)
      }
    };

    return signal;
  }

  /**
   * Select action using strategy-specific logic
   */
  private async selectStrategyAction(strategy: AdaptiveStrategy, marketState: MarketState): Promise<StrategyAction | null> {
    switch (strategy.model.type) {
      case 'momentum':
        return this.selectMomentumAction(strategy, marketState);
      case 'mean_reversion':
        return this.selectMeanReversionAction(strategy, marketState);
      case 'breakout':
        return this.selectBreakoutAction(strategy, marketState);
      default:
        return null;
    }
  }

  /**
   * Momentum strategy action selection
   */
  private selectMomentumAction(strategy: AdaptiveStrategy, marketState: MarketState): StrategyAction | null {
    const momentumThreshold = strategy.model.parameters.get('momentum_threshold') || 0.02;
    const volumeThreshold = strategy.model.parameters.get('volume_threshold') || 1.5;
    
    if (Math.abs(marketState.momentum) > momentumThreshold && marketState.volume > volumeThreshold) {
      return {
        type: 'entry',
        symbol: marketState.symbol,
        quantity: 1,
        price: marketState.price,
        confidence: Math.min(0.9, Math.abs(marketState.momentum) * 10),
        reasoning: `Momentum signal: ${marketState.momentum.toFixed(4)}, Volume: ${marketState.volume.toFixed(2)}`,
        timestamp: Date.now()
      };
    }
    
    return null;
  }

  /**
   * Mean reversion strategy action selection
   */
  private selectMeanReversionAction(strategy: AdaptiveStrategy, marketState: MarketState): StrategyAction | null {
    const deviationThreshold = strategy.model.parameters.get('deviation_threshold') || 2.0;
    
    // Calculate price deviation from support/resistance
    const midPrice = (marketState.support + marketState.resistance) / 2;
    const deviation = Math.abs(marketState.price - midPrice) / midPrice;
    
    if (deviation > deviationThreshold * 0.01) {
      const actionType = marketState.price < midPrice ? 'entry' : 'exit';
      
      return {
        type: actionType,
        symbol: marketState.symbol,
        quantity: 1,
        price: marketState.price,
        confidence: Math.min(0.9, deviation * 20),
        reasoning: `Mean reversion signal: deviation ${deviation.toFixed(4)}`,
        timestamp: Date.now()
      };
    }
    
    return null;
  }

  /**
   * Breakout strategy action selection
   */
  private selectBreakoutAction(strategy: AdaptiveStrategy, marketState: MarketState): StrategyAction | null {
    const breakoutThreshold = strategy.model.parameters.get('breakout_threshold') || 0.02;
    const volumeConfirmation = strategy.model.parameters.get('volume_confirmation') || 2.0;
    
    const upperBreakout = marketState.price > marketState.resistance * (1 + breakoutThreshold);
    const lowerBreakout = marketState.price < marketState.support * (1 - breakoutThreshold);
    const volumeConfirmed = marketState.volume > volumeConfirmation;
    
    if ((upperBreakout || lowerBreakout) && volumeConfirmed) {
      return {
        type: 'entry',
        symbol: marketState.symbol,
        quantity: 1,
        price: marketState.price,
        confidence: volumeConfirmed ? 0.8 : 0.6,
        reasoning: `Breakout signal: ${upperBreakout ? 'upper' : 'lower'} breakout with volume confirmation`,
        timestamp: Date.now()
      };
    }
    
    return null;
  }

  /**
   * Calculate position size based on strategy and risk parameters
   */
  private calculatePositionSize(action: StrategyAction, strategy: AdaptiveStrategy): number {
    const baseSize = this.userPolicyConstraints.maxPositionSize * 0.1;
    const confidenceMultiplier = action.confidence;
    const strategyMultiplier = this.calculateStrategyMultiplier(strategy);
    
    return Math.min(
      baseSize * confidenceMultiplier * strategyMultiplier,
      this.userPolicyConstraints.maxPositionSize
    );
  }

  /**
   * Calculate strategy-specific position multiplier
   */
  private calculateStrategyMultiplier(strategy: AdaptiveStrategy): number {
    const performance = strategy.model.performance;
    
    if (performance.totalTrades < this.minTradesForEvaluation) {
      return 1.0;
    }
    
    // Base multiplier on recent performance
    const winRateMultiplier = performance.winRate > 0.6 ? 1.2 : performance.winRate < 0.4 ? 0.8 : 1.0;
    const returnMultiplier = performance.avgReturn > 0.05 ? 1.1 : performance.avgReturn < -0.02 ? 0.9 : 1.0;
    
    return winRateMultiplier * returnMultiplier;
  }

  /**
   * Record strategy action for reinforcement learning
   */
  private async recordStrategyAction(
    strategy: AdaptiveStrategy,
    marketStates: MarketState[],
    signal: TradingSignal
  ): Promise<void> {
    const state = this.encodeMarketStateVector(marketStates);
    const action = this.encodeAction(signal);
    
    const rlState: ReinforcementLearningState = {
      state,
      action,
      reward: 0, // Will be updated when trade result is known
      nextState: [],
      done: false,
      timestamp: Date.now()
    };
    
    this.stateHistory.push(rlState);
    
    // Maintain history size
    if (this.stateHistory.length > this.maxStateHistory) {
      this.stateHistory.shift();
    }
  }

  /**
   * Update Q-table based on trade results
   */
  async updateQTable(
    strategy: AdaptiveStrategy,
    marketStates: MarketState[],
    action: StrategyAction,
    reward: number,
    nextMarketStates: MarketState[]
  ): Promise<void> {
    const stateKey = this.encodeMarketState(marketStates);
    const actionKey = strategy.name;
    const qKey = `${stateKey}_${actionKey}`;
    
    const currentQ = strategy.qTable[qKey] || 0;
    const nextStateKey = this.encodeMarketState(nextMarketStates);
    
    // Get maximum Q-value for next state
    const nextQValues = Object.keys(strategy.qTable)
      .filter(key => key.startsWith(nextStateKey))
      .map(key => strategy.qTable[key]);
    
    const maxNextQ = nextQValues.length > 0 ? Math.max(...nextQValues) : 0;
    
    // Q-learning update
    const updatedQ = currentQ + strategy.learningRate * (reward + strategy.discountFactor * maxNextQ - currentQ);
    strategy.qTable[qKey] = updatedQ;
    
    // Update strategy performance
    this.updateStrategyPerformance(strategy, reward);
    
    // Decay exploration rate
    strategy.explorationRate *= 0.995;
    strategy.explorationRate = Math.max(0.01, strategy.explorationRate);
  }

  /**
   * Update strategy performance metrics
   */
  private updateStrategyPerformance(strategy: AdaptiveStrategy, reward: number): void {
    const performance = strategy.model.performance;
    
    performance.totalTrades++;
    
    // Update win rate
    if (reward > 0) {
      performance.winRate = ((performance.winRate * (performance.totalTrades - 1)) + 1) / performance.totalTrades;
    } else {
      performance.winRate = (performance.winRate * (performance.totalTrades - 1)) / performance.totalTrades;
    }
    
    // Update average return
    performance.avgReturn = ((performance.avgReturn * (performance.totalTrades - 1)) + reward) / performance.totalTrades;
    
    // Update performance history
    strategy.performanceHistory.push(reward);
    if (strategy.performanceHistory.length > 100) {
      strategy.performanceHistory.shift();
    }
    
    // Update max drawdown
    const recentReturns = strategy.performanceHistory.slice(-20);
    const peak = Math.max(...recentReturns);
    const trough = Math.min(...recentReturns);
    performance.maxDrawdown = Math.max(performance.maxDrawdown, (peak - trough) / peak);
    
    // Update Sharpe ratio
    if (strategy.performanceHistory.length >= 20) {
      const returns = strategy.performanceHistory.slice(-20);
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance);
      performance.sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;
    }
  }

  /**
   * Encode market state for Q-table keys
   */
  private encodeMarketState(marketStates: MarketState[]): string {
    return marketStates.map(state => {
      const trend = state.trend === 'bullish' ? 1 : state.trend === 'bearish' ? -1 : 0;
      const volatility = Math.floor(state.volatility * 100);
      const momentum = Math.floor(state.momentum * 100);
      
      return `${trend}_${volatility}_${momentum}`;
    }).join('|');
  }

  /**
   * Encode market state as vector for neural network
   */
  private encodeMarketStateVector(marketStates: MarketState[]): number[] {
    const vector: number[] = [];
    
    marketStates.forEach(state => {
      vector.push(
        state.price,
        state.volume,
        state.volatility,
        state.momentum,
        state.trend === 'bullish' ? 1 : state.trend === 'bearish' ? -1 : 0,
        state.support,
        state.resistance
      );
    });
    
    return vector;
  }

  /**
   * Encode action for reinforcement learning
   */
  private encodeAction(signal: TradingSignal): number {
    // Simple action encoding: 0 = hold, 1 = buy, 2 = sell
    return signal.type === 'BUY' ? 1 : signal.type === 'SELL' ? 2 : 0;
  }

  /**
   * Get market state for a symbol
   */
  private async getMarketState(symbol: string): Promise<MarketState> {
    // Check cache first
    const cached = this.marketStateCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < 30000) { // 30 second cache
      return cached;
    }

    // Simulated market state - in production, this would fetch real data
    const marketState: MarketState = {
      symbol,
      price: 1.0 + (Math.random() - 0.5) * 0.1,
      volume: 500000 + Math.random() * 1000000,
      volatility: 0.1 + Math.random() * 0.3,
      trend: Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'bearish' : 'sideways',
      momentum: (Math.random() - 0.5) * 0.1,
      support: 0.95,
      resistance: 1.05,
      timestamp: Date.now()
    };

    this.marketStateCache.set(symbol, marketState);
    return marketState;
  }

  /**
   * Analyze market conditions
   */
  private analyzeMarketConditions(marketStates: MarketState[]): string[] {
    const conditions: string[] = [];
    
    if (marketStates.length === 0) return conditions;
    
    const avgVolatility = marketStates.reduce((sum, state) => sum + state.volatility, 0) / marketStates.length;
    const avgVolume = marketStates.reduce((sum, state) => sum + state.volume, 0) / marketStates.length;
    
    // Volatility conditions
    if (avgVolatility > 0.25) {
      conditions.push('high_volatility');
    } else if (avgVolatility < 0.15) {
      conditions.push('low_volatility');
    }
    
    // Volume conditions
    if (avgVolume > 1000000) {
      conditions.push('high_volume');
    } else if (avgVolume < 300000) {
      conditions.push('low_volume');
    }
    
    // Trend conditions
    const bullishCount = marketStates.filter(s => s.trend === 'bullish').length;
    const bearishCount = marketStates.filter(s => s.trend === 'bearish').length;
    
    if (bullishCount > marketStates.length * 0.6) {
      conditions.push('trending', 'bullish_trend');
    } else if (bearishCount > marketStates.length * 0.6) {
      conditions.push('trending', 'bearish_trend');
    } else {
      conditions.push('sideways', 'consolidation');
    }
    
    return conditions;
  }

  /**
   * Get monitored symbols
   */
  private async getMonitoredSymbols(): Promise<string[]> {
    return ['BTC', 'ETH', 'SOL', 'AVAX'];
  }

  /**
   * Start strategy evaluation
   */
  private startStrategyEvaluation(): void {
    setInterval(async () => {
      await this.evaluateStrategies();
    }, this.strategyEvaluationInterval);
  }

  /**
   * Start market state monitoring
   */
  private startMarketStateMonitoring(): void {
    setInterval(async () => {
      const symbols = await this.getMonitoredSymbols();
      for (const symbol of symbols) {
        await this.getMarketState(symbol);
      }
    }, this.stateUpdateInterval);
  }

  /**
   * Evaluate and potentially adjust strategies
   */
  private async evaluateStrategies(): Promise<void> {
    const strategies = Array.from(this.strategies.values());
    
    for (const strategy of strategies) {
      // Check if strategy needs rebalancing
      if (strategy.model.performance.totalTrades >= this.minTradesForEvaluation) {
        const performanceScore = this.calculatePerformanceScore(strategy);
        
        if (performanceScore < 0.3) {
          // Poor performance - consider deactivating or retraining
          consola.warn(`Strategy ${strategy.name} underperforming: ${performanceScore.toFixed(2)}`);
          await this.retrainStrategy(strategy);
        } else if (performanceScore > 0.7) {
          // Good performance - consider increasing allocation
          consola.info(`Strategy ${strategy.name} performing well: ${performanceScore.toFixed(2)}`);
        }
      }
    }
  }

  /**
   * Retrain strategy parameters
   */
  private async retrainStrategy(strategy: AdaptiveStrategy): Promise<void> {
    consola.info(`🔄 Retraining strategy: ${strategy.name}`);
    
    // Analyze recent performance
    const recentPerformance = strategy.performanceHistory.slice(-50);
    const avgReturn = recentPerformance.reduce((sum, r) => sum + r, 0) / recentPerformance.length;
    
    // Adjust parameters based on performance
    if (avgReturn < 0) {
      // Increase risk thresholds
      strategy.model.parameters.forEach((value, key) => {
        if (key.includes('threshold')) {
          strategy.model.parameters.set(key, value * 1.1);
        }
      });
    }
    
    // Reset Q-table for fresh learning
    strategy.qTable = {};
    strategy.explorationRate = 0.2; // Increase exploration
    
    strategy.model.lastUpdate = Date.now();
  }

  // Reward functions for different strategies
  private momentumRewardFunction(state: MarketState, action: StrategyAction, result: any): number {
    // Reward based on momentum direction alignment
    const momentumReward = state.momentum * (action.type === 'entry' ? 1 : -1);
    const volumeReward = state.volume > 1000000 ? 0.1 : 0;
    const profitReward = result.profit || 0;
    
    return momentumReward + volumeReward + profitReward;
  }

  private meanReversionRewardFunction(state: MarketState, action: StrategyAction, result: any): number {
    // Reward based on reversion to mean
    const midPrice = (state.support + state.resistance) / 2;
    const deviation = Math.abs(state.price - midPrice) / midPrice;
    const reversionReward = deviation * (action.type === 'entry' ? 1 : -1);
    const profitReward = result.profit || 0;
    
    return reversionReward + profitReward;
  }

  private breakoutRewardFunction(state: MarketState, action: StrategyAction, result: any): number {
    // Reward based on breakout success
    const breakoutReward = state.volume > 1500000 ? 0.2 : 0;
    const volatilityReward = state.volatility > 0.2 ? 0.1 : 0;
    const profitReward = result.profit || 0;
    
    return breakoutReward + volatilityReward + profitReward;
  }

  // Self-improvement methods
  protected async adjustRiskParameters(): Promise<void> {
    this.strategies.forEach(strategy => {
      const performance = strategy.model.performance;
      if (performance.maxDrawdown > 0.15) {
        // Reduce risk parameters
        strategy.model.parameters.forEach((value, key) => {
          if (key.includes('stop_loss')) {
            strategy.model.parameters.set(key, value * 0.9);
          }
        });
      }
    });
  }

  protected async retrainDecisionModel(): Promise<void> {
    const strategies = Array.from(this.strategies.values());
    const underperformingStrategies = strategies.filter(s => this.calculatePerformanceScore(s) < 0.4);
    
    for (const strategy of underperformingStrategies) {
      await this.retrainStrategy(strategy);
    }
  }

  protected async emphasizeSuccessfulPatterns(): Promise<void> {
    const analysis = this.learningEngine.analyzePerformance();
    const successfulActions = analysis.patterns.mostSuccessfulActions;
    
    // Adjust strategy parameters to emphasize successful patterns
    successfulActions.forEach(action => {
      const strategy = this.strategies.get(this.currentStrategy || '');
      if (strategy) {
        // Increase learning rate for successful patterns
        strategy.learningRate = Math.min(0.3, strategy.learningRate * 1.1);
      }
    });
  }

  protected async avoidFailurePatterns(): Promise<void> {
    const analysis = this.learningEngine.analyzePerformance();
    const failureReasons = analysis.patterns.commonFailureReasons;
    
    // Adjust strategy parameters to avoid failure patterns
    failureReasons.forEach(reason => {
      if (reason.includes('high_volatility')) {
        this.strategies.forEach(strategy => {
          const currentThreshold = strategy.model.parameters.get('volatility_threshold') || 0.3;
          strategy.model.parameters.set('volatility_threshold', currentThreshold * 0.9);
        });
      }
    });
  }

  // Public API methods
  getActiveStrategies(): AdaptiveStrategy[] {
    return Array.from(this.strategies.values()).filter(s => s.isActive);
  }

  getCurrentStrategy(): string | null {
    return this.currentStrategy;
  }

  getStrategyPerformance(strategyName: string): any {
    const strategy = this.strategies.get(strategyName);
    return strategy ? strategy.model.performance : null;
  }

  async getStrategyRecommendations(): Promise<any[]> {
    const strategies = Array.from(this.strategies.values());
    const symbols = await this.getMonitoredSymbols();
    const marketStates = await Promise.all(symbols.map(symbol => this.getMarketState(symbol)));
    
    const recommendations = strategies.map(strategy => ({
      name: strategy.name,
      compatibility: this.calculateMarketCompatibility(strategy, marketStates),
      performance: this.calculatePerformanceScore(strategy),
      qValue: this.getQValue(strategy, marketStates),
      isRecommended: this.calculatePerformanceScore(strategy) > 0.6
    }));
    
    return recommendations.sort((a, b) => b.performance - a.performance);
  }

  exportStrategies(): any {
    const strategies = Array.from(this.strategies.entries()).map(([name, strategy]) => ({
      name,
      model: {
        ...strategy.model,
        parameters: Array.from(strategy.model.parameters.entries())
      },
      qTable: strategy.qTable,
      explorationRate: strategy.explorationRate,
      learningRate: strategy.learningRate,
      performanceHistory: strategy.performanceHistory
    }));
    
    return {
      strategies,
      stateHistory: this.stateHistory,
      exportTimestamp: Date.now()
    };
  }
}