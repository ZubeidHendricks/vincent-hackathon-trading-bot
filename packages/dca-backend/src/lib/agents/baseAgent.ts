/**
 * Base Agent Class - Foundation for Multi-Agent Trading System
 * Production-ready autonomous trading agents
 */

import { EventEmitter } from 'events';
import { MarketData, TradingSignal } from '../strategies/index';
import consola from 'consola';

export interface AgentConfig {
  agentId: string;
  name: string;
  allocation: number; // Percentage of total portfolio
  riskTolerance: number; // 0-1 scale
  updateFrequency: number; // milliseconds
  enabled: boolean;
  maxPositionSize: number; // Maximum position as % of allocation
}

export interface AgentMessage {
  from: string;
  to: string;
  type: 'SIGNAL' | 'COORDINATION' | 'RISK_ALERT' | 'POSITION_UPDATE' | 'MARKET_UPDATE';
  timestamp: number;
  data: any;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface AgentState {
  isActive: boolean;
  lastUpdate: number;
  confidence: number;
  currentSignal: TradingSignal | null;
  performance: {
    totalTrades: number;
    successfulTrades: number;
    totalPnL: number;
    averageReturn: number;
    sharpeRatio: number;
  };
}

export abstract class BaseAgent extends EventEmitter {
  protected config: AgentConfig;
  protected state: AgentState;
  protected marketData: MarketData[] = [];
  protected messageQueue: AgentMessage[] = [];
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.state = {
      isActive: false,
      lastUpdate: 0,
      confidence: 0,
      currentSignal: null,
      performance: {
        totalTrades: 0,
        successfulTrades: 0,
        totalPnL: 0,
        averageReturn: 0,
        sharpeRatio: 0
      }
    };
    
    consola.info(`🤖 Agent ${this.config.name} initialized with ${this.config.allocation}% allocation`);
  }

  // Abstract methods that each agent must implement
  abstract analyzeMarket(data: MarketData): Promise<TradingSignal>;
  abstract processMessage(message: AgentMessage): Promise<void>;
  abstract validateSignal(signal: TradingSignal): boolean;

  // Agent lifecycle management
  async start(): Promise<void> {
    if (this.state.isActive) {
      consola.warn(`Agent ${this.config.name} is already active`);
      return;
    }

    this.state.isActive = true;
    this.state.lastUpdate = Date.now();
    
    // Start periodic updates
    this.updateInterval = setInterval(async () => {
      await this.performUpdate();
    }, this.config.updateFrequency);

    consola.success(`🚀 Agent ${this.config.name} started`);
    this.emit('agentStarted', { agentId: this.config.agentId });
  }

  async stop(): Promise<void> {
    if (!this.state.isActive) return;

    this.state.isActive = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    consola.info(`🛑 Agent ${this.config.name} stopped`);
    this.emit('agentStopped', { agentId: this.config.agentId });
  }

  // Market data handling
  async updateMarketData(data: MarketData): Promise<void> {
    this.marketData.push(data);
    
    // Keep only last 100 data points for efficiency
    if (this.marketData.length > 100) {
      this.marketData = this.marketData.slice(-100);
    }

    // Trigger analysis if agent is active
    if (this.state.isActive) {
      try {
        const signal = await this.analyzeMarket(data);
        if (this.validateSignal(signal)) {
          this.state.currentSignal = signal;
          this.state.confidence = signal.confidence;
          this.broadcastSignal(signal);
        }
      } catch (error) {
        consola.error(`Agent ${this.config.name} analysis failed:`, error);
      }
    }
  }

  // Inter-agent communication
  async sendMessage(to: string, type: AgentMessage['type'], data: any, priority: AgentMessage['priority'] = 'MEDIUM'): Promise<void> {
    const message: AgentMessage = {
      from: this.config.agentId,
      to,
      type,
      timestamp: Date.now(),
      data,
      priority
    };

    this.emit('messageSent', message);
  }

  async receiveMessage(message: AgentMessage): Promise<void> {
    // Add to queue with priority ordering
    this.messageQueue.push(message);
    this.messageQueue.sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Process message
    try {
      await this.processMessage(message);
    } catch (error) {
      consola.error(`Agent ${this.config.name} message processing failed:`, error);
    }
  }

  // Signal broadcasting
  private broadcastSignal(signal: TradingSignal): void {
    const signalMessage: AgentMessage = {
      from: this.config.agentId,
      to: 'COORDINATOR',
      type: 'SIGNAL',
      timestamp: Date.now(),
      data: signal,
      priority: signal.confidence > 0.7 ? 'HIGH' : 'MEDIUM'
    };

    this.emit('signalGenerated', signalMessage);
  }

  // Performance tracking
  updatePerformance(trade: { success: boolean; pnl: number; return: number }): void {
    this.state.performance.totalTrades++;
    if (trade.success) {
      this.state.performance.successfulTrades++;
    }
    this.state.performance.totalPnL += trade.pnl;
    
    // Update running averages
    const totalTrades = this.state.performance.totalTrades;
    this.state.performance.averageReturn = 
      (this.state.performance.averageReturn * (totalTrades - 1) + trade.return) / totalTrades;
  }

  // Periodic update cycle
  private async performUpdate(): Promise<void> {
    if (!this.state.isActive) return;

    try {
      // Process queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift()!;
        await this.processMessage(message);
      }

      // Update timestamp
      this.state.lastUpdate = Date.now();

      // Emit heartbeat for monitoring
      this.emit('agentHeartbeat', {
        agentId: this.config.agentId,
        state: this.state,
        queueSize: this.messageQueue.length
      });

    } catch (error) {
      consola.error(`Agent ${this.config.name} update cycle failed:`, error);
    }
  }

  // Getters for external access
  getState(): AgentState {
    return { ...this.state };
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  getCurrentSignal(): TradingSignal | null {
    return this.state.currentSignal;
  }

  getPerformanceMetrics(): AgentState['performance'] {
    return { ...this.state.performance };
  }

  isActive(): boolean {
    return this.state.isActive;
  }

  // Dynamic configuration updates
  updateConfig(updates: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...updates };
    consola.info(`Agent ${this.config.name} configuration updated`);
  }

  // Health check
  getHealthStatus(): {
    healthy: boolean;
    lastUpdate: number;
    timeSinceUpdate: number;
    issues: string[];
  } {
    const now = Date.now();
    const timeSinceUpdate = now - this.state.lastUpdate;
    const issues: string[] = [];

    if (!this.state.isActive) {
      issues.push('Agent is not active');
    }

    if (timeSinceUpdate > this.config.updateFrequency * 3) {
      issues.push('Agent update cycle is delayed');
    }

    if (this.messageQueue.length > 50) {
      issues.push('Message queue is backing up');
    }

    return {
      healthy: issues.length === 0,
      lastUpdate: this.state.lastUpdate,
      timeSinceUpdate,
      issues
    };
  }
}