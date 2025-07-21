/**
 * Vincent Multi-Agent Trading System
 * Production-ready autonomous trading with user-controlled permissions
 * Built for Vincent AI Agent Hackathon
 */

import { EventEmitter } from 'events';
import { VincentBaseAgent, VincentAgentConfig, VincentPolicyConstraints } from './vincentBaseAgent';
import { VincentMomentumAgent } from './vincentMomentumAgent';
import { VincentArbitrageAgent } from './vincentArbitrageAgent';
import { VincentMeanReversionAgent } from './vincentMeanReversionAgent';
import { MarketData, TradingSignal } from '../strategies/index';
import { RealTimeDataFeed } from '../dataFeeds/realTimeDataFeed';
import { recallNetworkClient, AgentRegistration } from '../recallNetwork/index';
import consola from 'consola';

interface VincentSystemConfig {
  initialBalance: number;
  tradingPairs: string[];
  updateFrequency: number;
  competitionMode: boolean;
  vincentAppVersion: number;
  globalPolicyConstraints: VincentPolicyConstraints;
  userDelegationId?: string;
  agentConfigurations: {
    momentum: VincentAgentConfig;
    arbitrage: VincentAgentConfig;
    meanReversion: VincentAgentConfig;
  };
}

interface VincentSystemMetrics {
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
  vincentMetrics: {
    totalSpending: { daily: number; monthly: number };
    policyViolations: number;
    approvalRequests: number;
    walletAddresses: string[];
    toolsUsed: Map<string, number>;
  };
}

interface VincentTradeRecord {
  id: string;
  timestamp: number;
  agentId: string;
  signal: TradingSignal;
  execution: any; // VincentTradeExecution
  policyValidation: any;
  userApprovalRequired: boolean;
  vincentWallet: string;
  gasUsed?: number;
  transactionHash?: string;
}

export class VincentMultiAgentSystem extends EventEmitter {
  private config: VincentSystemConfig;
  private agents: Map<string, VincentBaseAgent> = new Map();
  private dataFeed: RealTimeDataFeed;
  
  private isRunning: boolean = false;
  private startTime: number = 0;
  private systemMetrics: VincentSystemMetrics;
  private tradeHistory: VincentTradeRecord[] = [];
  private policyViolations: string[] = [];
  
  // Recall Network Integration
  private recallNetworkRegistration: AgentRegistration | null = null;
  private lastPerformanceReport: number = 0;
  private performanceReportInterval: number = 60000; // Report every minute
  
  private updateInterval: NodeJS.Timeout | null = null;
  private performanceTracker: any = {
    tradesPerHour: 0,
    avgExecutionTime: 0,
    successRate: 0,
    avgGasUsed: 0
  };

  constructor(config: VincentSystemConfig) {
    super();
    this.config = config;
    
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
      lastUpdate: 0,
      vincentMetrics: {
        totalSpending: { daily: 0, monthly: 0 },
        policyViolations: 0,
        approvalRequests: 0,
        walletAddresses: [],
        toolsUsed: new Map()
      }
    };
    
    this.initializeVincentAgents();
    consola.success('🔐 Vincent Multi-Agent Trading System initialized with user-controlled permissions');
  }

  private initializeVincentAgents(): void {
    // Initialize data feed
    this.dataFeed = new RealTimeDataFeed();
    
    // Create Vincent-enhanced trading agents with policy constraints
    const momentumConfig: VincentAgentConfig = {
      agentId: 'vincent-momentum',
      name: 'Vincent Momentum Trader',
      allocation: 60, // Increased allocation from config
      riskTolerance: 0.7,
      updateFrequency: 10000,
      enabled: true,
      maxPositionSize: 0.15,
      vincentAppVersion: this.config.vincentAppVersion,
      userDelegationId: this.config.userDelegationId,
      policyConstraints: {
        ...this.config.globalPolicyConstraints,
        spendingLimits: {
          ...this.config.globalPolicyConstraints.spendingLimits,
          perTradeLimit: this.config.globalPolicyConstraints.spendingLimits.perTradeLimit * 0.6 // 60% allocation
        }
      }
    };

    const arbitrageConfig: VincentAgentConfig = {
      agentId: 'vincent-arbitrage',
      name: 'Vincent Arbitrage Hunter',
      allocation: 25,
      riskTolerance: 0.3,
      updateFrequency: 5000,
      enabled: true,
      maxPositionSize: 0.10,
      vincentAppVersion: this.config.vincentAppVersion,
      userDelegationId: this.config.userDelegationId,
      policyConstraints: {
        ...this.config.globalPolicyConstraints,
        spendingLimits: {
          ...this.config.globalPolicyConstraints.spendingLimits,
          perTradeLimit: this.config.globalPolicyConstraints.spendingLimits.perTradeLimit * 0.25 // 25% allocation
        }
      }
    };

    const meanReversionConfig: VincentAgentConfig = {
      agentId: 'vincent-mean-reversion',
      name: 'Vincent Mean Reversion Specialist',
      allocation: 15,
      riskTolerance: 0.8,
      updateFrequency: 15000,
      enabled: true,
      maxPositionSize: 0.08,
      vincentAppVersion: this.config.vincentAppVersion,
      userDelegationId: this.config.userDelegationId,
      policyConstraints: {
        ...this.config.globalPolicyConstraints,
        spendingLimits: {
          ...this.config.globalPolicyConstraints.spendingLimits,
          perTradeLimit: this.config.globalPolicyConstraints.spendingLimits.perTradeLimit * 0.15 // 15% allocation
        }
      }
    };
    
    // Create all Vincent agents
    this.agents.set('momentum', new VincentMomentumAgent(momentumConfig));
    this.agents.set('arbitrage', new VincentArbitrageAgent(arbitrageConfig));
    this.agents.set('meanReversion', new VincentMeanReversionAgent(meanReversionConfig));
    
    // Setup inter-agent communication
    this.setupVincentCommunication();
    
    consola.info(`🤖 Initialized ${this.agents.size} Vincent agents with user-controlled permissions`);
  }

  private setupVincentCommunication(): void {
    // Enhanced communication with Vincent policy validation
    for (const [agentId, agent] of this.agents) {
      agent.on('signalGenerated', async (signal: TradingSignal) => {
        await this.handleVincentSignal(agentId, signal);
      });
      
      agent.on('policyViolation', (violation: string) => {
        this.handlePolicyViolation(agentId, violation);
      });
      
      agent.on('approvalRequired', (data: any) => {
        this.handleApprovalRequest(agentId, data);
      });
      
      agent.on('agentHeartbeat', (data: any) => {
        this.updateVincentAgentHealth(agentId, data);
      });
    }
    
    // Setup data feed with Vincent context
    this.dataFeed.on('priceUpdate', ({ symbol, data }) => {
      this.distributeMarketDataWithVincentContext(symbol, data);
    });
    
    consola.success('🔗 Vincent inter-agent communication established with policy validation');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      consola.warn('Vincent Multi-Agent System already running');
      return;
    }
    
    this.isRunning = true;
    this.startTime = Date.now();
    
    consola.info('🚀 Starting Vincent Multi-Agent Trading System...');
    
    try {
      // Register with Recall Network Competition
      await this.registerWithRecallNetwork();
      
      // Start all Vincent agents
      for (const [agentId, agent] of this.agents) {
        await agent.start();
        consola.success(`✅ Vincent ${agentId} agent started with PKP wallet: ${agent.getVincentWalletAddress()}`);
      }
      
      // Collect wallet addresses for monitoring
      this.systemMetrics.vincentMetrics.walletAddresses = Array.from(this.agents.values())
        .map(agent => agent.getVincentWalletAddress());
      
      // Start system monitoring
      this.startVincentSystemMonitoring();
      
      // Start main system loop
      this.startMainLoop();
      
      this.systemMetrics.activeAgents = this.agents.size;
      
      consola.success('🎯 Vincent Multi-Agent Trading System is LIVE with user-controlled permissions!');
      this.emit('vincentSystemStarted', { 
        startTime: this.startTime, 
        config: this.config,
        walletAddresses: this.systemMetrics.vincentMetrics.walletAddresses
      });
      
    } catch (error) {
      consola.error('Failed to start Vincent Multi-Agent System:', error);
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    consola.info('🛑 Stopping Vincent Multi-Agent Trading System...');
    
    // Stop main loop
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Stop all Vincent agents
    for (const [agentId, agent] of this.agents) {
      await agent.stop();
      consola.info(`🛑 Vincent ${agentId} agent stopped`);
    }
    
    // Stop data feed
    this.dataFeed.stop();
    
    const duration = (Date.now() - this.startTime) / 1000 / 60 / 60; // hours
    this.systemMetrics.systemUptime = duration;
    
    consola.success(`📊 Vincent Multi-Agent System stopped after ${duration.toFixed(2)} hours`);
    this.emit('vincentSystemStopped', { 
      duration, 
      finalMetrics: this.systemMetrics,
      tradeHistory: this.tradeHistory,
      policyViolations: this.policyViolations
    });
  }

  private startMainLoop(): void {
    this.updateInterval = setInterval(async () => {
      await this.vincentSystemUpdateWithRecallNetwork();
    }, this.config.updateFrequency);
  }

  private async vincentSystemUpdate(): Promise<void> {
    try {
      if (!this.isRunning) return;
      
      // Update system metrics with Vincent-specific data
      this.updateVincentSystemMetrics();
      
      // Validate policy compliance across all agents
      await this.validateSystemPolicyCompliance();
      
      // Update performance tracking
      this.updateVincentPerformanceTracking();
      
      this.systemMetrics.lastUpdate = Date.now();
      
      // Emit enhanced system update with Vincent metrics
      this.emit('vincentSystemUpdate', {
        metrics: this.systemMetrics,
        agentHealth: this.getVincentAgentHealthSummary(),
        recentTrades: this.tradeHistory.slice(-5),
        policyStatus: this.getPolicyComplianceStatus()
      });
      
    } catch (error) {
      consola.error('Vincent system update failed:', error);
    }
  }

  private updateVincentSystemMetrics(): void {
    const currentTime = Date.now();
    const uptime = (currentTime - this.startTime) / 1000 / 60 / 60; // hours
    
    // Calculate spending across all agents
    let totalDailySpending = 0;
    let totalMonthlySpending = 0;
    
    for (const agent of this.agents.values()) {
      const spendingStatus = agent.getSpendingStatus();
      totalDailySpending += spendingStatus.daily.used;
      totalMonthlySpending += spendingStatus.monthly.used;
    }
    
    // Update Vincent-specific metrics
    this.systemMetrics.vincentMetrics.totalSpending = {
      daily: totalDailySpending,
      monthly: totalMonthlySpending
    };
    
    // Update general metrics
    this.systemMetrics.totalValue = this.config.initialBalance + this.systemMetrics.totalPnL;
    this.systemMetrics.totalReturn = this.systemMetrics.totalPnL / this.config.initialBalance;
    this.systemMetrics.systemUptime = uptime;
    this.systemMetrics.totalTrades = this.tradeHistory.length;
    
    // Calculate win rate
    const completedTrades = this.tradeHistory.filter(t => t.execution?.postValidation?.pnlRealized !== undefined);
    const winningTrades = completedTrades.filter(t => t.execution.postValidation.pnlRealized > 0);
    this.systemMetrics.winRate = completedTrades.length > 0 ? 
      winningTrades.length / completedTrades.length : 0;
  }

  private async validateSystemPolicyCompliance(): Promise<void> {
    for (const [agentId, agent] of this.agents) {
      const health = agent.getVincentHealthStatus();
      if (!health.vincent.policyCompliance) {
        this.handlePolicyViolation(agentId, 'Spending limits exceeded');
      }
    }
  }

  private async handleVincentSignal(agentId: string, signal: TradingSignal): Promise<void> {
    consola.debug(`📡 Vincent signal from ${agentId}: ${signal.action} ${signal.strategy} (${(signal.confidence * 100).toFixed(1)}%)`);
    
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    try {
      // Execute trade with Vincent policy validation
      if (signal.action !== 'HOLD' && signal.confidence > 0.4) {
        const execution = await agent.executeTrade(signal);
        
        // Record Vincent trade
        const tradeRecord: VincentTradeRecord = {
          id: this.generateTradeId(),
          timestamp: Date.now(),
          agentId,
          signal,
          execution,
          policyValidation: execution.preValidation,
          userApprovalRequired: execution.preValidation.userConsentRequired,
          vincentWallet: agent.getVincentWalletAddress(),
          gasUsed: execution.execution.gasUsed,
          transactionHash: execution.execution.transactionHash
        };
        
        this.tradeHistory.push(tradeRecord);
        
        // Update total P&L
        if (execution.postValidation.pnlRealized) {
          this.systemMetrics.totalPnL += execution.postValidation.pnlRealized;
        }
        
        consola.success(`✅ Vincent trade executed: ${signal.action} $${signal.amount.toFixed(2)} by ${agentId}`);
        this.emit('vincentTradeExecuted', tradeRecord);
      }
      
    } catch (error) {
      consola.error(`❌ Vincent trade execution failed for ${agentId}:`, error);
      this.emit('vincentTradeFailed', { agentId, signal, error });
    }
  }

  private handlePolicyViolation(agentId: string, violation: string): void {
    const violationRecord = `${agentId}: ${violation} at ${new Date().toISOString()}`;
    this.policyViolations.push(violationRecord);
    this.systemMetrics.vincentMetrics.policyViolations++;
    
    consola.warn(`⚠️ Vincent Policy Violation: ${violationRecord}`);
    this.emit('vincentPolicyViolation', { agentId, violation, timestamp: Date.now() });
  }

  private handleApprovalRequest(agentId: string, data: any): void {
    this.systemMetrics.vincentMetrics.approvalRequests++;
    consola.warn(`🔐 Vincent Approval Required: ${agentId} - ${data.reason}`);
    this.emit('vincentApprovalRequired', { agentId, data, timestamp: Date.now() });
  }

  private updateVincentAgentHealth(agentId: string, data: any): void {
    // Track Vincent-specific agent health metrics
  }

  private distributeMarketDataWithVincentContext(symbol: string, data: MarketData): void {
    // Add Vincent context to market data
    const vincentContext = {
      systemPolicyCompliance: this.getPolicyComplianceStatus(),
      availableSpending: this.getSystemSpendingLimits(),
      activeWallets: this.systemMetrics.vincentMetrics.walletAddresses.length
    };
    
    // Distribute to all agents with Vincent context
    for (const agent of this.agents.values()) {
      agent.updateMarketData({ ...data, vincentContext });
    }
  }

  private startVincentSystemMonitoring(): void {
    // Enhanced monitoring with Vincent metrics
    setInterval(() => {
      if (this.isRunning) {
        const uptime = (Date.now() - this.startTime) / 1000 / 60; // minutes
        const spending = this.systemMetrics.vincentMetrics.totalSpending;
        
        consola.info(`🔐 Vincent System Status: ${this.systemMetrics.activeAgents} agents active, ` +
                    `${this.tradeHistory.length} trades, ` +
                    `$${spending.daily.toFixed(2)} daily spending, ` +
                    `${this.systemMetrics.vincentMetrics.policyViolations} violations, ` +
                    `${uptime.toFixed(1)}min uptime`);
      }
    }, 60000);
  }

  private updateVincentPerformanceTracking(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // Calculate Vincent-specific performance metrics
    const recentTrades = this.tradeHistory.filter(t => now - t.timestamp < oneHour);
    this.performanceTracker.tradesPerHour = recentTrades.length;
    
    if (recentTrades.length > 0) {
      const totalExecutionTime = recentTrades.reduce((sum, t) => sum + t.execution.execution.executionTime, 0);
      this.performanceTracker.avgExecutionTime = totalExecutionTime / recentTrades.length;
      
      const totalGasUsed = recentTrades.reduce((sum, t) => sum + (t.gasUsed || 0), 0);
      this.performanceTracker.avgGasUsed = totalGasUsed / recentTrades.length;
      
      const successful = recentTrades.filter(t => t.execution.postValidation.policyViolations.length === 0).length;
      this.performanceTracker.successRate = successful / recentTrades.length;
    }
  }

  private generateTradeId(): string {
    return `vincent_trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods for Vincent system
  getVincentSystemMetrics(): VincentSystemMetrics {
    return { ...this.systemMetrics };
  }

  getVincentTradeHistory(): VincentTradeRecord[] {
    return [...this.tradeHistory];
  }

  getPolicyComplianceStatus(): any {
    const agentCompliance = new Map();
    for (const [agentId, agent] of this.agents) {
      const health = agent.getVincentHealthStatus();
      agentCompliance.set(agentId, health.vincent.policyCompliance);
    }
    
    return {
      overall: Array.from(agentCompliance.values()).every(compliant => compliant),
      byAgent: Object.fromEntries(agentCompliance),
      violations: this.policyViolations.length,
      lastViolation: this.policyViolations[this.policyViolations.length - 1]
    };
  }

  getSystemSpendingLimits(): any {
    const totalDaily = this.config.globalPolicyConstraints.spendingLimits.dailyLimit;
    const totalMonthly = this.config.globalPolicyConstraints.spendingLimits.monthlyLimit;
    const usedDaily = this.systemMetrics.vincentMetrics.totalSpending.daily;
    const usedMonthly = this.systemMetrics.vincentMetrics.totalSpending.monthly;
    
    return {
      daily: { limit: totalDaily, used: usedDaily, remaining: totalDaily - usedDaily },
      monthly: { limit: totalMonthly, used: usedMonthly, remaining: totalMonthly - usedMonthly }
    };
  }

  getVincentAgentHealthSummary(): any {
    const health: any = {};
    for (const [agentId, agent] of this.agents) {
      health[agentId] = agent.getVincentHealthStatus();
    }
    return health;
  }

  getVincentWalletAddresses(): string[] {
    return this.systemMetrics.vincentMetrics.walletAddresses;
  }

  // Emergency controls with Vincent policy respect
  async emergencyHalt(): Promise<void> {
    consola.warn('🚨 VINCENT EMERGENCY HALT INITIATED - All trading stopped while respecting user permissions');
    await this.stop();
  }

  // Update global policy constraints
  async updateGlobalPolicyConstraints(newConstraints: Partial<VincentPolicyConstraints>): Promise<void> {
    this.config.globalPolicyConstraints = { ...this.config.globalPolicyConstraints, ...newConstraints };
    
    // Update all agents with new constraints
    for (const agent of this.agents.values()) {
      await agent.updatePolicyConstraints(newConstraints);
    }
    
    consola.info('🔄 Vincent global policy constraints updated across all agents');
    this.emit('vincentPolicyUpdated', { constraints: this.config.globalPolicyConstraints });
  }

  // ========== RECALL NETWORK COMPETITION INTEGRATION ==========

  /**
   * Register agent with Recall Network Competition
   */
  private async registerWithRecallNetwork(): Promise<void> {
    try {
      consola.info('🌐 Registering with Recall Network Competition...');
      
      const capabilities = [
        'autonomous-trading',
        'multi-agent-coordination', 
        'dca-strategy',
        'momentum-trading',
        'arbitrage-detection',
        'mean-reversion',
        'risk-management',
        'user-controlled-permissions',
        'vincent-protocol-integration',
        'real-time-market-analysis',
        'policy-compliance',
        'pkp-wallet-management'
      ];

      this.recallNetworkRegistration = await recallNetworkClient.registerAgent(capabilities);
      
      consola.success(`✅ Registered with Recall Network as Agent: ${this.recallNetworkRegistration.agentId}`);
      consola.info(`🏆 Competition Environment: ${recallNetworkClient.getCurrentEnvironment()}`);
      
      // Update agent status to active
      await recallNetworkClient.updateAgentStatus(
        this.recallNetworkRegistration.agentId, 
        'active'
      );
      
    } catch (error) {
      consola.error('❌ Failed to register with Recall Network:', error);
      
      if (this.config.competitionMode) {
        consola.warn('⚠️ Competition mode enabled but registration failed - continuing anyway');
      } else {
        throw error;
      }
    }
  }

  /**
   * Report performance metrics to Recall Network
   */
  private async reportPerformanceToRecallNetwork(): Promise<void> {
    if (!this.recallNetworkRegistration || !this.config.competitionMode) {
      return;
    }

    const now = Date.now();
    if (now - this.lastPerformanceReport < this.performanceReportInterval) {
      return;
    }

    try {
      const performanceData = {
        agentId: this.recallNetworkRegistration.agentId,
        timestamp: now,
        performance: {
          totalReturn: this.systemMetrics.totalReturn,
          sharpeRatio: this.systemMetrics.sharpeRatio,
          drawdown: -Math.abs(this.systemMetrics.maxDrawdown), // Ensure negative
          trades: this.systemMetrics.totalTrades
        },
        metadata: {
          activeAgents: this.systemMetrics.activeAgents,
          systemUptime: (now - this.startTime) / 1000 / 3600, // hours
          totalValue: this.systemMetrics.totalValue,
          winRate: this.systemMetrics.winRate,
          policyViolations: this.systemMetrics.vincentMetrics.policyViolations,
          environment: recallNetworkClient.getCurrentEnvironment(),
          vincentMetrics: {
            dailySpending: this.systemMetrics.vincentMetrics.totalSpending.daily,
            monthlySpending: this.systemMetrics.vincentMetrics.totalSpending.monthly,
            walletCount: this.systemMetrics.vincentMetrics.walletAddresses.length,
            toolsUsed: Object.fromEntries(this.systemMetrics.vincentMetrics.toolsUsed)
          }
        }
      };

      await recallNetworkClient.submitPerformanceData(performanceData);
      this.lastPerformanceReport = now;
      
      // consola.info('📊 Performance metrics reported to Recall Network');
      
    } catch (error) {
      consola.error('❌ Failed to report performance to Recall Network:', error);
    }
  }

  /**
   * Get current competition leaderboard position
   */
  async getCompetitionStatus(): Promise<any> {
    if (!this.recallNetworkRegistration) {
      return { error: 'Not registered with Recall Network' };
    }

    try {
      const [competitionData, leaderboard] = await Promise.all([
        recallNetworkClient.getCompetitionData(),
        recallNetworkClient.getLeaderboard()
      ]);

      const ourPosition = leaderboard.find(
        entry => entry.agentId === this.recallNetworkRegistration?.agentId
      );

      return {
        competition: competitionData,
        ourRank: ourPosition?.rank || 'Unranked',
        ourScore: ourPosition?.score || 0,
        totalParticipants: leaderboard.length,
        environment: recallNetworkClient.getCurrentEnvironment(),
        agentId: this.recallNetworkRegistration.agentId
      };

    } catch (error) {
      consola.error('❌ Failed to get competition status:', error);
      return { error: error.message };
    }
  }

  /**
   * Switch between sandbox and production environments
   */
  switchRecallNetworkEnvironment(environment: 'sandbox' | 'production'): void {
    if (environment === 'production') {
      recallNetworkClient.switchToProduction();
      consola.info('🏭 Switched to Recall Network PRODUCTION environment');
    } else {
      recallNetworkClient.switchToSandbox();
      consola.info('🏖️ Switched to Recall Network SANDBOX environment');
    }
  }

  /**
   * Enhanced system update with Recall Network reporting
   */
  private async vincentSystemUpdateWithRecallNetwork(): Promise<void> {
    // Run original system update
    await this.vincentSystemUpdate();
    
    // Report to Recall Network if in competition mode
    if (this.config.competitionMode) {
      await this.reportPerformanceToRecallNetwork();
    }
  }
}