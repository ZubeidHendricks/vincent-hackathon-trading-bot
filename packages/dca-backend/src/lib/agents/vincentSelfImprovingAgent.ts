/**
 * VincentSelfImprovingAgent - Base class for self-improving Vincent agents
 * Extends VincentBaseAgent with continuous learning and adaptation capabilities
 */

import { EventEmitter } from 'events';
import consola from 'consola';
import { VincentBaseAgent } from './vincentBaseAgent.js';
import { LearningEngine, type Feedback, type LearningState } from '../learning/learningEngine.js';
import type { TradingSignal, UserPolicyConstraints } from '../types/trading.js';

export interface PerformanceMetrics {
  accuracy: number;
  latency: number;
  profitability: number;
  riskScore: number;
  adaptationSpeed: number;
  learningEfficiency: number;
}

export interface SelfImprovementConfig {
  enableContinuousLearning: boolean;
  learningRate: number;
  adaptationThreshold: number;
  performanceWindowSize: number;
  modelUpdateFrequency: number;
  experienceBufferSize: number;
  validationSplitRatio: number;
}

export interface AdaptationResult {
  modelUpdated: boolean;
  performanceImprovement: number;
  adaptationsSuggested: string[];
  confidenceLevel: number;
  timestamp: number;
}

export abstract class VincentSelfImprovingAgent extends VincentBaseAgent {
  protected learningEngine: LearningEngine;
  protected performanceHistory: PerformanceMetrics[] = [];
  protected adaptationHistory: AdaptationResult[] = [];
  protected selfImprovementConfig: SelfImprovementConfig;
  protected currentModelVersion: string = '1.0.0';
  protected trainingMode: boolean = false;
  
  private performanceTracker: Map<string, number[]> = new Map();
  private lastPerformanceCheck: number = Date.now();
  private adaptationCounter: number = 0;
  private validationResults: Map<string, number> = new Map();

  constructor(
    agentId: string,
    userPolicyConstraints: UserPolicyConstraints,
    config: SelfImprovementConfig = {
      enableContinuousLearning: true,
      learningRate: 0.001,
      adaptationThreshold: 0.05,
      performanceWindowSize: 100,
      modelUpdateFrequency: 50,
      experienceBufferSize: 1000,
      validationSplitRatio: 0.2
    }
  ) {
    super(agentId, userPolicyConstraints);
    
    this.selfImprovementConfig = config;
    this.learningEngine = new LearningEngine(agentId, config.learningRate);
    
    // Set up learning engine event handlers
    this.learningEngine.on('learningUpdate', this.handleLearningUpdate.bind(this));
    this.learningEngine.on('modelUpdate', this.handleModelUpdate.bind(this));
    
    // Initialize performance tracking
    this.initializePerformanceTracking();
    
    consola.info(`🧠 Self-improving agent initialized: ${agentId}`);
  }

  /**
   * Enhanced signal generation with learning integration
   */
  async generateSignal(): Promise<TradingSignal | null> {
    const startTime = Date.now();
    
    try {
      // Generate base signal using agent-specific logic
      const baseSignal = await this.generateBaseSignal();
      
      if (!baseSignal) {
        await this.recordPerformance('signal_generation', 'failure', 0, Date.now() - startTime);
        return null;
      }
      
      // Apply learning-based enhancements
      const enhancedSignal = await this.enhanceSignalWithLearning(baseSignal);
      
      // Validate with policy constraints
      const validation = await this.validateSignalWithPolicy(enhancedSignal);
      
      if (!validation.isValid) {
        await this.recordPerformance('signal_validation', 'failure', 0, Date.now() - startTime);
        return null;
      }
      
      // Record successful signal generation
      await this.recordPerformance('signal_generation', 'success', 1, Date.now() - startTime);
      
      return enhancedSignal;
      
    } catch (error) {
      consola.error(`Error in signal generation for ${this.agentId}:`, error);
      await this.recordPerformance('signal_generation', 'failure', 0, Date.now() - startTime);
      return null;
    }
  }

  /**
   * Abstract method for agent-specific signal generation
   */
  protected abstract generateBaseSignal(): Promise<TradingSignal | null>;

  /**
   * Enhance signal using learning insights
   */
  protected async enhanceSignalWithLearning(signal: TradingSignal): Promise<TradingSignal> {
    if (!this.selfImprovementConfig.enableContinuousLearning) {
      return signal;
    }

    const learningState = this.learningEngine.getLearningState();
    const recentPatterns = this.learningEngine.getExperienceBuffer().slice(-20);
    
    // Apply learned patterns to adjust signal parameters
    const enhancedSignal = { ...signal };
    
    // Adjust confidence based on recent success patterns
    const successfulPatterns = recentPatterns.filter(p => p.outcome === 'success');
    if (successfulPatterns.length > 0) {
      const avgSuccessReward = successfulPatterns.reduce((sum, p) => sum + p.reward, 0) / successfulPatterns.length;
      enhancedSignal.confidence = Math.min(1.0, signal.confidence * (1 + avgSuccessReward * 0.1));
    }
    
    // Adjust position size based on learning insights
    if (learningState.successRate > 0.7) {
      enhancedSignal.positionSize = Math.min(
        enhancedSignal.positionSize * 1.1,
        this.userPolicyConstraints.maxPositionSize
      );
    } else if (learningState.successRate < 0.4) {
      enhancedSignal.positionSize = Math.max(
        enhancedSignal.positionSize * 0.9,
        this.userPolicyConstraints.minPositionSize || 0.01
      );
    }
    
    // Add learning-based metadata
    enhancedSignal.metadata = {
      ...enhancedSignal.metadata,
      learningEnhanced: true,
      modelVersion: this.currentModelVersion,
      learningState: {
        successRate: learningState.successRate,
        adaptationSpeed: learningState.adaptationSpeed,
        modelVersion: learningState.modelVersion
      }
    };
    
    return enhancedSignal;
  }

  /**
   * Record performance feedback for learning
   */
  async recordPerformance(
    action: string,
    outcome: 'success' | 'failure' | 'partial',
    reward: number,
    latency: number,
    context?: any
  ): Promise<void> {
    const feedback: Feedback = {
      timestamp: Date.now(),
      agentId: this.agentId,
      action,
      outcome,
      reward,
      context: context || {},
      metrics: {
        latency,
        accuracy: outcome === 'success' ? 1 : 0,
        profitability: reward,
        riskScore: this.calculateRiskScore(context)
      }
    };
    
    await this.learningEngine.updateFromFeedback(feedback);
    
    // Update performance tracking
    this.updatePerformanceTracking(action, feedback.metrics);
    
    // Check for adaptation opportunities
    await this.checkForAdaptation();
  }

  /**
   * Calculate risk score based on context
   */
  private calculateRiskScore(context: any): number {
    if (!context) return 0.5;
    
    let riskScore = 0.5;
    
    // Adjust based on market volatility
    if (context.marketVolatility) {
      riskScore += context.marketVolatility * 0.3;
    }
    
    // Adjust based on position size
    if (context.positionSize) {
      const sizeRatio = context.positionSize / this.userPolicyConstraints.maxPositionSize;
      riskScore += sizeRatio * 0.2;
    }
    
    // Adjust based on recent performance
    const recentPerformance = this.performanceHistory.slice(-10);
    if (recentPerformance.length > 0) {
      const avgProfitability = recentPerformance.reduce((sum, p) => sum + p.profitability, 0) / recentPerformance.length;
      if (avgProfitability < 0) {
        riskScore += 0.1;
      }
    }
    
    return Math.max(0, Math.min(1, riskScore));
  }

  /**
   * Update performance tracking metrics
   */
  private updatePerformanceTracking(action: string, metrics: any): void {
    Object.entries(metrics).forEach(([key, value]) => {
      if (typeof value === 'number') {
        const trackingKey = `${action}_${key}`;
        if (!this.performanceTracker.has(trackingKey)) {
          this.performanceTracker.set(trackingKey, []);
        }
        
        const values = this.performanceTracker.get(trackingKey)!;
        values.push(value);
        
        // Keep only recent values
        if (values.length > this.selfImprovementConfig.performanceWindowSize) {
          values.shift();
        }
      }
    });
  }

  /**
   * Check if adaptation is needed
   */
  private async checkForAdaptation(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastPerformanceCheck;
    
    // Check every 5 minutes
    if (timeSinceLastCheck < 5 * 60 * 1000) {
      return;
    }
    
    this.lastPerformanceCheck = now;
    
    const currentPerformance = await this.calculateCurrentPerformance();
    const adaptationNeeded = await this.shouldAdapt(currentPerformance);
    
    if (adaptationNeeded) {
      await this.performAdaptation(currentPerformance);
    }
  }

  /**
   * Calculate current performance metrics
   */
  private async calculateCurrentPerformance(): Promise<PerformanceMetrics> {
    const learningState = this.learningEngine.getLearningState();
    const recentFeedback = this.learningEngine.getExperienceBuffer().slice(-50);
    
    const accuracy = recentFeedback.length > 0 
      ? recentFeedback.filter(f => f.outcome === 'success').length / recentFeedback.length 
      : 0;
    
    const latency = recentFeedback.length > 0
      ? recentFeedback.reduce((sum, f) => sum + (f.metrics.latency || 0), 0) / recentFeedback.length
      : 0;
    
    const profitability = recentFeedback.length > 0
      ? recentFeedback.reduce((sum, f) => sum + f.reward, 0) / recentFeedback.length
      : 0;
    
    const riskScore = recentFeedback.length > 0
      ? recentFeedback.reduce((sum, f) => sum + (f.metrics.riskScore || 0.5), 0) / recentFeedback.length
      : 0.5;
    
    return {
      accuracy,
      latency,
      profitability,
      riskScore,
      adaptationSpeed: learningState.adaptationSpeed,
      learningEfficiency: learningState.successRate * learningState.adaptationSpeed
    };
  }

  /**
   * Determine if adaptation is needed
   */
  private async shouldAdapt(currentPerformance: PerformanceMetrics): Promise<boolean> {
    // Check if performance has declined
    if (this.performanceHistory.length < 2) {
      return false;
    }
    
    const recentPerformance = this.performanceHistory.slice(-5);
    const avgRecentProfitability = recentPerformance.reduce((sum, p) => sum + p.profitability, 0) / recentPerformance.length;
    
    // Adapt if performance has declined significantly
    const performanceDecline = avgRecentProfitability < currentPerformance.profitability - this.selfImprovementConfig.adaptationThreshold;
    
    // Adapt if learning efficiency is low
    const lowLearningEfficiency = currentPerformance.learningEfficiency < 0.3;
    
    // Adapt if accuracy is below threshold
    const lowAccuracy = currentPerformance.accuracy < 0.5;
    
    return performanceDecline || lowLearningEfficiency || lowAccuracy;
  }

  /**
   * Perform adaptation based on current performance
   */
  private async performAdaptation(currentPerformance: PerformanceMetrics): Promise<void> {
    const adaptationResult: AdaptationResult = {
      modelUpdated: false,
      performanceImprovement: 0,
      adaptationsSuggested: [],
      confidenceLevel: 0,
      timestamp: Date.now()
    };
    
    try {
      // Analyze performance patterns
      const analysis = this.learningEngine.analyzePerformance();
      
      // Suggest parameter adjustments
      const suggestions = await this.generateAdaptationSuggestions(currentPerformance, analysis);
      adaptationResult.adaptationsSuggested = suggestions;
      
      // Apply adaptations
      if (suggestions.length > 0) {
        await this.applyAdaptations(suggestions);
        adaptationResult.modelUpdated = true;
      }
      
      // Calculate confidence level
      adaptationResult.confidenceLevel = this.calculateAdaptationConfidence(currentPerformance);
      
      // Record adaptation
      this.adaptationHistory.push(adaptationResult);
      this.adaptationCounter++;
      
      consola.info(`🔄 Adaptation performed for ${this.agentId}: ${suggestions.length} changes applied`);
      
    } catch (error) {
      consola.error(`Adaptation failed for ${this.agentId}:`, error);
    }
  }

  /**
   * Generate adaptation suggestions
   */
  private async generateAdaptationSuggestions(
    performance: PerformanceMetrics,
    analysis: any
  ): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Suggest learning rate adjustments
    if (performance.learningEfficiency < 0.3) {
      suggestions.push('increase_learning_rate');
    } else if (performance.learningEfficiency > 0.8) {
      suggestions.push('decrease_learning_rate');
    }
    
    // Suggest parameter tuning based on trends
    if (analysis.trends.rewardTrend === 'declining') {
      suggestions.push('adjust_risk_parameters');
    }
    
    if (analysis.trends.successRateTrend === 'declining') {
      suggestions.push('retrain_decision_model');
    }
    
    // Suggest strategy changes based on patterns
    if (analysis.patterns.mostSuccessfulActions.length > 0) {
      suggestions.push('emphasize_successful_patterns');
    }
    
    if (analysis.patterns.commonFailureReasons.length > 0) {
      suggestions.push('avoid_failure_patterns');
    }
    
    return suggestions;
  }

  /**
   * Apply adaptation suggestions
   */
  private async applyAdaptations(suggestions: string[]): Promise<void> {
    for (const suggestion of suggestions) {
      switch (suggestion) {
        case 'increase_learning_rate':
          this.selfImprovementConfig.learningRate *= 1.2;
          break;
        case 'decrease_learning_rate':
          this.selfImprovementConfig.learningRate *= 0.8;
          break;
        case 'adjust_risk_parameters':
          await this.adjustRiskParameters();
          break;
        case 'retrain_decision_model':
          await this.retrainDecisionModel();
          break;
        case 'emphasize_successful_patterns':
          await this.emphasizeSuccessfulPatterns();
          break;
        case 'avoid_failure_patterns':
          await this.avoidFailurePatterns();
          break;
      }
    }
  }

  /**
   * Calculate adaptation confidence
   */
  private calculateAdaptationConfidence(performance: PerformanceMetrics): number {
    const factors = [
      performance.accuracy,
      Math.min(1, performance.adaptationSpeed / 10),
      Math.min(1, performance.learningEfficiency),
      1 - performance.riskScore
    ];
    
    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }

  /**
   * Initialize performance tracking
   */
  private initializePerformanceTracking(): void {
    // Set up periodic performance recording
    setInterval(async () => {
      const currentPerformance = await this.calculateCurrentPerformance();
      this.performanceHistory.push(currentPerformance);
      
      // Keep only recent performance history
      if (this.performanceHistory.length > this.selfImprovementConfig.performanceWindowSize) {
        this.performanceHistory.shift();
      }
    }, 60000); // Every minute
  }

  /**
   * Handle learning engine updates
   */
  private handleLearningUpdate(event: any): void {
    this.emit('learningUpdate', {
      agentId: this.agentId,
      ...event
    });
  }

  /**
   * Handle model updates
   */
  private handleModelUpdate(event: any): void {
    this.currentModelVersion = event.update.version;
    this.emit('modelUpdate', {
      agentId: this.agentId,
      ...event
    });
  }

  // Abstract methods for agent-specific adaptations
  protected abstract adjustRiskParameters(): Promise<void>;
  protected abstract retrainDecisionModel(): Promise<void>;
  protected abstract emphasizeSuccessfulPatterns(): Promise<void>;
  protected abstract avoidFailurePatterns(): Promise<void>;

  // Public API methods
  getCurrentModelVersion(): string {
    return this.currentModelVersion;
  }

  getLearningState(): LearningState {
    return this.learningEngine.getLearningState();
  }

  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  getAdaptationHistory(): AdaptationResult[] {
    return [...this.adaptationHistory];
  }

  async enableTrainingMode(): Promise<void> {
    this.trainingMode = true;
    consola.info(`🎓 Training mode enabled for ${this.agentId}`);
  }

  async disableTrainingMode(): Promise<void> {
    this.trainingMode = false;
    consola.info(`🎓 Training mode disabled for ${this.agentId}`);
  }

  async exportModel(): Promise<any> {
    return {
      agentId: this.agentId,
      modelVersion: this.currentModelVersion,
      learningState: this.learningEngine.getLearningState(),
      performanceHistory: this.performanceHistory,
      adaptationHistory: this.adaptationHistory,
      config: this.selfImprovementConfig,
      exportTimestamp: Date.now()
    };
  }
}