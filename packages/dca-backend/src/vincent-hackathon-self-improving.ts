#!/usr/bin/env node
/**
 * Vincent AI Agent Hackathon - Self-Improving Multi-Agent Trading System
 * Advanced AI agents with continuous learning and adaptation capabilities
 * 
 * Built for Vincent AI Agent Hackathon - Categories:
 * - Best AI Agent ($2,500) - Self-improving agents with continuous learning
 * - Best New Tool ($2,500) - Reusable self-improvement framework
 */

import { VincentDataAnalystAgent } from './lib/agents/vincentDataAnalystAgent.js';
import { VincentAdaptiveStrategistAgent } from './lib/agents/vincentAdaptiveStrategistAgent.js';
import { VincentRiskManagementAgent } from './lib/agents/vincentRiskManagementAgent.js';
import { VincentMetaLearningAgent } from './lib/agents/vincentMetaLearningAgent.js';
import { ModelRegistry } from './lib/learning/modelRegistry.js';
import { VincentMCPServer } from './lib/mcp/vincentMCPServer.js';
import { VincentPolicyConstraints } from './lib/agents/vincentBaseAgent.js';
import { ethers } from 'ethers';
import { LIT_RPC } from '@lit-protocol/constants';
import consola from 'consola';
import { writeFileSync, mkdirSync } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { TradingSignal } from './lib/types/trading.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Self-Improving Vincent Hackathon Configuration
const VINCENT_SELF_IMPROVING_CONFIG = {
  initialBalance: 10000,
  tradingPairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AVAX/USDT'],
  updateFrequency: 5000, // 5 seconds for faster learning
  competitionMode: true,
  vincentAppVersion: 2, // v2 with self-improvement
  
  // Enhanced learning configuration
  learningConfiguration: {
    enableContinuousLearning: true,
    learningRate: 0.001,
    adaptationThreshold: 0.05,
    performanceWindowSize: 100,
    modelUpdateFrequency: 50,
    experienceBufferSize: 1000,
    validationSplitRatio: 0.2,
    metaLearningEnabled: true,
    systemOptimizationInterval: 10 * 60 * 1000, // 10 minutes
    knowledgeSharing: true
  },
  
  // User-controlled policy constraints
  globalPolicyConstraints: {
    spendingLimits: {
      dailyLimit: 500,
      perTradeLimit: 100,
      monthlyLimit: 5000
    },
    riskLimits: {
      maxDrawdown: 0.15,
      maxPositionSize: 0.10,
      maxDailyLoss: 0.05,
      stopLossThreshold: 0.02
    },
    timeRestrictions: {
      tradingHours: "0-23",
      timezone: "UTC",
      allowedDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    },
    assetRestrictions: {
      allowedAssets: ["BTC", "ETH", "SOL", "AVAX", "USDT"],
      blockedAssets: [],
      maxAssetsPerTrade: 3
    },
    approvalRequirements: {
      largePositions: true,
      newAssets: false,
      highRiskOperations: true,
      manualApprovalThreshold: 200
    }
  } as VincentPolicyConstraints,
  
  // Self-improving agent configurations
  agentConfigurations: {
    dataAnalyst: {
      agentId: 'vincent-data-analyst',
      name: 'Vincent Data Analyst (Self-Improving)',
      allocation: 0, // Support role, no direct trading
      riskTolerance: 0.3,
      updateFrequency: 30000, // 30 seconds
      enabled: true,
      role: 'analysis',
      capabilities: ['sentiment_analysis', 'market_analysis', 'anomaly_detection']
    },
    adaptiveStrategist: {
      agentId: 'vincent-adaptive-strategist',
      name: 'Vincent Adaptive Strategist (RL)',
      allocation: 70, // Primary trading agent
      riskTolerance: 0.6,
      updateFrequency: 8000, // 8 seconds
      enabled: true,
      role: 'trading',
      capabilities: ['reinforcement_learning', 'strategy_adaptation', 'pattern_recognition']
    },
    riskManager: {
      agentId: 'vincent-risk-manager',
      name: 'Vincent Risk Manager (Dynamic)',
      allocation: 0, // Risk control, no direct trading
      riskTolerance: 0.2,
      updateFrequency: 10000, // 10 seconds
      enabled: true,
      role: 'risk_control',
      capabilities: ['dynamic_risk_models', 'portfolio_optimization', 'real_time_monitoring']
    },
    metaLearner: {
      agentId: 'vincent-meta-learner',
      name: 'Vincent Meta-Learning Orchestrator',
      allocation: 0, // System optimization, no direct trading
      riskTolerance: 0.1,
      updateFrequency: 60000, // 1 minute
      enabled: true,
      role: 'system_optimization',
      capabilities: ['meta_learning', 'system_coordination', 'architecture_adaptation']
    },
    conservativeBackup: {
      agentId: 'vincent-conservative-backup',
      name: 'Vincent Conservative Backup',
      allocation: 30, // Backup/safety trading
      riskTolerance: 0.3,
      updateFrequency: 15000, // 15 seconds
      enabled: true,
      role: 'backup_trading',
      capabilities: ['conservative_trading', 'portfolio_balance', 'risk_mitigation']
    }
  }
};

// Enhanced MCP Server Configuration
const MCP_CONFIG = {
  transport: (process.env.MCP_TRANSPORT as 'stdio' | 'http') || 'http',
  port: parseInt(process.env.MCP_PORT || '8053'),
  host: process.env.MCP_HOST || '0.0.0.0',
  enableSelfImprovement: true,
  modelRegistryPath: './models'
};

class VincentSelfImprovingSystem {
  private agents: Map<string, any> = new Map();
  private modelRegistry: ModelRegistry;
  private metaLearningAgent: VincentMetaLearningAgent;
  private isRunning = false;
  private sessionMetrics: any = {};
  private tradeHistory: any[] = [];
  private learningEvents: any[] = [];
  private systemStartTime: number = 0;
  private performanceUpdateInterval: NodeJS.Timeout | null = null;
  private learningUpdateInterval: NodeJS.Timeout | null = null;

  constructor(private config: any) {
    this.modelRegistry = new ModelRegistry(MCP_CONFIG.modelRegistryPath);
    this.sessionMetrics = this.initializeMetrics();
  }

  async initialize(vincentWallet: ethers.Wallet): Promise<void> {
    consola.info('🧠 Initializing Self-Improving Vincent System...');
    
    // Create results directory
    const resultsDir = path.join(__dirname, '../results');
    if (!existsSync(resultsDir)) {
      mkdirSync(resultsDir, { recursive: true });
    }

    // Initialize agents with self-improvement capabilities
    await this.initializeAgents(vincentWallet);
    
    // Set up agent coordination
    await this.setupAgentCoordination();
    
    // Initialize learning system
    await this.initializeLearningSystem();
    
    consola.success('✅ Self-Improving Vincent System initialized');
  }

  private async initializeAgents(vincentWallet: ethers.Wallet): Promise<void> {
    const { agentConfigurations, globalPolicyConstraints, learningConfiguration } = this.config;
    
    // Initialize Data Analyst Agent
    const dataAnalyst = new VincentDataAnalystAgent(
      agentConfigurations.dataAnalyst.agentId,
      globalPolicyConstraints,
      learningConfiguration
    );
    this.agents.set('dataAnalyst', dataAnalyst);
    
    // Initialize Adaptive Strategist Agent
    const adaptiveStrategist = new VincentAdaptiveStrategistAgent(
      agentConfigurations.adaptiveStrategist.agentId,
      globalPolicyConstraints,
      learningConfiguration
    );
    this.agents.set('adaptiveStrategist', adaptiveStrategist);
    
    // Initialize Risk Management Agent
    const riskManager = new VincentRiskManagementAgent(
      agentConfigurations.riskManager.agentId,
      globalPolicyConstraints,
      learningConfiguration
    );
    this.agents.set('riskManager', riskManager);
    
    // Initialize Meta-Learning Agent
    this.metaLearningAgent = new VincentMetaLearningAgent(
      agentConfigurations.metaLearner.agentId,
      globalPolicyConstraints,
      this.modelRegistry,
      learningConfiguration
    );
    this.agents.set('metaLearner', this.metaLearningAgent);
    
    // Register all agents with meta-learning system
    this.agents.forEach((agent, id) => {
      if (id !== 'metaLearner') {
        this.metaLearningAgent.registerAgent(id, agent);
      }
    });
    
    consola.success(`🤖 Initialized ${this.agents.size} self-improving agents`);
  }

  private async setupAgentCoordination(): Promise<void> {
    // Set up event listeners for agent coordination
    this.agents.forEach((agent, agentId) => {
      // Learning events
      agent.on('learningUpdate', (event: any) => {
        this.learningEvents.push({
          agentId,
          type: 'learningUpdate',
          data: event,
          timestamp: Date.now()
        });
      });
      
      // Model update events
      agent.on('modelUpdate', (event: any) => {
        this.learningEvents.push({
          agentId,
          type: 'modelUpdate',
          data: event,
          timestamp: Date.now()
        });
        
        // Register model update with registry
        this.modelRegistry.registerModel({
          modelId: event.update.modelId,
          version: event.update.version,
          agentType: agent.constructor.name,
          trainedOn: event.update.timestamp,
          trainingData: {
            experienceCount: event.learningState.totalExperiences,
            successRate: event.learningState.successRate,
            averageReward: event.learningState.averageReward
          },
          performance: {
            accuracy: event.learningState.successRate,
            latency: 0,
            profitability: event.learningState.averageReward,
            riskScore: 0.5,
            validationScore: event.update.validationScore
          },
          parameters: event.update.parameters,
          tags: ['self_improving', agent.constructor.name.toLowerCase()]
        });
      });
      
      // Risk events
      if (agent.on && typeof agent.on === 'function') {
        agent.on('riskUpdate', (event: any) => {
          this.sessionMetrics.riskMetrics = event;
        });
      }
    });
  }

  private async initializeLearningSystem(): Promise<void> {
    // Set up meta-learning coordination
    this.metaLearningAgent.on('systemOptimized', (event: any) => {
      consola.info(`🔄 System optimized: ${event.optimizations.length} improvements applied`);
    });
    
    // Set up periodic learning updates
    this.learningUpdateInterval = setInterval(async () => {
      await this.updateLearningMetrics();
    }, 30000); // 30 seconds
  }

  private initializeMetrics(): any {
    return {
      startTime: Date.now(),
      totalValue: this.config.initialBalance,
      totalPnL: 0,
      totalReturn: 0,
      totalTrades: 0,
      winRate: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      activeAgents: this.agents.size,
      learningMetrics: {
        totalLearningEvents: 0,
        modelUpdates: 0,
        systemOptimizations: 0,
        adaptationSuccess: 0,
        averageLearningRate: 0
      },
      riskMetrics: null,
      systemUptime: 0
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      consola.warn('⚠️ System already running');
      return;
    }

    this.isRunning = true;
    this.systemStartTime = Date.now();
    
    // Start all agents
    const startPromises = Array.from(this.agents.values()).map(async (agent) => {
      if (agent.start) {
        await agent.start();
      }
    });
    
    await Promise.all(startPromises);
    
    // Start trading cycle
    this.startTradingCycle();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
    
    consola.success('🚀 Self-Improving Vincent System started');
    this.emitSystemEvent('systemStarted', {
      startTime: this.systemStartTime,
      config: this.config,
      agents: Array.from(this.agents.keys())
    });
  }

  private startTradingCycle(): void {
    const tradingInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(tradingInterval);
        return;
      }

      try {
        await this.executeTradingCycle();
      } catch (error) {
        consola.error('Trading cycle error:', error);
      }
    }, this.config.updateFrequency);
  }

  private async executeTradingCycle(): Promise<void> {
    // Get market analysis from data analyst
    const dataAnalyst = this.agents.get('dataAnalyst');
    const marketOverview = await dataAnalyst.getMarketOverview();
    
    // Generate trading signals from adaptive strategist
    const adaptiveStrategist = this.agents.get('adaptiveStrategist');
    const tradingSignal = await adaptiveStrategist.generateSignal();
    
    if (tradingSignal) {
      // Assess and adjust signal with risk manager
      const riskManager = this.agents.get('riskManager');
      const riskAdjustment = await riskManager.assessAndAdjustSignal(tradingSignal);
      
      // Execute adjusted signal if approved
      if (riskAdjustment.adjustedSignal.type !== 'HOLD') {
        await this.executeTradeSignal(riskAdjustment.adjustedSignal, {
          originalSignal: tradingSignal,
          riskAdjustment,
          marketContext: marketOverview
        });
      }
    }
  }

  private async executeTradeSignal(signal: TradingSignal, context: any): Promise<void> {
    // Simulate trade execution
    const tradeResult = {
      signal,
      context,
      execution: {
        success: Math.random() > 0.3, // 70% success rate
        profit: (Math.random() - 0.4) * signal.positionSize * 0.1, // Simulated profit/loss
        timestamp: Date.now()
      }
    };

    // Update metrics
    this.sessionMetrics.totalTrades++;
    this.sessionMetrics.totalPnL += tradeResult.execution.profit;
    this.sessionMetrics.totalValue = this.config.initialBalance + this.sessionMetrics.totalPnL;
    this.sessionMetrics.totalReturn = this.sessionMetrics.totalPnL / this.config.initialBalance;
    
    // Update win rate
    const wins = this.tradeHistory.filter(t => t.execution.profit > 0).length;
    this.sessionMetrics.winRate = this.sessionMetrics.totalTrades > 0 ? wins / this.sessionMetrics.totalTrades : 0;
    
    // Record trade
    this.tradeHistory.push(tradeResult);
    
    // Provide feedback to agents for learning
    await this.provideFeedbackToAgents(tradeResult);
    
    // Emit trade event
    this.emitSystemEvent('tradeExecuted', tradeResult);
    
    consola.info(`💰 Trade executed: ${signal.type} ${signal.symbol} | P&L: ${tradeResult.execution.profit >= 0 ? '+' : ''}$${tradeResult.execution.profit.toFixed(2)}`);
  }

  private async provideFeedbackToAgents(tradeResult: any): Promise<void> {
    const { signal, execution } = tradeResult;
    const outcome = execution.success ? 'success' : 'failure';
    const reward = execution.profit / signal.positionSize; // Normalized reward
    
    // Provide feedback to adaptive strategist
    const adaptiveStrategist = this.agents.get('adaptiveStrategist');
    await adaptiveStrategist.recordPerformance('trade_execution', outcome, reward, 1000);
    
    // Provide feedback to risk manager
    const riskManager = this.agents.get('riskManager');
    riskManager.updatePosition(signal.symbol, {
      symbol: signal.symbol,
      quantity: signal.positionSize,
      averagePrice: signal.price,
      currentPrice: signal.price,
      marketValue: signal.positionSize * signal.price,
      unrealizedPnL: execution.profit,
      weight: signal.positionSize / this.sessionMetrics.totalValue,
      riskContribution: 0.1,
      beta: 1.0,
      volatility: 0.2,
      liquidity: 0.8,
      timestamp: Date.now()
    });
  }

  private startPerformanceMonitoring(): void {
    this.performanceUpdateInterval = setInterval(() => {
      this.updateSystemMetrics();
      this.emitSystemEvent('systemUpdate', {
        metrics: this.sessionMetrics,
        agentHealth: this.getAgentHealthStatus(),
        recentTrades: this.tradeHistory.slice(-5),
        learningProgress: this.getLearningProgress()
      });
    }, 30000); // 30 seconds
  }

  private updateSystemMetrics(): void {
    this.sessionMetrics.systemUptime = (Date.now() - this.systemStartTime) / (1000 * 60 * 60); // Hours
    this.sessionMetrics.activeAgents = this.agents.size;
    
    // Update learning metrics
    this.sessionMetrics.learningMetrics.totalLearningEvents = this.learningEvents.length;
    this.sessionMetrics.learningMetrics.modelUpdates = this.learningEvents.filter(e => e.type === 'modelUpdate').length;
    
    // Calculate max drawdown
    const portfolioValues = this.tradeHistory.map(t => this.config.initialBalance + t.execution.profit);
    if (portfolioValues.length > 0) {
      let peak = portfolioValues[0];
      let maxDD = 0;
      for (const value of portfolioValues) {
        if (value > peak) peak = value;
        const drawdown = (peak - value) / peak;
        maxDD = Math.max(maxDD, drawdown);
      }
      this.sessionMetrics.maxDrawdown = maxDD;
    }
    
    // Calculate Sharpe ratio (simplified)
    if (this.tradeHistory.length > 10) {
      const returns = this.tradeHistory.map(t => t.execution.profit / this.config.initialBalance);
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance);
      this.sessionMetrics.sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;
    }
  }

  private async updateLearningMetrics(): Promise<void> {
    // Get learning states from all agents
    const learningStates = [];
    this.agents.forEach((agent, agentId) => {
      if (agent.getLearningState) {
        learningStates.push({
          agentId,
          learningState: agent.getLearningState(),
          performance: agent.getPerformanceHistory ? agent.getPerformanceHistory().slice(-10) : []
        });
      }
    });
    
    // Calculate average learning rate
    const avgLearningRate = learningStates.reduce((sum, state) => sum + state.learningState.learningRate, 0) / learningStates.length;
    this.sessionMetrics.learningMetrics.averageLearningRate = avgLearningRate;
    
    // Update adaptation success rate
    const adaptationSuccesses = learningStates.filter(state => state.learningState.successRate > 0.6).length;
    this.sessionMetrics.learningMetrics.adaptationSuccess = adaptationSuccesses / learningStates.length;
  }

  private getAgentHealthStatus(): any {
    const healthStatus = {};
    this.agents.forEach((agent, agentId) => {
      healthStatus[agentId] = {
        status: 'active',
        uptime: (Date.now() - this.systemStartTime) / 1000,
        performance: agent.getLearningState ? agent.getLearningState().successRate : 0.5,
        learningRate: agent.getLearningState ? agent.getLearningState().learningRate : 0.001
      };
    });
    return healthStatus;
  }

  private getLearningProgress(): any {
    return {
      totalEvents: this.learningEvents.length,
      recentEvents: this.learningEvents.slice(-10),
      modelUpdates: this.learningEvents.filter(e => e.type === 'modelUpdate').length,
      systemOptimizations: 0 // Would be tracked from meta-learning agent
    };
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      consola.warn('⚠️ System not running');
      return;
    }

    this.isRunning = false;
    
    // Clear intervals
    if (this.performanceUpdateInterval) {
      clearInterval(this.performanceUpdateInterval);
    }
    if (this.learningUpdateInterval) {
      clearInterval(this.learningUpdateInterval);
    }
    
    // Stop all agents
    const stopPromises = Array.from(this.agents.values()).map(async (agent) => {
      if (agent.stop) {
        await agent.stop();
      }
    });
    
    await Promise.all(stopPromises);
    
    // Generate final report
    const finalMetrics = this.generateFinalReport();
    
    // Emit stop event
    this.emitSystemEvent('systemStopped', {
      duration: (Date.now() - this.systemStartTime) / (1000 * 60 * 60),
      finalMetrics,
      tradeHistory: this.tradeHistory,
      learningEvents: this.learningEvents
    });
    
    consola.success('🛑 Self-Improving Vincent System stopped');
  }

  private generateFinalReport(): any {
    return {
      ...this.sessionMetrics,
      finalTime: Date.now(),
      totalDuration: (Date.now() - this.systemStartTime) / (1000 * 60 * 60),
      learningAchievements: {
        totalLearningEvents: this.learningEvents.length,
        modelUpdates: this.learningEvents.filter(e => e.type === 'modelUpdate').length,
        avgLearningRate: this.sessionMetrics.learningMetrics.averageLearningRate,
        adaptationSuccess: this.sessionMetrics.learningMetrics.adaptationSuccess
      },
      agentPerformance: this.getAgentHealthStatus(),
      modelRegistry: this.modelRegistry.getRegistryStats()
    };
  }

  private emitSystemEvent(eventType: string, data: any): void {
    // Emit event (simplified - would use EventEmitter in full implementation)
    consola.debug(`📡 System event: ${eventType}`, data);
  }

  // Public API
  on(event: string, callback: Function): void {
    // Event handling (simplified)
  }

  getSystemMetrics(): any {
    return this.sessionMetrics;
  }

  getAgents(): Map<string, any> {
    return new Map(this.agents);
  }

  getModelRegistry(): ModelRegistry {
    return this.modelRegistry;
  }
}

async function main() {
  consola.info('🧠 Vincent AI Agent Hackathon - Self-Improving Multi-Agent System');
  consola.info('💰 Target: $5,000 Prize Pool (Best AI Agent + Best Tool)');
  consola.info('🚀 Features: Continuous Learning, Reinforcement Learning, Meta-Learning');
  consola.info('🔐 User-Controlled Permissions via Vincent Framework');
  
  // Initialize Vincent signer
  const privateKey = process.env.VINCENT_DELEGATEE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('VINCENT_DELEGATEE_PRIVATE_KEY environment variable required');
  }
  
  const vincentWallet = new ethers.Wallet(
    privateKey,
    new ethers.providers.StaticJsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
  );
  
  consola.info(`🔐 Vincent Wallet Address: ${vincentWallet.address}`);
  
  // Initialize Self-Improving Vincent System
  const selfImprovingSystem = new VincentSelfImprovingSystem(VINCENT_SELF_IMPROVING_CONFIG);
  await selfImprovingSystem.initialize(vincentWallet);
  
  // Initialize Enhanced Vincent MCP Server
  let vincentMCPServer: any = null;
  try {
    vincentMCPServer = new VincentMCPServer({
      wallet: vincentWallet,
      ...MCP_CONFIG
    });
    
    await vincentMCPServer.initialize(selfImprovingSystem);
    consola.success('🔗 Enhanced Vincent MCP Server initialized successfully');
  } catch (error) {
    consola.warn('⚠️ MCP Server initialization failed, continuing without MCP:', error instanceof Error ? error.message : 'Unknown error');
    vincentMCPServer = {
      start: async () => {},
      stop: async () => {},
      getServerInfo: () => ({ error: 'MCP Server not initialized' })
    };
  }
  
  // Performance tracking
  let sessionStart = Date.now();
  let learningAchievements = {
    modelUpdates: 0,
    adaptationEvents: 0,
    optimizationCycles: 0
  };
  
  // Self-Improving System event handlers
  selfImprovingSystem.on('systemStarted', (data) => {
    consola.success(`🧠 Self-Improving Vincent System LIVE at ${new Date(data.startTime).toISOString()}`);
    consola.info(`🤖 Agents: ${data.agents.join(', ')}`);
    consola.info(`📊 Configuration: ${data.config.tradingPairs.length} pairs, $${data.config.initialBalance} initial balance`);
    consola.info(`🚀 Learning: Continuous learning enabled with meta-optimization`);
  });
  
  selfImprovingSystem.on('tradeExecuted', (trade) => {
    const profit = trade.execution.profit;
    consola.success(`✅ Smart Trade: ${trade.signal.type} ${trade.signal.symbol} $${trade.signal.positionSize.toFixed(2)} | P&L: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`);
    if (trade.context.riskAdjustment.adjustmentType !== 'size_reduction') {
      consola.info(`🛡️ Risk Adjustment: ${trade.context.riskAdjustment.reason}`);
    }
  });
  
  selfImprovingSystem.on('systemUpdate', (data) => {
    const { metrics, agentHealth, learningProgress } = data;
    
    // Update learning achievements
    learningAchievements.modelUpdates = learningProgress.modelUpdates;
    learningAchievements.adaptationEvents = learningProgress.totalEvents;
    
    // Log comprehensive status every 2 minutes
    if (Date.now() - sessionStart > 120000) {
      sessionStart = Date.now();
      
      consola.info(`📈 Performance: Value: $${metrics.totalValue.toFixed(2)} | P&L: ${metrics.totalPnL >= 0 ? '+' : ''}$${metrics.totalPnL.toFixed(2)} (${(metrics.totalReturn * 100).toFixed(2)}%)`);
      consola.info(`📊 Trading: ${metrics.totalTrades} trades | Win Rate: ${(metrics.winRate * 100).toFixed(1)}% | Sharpe: ${metrics.sharpeRatio.toFixed(3)}`);
      consola.info(`🧠 Learning: ${learningAchievements.modelUpdates} model updates | ${learningAchievements.adaptationEvents} learning events`);
      consola.info(`🤖 Agents: ${Object.keys(agentHealth).length} active | Avg Learning Rate: ${metrics.learningMetrics.averageLearningRate.toFixed(6)}`);
      consola.info(`🛡️ Risk: Max DD: ${(metrics.maxDrawdown * 100).toFixed(2)}% | Adaptation Success: ${(metrics.learningMetrics.adaptationSuccess * 100).toFixed(1)}%`);
    }
  });
  
  selfImprovingSystem.on('systemStopped', (data) => {
    const { duration, finalMetrics, tradeHistory, learningEvents } = data;
    
    consola.info(`🧠 SELF-IMPROVING VINCENT HACKATHON SESSION COMPLETE - Duration: ${duration.toFixed(2)} hours`);
    consola.info(`💰 Final Portfolio Value: $${finalMetrics.totalValue.toFixed(2)}`);
    consola.info(`📈 Total P&L: ${finalMetrics.totalPnL >= 0 ? '+' : ''}$${finalMetrics.totalPnL.toFixed(2)} (${(finalMetrics.totalReturn * 100).toFixed(2)}%)`);
    consola.info(`📊 Trading Performance: ${finalMetrics.totalTrades} trades | Win Rate: ${(finalMetrics.winRate * 100).toFixed(1)}%`);
    consola.info(`⚡ Risk-Adjusted Returns: Sharpe: ${finalMetrics.sharpeRatio.toFixed(3)} | Max DD: ${(finalMetrics.maxDrawdown * 100).toFixed(2)}%`);
    consola.info(`🧠 Learning Achievements: ${learningEvents.length} events | ${finalMetrics.learningAchievements.modelUpdates} model updates`);
    consola.info(`🤖 System Intelligence: ${finalMetrics.learningAchievements.adaptationSuccess * 100}% adaptation success`);
    
    // Save Self-Improving Vincent hackathon results
    const results = {
      hackathon: {
        event: "Vincent AI Agent Hackathon",
        categories: ["Best AI Agent", "Best Tool"],
        targetPrize: 5000,
        submissionType: "Self-Improving Multi-Agent Trading System",
        innovations: [
          "Continuous learning with experience replay",
          "Reinforcement learning for strategy adaptation",
          "Meta-learning for system optimization",
          "Dynamic risk models with real-time adaptation",
          "Sentiment analysis with market intelligence",
          "Model versioning and deployment system"
        ]
      },
      session: {
        startTime: new Date(finalMetrics.startTime).toISOString(),
        duration: duration,
        configuration: VINCENT_SELF_IMPROVING_CONFIG
      },
      performance: {
        initialBalance: VINCENT_SELF_IMPROVING_CONFIG.initialBalance,
        finalValue: finalMetrics.totalValue,
        totalPnL: finalMetrics.totalPnL,
        totalReturn: finalMetrics.totalReturn,
        maxDrawdown: finalMetrics.maxDrawdown,
        sharpeRatio: finalMetrics.sharpeRatio,
        winRate: finalMetrics.winRate,
        totalTrades: finalMetrics.totalTrades
      },
      selfImprovement: {
        learningEvents: learningEvents.length,
        modelUpdates: finalMetrics.learningAchievements.modelUpdates,
        adaptationSuccess: finalMetrics.learningAchievements.adaptationSuccess,
        averageLearningRate: finalMetrics.learningAchievements.avgLearningRate,
        agentPerformance: finalMetrics.agentPerformance,
        modelRegistry: finalMetrics.modelRegistry
      },
      agents: Object.keys(finalMetrics.agentPerformance).map(agentId => ({
        agentId,
        type: selfImprovingSystem.getAgents().get(agentId)?.constructor.name,
        finalPerformance: finalMetrics.agentPerformance[agentId].performance,
        learningRate: finalMetrics.agentPerformance[agentId].learningRate,
        uptime: finalMetrics.agentPerformance[agentId].uptime
      })),
      trades: tradeHistory.map(t => ({
        signal: t.signal,
        execution: t.execution,
        riskAdjustment: t.context.riskAdjustment
      })),
      learningTimeline: learningEvents,
      systemMetrics: finalMetrics,
      mcpIntegration: vincentMCPServer.getServerInfo()
    };
    
    const resultsPath = path.join(__dirname, `../results/vincent-self-improving-session-${Date.now()}.json`);
    try {
      writeFileSync(resultsPath, JSON.stringify(results, null, 2));
      consola.success(`💾 Self-Improving Vincent results saved to: ${resultsPath}`);
    } catch (error) {
      consola.error('Failed to save results:', error);
    }
    
    // Hackathon achievement assessment
    const learningScore = finalMetrics.learningAchievements.adaptationSuccess * 100;
    const performanceScore = finalMetrics.totalReturn * 100;
    
    if (performanceScore > 10 && learningScore > 70) {
      consola.success(`🏆 HACKATHON EXCELLENCE ACHIEVED! Performance: ${performanceScore.toFixed(1)}% | Learning: ${learningScore.toFixed(1)}%`);
    } else if (performanceScore > 5 && learningScore > 50) {
      consola.info(`🎯 Good hackathon showing! Performance: ${performanceScore.toFixed(1)}% | Learning: ${learningScore.toFixed(1)}%`);
    } else {
      consola.warn(`⚠️ Room for improvement: Performance: ${performanceScore.toFixed(1)}% | Learning: ${learningScore.toFixed(1)}%`);
    }
    
    // Innovation highlights
    if (finalMetrics.learningAchievements.modelUpdates > 5) {
      consola.success(`🚀 CONTINUOUS LEARNING DEMONSTRATED: ${finalMetrics.learningAchievements.modelUpdates} model updates`);
    }
    
    if (learningEvents.length > 50) {
      consola.success(`🧠 ADAPTIVE INTELLIGENCE ACHIEVED: ${learningEvents.length} learning events`);
    }
  });
  
  // Graceful shutdown handlers
  process.on('SIGINT', async () => {
    consola.warn('🛑 Received SIGINT - Gracefully shutting down Self-Improving Vincent system...');
    await selfImprovingSystem.stop();
    await vincentMCPServer.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    consola.warn('🛑 Received SIGTERM - Gracefully shutting down Self-Improving Vincent system...');
    await selfImprovingSystem.stop();
    await vincentMCPServer.stop();
    process.exit(0);
  });
  
  // Emergency shutdown on uncaught errors
  process.on('uncaughtException', async (error) => {
    consola.error('💥 Uncaught Exception:', error);
    consola.warn('🚨 Emergency shutdown initiated...');
    await selfImprovingSystem.stop();
    await vincentMCPServer.stop();
    process.exit(1);
  });
  
  process.on('unhandledRejection', async (reason, promise) => {
    consola.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    consola.warn('🚨 Emergency shutdown initiated...');
    await selfImprovingSystem.stop();
    await vincentMCPServer.stop();
    process.exit(1);
  });
  
  try {
    // Start the Vincent MCP server
    await vincentMCPServer.start();
    
    // Start the Self-Improving Vincent system
    await selfImprovingSystem.start();
    
    // Keep running until manually stopped
    consola.info('🧠 Self-Improving Vincent System running... Press Ctrl+C to stop');
    consola.info('🚀 Features: Continuous Learning, RL, Meta-Learning, Dynamic Risk Management');
    consola.info('🔗 MCP Server Info:', vincentMCPServer.getServerInfo());
    
    // Optional: Auto-stop after specific duration (for testing)
    if (process.env.AUTO_STOP_MINUTES) {
      const minutes = parseInt(process.env.AUTO_STOP_MINUTES);
      setTimeout(async () => {
        consola.info(`⏰ Auto-stopping after ${minutes} minutes...`);
        await selfImprovingSystem.stop();
        await vincentMCPServer.stop();
      }, minutes * 60 * 1000);
    }
    
  } catch (error) {
    consola.error('❌ Failed to start Self-Improving Vincent System:', error);
    process.exit(1);
  }
}

// CLI argument handling
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Vincent AI Agent Hackathon - Self-Improving Multi-Agent Trading System

Usage: node vincent-hackathon-self-improving.js [options]

Options:
  --help, -h                 Show this help message
  --balance <amount>         Set initial balance (default: 10000)
  --auto-stop <minutes>      Auto-stop after specified minutes
  --daily-limit <amount>     Set daily spending limit (default: 500)
  --learning-rate <rate>     Set learning rate (default: 0.001)
  --mcp-port <port>          Set MCP server port (default: 8053)
  --mcp-transport <type>     Set MCP transport: stdio|http (default: http)

Environment Variables:
  VINCENT_DELEGATEE_PRIVATE_KEY    Required: Vincent wallet private key
  AUTO_STOP_MINUTES               Auto-stop after specified minutes
  MCP_PORT                        MCP server port
  MCP_TRANSPORT                   MCP transport type
  MCP_HOST                        MCP server host

Features:
  🧠 Continuous Learning        Agents learn from every trade
  🔄 Reinforcement Learning     Adaptive strategies with Q-learning
  🎯 Meta-Learning              System-wide optimization
  📊 Sentiment Analysis         Real-time market intelligence
  🛡️ Dynamic Risk Management    Self-adjusting risk models
  📈 Model Versioning           Automated model deployment

Hackathon Categories:
  Best AI Agent ($2,500):    Self-improving multi-agent coordination
  Best Tool ($2,500):        Reusable self-improvement framework

Examples:
  node vincent-hackathon-self-improving.js --balance 20000 --learning-rate 0.01
  AUTO_STOP_MINUTES=120 node vincent-hackathon-self-improving.js
  MCP_TRANSPORT=stdio node vincent-hackathon-self-improving.js
`);
  process.exit(0);
}

// Parse CLI arguments
const balanceArg = process.argv.indexOf('--balance');
if (balanceArg !== -1 && process.argv[balanceArg + 1]) {
  VINCENT_SELF_IMPROVING_CONFIG.initialBalance = parseFloat(process.argv[balanceArg + 1]);
}

const learningRateArg = process.argv.indexOf('--learning-rate');
if (learningRateArg !== -1 && process.argv[learningRateArg + 1]) {
  VINCENT_SELF_IMPROVING_CONFIG.learningConfiguration.learningRate = parseFloat(process.argv[learningRateArg + 1]);
}

const dailyLimitArg = process.argv.indexOf('--daily-limit');
if (dailyLimitArg !== -1 && process.argv[dailyLimitArg + 1]) {
  VINCENT_SELF_IMPROVING_CONFIG.globalPolicyConstraints.spendingLimits.dailyLimit = parseFloat(process.argv[dailyLimitArg + 1]);
}

const mcpPortArg = process.argv.indexOf('--mcp-port');
if (mcpPortArg !== -1 && process.argv[mcpPortArg + 1]) {
  MCP_CONFIG.port = parseInt(process.argv[mcpPortArg + 1]);
}

const mcpTransportArg = process.argv.indexOf('--mcp-transport');
if (mcpTransportArg !== -1 && process.argv[mcpTransportArg + 1]) {
  MCP_CONFIG.transport = process.argv[mcpTransportArg + 1] as 'stdio' | 'http';
}

// Only run if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    consola.error('❌ Self-Improving Vincent Hackathon application failed:', error);
    process.exit(1);
  });
}