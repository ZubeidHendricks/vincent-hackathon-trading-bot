/**
 * Multi-Agent Trading System
 * Production-ready orchestrator for autonomous trading agents
 */

import { EventEmitter } from 'events';
import { BaseAgent, AgentConfig, AgentMessage } from './baseAgent';
import { MomentumAgent } from './momentumAgent';
import { ArbitrageAgent } from './arbitrageAgent';
import { MeanReversionAgent } from './meanReversionAgent';
import { PortfolioCoordinator } from './portfolioCoordinator';
import { RiskManager } from './riskManager';
import { MarketData, TradingSignal } from '../strategies/index';
import { RealTimeDataFeed } from '../dataFeeds/realTimeDataFeed';
import consola from 'consola';

interface SystemConfig {
  initialBalance: number;
  tradingPairs: string[];
  updateFrequency: number;
  competitionMode: boolean;
  riskLimits: {
    maxDrawdown: number;
    maxPositionSize: number;
    maxDailyLoss: number;
  };
}

interface SystemMetrics {
  totalValue: number;
  totalPnL: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  activeAgents: number;
  systemUptime: number;
  lastUpdate: number;
}

interface TradeExecution {
  id: string;
  timestamp: number;
  symbol: string;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
  initiatingAgent: string;
  coordinatorDecision: string;
  riskApproval: boolean;
  executionTime: number;
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED';
  pnl?: number;
}

export class MultiAgentTradingSystem extends EventEmitter {
  private config: SystemConfig;
  private agents: Map<string, BaseAgent> = new Map();
  private coordinator: PortfolioCoordinator;
  private riskManager: RiskManager;
  private dataFeed: RealTimeDataFeed;
  
  private isRunning: boolean = false;
  private startTime: number = 0;
  private systemMetrics: SystemMetrics;
  private tradeHistory: TradeExecution[] = [];
  private messageQueue: AgentMessage[] = [];
  private portfolioValue: number = 0;
  private cashBalance: number = 0;
  private positions: Map<string, number> = new Map();
  
  private updateInterval: NodeJS.Timeout | null = null;
  private performanceTracker: any = {
    tradesPerHour: 0,
    avgExecutionTime: 0,
    successRate: 0
  };

  constructor(config: SystemConfig) {
    super();
    this.config = config;
    this.portfolioValue = config.initialBalance;
    this.cashBalance = config.initialBalance;
    
    this.systemMetrics = {
      totalValue: config.initialBalance,
      totalPnL: 0,
      totalReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      totalTrades: 0,
      activeAgents: 0,
      systemUptime: 0,
      lastUpdate: 0
    };
    
    this.initializeAgents();
    consola.success('🚀 Multi-Agent Trading System initialized');
  }

  private initializeAgents(): void {
    // Initialize data feed
    this.dataFeed = new RealTimeDataFeed();
    
    // Initialize trading agents
    const momentumConfig: AgentConfig = {
      agentId: 'momentum',
      name: 'Momentum Trader',
      allocation: 35,
      riskTolerance: 0.7,
      updateFrequency: 10000,
      enabled: true,
      maxPositionSize: 0.15
    };
    
    const arbitrageConfig: AgentConfig = {
      agentId: 'arbitrage',
      name: 'Arbitrage Hunter',
      allocation: 40,
      riskTolerance: 0.3,
      updateFrequency: 5000,
      enabled: true,
      maxPositionSize: 0.20
    };
    
    const meanReversionConfig: AgentConfig = {
      agentId: 'mean-reversion',
      name: 'Mean Reversion Specialist',
      allocation: 25,
      riskTolerance: 0.8,
      updateFrequency: 15000,
      enabled: true,
      maxPositionSize: 0.12
    };
    
    const coordinatorConfig: AgentConfig = {
      agentId: 'coordinator',
      name: 'Portfolio Coordinator',
      allocation: 100,
      riskTolerance: 0.5,
      updateFrequency: 8000,
      enabled: true,
      maxPositionSize: 1.0
    };
    
    const riskConfig: AgentConfig = {
      agentId: 'risk-manager',
      name: 'Risk Manager',
      allocation: 0,
      riskTolerance: 0.0,
      updateFrequency: 3000,
      enabled: true,
      maxPositionSize: 0
    };
    
    // Create agents
    this.agents.set('momentum', new MomentumAgent(momentumConfig));
    this.agents.set('arbitrage', new ArbitrageAgent(arbitrageConfig));
    this.agents.set('mean-reversion', new MeanReversionAgent(meanReversionConfig));
    
    this.coordinator = new PortfolioCoordinator(coordinatorConfig);
    this.riskManager = new RiskManager(riskConfig);
    
    // Setup inter-agent communication
    this.setupCommunication();
    
    consola.info(`📊 Initialized ${this.agents.size + 2} agents (3 trading + 1 coordinator + 1 risk manager)`);
  }

  private setupCommunication(): void {
    // Setup message routing between agents
    const allAgents = [
      ...Array.from(this.agents.values()),
      this.coordinator,
      this.riskManager
    ];
    
    for (const agent of allAgents) {
      agent.on('messageSent', (message: AgentMessage) => {
        this.routeMessage(message);
      });
      
      agent.on('signalGenerated', (message: AgentMessage) => {
        this.handleSignal(message);
      });
      
      agent.on('agentHeartbeat', (data: any) => {
        this.updateAgentHealth(data);
      });
    }
    
    // Setup data feed distribution
    this.dataFeed.on('priceUpdate', ({ symbol, data }) => {
      this.distributeMarketData(symbol, data);
    });
    
    consola.success('🔗 Inter-agent communication established');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      consola.warn('Multi-Agent System already running');
      return;
    }
    
    this.isRunning = true;
    this.startTime = Date.now();
    
    consola.info('🚀 Starting Multi-Agent Trading System...');
    
    try {
      // Start all agents
      await this.coordinator.start();
      await this.riskManager.start();
      
      for (const [agentId, agent] of this.agents) {
        await agent.start();
        consola.success(`✅ ${agentId} agent started`);
      }
      
      // Start system monitoring
      this.startSystemMonitoring();
      
      // Start main system loop
      this.startMainLoop();
      
      this.systemMetrics.activeAgents = this.agents.size + 2;
      
      consola.success('🎯 Multi-Agent Trading System is LIVE!');
      this.emit('systemStarted', { startTime: this.startTime, config: this.config });
      
    } catch (error) {
      consola.error('Failed to start Multi-Agent System:', error);
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    consola.info('🛑 Stopping Multi-Agent Trading System...');
    
    // Stop main loop
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Stop all agents
    await this.coordinator.stop();
    await this.riskManager.stop();
    
    for (const [agentId, agent] of this.agents) {
      await agent.stop();
      consola.info(`🛑 ${agentId} agent stopped`);
    }
    
    // Stop data feed
    this.dataFeed.stop();
    
    const duration = (Date.now() - this.startTime) / 1000 / 60 / 60; // hours
    this.systemMetrics.systemUptime = duration;
    
    consola.success(`📊 Multi-Agent System stopped after ${duration.toFixed(2)} hours`);
    this.emit('systemStopped', { 
      duration, 
      finalMetrics: this.systemMetrics,
      tradeHistory: this.tradeHistory 
    });
  }

  private startMainLoop(): void {
    this.updateInterval = setInterval(async () => {
      await this.systemUpdate();
    }, this.config.updateFrequency);
  }

  private async systemUpdate(): Promise<void> {
    try {
      if (!this.isRunning) return;
      
      // Update system metrics
      this.updateSystemMetrics();
      
      // Process message queue
      await this.processMessageQueue();
      
      // Check system health
      await this.performHealthCheck();
      
      // Execute any pending trades
      await this.executePendingTrades();
      
      // Update performance tracking
      this.updatePerformanceTracking();
      
      this.systemMetrics.lastUpdate = Date.now();
      
      // Emit system update
      this.emit('systemUpdate', {
        metrics: this.systemMetrics,
        agentHealth: this.getAgentHealthSummary(),
        recentTrades: this.tradeHistory.slice(-5)
      });
      
    } catch (error) {
      consola.error('System update failed:', error);
    }
  }

  private updateSystemMetrics(): void {
    const currentTime = Date.now();
    const uptime = (currentTime - this.startTime) / 1000 / 60 / 60; // hours
    
    // Update portfolio metrics
    this.systemMetrics.totalValue = this.portfolioValue;
    this.systemMetrics.totalPnL = this.portfolioValue - this.config.initialBalance;
    this.systemMetrics.totalReturn = this.systemMetrics.totalPnL / this.config.initialBalance;
    this.systemMetrics.systemUptime = uptime;
    this.systemMetrics.totalTrades = this.tradeHistory.length;
    
    // Calculate win rate
    const completedTrades = this.tradeHistory.filter(t => t.status === 'EXECUTED');
    const winningTrades = completedTrades.filter(t => (t.pnl || 0) > 0);
    this.systemMetrics.winRate = completedTrades.length > 0 ? 
      winningTrades.length / completedTrades.length : 0;
    
    // Update coordinator and risk manager with current metrics
    this.coordinator.updatePortfolioValue(this.portfolioValue);
    this.coordinator.updateCashBalance(this.cashBalance);
  }

  private async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      await this.routeMessage(message);
    }
  }

  private async routeMessage(message: AgentMessage): Promise<void> {
    try {
      if (message.to === 'COORDINATOR') {
        await this.coordinator.receiveMessage(message);
      } else if (message.to === 'RISK_MANAGER') {
        await this.riskManager.receiveMessage(message);
      } else {
        const targetAgent = this.agents.get(message.to);
        if (targetAgent) {
          await targetAgent.receiveMessage(message);
        } else {
          consola.debug(`Unknown message target: ${message.to}`);
        }
      }
    } catch (error) {
      consola.error(`Message routing failed: ${message.from} -> ${message.to}`, error);
    }
  }

  private async handleSignal(message: AgentMessage): Promise<void> {
    const signal = message.data as TradingSignal;
    
    // Log signal for monitoring
    consola.debug(`📡 Signal from ${message.from}: ${signal.action} ${signal.strategy} (${(signal.confidence * 100).toFixed(1)}%)`);
    
    // Forward to coordinator for decision making
    await this.coordinator.receiveMessage(message);
    
    // If coordinator makes a trading decision, validate with risk manager
    if (signal.action !== 'HOLD' && signal.confidence > 0.5) {
      await this.validateTradeWithRiskManager(signal, message.from);
    }
  }

  private async validateTradeWithRiskManager(signal: TradingSignal, initiatingAgent: string): Promise<void> {
    const riskApproval = this.riskManager.validateSignal(signal);
    
    if (riskApproval && !this.riskManager.isEmergencyHaltActive()) {
      await this.executeTrade(signal, initiatingAgent);
    } else {
      consola.warn(`🚫 Trade rejected by risk manager: ${signal.action} ${signal.strategy}`);
    }
  }

  private async executeTrade(signal: TradingSignal, initiatingAgent: string): Promise<void> {
    const tradeId = this.generateTradeId();
    const currentPrice = this.getCurrentPrice(this.config.tradingPairs[0]); // Simplified
    
    const trade: TradeExecution = {
      id: tradeId,
      timestamp: Date.now(),
      symbol: this.config.tradingPairs[0], // Simplified
      action: signal.action,
      amount: signal.amount,
      price: currentPrice,
      initiatingAgent,
      coordinatorDecision: signal.reason,
      riskApproval: true,
      executionTime: 0,
      status: 'PENDING'
    };
    
    const executionStart = Date.now();
    
    try {
      // Simulate trade execution (in production, this would call Vincent AI)
      await this.simulateTradeExecution(trade);
      
      trade.executionTime = Date.now() - executionStart;
      trade.status = 'EXECUTED';
      
      // Update portfolio
      this.updatePortfolioAfterTrade(trade);
      
      this.tradeHistory.push(trade);
      
      consola.success(`✅ Trade executed: ${trade.action} ${trade.amount.toFixed(2)} @ ${trade.price.toFixed(4)} (${trade.executionTime}ms)`);
      
      this.emit('tradeExecuted', trade);
      
    } catch (error) {
      trade.status = 'FAILED';
      trade.executionTime = Date.now() - executionStart;
      
      this.tradeHistory.push(trade);
      
      consola.error(`❌ Trade execution failed: ${trade.id}`, error);
      this.emit('tradeFailed', { trade, error });
    }
  }

  private async simulateTradeExecution(trade: TradeExecution): Promise<void> {
    // Simulate network latency and potential failures
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 200));
    
    // Simulate 3% chance of trade failure
    if (Math.random() < 0.03) {
      throw new Error('Simulated execution failure');
    }
    
    // Simulate slippage
    const slippage = Math.random() * 0.002; // 0-0.2%
    trade.price *= (1 + (trade.action === 'BUY' ? slippage : -slippage));
  }

  private updatePortfolioAfterTrade(trade: TradeExecution): void {
    const tradeValue = trade.amount; // Amount is in USD
    
    if (trade.action === 'BUY') {
      this.cashBalance -= tradeValue;
      const currentPosition = this.positions.get(trade.symbol) || 0;
      this.positions.set(trade.symbol, currentPosition + (tradeValue / trade.price));
    } else {
      this.cashBalance += tradeValue;
      const currentPosition = this.positions.get(trade.symbol) || 0;
      this.positions.set(trade.symbol, Math.max(0, currentPosition - (tradeValue / trade.price)));
    }
    
    // Update total portfolio value
    this.portfolioValue = this.calculateTotalPortfolioValue();
  }

  private calculateTotalPortfolioValue(): number {
    let totalValue = this.cashBalance;
    
    for (const [symbol, quantity] of this.positions) {
      const currentPrice = this.getCurrentPrice(symbol);
      totalValue += quantity * currentPrice;
    }
    
    return totalValue;
  }

  private getCurrentPrice(symbol: string): number {
    const marketData = this.dataFeed.getCurrentPrice(symbol);
    return marketData?.price || 100; // Default price
  }

  private distributeMarketData(symbol: string, data: MarketData): void {
    // Distribute to all agents
    for (const agent of this.agents.values()) {
      agent.updateMarketData(data);
    }
    
    this.coordinator.updateMarketData(data);
    // Risk manager gets data through coordinator
  }

  private updateAgentHealth(data: any): void {
    // Track agent health metrics
    // Implementation depends on specific health tracking needs
  }

  private async performHealthCheck(): Promise<void> {
    const healthIssues: string[] = [];
    
    // Check agent health
    for (const [agentId, agent] of this.agents) {
      const health = agent.getHealthStatus();
      if (!health.healthy) {
        healthIssues.push(`${agentId}: ${health.issues.join(', ')}`);
      }
    }
    
    // Check coordinator health
    const coordinatorHealth = this.coordinator.getHealthStatus();
    if (!coordinatorHealth.healthy) {
      healthIssues.push(`coordinator: ${coordinatorHealth.issues.join(', ')}`);
    }
    
    // Check risk manager health
    const riskHealth = this.riskManager.getHealthStatus();
    if (!riskHealth.healthy) {
      healthIssues.push(`risk-manager: ${riskHealth.issues.join(', ')}`);
    }
    
    if (healthIssues.length > 0) {
      consola.warn('🏥 System health issues detected:', healthIssues);
      this.emit('healthIssues', healthIssues);
    }
  }

  private async executePendingTrades(): Promise<void> {
    // Check for any coordinator decisions that need execution
    const coordinatorSignal = this.coordinator.getCurrentSignal();
    
    if (coordinatorSignal && 
        coordinatorSignal.action !== 'HOLD' && 
        coordinatorSignal.confidence > 0.6) {
      
      const recentTrade = this.tradeHistory[this.tradeHistory.length - 1];
      const timeSinceLastTrade = recentTrade ? Date.now() - recentTrade.timestamp : Infinity;
      
      // Minimum 30 seconds between trades
      if (timeSinceLastTrade > 30000) {
        await this.validateTradeWithRiskManager(coordinatorSignal, 'coordinator');
      }
    }
  }

  private updatePerformanceTracking(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // Calculate trades per hour
    const recentTrades = this.tradeHistory.filter(t => 
      now - t.timestamp < oneHour && t.status === 'EXECUTED'
    );
    this.performanceTracker.tradesPerHour = recentTrades.length;
    
    // Calculate average execution time
    if (recentTrades.length > 0) {
      const totalTime = recentTrades.reduce((sum, t) => sum + t.executionTime, 0);
      this.performanceTracker.avgExecutionTime = totalTime / recentTrades.length;
    }
    
    // Calculate success rate
    const allRecentTrades = this.tradeHistory.filter(t => now - t.timestamp < oneHour);
    if (allRecentTrades.length > 0) {
      const successful = allRecentTrades.filter(t => t.status === 'EXECUTED').length;
      this.performanceTracker.successRate = successful / allRecentTrades.length;
    }
  }

  private startSystemMonitoring(): void {
    // Log system status every minute
    setInterval(() => {
      if (this.isRunning) {
        const uptime = (Date.now() - this.startTime) / 1000 / 60; // minutes
        consola.info(`📊 System Status: ${this.systemMetrics.activeAgents} agents active, ` +
                    `${this.tradeHistory.length} trades, ` +
                    `${uptime.toFixed(1)}min uptime, ` +
                    `$${this.portfolioValue.toFixed(2)} portfolio value`);
      }
    }, 60000);
  }

  private generateTradeId(): string {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  getSystemMetrics(): SystemMetrics {
    return { ...this.systemMetrics };
  }

  getTradeHistory(): TradeExecution[] {
    return [...this.tradeHistory];
  }

  getPortfolioState(): any {
    return {
      totalValue: this.portfolioValue,
      cashBalance: this.cashBalance,
      positions: Object.fromEntries(this.positions),
      pnl: this.portfolioValue - this.config.initialBalance,
      pnlPercent: (this.portfolioValue - this.config.initialBalance) / this.config.initialBalance
    };
  }

  getAgentHealthSummary(): any {
    const health: any = {};
    
    for (const [agentId, agent] of this.agents) {
      health[agentId] = agent.getHealthStatus();
    }
    
    health.coordinator = this.coordinator.getHealthStatus();
    health.riskManager = this.riskManager.getHealthStatus();
    
    return health;
  }

  getRiskReport(): any {
    return this.riskManager.generateRiskReport();
  }

  getPerformanceMetrics(): any {
    return {
      ...this.performanceTracker,
      systemMetrics: this.systemMetrics,
      portfolioState: this.getPortfolioState()
    };
  }

  isSystemRunning(): boolean {
    return this.isRunning;
  }

  // Emergency controls
  async emergencyStop(): Promise<void> {
    consola.warn('🚨 EMERGENCY STOP INITIATED');
    await this.stop();
  }

  async pauseTrading(): Promise<void> {
    // Pause all trading agents
    for (const agent of this.agents.values()) {
      await agent.stop();
    }
    consola.warn('⏸️ Trading paused - agents stopped');
  }

  async resumeTrading(): Promise<void> {
    // Resume all trading agents
    for (const agent of this.agents.values()) {
      await agent.start();
    }
    consola.success('▶️ Trading resumed - agents restarted');
  }
}