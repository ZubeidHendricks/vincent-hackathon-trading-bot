/**
 * Portfolio Coordinator Agent
 * Master agent that coordinates all trading agents and makes final portfolio decisions
 */

import { BaseAgent, AgentConfig, AgentMessage } from './baseAgent';
import { MarketData, TradingSignal } from '../strategies/index';
import consola from 'consola';

interface PortfolioState {
  totalValue: number;
  cashBalance: number;
  positions: Map<string, number>;
  allocation: Map<string, number>; // agent_id -> allocation %
  performance: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  };
}

interface AgentSignal {
  agentId: string;
  signal: TradingSignal;
  timestamp: number;
  allocation: number;
  performance: any;
}

interface PortfolioDecision {
  finalAction: 'BUY' | 'SELL' | 'HOLD';
  amount: number;
  confidence: number;
  reasoning: string;
  contributingAgents: string[];
  riskAssessment: string;
}

interface MarketRegime {
  trend: 'BULL' | 'BEAR' | 'SIDEWAYS';
  volatility: 'LOW' | 'MEDIUM' | 'HIGH';
  correlation: number;
  confidence: number;
}

export class PortfolioCoordinator extends BaseAgent {
  private agentSignals: Map<string, AgentSignal> = new Map();
  private portfolioState: PortfolioState;
  private decisionHistory: PortfolioDecision[] = [];
  private marketRegime: MarketRegime;
  private rebalanceThreshold: number = 0.1; // 10% deviation triggers rebalance
  
  // Agent coordination parameters
  private agentWeights: Map<string, number> = new Map([
    ['momentum', 0.35],
    ['arbitrage', 0.40],
    ['mean-reversion', 0.25]
  ]);

  constructor(config: AgentConfig) {
    super(config);
    
    this.portfolioState = {
      totalValue: 0,
      cashBalance: 0,
      positions: new Map(),
      allocation: new Map([
        ['momentum', 35],
        ['arbitrage', 40],
        ['mean-reversion', 25]
      ]),
      performance: {
        totalReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0
      }
    };

    this.marketRegime = {
      trend: 'SIDEWAYS',
      volatility: 'MEDIUM',
      correlation: 0.5,
      confidence: 0.5
    };

    consola.info(`🎯 Portfolio Coordinator initialized - Master decision maker`);
  }

  async analyzeMarket(data: MarketData): Promise<TradingSignal> {
    try {
      // Update market regime analysis
      await this.updateMarketRegime(data);
      
      // Collect signals from all agents
      const activeSignals = Array.from(this.agentSignals.values())
        .filter(signal => Date.now() - signal.timestamp < 30000); // Last 30 seconds
      
      if (activeSignals.length === 0) {
        return this.createHoldSignal('No recent signals from trading agents');
      }

      // Make portfolio decision
      const decision = await this.makePortfolioDecision(activeSignals, data);
      
      // Check if rebalancing is needed
      await this.checkRebalancing();
      
      // Convert decision to trading signal
      return this.convertDecisionToSignal(decision);

    } catch (error) {
      consola.error('Portfolio Coordinator analysis failed:', error);
      return this.createHoldSignal(`Coordination error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processMessage(message: AgentMessage): Promise<void> {
    switch (message.type) {
      case 'SIGNAL':
        await this.handleAgentSignal(message);
        break;
      case 'POSITION_UPDATE':
        await this.handlePositionUpdate(message);
        break;
      case 'RISK_ALERT':
        await this.handleRiskAlert(message);
        break;
      default:
        consola.debug(`Portfolio Coordinator received unhandled message type: ${message.type}`);
    }
  }

  validateSignal(signal: TradingSignal): boolean {
    // Portfolio coordinator validates the final decision
    if (signal.confidence < 0.2) return false;
    
    // Ensure decision is within risk parameters
    if (signal.action !== 'HOLD') {
      const maxPositionSize = this.portfolioState.totalValue * 0.1; // 10% max position
      if (signal.amount > maxPositionSize) return false;
    }
    
    return true;
  }

  private async updateMarketRegime(data: MarketData): Promise<void> {
    if (this.marketData.length < 20) return;
    
    const recentData = this.marketData.slice(-20);
    const prices = recentData.map(d => d.price);
    
    // Trend analysis
    const startPrice = prices[0];
    const endPrice = prices[prices.length - 1];
    const trendChange = (endPrice - startPrice) / startPrice;
    
    if (trendChange > 0.05) {
      this.marketRegime.trend = 'BULL';
    } else if (trendChange < -0.05) {
      this.marketRegime.trend = 'BEAR';
    } else {
      this.marketRegime.trend = 'SIDEWAYS';
    }
    
    // Volatility analysis
    const returns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
    const volatility = Math.sqrt(returns.reduce((sum, ret) => sum + ret * ret, 0) / returns.length);
    
    if (volatility > 0.03) {
      this.marketRegime.volatility = 'HIGH';
    } else if (volatility > 0.015) {
      this.marketRegime.volatility = 'MEDIUM';
    } else {
      this.marketRegime.volatility = 'LOW';
    }
    
    // Update confidence based on data quality
    this.marketRegime.confidence = Math.min(0.9, this.marketData.length / 50);
    
    // Broadcast regime change if significant
    if (Date.now() % 60000 < 10000) { // Every minute
      await this.broadcastMarketRegime();
    }
  }

  private async makePortfolioDecision(signals: AgentSignal[], data: MarketData): Promise<PortfolioDecision> {
    // Weighted signal aggregation
    let buyScore = 0;
    let sellScore = 0;
    let totalWeight = 0;
    let totalAmount = 0;
    const contributingAgents: string[] = [];
    
    for (const agentSignal of signals) {
      const weight = this.agentWeights.get(agentSignal.agentId) || 0;
      const signal = agentSignal.signal;
      
      if (signal.confidence < 0.3) continue; // Skip low-confidence signals
      
      const adjustedWeight = weight * signal.confidence * this.getAgentPerformanceMultiplier(agentSignal.agentId);
      totalWeight += adjustedWeight;
      contributingAgents.push(agentSignal.agentId);
      
      if (signal.action === 'BUY') {
        buyScore += adjustedWeight;
        totalAmount += signal.amount * (agentSignal.allocation / 100);
      } else if (signal.action === 'SELL') {
        sellScore += adjustedWeight;
        totalAmount += signal.amount * (agentSignal.allocation / 100);
      }
    }
    
    // Determine final action
    let finalAction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0;
    
    if (buyScore > sellScore && buyScore > 0.3) {
      finalAction = 'BUY';
      confidence = Math.min(0.95, buyScore / Math.max(totalWeight, 1));
    } else if (sellScore > buyScore && sellScore > 0.3) {
      finalAction = 'SELL';
      confidence = Math.min(0.95, sellScore / Math.max(totalWeight, 1));
    } else {
      confidence = 0.1;
    }
    
    // Apply market regime adjustments
    const regimeAdjustment = this.applyMarketRegimeAdjustment(finalAction, confidence);
    finalAction = regimeAdjustment.action;
    confidence = regimeAdjustment.confidence;
    
    // Consensus bonus
    if (contributingAgents.length >= 2) {
      const consensusBonus = Math.min(0.15, contributingAgents.length * 0.05);
      confidence = Math.min(0.98, confidence * (1 + consensusBonus));
    }
    
    // Risk assessment
    const riskAssessment = this.assessRisk(finalAction, totalAmount, confidence);
    
    // Generate reasoning
    const reasoning = this.generateReasoning(signals, finalAction, confidence, riskAssessment);
    
    const decision: PortfolioDecision = {
      finalAction,
      amount: finalAction === 'HOLD' ? 0 : totalAmount,
      confidence,
      reasoning,
      contributingAgents,
      riskAssessment
    };
    
    // Store decision history
    this.decisionHistory.push(decision);
    if (this.decisionHistory.length > 100) {
      this.decisionHistory = this.decisionHistory.slice(-100);
    }
    
    return decision;
  }

  private getAgentPerformanceMultiplier(agentId: string): number {
    // Adjust agent weight based on recent performance
    // This would use actual performance data in production
    const baseMultiplier = 1.0;
    
    // Simple performance-based adjustment (placeholder)
    const recentDecisions = this.decisionHistory.slice(-10);
    const agentContributions = recentDecisions.filter(d => d.contributingAgents.includes(agentId));
    
    if (agentContributions.length === 0) return baseMultiplier;
    
    // This is simplified - in production, track actual P&L attribution
    const successRate = agentContributions.length / recentDecisions.length;
    return baseMultiplier * (0.5 + successRate);
  }

  private applyMarketRegimeAdjustment(action: 'BUY' | 'SELL' | 'HOLD', confidence: number): { action: 'BUY' | 'SELL' | 'HOLD'; confidence: number } {
    let adjustedAction = action;
    let adjustedConfidence = confidence;
    
    // Adjust based on market regime
    if (this.marketRegime.trend === 'BULL' && action === 'BUY') {
      adjustedConfidence *= 1.1; // Boost buy confidence in bull markets
    } else if (this.marketRegime.trend === 'BEAR' && action === 'SELL') {
      adjustedConfidence *= 1.1; // Boost sell confidence in bear markets
    } else if (this.marketRegime.trend === 'BEAR' && action === 'BUY') {
      adjustedConfidence *= 0.8; // Reduce buy confidence in bear markets
    }
    
    // Volatility adjustments
    if (this.marketRegime.volatility === 'HIGH') {
      adjustedConfidence *= 0.9; // Reduce confidence in high volatility
    } else if (this.marketRegime.volatility === 'LOW') {
      adjustedConfidence *= 1.05; // Slightly boost confidence in stable markets
    }
    
    return {
      action: adjustedConfidence > 0.3 ? adjustedAction : 'HOLD',
      confidence: Math.min(0.98, adjustedConfidence)
    };
  }

  private assessRisk(action: 'BUY' | 'SELL' | 'HOLD', amount: number, confidence: number): string {
    const risks: string[] = [];
    
    if (action !== 'HOLD') {
      // Position size risk
      const positionRisk = amount / this.portfolioState.totalValue;
      if (positionRisk > 0.1) risks.push('Large position size');
      
      // Confidence risk
      if (confidence < 0.6) risks.push('Low confidence signal');
      
      // Market regime risk
      if (this.marketRegime.volatility === 'HIGH') risks.push('High market volatility');
      if (this.marketRegime.confidence < 0.5) risks.push('Uncertain market regime');
      
      // Diversification risk
      if (this.agentSignals.size < 2) risks.push('Limited signal diversity');
    }
    
    return risks.length > 0 ? risks.join(', ') : 'Low risk';
  }

  private generateReasoning(signals: AgentSignal[], action: 'BUY' | 'SELL' | 'HOLD', confidence: number, riskAssessment: string): string {
    const activeAgents = signals.map(s => s.agentId).join(', ');
    const avgConfidence = signals.reduce((sum, s) => sum + s.signal.confidence, 0) / signals.length;
    
    let reasoning = `${action} decision with ${(confidence * 100).toFixed(1)}% confidence. `;
    reasoning += `Contributing agents: ${activeAgents}. `;
    reasoning += `Average agent confidence: ${(avgConfidence * 100).toFixed(1)}%. `;
    reasoning += `Market regime: ${this.marketRegime.trend}/${this.marketRegime.volatility}. `;
    reasoning += `Risk: ${riskAssessment}.`;
    
    return reasoning;
  }

  private async checkRebalancing(): Promise<void> {
    // Check if agent allocations need rebalancing
    const currentAllocations = new Map<string, number>();
    let totalDeviation = 0;
    
    for (const [agentId, targetAllocation] of this.portfolioState.allocation) {
      const agentSignal = this.agentSignals.get(agentId);
      const currentAllocation = agentSignal?.allocation || 0;
      const deviation = Math.abs(currentAllocation - targetAllocation) / targetAllocation;
      
      currentAllocations.set(agentId, currentAllocation);
      totalDeviation += deviation;
    }
    
    if (totalDeviation > this.rebalanceThreshold) {
      await this.rebalancePortfolio(currentAllocations);
    }
  }

  private async rebalancePortfolio(currentAllocations: Map<string, number>): Promise<void> {
    consola.info('🔄 Portfolio Coordinator: Rebalancing agent allocations');
    
    for (const [agentId, targetAllocation] of this.portfolioState.allocation) {
      const currentAllocation = currentAllocations.get(agentId) || 0;
      
      if (Math.abs(currentAllocation - targetAllocation) > 5) { // 5% threshold
        await this.sendMessage(agentId, 'COORDINATION', {
          type: 'PORTFOLIO_REBALANCE',
          newAllocation: targetAllocation,
          reason: 'Allocation drift correction'
        }, 'HIGH');
      }
    }
  }

  private convertDecisionToSignal(decision: PortfolioDecision): TradingSignal {
    return {
      action: decision.finalAction,
      confidence: decision.confidence,
      amount: decision.amount,
      reason: decision.reasoning,
      strategy: 'portfolio-coordination'
    };
  }

  private createHoldSignal(reason: string): TradingSignal {
    return {
      action: 'HOLD',
      confidence: 0.1,
      amount: 0,
      reason,
      strategy: 'portfolio-hold'
    };
  }

  private async handleAgentSignal(message: AgentMessage): Promise<void> {
    const signal = message.data as TradingSignal;
    const agentSignal: AgentSignal = {
      agentId: message.from,
      signal,
      timestamp: message.timestamp,
      allocation: this.portfolioState.allocation.get(message.from) || 0,
      performance: {} // Would include actual performance metrics
    };
    
    this.agentSignals.set(message.from, agentSignal);
    
    consola.debug(`📊 Coordinator received signal from ${message.from}: ${signal.action} (${(signal.confidence * 100).toFixed(1)}%)`);
  }

  private async handlePositionUpdate(message: AgentMessage): Promise<void> {
    const { symbol, quantity, value } = message.data;
    
    // Update portfolio state
    this.portfolioState.positions.set(symbol, quantity);
    
    // Broadcast position update to risk manager
    await this.sendMessage('RISK_MANAGER', 'POSITION_UPDATE', {
      symbol,
      quantity,
      value,
      timestamp: Date.now()
    }, 'MEDIUM');
  }

  private async handleRiskAlert(message: AgentMessage): Promise<void> {
    const { alertType, severity, data } = message.data;
    
    if (severity === 'CRITICAL') {
      // Emergency halt
      consola.warn(`🚨 CRITICAL RISK ALERT: ${alertType}`);
      
      // Send emergency stop to all agents
      for (const agentId of this.agentWeights.keys()) {
        await this.sendMessage(agentId, 'RISK_ALERT', {
          alertType: 'EMERGENCY_STOP',
          reason: `Critical risk: ${alertType}`
        }, 'CRITICAL');
      }
    } else if (severity === 'HIGH') {
      // Reduce risk across portfolio
      consola.warn(`⚠️ HIGH RISK ALERT: ${alertType}`);
      
      // Temporarily reduce all agent allocations
      for (const [agentId, allocation] of this.portfolioState.allocation) {
        await this.sendMessage(agentId, 'COORDINATION', {
          type: 'RISK_REDUCTION',
          newAllocation: allocation * 0.7, // 30% reduction
          duration: 300000 // 5 minutes
        }, 'HIGH');
      }
    }
  }

  private async broadcastMarketRegime(): Promise<void> {
    const regimeMessage = {
      regime: this.marketRegime,
      timestamp: Date.now()
    };
    
    for (const agentId of this.agentWeights.keys()) {
      await this.sendMessage(agentId, 'MARKET_UPDATE', regimeMessage, 'MEDIUM');
    }
  }

  // Public methods for external access
  getPortfolioState(): PortfolioState {
    return { ...this.portfolioState };
  }

  getMarketRegime(): MarketRegime {
    return { ...this.marketRegime };
  }

  getDecisionHistory(): PortfolioDecision[] {
    return [...this.decisionHistory];
  }

  updatePortfolioValue(newValue: number): void {
    this.portfolioState.totalValue = newValue;
  }

  updateCashBalance(newBalance: number): void {
    this.portfolioState.cashBalance = newBalance;
  }

  // Performance tracking
  updatePerformanceMetrics(metrics: PortfolioState['performance']): void {
    this.portfolioState.performance = { ...metrics };
  }

  // Dynamic weight adjustment
  adjustAgentWeight(agentId: string, newWeight: number): void {
    if (this.agentWeights.has(agentId)) {
      this.agentWeights.set(agentId, newWeight);
      consola.info(`📊 Agent ${agentId} weight adjusted to ${newWeight}`);
    }
  }

  // Agent health monitoring
  getAgentHealthSummary(): any {
    const agentHealth = new Map();
    
    for (const [agentId, signal] of this.agentSignals) {
      const timeSinceSignal = Date.now() - signal.timestamp;
      const isHealthy = timeSinceSignal < 60000; // 1 minute threshold
      
      agentHealth.set(agentId, {
        isHealthy,
        lastSignal: timeSinceSignal,
        confidence: signal.signal.confidence,
        allocation: signal.allocation
      });
    }
    
    return Object.fromEntries(agentHealth);
  }
}