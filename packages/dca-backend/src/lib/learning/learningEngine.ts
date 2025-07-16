/**
 * Learning Engine - Core self-improvement system for Vincent agents
 * Implements continuous learning, model updates, and adaptation mechanisms
 */

import { EventEmitter } from 'events';
import consola from 'consola';

export interface Feedback {
  timestamp: number;
  agentId: string;
  action: string;
  outcome: 'success' | 'failure' | 'partial';
  reward: number;
  context: any;
  metrics: {
    accuracy?: number;
    latency?: number;
    profitability?: number;
    riskScore?: number;
  };
}

export interface LearningState {
  totalExperiences: number;
  successRate: number;
  averageReward: number;
  learningRate: number;
  adaptationSpeed: number;
  modelVersion: string;
  lastUpdateTime: number;
}

export interface ModelUpdate {
  modelId: string;
  version: string;
  parameters: Map<string, any>;
  performanceImprovement: number;
  validationScore: number;
  timestamp: number;
}

export class LearningEngine extends EventEmitter {
  private agentId: string;
  private learningState: LearningState;
  private experienceBuffer: Feedback[] = [];
  private rewardHistory: number[] = [];
  private adaptationHistory: number[] = [];
  
  private readonly maxBufferSize = 1000;
  private readonly minExperiencesForUpdate = 10;
  private readonly baselearningRate = 0.001;
  private readonly adaptationDecay = 0.95;

  constructor(agentId: string, initialLearningRate: number = 0.001) {
    super();
    this.agentId = agentId;
    this.learningState = {
      totalExperiences: 0,
      successRate: 0,
      averageReward: 0,
      learningRate: initialLearningRate,
      adaptationSpeed: 0,
      modelVersion: '1.0.0',
      lastUpdateTime: Date.now()
    };
    
    consola.info(`🧠 Learning Engine initialized for agent: ${agentId}`);
  }

  async updateFromFeedback(feedback: Feedback): Promise<void> {
    // Add experience to buffer
    this.experienceBuffer.push(feedback);
    this.rewardHistory.push(feedback.reward);
    
    // Maintain buffer size
    if (this.experienceBuffer.length > this.maxBufferSize) {
      this.experienceBuffer.shift();
      this.rewardHistory.shift();
    }
    
    // Update learning state
    this.updateLearningState(feedback);
    
    // Check if we should trigger model update
    if (this.shouldUpdateModel()) {
      await this.triggerModelUpdate();
    }
    
    // Emit learning event
    this.emit('learningUpdate', {
      agentId: this.agentId,
      feedback,
      learningState: this.learningState
    });
  }

  private updateLearningState(feedback: Feedback): void {
    this.learningState.totalExperiences++;
    
    // Update success rate
    const recentExperiences = this.experienceBuffer.slice(-100);
    const successCount = recentExperiences.filter(exp => exp.outcome === 'success').length;
    this.learningState.successRate = successCount / recentExperiences.length;
    
    // Update average reward
    const recentRewards = this.rewardHistory.slice(-100);
    this.learningState.averageReward = recentRewards.reduce((sum, r) => sum + r, 0) / recentRewards.length;
    
    // Adapt learning rate based on performance
    this.adaptLearningRate();
    
    // Calculate adaptation speed
    this.calculateAdaptationSpeed();
    
    this.learningState.lastUpdateTime = Date.now();
  }

  private adaptLearningRate(): void {
    // Increase learning rate if performance is poor
    if (this.learningState.successRate < 0.5) {
      this.learningState.learningRate = Math.min(
        this.learningState.learningRate * 1.1,
        this.baselearningRate * 10
      );
    }
    // Decrease learning rate if performance is good (fine-tuning)
    else if (this.learningState.successRate > 0.8) {
      this.learningState.learningRate = Math.max(
        this.learningState.learningRate * 0.9,
        this.baselearningRate * 0.1
      );
    }
  }

  private calculateAdaptationSpeed(): void {
    if (this.rewardHistory.length < 20) return;
    
    // Calculate moving average of rewards
    const recent = this.rewardHistory.slice(-10);
    const older = this.rewardHistory.slice(-20, -10);
    
    const recentAvg = recent.reduce((sum, r) => sum + r, 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + r, 0) / older.length;
    
    // Adaptation speed based on improvement rate
    const improvement = recentAvg - olderAvg;
    this.learningState.adaptationSpeed = Math.max(0, improvement * 100);
    
    this.adaptationHistory.push(this.learningState.adaptationSpeed);
    if (this.adaptationHistory.length > 100) {
      this.adaptationHistory.shift();
    }
  }

  private shouldUpdateModel(): boolean {
    return (
      this.learningState.totalExperiences >= this.minExperiencesForUpdate &&
      this.learningState.totalExperiences % 50 === 0 // Update every 50 experiences
    );
  }

  private async triggerModelUpdate(): Promise<void> {
    try {
      const modelUpdate = await this.generateModelUpdate();
      
      if (modelUpdate.performanceImprovement > 0.05) { // 5% improvement threshold
        await this.applyModelUpdate(modelUpdate);
        consola.success(`🎯 Model updated for ${this.agentId}: ${modelUpdate.performanceImprovement.toFixed(2)}% improvement`);
      }
    } catch (error) {
      consola.error(`Failed to update model for ${this.agentId}:`, error);
    }
  }

  private async generateModelUpdate(): Promise<ModelUpdate> {
    // Analyze recent performance patterns
    const recentFeedback = this.experienceBuffer.slice(-100);
    const successfulActions = recentFeedback.filter(f => f.outcome === 'success');
    const failedActions = recentFeedback.filter(f => f.outcome === 'failure');
    
    // Extract patterns from successful actions
    const successPatterns = this.extractPatterns(successfulActions);
    const failurePatterns = this.extractPatterns(failedActions);
    
    // Generate new parameters
    const parameters = new Map<string, any>();
    parameters.set('successPatterns', successPatterns);
    parameters.set('failurePatterns', failurePatterns);
    parameters.set('learningRate', this.learningState.learningRate);
    parameters.set('adaptationSpeed', this.learningState.adaptationSpeed);
    
    // Calculate performance improvement
    const currentPerformance = this.learningState.successRate;
    const historicalPerformance = this.calculateHistoricalPerformance();
    const improvement = currentPerformance - historicalPerformance;
    
    return {
      modelId: this.agentId,
      version: this.incrementVersion(),
      parameters,
      performanceImprovement: improvement,
      validationScore: this.calculateValidationScore(),
      timestamp: Date.now()
    };
  }

  private extractPatterns(feedback: Feedback[]): any[] {
    // Simple pattern extraction - can be enhanced with ML
    const patterns: any[] = [];
    
    feedback.forEach(f => {
      if (f.context && f.reward > 0) {
        patterns.push({
          action: f.action,
          context: f.context,
          reward: f.reward,
          frequency: 1
        });
      }
    });
    
    // Aggregate similar patterns
    const aggregatedPatterns = new Map();
    patterns.forEach(pattern => {
      const key = `${pattern.action}_${JSON.stringify(pattern.context)}`;
      if (aggregatedPatterns.has(key)) {
        const existing = aggregatedPatterns.get(key);
        existing.frequency++;
        existing.reward = (existing.reward + pattern.reward) / 2;
      } else {
        aggregatedPatterns.set(key, pattern);
      }
    });
    
    return Array.from(aggregatedPatterns.values())
      .sort((a, b) => b.reward - a.reward)
      .slice(0, 10); // Top 10 patterns
  }

  private calculateHistoricalPerformance(): number {
    if (this.experienceBuffer.length < 50) return 0;
    
    const historical = this.experienceBuffer.slice(-200, -100);
    const successCount = historical.filter(exp => exp.outcome === 'success').length;
    return successCount / historical.length;
  }

  private calculateValidationScore(): number {
    // Cross-validation score based on recent performance
    const recentExperiences = this.experienceBuffer.slice(-50);
    if (recentExperiences.length < 10) return 0.5;
    
    const successRate = recentExperiences.filter(exp => exp.outcome === 'success').length / recentExperiences.length;
    const avgReward = recentExperiences.reduce((sum, exp) => sum + exp.reward, 0) / recentExperiences.length;
    
    return (successRate * 0.7 + Math.min(avgReward, 1) * 0.3);
  }

  private incrementVersion(): string {
    const [major, minor, patch] = this.learningState.modelVersion.split('.').map(Number);
    const newVersion = `${major}.${minor}.${patch + 1}`;
    this.learningState.modelVersion = newVersion;
    return newVersion;
  }

  private async applyModelUpdate(update: ModelUpdate): Promise<void> {
    // Update internal state
    this.learningState.modelVersion = update.version;
    this.learningState.lastUpdateTime = update.timestamp;
    
    // Emit model update event
    this.emit('modelUpdate', {
      agentId: this.agentId,
      update,
      learningState: this.learningState
    });
  }

  // Public API methods
  getCurrentLearningRate(): number {
    return this.learningState.learningRate;
  }

  getLearningState(): LearningState {
    return { ...this.learningState };
  }

  getExperienceBuffer(): Feedback[] {
    return [...this.experienceBuffer];
  }

  getRewardHistory(): number[] {
    return [...this.rewardHistory];
  }

  getAdaptationTrend(): number[] {
    return [...this.adaptationHistory];
  }

  // Performance analysis
  analyzePerformance(): any {
    const recentExperiences = this.experienceBuffer.slice(-100);
    
    return {
      totalExperiences: this.learningState.totalExperiences,
      successRate: this.learningState.successRate,
      averageReward: this.learningState.averageReward,
      learningRate: this.learningState.learningRate,
      adaptationSpeed: this.learningState.adaptationSpeed,
      modelVersion: this.learningState.modelVersion,
      trends: {
        rewardTrend: this.calculateTrend(this.rewardHistory.slice(-50)),
        adaptationTrend: this.calculateTrend(this.adaptationHistory.slice(-50)),
        successRateTrend: this.calculateSuccessRateTrend()
      },
      patterns: {
        mostSuccessfulActions: this.getMostSuccessfulActions(),
        commonFailureReasons: this.getCommonFailureReasons(),
        performanceByTimeOfDay: this.getPerformanceByTimeOfDay()
      }
    };
  }

  private calculateTrend(data: number[]): 'improving' | 'declining' | 'stable' {
    if (data.length < 10) return 'stable';
    
    const recent = data.slice(-10);
    const older = data.slice(-20, -10);
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  private calculateSuccessRateTrend(): 'improving' | 'declining' | 'stable' {
    const recentExperiences = this.experienceBuffer.slice(-100);
    const olderExperiences = this.experienceBuffer.slice(-200, -100);
    
    if (recentExperiences.length < 20 || olderExperiences.length < 20) return 'stable';
    
    const recentSuccess = recentExperiences.filter(exp => exp.outcome === 'success').length / recentExperiences.length;
    const olderSuccess = olderExperiences.filter(exp => exp.outcome === 'success').length / olderExperiences.length;
    
    const change = (recentSuccess - olderSuccess) / olderSuccess;
    
    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  private getMostSuccessfulActions(): any[] {
    const successfulActions = this.experienceBuffer.filter(exp => exp.outcome === 'success');
    const actionCounts = new Map<string, { count: number; avgReward: number; totalReward: number }>();
    
    successfulActions.forEach(exp => {
      if (actionCounts.has(exp.action)) {
        const existing = actionCounts.get(exp.action)!;
        existing.count++;
        existing.totalReward += exp.reward;
        existing.avgReward = existing.totalReward / existing.count;
      } else {
        actionCounts.set(exp.action, {
          count: 1,
          avgReward: exp.reward,
          totalReward: exp.reward
        });
      }
    });
    
    return Array.from(actionCounts.entries())
      .map(([action, stats]) => ({ action, ...stats }))
      .sort((a, b) => b.avgReward - a.avgReward)
      .slice(0, 5);
  }

  private getCommonFailureReasons(): string[] {
    const failedActions = this.experienceBuffer.filter(exp => exp.outcome === 'failure');
    const reasons = new Map<string, number>();
    
    failedActions.forEach(exp => {
      const reason = exp.context?.failureReason || 'Unknown';
      reasons.set(reason, (reasons.get(reason) || 0) + 1);
    });
    
    return Array.from(reasons.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason]) => reason);
  }

  private getPerformanceByTimeOfDay(): any {
    const performanceByHour = new Map<number, { success: number; total: number }>();
    
    this.experienceBuffer.forEach(exp => {
      const hour = new Date(exp.timestamp).getHours();
      if (!performanceByHour.has(hour)) {
        performanceByHour.set(hour, { success: 0, total: 0 });
      }
      
      const stats = performanceByHour.get(hour)!;
      stats.total++;
      if (exp.outcome === 'success') {
        stats.success++;
      }
    });
    
    return Array.from(performanceByHour.entries())
      .map(([hour, stats]) => ({
        hour,
        successRate: stats.success / stats.total,
        totalActions: stats.total
      }))
      .sort((a, b) => b.successRate - a.successRate);
  }
}