/**
 * Competition Monitoring System
 * Comprehensive monitoring, logging, and alerting for live trading competitions
 */

import { EventEmitter } from 'events';
import { writeFile, appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { consola } from 'consola';

export interface CompetitionMetrics {
  startTime: Date;
  currentTime: Date;
  elapsedTime: number;
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalVolume: number;
  currentBalance: number;
  initialBalance: number;
  totalPnL: number;
  totalPnLPercent: number;
  maxDrawdown: number;
  currentDrawdown: number;
  winRate: number;
  averageTradeSize: number;
  tradesPerHour: number;
  sharpeRatio: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  avgTimePerTrade: number;
  strategyPerformance: Record<string, {
    trades: number;
    pnl: number;
    winRate: number;
    avgReturn: number;
  }>;
  riskMetrics: {
    valueAtRisk: number;
    maxPositionSize: number;
    currentExposure: number;
    correlationRisk: number;
  };
  systemHealth: {
    memoryUsage: number;
    cpuUsage: number;
    networkLatency: number;
    apiResponseTime: number;
    errorRate: number;
    uptime: number;
  };
}

export interface TradeEvent {
  id: string;
  timestamp: Date;
  type: 'BUY' | 'SELL';
  symbol: string;
  amount: number;
  price: number;
  value: number;
  strategy: string;
  confidence: number;
  reason: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  error?: string;
  latency: number;
  slippage?: number;
  fees?: number;
  netPnL?: number;
}

export interface SystemAlert {
  id: string;
  timestamp: Date;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  category: 'TRADE' | 'SYSTEM' | 'RISK' | 'PERFORMANCE' | 'NETWORK';
  message: string;
  data?: any;
  acknowledged: boolean;
}

export class CompetitionMonitor extends EventEmitter {
  private metrics: CompetitionMetrics;
  private trades: TradeEvent[] = [];
  private alerts: SystemAlert[] = [];
  private logsDir: string;
  private metricsFile: string;
  private tradesFile: string;
  private alertsFile: string;
  private monitoringInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  
  constructor(competitionId: string, initialBalance: number) {
    super();
    
    this.logsDir = path.join(process.cwd(), 'logs', competitionId);
    this.metricsFile = path.join(this.logsDir, 'metrics.jsonl');
    this.tradesFile = path.join(this.logsDir, 'trades.jsonl');
    this.alertsFile = path.join(this.logsDir, 'alerts.jsonl');
    
    this.metrics = this.initializeMetrics(initialBalance);
    this.setupLogging();
    this.startMonitoring();
  }

  private initializeMetrics(initialBalance: number): CompetitionMetrics {
    const now = new Date();
    return {
      startTime: now,
      currentTime: now,
      elapsedTime: 0,
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalVolume: 0,
      currentBalance: initialBalance,
      initialBalance,
      totalPnL: 0,
      totalPnLPercent: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      winRate: 0,
      averageTradeSize: 0,
      tradesPerHour: 0,
      sharpeRatio: 0,
      profitFactor: 0,
      largestWin: 0,
      largestLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      avgTimePerTrade: 0,
      strategyPerformance: {},
      riskMetrics: {
        valueAtRisk: 0,
        maxPositionSize: 0,
        currentExposure: 0,
        correlationRisk: 0,
      },
      systemHealth: {
        memoryUsage: 0,
        cpuUsage: 0,
        networkLatency: 0,
        apiResponseTime: 0,
        errorRate: 0,
        uptime: 0,
      },
    };
  }

  private async setupLogging(): Promise<void> {
    try {
      if (!existsSync(this.logsDir)) {
        await mkdir(this.logsDir, { recursive: true });
      }
    } catch (error) {
      consola.error('Failed to setup logging directory:', error);
    }
  }

  private startMonitoring(): void {
    // Update metrics every 10 seconds
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      this.logMetrics();
      this.checkAlerts();
    }, 10000);

    // Health checks every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    consola.info('🔍 Competition monitoring started');
  }

  public recordTrade(trade: Omit<TradeEvent, 'id' | 'timestamp'>): void {
    const tradeEvent: TradeEvent = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...trade,
    };

    this.trades.push(tradeEvent);
    this.logTrade(tradeEvent);
    this.updateTradeMetrics();
    this.emit('trade', tradeEvent);

    // Real-time trade logging
    const emoji = trade.type === 'BUY' ? '💰' : '💸';
    const status = trade.status === 'SUCCESS' ? '✅' : trade.status === 'FAILED' ? '❌' : '⏳';
    
    consola.info(`${emoji} ${status} ${trade.type}: ${trade.amount} ${trade.symbol} @ $${trade.price.toFixed(2)} | Strategy: ${trade.strategy} | Confidence: ${trade.confidence.toFixed(1)}%`);
    
    if (trade.netPnL) {
      const pnlEmoji = trade.netPnL > 0 ? '📈' : '📉';
      consola.info(`${pnlEmoji} Trade P&L: ${trade.netPnL > 0 ? '+' : ''}$${trade.netPnL.toFixed(2)}`);
    }
  }

  public recordAlert(alert: Omit<SystemAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const alertEvent: SystemAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false,
      ...alert,
    };

    this.alerts.push(alertEvent);
    this.logAlert(alertEvent);
    this.emit('alert', alertEvent);

    // Real-time alert logging with appropriate emoji
    const levelEmojis = {
      INFO: 'ℹ️',
      WARNING: '⚠️',
      ERROR: '❌',
      CRITICAL: '🚨'
    };

    consola[alert.level.toLowerCase() as keyof typeof consola](
      `${levelEmojis[alert.level]} [${alert.category}] ${alert.message}`
    );

    // Critical alerts need immediate attention
    if (alert.level === 'CRITICAL') {
      consola.error('🚨 CRITICAL ALERT - Immediate attention required!');
    }
  }

  private updateMetrics(): void {
    const now = new Date();
    this.metrics.currentTime = now;
    this.metrics.elapsedTime = (now.getTime() - this.metrics.startTime.getTime()) / 1000;

    // Update system health
    const memUsage = process.memoryUsage();
    this.metrics.systemHealth.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
    this.metrics.systemHealth.uptime = process.uptime();
    
    // Calculate trading metrics
    this.calculateTradingMetrics();
    this.calculateRiskMetrics();
    
    this.emit('metricsUpdate', this.metrics);
  }

  private calculateTradingMetrics(): void {
    const successfulTrades = this.trades.filter(t => t.status === 'SUCCESS');
    this.metrics.totalTrades = this.trades.length;
    this.metrics.successfulTrades = successfulTrades.length;
    this.metrics.failedTrades = this.trades.filter(t => t.status === 'FAILED').length;

    if (successfulTrades.length > 0) {
      this.metrics.totalVolume = successfulTrades.reduce((sum, t) => sum + t.value, 0);
      this.metrics.averageTradeSize = this.metrics.totalVolume / successfulTrades.length;
      
      // Calculate P&L
      const totalPnL = successfulTrades.reduce((sum, t) => sum + (t.netPnL || 0), 0);
      this.metrics.totalPnL = totalPnL;
      this.metrics.totalPnLPercent = (totalPnL / this.metrics.initialBalance) * 100;
      this.metrics.currentBalance = this.metrics.initialBalance + totalPnL;

      // Win rate
      const winners = successfulTrades.filter(t => (t.netPnL || 0) > 0);
      this.metrics.winRate = (winners.length / successfulTrades.length) * 100;

      // Trading frequency
      const hoursElapsed = this.metrics.elapsedTime / 3600;
      this.metrics.tradesPerHour = hoursElapsed > 0 ? this.metrics.totalTrades / hoursElapsed : 0;

      // Strategy performance
      this.updateStrategyPerformance(successfulTrades);
      
      // Risk metrics
      this.calculateDrawdown();
    }
  }

  private updateStrategyPerformance(trades: TradeEvent[]): void {
    const strategyStats: Record<string, any> = {};

    for (const trade of trades) {
      if (!strategyStats[trade.strategy]) {
        strategyStats[trade.strategy] = {
          trades: 0,
          totalPnL: 0,
          winners: 0,
          totalReturn: 0,
        };
      }

      const stats = strategyStats[trade.strategy];
      stats.trades++;
      stats.totalPnL += trade.netPnL || 0;
      stats.totalReturn += Math.abs(trade.netPnL || 0);
      
      if ((trade.netPnL || 0) > 0) {
        stats.winners++;
      }
    }

    // Convert to final metrics
    for (const [strategy, stats] of Object.entries(strategyStats)) {
      this.metrics.strategyPerformance[strategy] = {
        trades: stats.trades,
        pnl: stats.totalPnL,
        winRate: (stats.winners / stats.trades) * 100,
        avgReturn: stats.totalReturn / stats.trades,
      };
    }
  }

  private calculateDrawdown(): void {
    const runningBalances: number[] = [this.metrics.initialBalance];
    let balance = this.metrics.initialBalance;

    for (const trade of this.trades.filter(t => t.status === 'SUCCESS')) {
      balance += trade.netPnL || 0;
      runningBalances.push(balance);
    }

    let maxBalance = this.metrics.initialBalance;
    let maxDrawdown = 0;
    
    for (const currentBalance of runningBalances) {
      if (currentBalance > maxBalance) {
        maxBalance = currentBalance;
      }
      
      const drawdown = ((maxBalance - currentBalance) / maxBalance) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    this.metrics.maxDrawdown = maxDrawdown;
    this.metrics.currentDrawdown = ((maxBalance - balance) / maxBalance) * 100;
  }

  private calculateRiskMetrics(): void {
    // Calculate Value at Risk (simplified 5% VaR)
    const returns = this.getRecentReturns();
    if (returns.length > 10) {
      returns.sort((a, b) => a - b);
      const varIndex = Math.floor(returns.length * 0.05);
      this.metrics.riskMetrics.valueAtRisk = Math.abs(returns[varIndex]) * this.metrics.currentBalance;
    }
  }

  private getRecentReturns(): number[] {
    return this.trades
      .filter(t => t.status === 'SUCCESS' && t.netPnL !== undefined)
      .slice(-100) // Last 100 trades
      .map(t => (t.netPnL || 0) / t.value);
  }

  private performHealthCheck(): void {
    // API response time test
    const startTime = Date.now();
    fetch('https://api.sandbox.competitions.recall.network/health')
      .then(() => {
        this.metrics.systemHealth.apiResponseTime = Date.now() - startTime;
      })
      .catch(() => {
        this.recordAlert({
          level: 'WARNING',
          category: 'NETWORK',
          message: 'API health check failed',
        });
      });

    // Memory usage check
    if (this.metrics.systemHealth.memoryUsage > 512) { // 512MB threshold
      this.recordAlert({
        level: 'WARNING',
        category: 'SYSTEM',
        message: `High memory usage: ${this.metrics.systemHealth.memoryUsage.toFixed(1)}MB`,
      });
    }

    // Drawdown check
    if (this.metrics.currentDrawdown > 10) { // 10% drawdown threshold
      this.recordAlert({
        level: 'WARNING',
        category: 'RISK',
        message: `High drawdown: ${this.metrics.currentDrawdown.toFixed(2)}%`,
      });
    }

    // Critical drawdown check
    if (this.metrics.currentDrawdown > 15) { // 15% critical threshold
      this.recordAlert({
        level: 'CRITICAL',
        category: 'RISK',
        message: `Critical drawdown reached: ${this.metrics.currentDrawdown.toFixed(2)}%`,
        data: { action: 'STOP_TRADING' },
      });
    }
  }

  private checkAlerts(): void {
    // Check for stale trades (no trades in last 30 minutes during market hours)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentTrades = this.trades.filter(t => t.timestamp > thirtyMinutesAgo);
    
    if (recentTrades.length === 0 && this.metrics.elapsedTime > 1800) { // 30 minutes elapsed
      this.recordAlert({
        level: 'WARNING',
        category: 'TRADE',
        message: 'No trades executed in the last 30 minutes',
      });
    }

    // Check error rate
    const recentErrors = this.trades.filter(t => 
      t.status === 'FAILED' && t.timestamp > new Date(Date.now() - 60 * 60 * 1000)
    );
    
    const errorRate = this.trades.length > 0 ? (recentErrors.length / this.trades.length) * 100 : 0;
    if (errorRate > 20) { // 20% error rate threshold
      this.recordAlert({
        level: 'ERROR',
        category: 'SYSTEM',
        message: `High error rate: ${errorRate.toFixed(1)}%`,
      });
    }
  }

  private async logMetrics(): Promise<void> {
    const logEntry = JSON.stringify({
      timestamp: this.metrics.currentTime.toISOString(),
      ...this.metrics,
    }) + '\n';

    try {
      await appendFile(this.metricsFile, logEntry);
    } catch (error) {
      consola.error('Failed to log metrics:', error);
    }
  }

  private async logTrade(trade: TradeEvent): Promise<void> {
    const logEntry = JSON.stringify({
      ...trade,
      timestamp: trade.timestamp.toISOString(),
    }) + '\n';

    try {
      await appendFile(this.tradesFile, logEntry);
    } catch (error) {
      consola.error('Failed to log trade:', error);
    }
  }

  private async logAlert(alert: SystemAlert): Promise<void> {
    const logEntry = JSON.stringify({
      ...alert,
      timestamp: alert.timestamp.toISOString(),
    }) + '\n';

    try {
      await appendFile(this.alertsFile, logEntry);
    } catch (error) {
      consola.error('Failed to log alert:', error);
    }
  }

  public getMetrics(): CompetitionMetrics {
    return { ...this.metrics };
  }

  public getRecentTrades(count: number = 10): TradeEvent[] {
    return this.trades.slice(-count);
  }

  public getActiveAlerts(): SystemAlert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  public acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      consola.info(`✅ Alert acknowledged: ${alert.message}`);
    }
  }

  public generateReport(): string {
    const uptime = Math.floor(this.metrics.elapsedTime / 3600);
    const uptimeMinutes = Math.floor((this.metrics.elapsedTime % 3600) / 60);
    
    return `
📊 Competition Performance Report
================================
⏱️  Runtime: ${uptime}h ${uptimeMinutes}m
💰 Current Balance: $${this.metrics.currentBalance.toFixed(2)}
📈 Total P&L: ${this.metrics.totalPnL >= 0 ? '+' : ''}$${this.metrics.totalPnL.toFixed(2)} (${this.metrics.totalPnLPercent.toFixed(2)}%)
📉 Max Drawdown: ${this.metrics.maxDrawdown.toFixed(2)}%
🎯 Win Rate: ${this.metrics.winRate.toFixed(1)}%
📊 Total Trades: ${this.metrics.totalTrades} (${this.metrics.successfulTrades} successful)
⚡ Trades/Hour: ${this.metrics.tradesPerHour.toFixed(1)}
💹 Total Volume: $${this.metrics.totalVolume.toFixed(2)}

🧠 Strategy Performance:
${Object.entries(this.metrics.strategyPerformance)
  .map(([strategy, perf]) => 
    `   ${strategy}: ${perf.trades} trades, $${perf.pnl.toFixed(2)} P&L, ${perf.winRate.toFixed(1)}% wins`
  ).join('\n')}

🚨 Active Alerts: ${this.getActiveAlerts().length}
    `;
  }

  public stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    consola.info('🛑 Competition monitoring stopped');
    consola.info(this.generateReport());
  }
}

export default CompetitionMonitor;