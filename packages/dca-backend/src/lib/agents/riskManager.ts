/**
 * Risk Manager Agent
 * Specialized agent for real-time risk monitoring and portfolio protection
 */

import { BaseAgent, AgentConfig, AgentMessage } from './baseAgent';
import { MarketData, TradingSignal } from '../strategies/index';
import consola from 'consola';

interface RiskLimits {
  maxDrawdown: number;          // Maximum portfolio drawdown
  maxPositionSize: number;      // Maximum position as % of portfolio
  maxDailyLoss: number;         // Maximum daily loss amount
  maxVolatility: number;        // Maximum portfolio volatility
  maxConcentration: number;     // Maximum concentration in single asset
  stopLossThreshold: number;    // Individual position stop loss
}

interface RiskMetrics {
  currentDrawdown: number;
  dailyPnL: number;
  portfolioVolatility: number;
  concentrationRisk: number;
  valueAtRisk: number;          // VaR 95%
  sharpeRatio: number;
  maxDrawdownToday: number;
  positionSizes: Map<string, number>;
}

interface RiskAlert {
  type: 'DRAWDOWN' | 'POSITION_SIZE' | 'VOLATILITY' | 'CONCENTRATION' | 'STOP_LOSS' | 'VAR_BREACH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: number;
  action: 'MONITOR' | 'REDUCE' | 'STOP' | 'EMERGENCY_HALT';
  affectedAssets?: string[];
}

interface StressTestScenario {
  name: string;
  priceShock: number;           // Price change %
  volumeShock: number;          // Volume change %
  correlationShift: number;     // Correlation change
  expectedLoss: number;         // Expected portfolio loss
}

export class RiskManager extends BaseAgent {
  private riskLimits: RiskLimits;
  private riskMetrics: RiskMetrics;
  private alerts: RiskAlert[] = [];
  private positionHistory: Map<string, number[]> = new Map();
  private pnlHistory: number[] = [];
  private initialPortfolioValue: number = 0;
  private todayStartValue: number = 0;
  private highWaterMark: number = 0;
  
  // Risk monitoring parameters
  private monitoringFrequency: number = 5000; // 5 seconds
  private alertCooldown: Map<string, number> = new Map();
  private emergencyHaltActive: boolean = false;

  constructor(config: AgentConfig) {
    super(config);
    
    this.riskLimits = {
      maxDrawdown: 0.15,          // 15%
      maxPositionSize: 0.10,      // 10%
      maxDailyLoss: 0.05,         // 5%
      maxVolatility: 0.25,        // 25% annualized
      maxConcentration: 0.30,     // 30%
      stopLossThreshold: 0.02     // 2%
    };

    this.riskMetrics = {
      currentDrawdown: 0,
      dailyPnL: 0,
      portfolioVolatility: 0,
      concentrationRisk: 0,
      valueAtRisk: 0,
      sharpeRatio: 0,
      maxDrawdownToday: 0,
      positionSizes: new Map()
    };

    consola.info(`🛡️ Risk Manager initialized - Portfolio Protection Active`);
    this.startRiskMonitoring();
  }

  async analyzeMarket(data: MarketData): Promise<TradingSignal> {
    try {
      // Risk manager doesn't generate trading signals, only risk assessments
      await this.updateRiskMetrics(data);
      
      const riskAssessment = await this.assessCurrentRisk();
      
      if (riskAssessment.severity === 'CRITICAL') {
        return {
          action: 'SELL', // Emergency liquidation signal
          confidence: 0.95,
          amount: 0, // Will be calculated by coordinator
          reason: `EMERGENCY: ${riskAssessment.message}`,
          strategy: 'risk-emergency'
        };
      }
      
      // Default to hold - risk manager monitors, doesn't trade
      return {
        action: 'HOLD',
        confidence: 0.1,
        amount: 0,
        reason: `Risk monitoring: ${riskAssessment.severity} risk level`,
        strategy: 'risk-monitoring'
      };

    } catch (error) {
      consola.error('Risk Manager analysis failed:', error);
      return {
        action: 'HOLD',
        confidence: 0,
        amount: 0,
        reason: `Risk analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        strategy: 'risk-error'
      };
    }
  }

  async processMessage(message: AgentMessage): Promise<void> {
    switch (message.type) {
      case 'POSITION_UPDATE':
        await this.handlePositionUpdate(message);
        break;
      case 'COORDINATION':
        await this.handleCoordinationMessage(message);
        break;
      case 'MARKET_UPDATE':
        await this.handleMarketUpdate(message);
        break;
      default:
        consola.debug(`Risk Manager received unhandled message type: ${message.type}`);
    }
  }

  validateSignal(signal: TradingSignal): boolean {
    // Risk manager validates all signals for risk compliance
    if (signal.action === 'HOLD') return true;
    
    // Check if we're in emergency halt
    if (this.emergencyHaltActive && signal.action === 'BUY') {
      return false;
    }
    
    // Position size validation
    if (signal.amount > this.riskLimits.maxPositionSize * 10000) { // Assume 10k portfolio
      return false;
    }
    
    return true;
  }

  private async updateRiskMetrics(data: MarketData): Promise<void> {
    // Update portfolio value tracking
    const currentValue = this.calculateCurrentPortfolioValue();
    
    if (this.initialPortfolioValue === 0) {
      this.initialPortfolioValue = currentValue;
      this.todayStartValue = currentValue;
      this.highWaterMark = currentValue;
    }
    
    // Update high water mark
    if (currentValue > this.highWaterMark) {
      this.highWaterMark = currentValue;
    }
    
    // Calculate drawdown
    this.riskMetrics.currentDrawdown = (this.highWaterMark - currentValue) / this.highWaterMark;
    this.riskMetrics.maxDrawdownToday = Math.max(this.riskMetrics.maxDrawdownToday, this.riskMetrics.currentDrawdown);
    
    // Calculate daily P&L
    this.riskMetrics.dailyPnL = (currentValue - this.todayStartValue) / this.todayStartValue;
    
    // Add to P&L history
    this.pnlHistory.push(this.riskMetrics.dailyPnL);
    if (this.pnlHistory.length > 100) {
      this.pnlHistory = this.pnlHistory.slice(-100);
    }
    
    // Calculate volatility
    this.riskMetrics.portfolioVolatility = this.calculateVolatility();
    
    // Calculate VaR
    this.riskMetrics.valueAtRisk = this.calculateVaR();
    
    // Calculate Sharpe ratio
    this.riskMetrics.sharpeRatio = this.calculateSharpeRatio();
    
    // Update concentration risk
    this.riskMetrics.concentrationRisk = this.calculateConcentrationRisk();
  }

  private calculateCurrentPortfolioValue(): number {
    // This would integrate with actual portfolio tracking
    // For now, simulate based on position history
    return 10000; // Placeholder
  }

  private calculateVolatility(): number {
    if (this.pnlHistory.length < 10) return 0;
    
    const returns = this.pnlHistory.slice(-20); // Last 20 periods
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    // Annualize (assuming daily data)
    return Math.sqrt(variance * 252);
  }

  private calculateVaR(confidence: number = 0.05): number {
    if (this.pnlHistory.length < 20) return 0;
    
    const sortedReturns = [...this.pnlHistory].sort((a, b) => a - b);
    const index = Math.floor(sortedReturns.length * confidence);
    
    return Math.abs(sortedReturns[index] || 0);
  }

  private calculateSharpeRatio(): number {
    if (this.pnlHistory.length < 10) return 0;
    
    const returns = this.pnlHistory.slice(-30);
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const volatility = this.calculateVolatility();
    
    return volatility > 0 ? (avgReturn / volatility) * Math.sqrt(252) : 0;
  }

  private calculateConcentrationRisk(): number {
    if (this.riskMetrics.positionSizes.size === 0) return 0;
    
    const positions = Array.from(this.riskMetrics.positionSizes.values());
    const totalValue = positions.reduce((sum, pos) => sum + pos, 0);
    
    if (totalValue === 0) return 0;
    
    // Calculate Herfindahl-Hirschman Index
    const hhi = positions.reduce((sum, pos) => {
      const weight = pos / totalValue;
      return sum + (weight * weight);
    }, 0);
    
    return hhi;
  }

  private async assessCurrentRisk(): Promise<RiskAlert> {
    const alerts: RiskAlert[] = [];
    
    // Drawdown check
    if (this.riskMetrics.currentDrawdown > this.riskLimits.maxDrawdown) {
      alerts.push({
        type: 'DRAWDOWN',
        severity: 'CRITICAL',
        message: `Portfolio drawdown ${(this.riskMetrics.currentDrawdown * 100).toFixed(2)}% exceeds limit ${(this.riskLimits.maxDrawdown * 100).toFixed(2)}%`,
        timestamp: Date.now(),
        action: 'EMERGENCY_HALT'
      });
    } else if (this.riskMetrics.currentDrawdown > this.riskLimits.maxDrawdown * 0.8) {
      alerts.push({
        type: 'DRAWDOWN',
        severity: 'HIGH',
        message: `Portfolio drawdown ${(this.riskMetrics.currentDrawdown * 100).toFixed(2)}% approaching limit`,
        timestamp: Date.now(),
        action: 'REDUCE'
      });
    }
    
    // Daily loss check
    if (this.riskMetrics.dailyPnL < -this.riskLimits.maxDailyLoss) {
      alerts.push({
        type: 'STOP_LOSS',
        severity: 'HIGH',
        message: `Daily loss ${(this.riskMetrics.dailyPnL * 100).toFixed(2)}% exceeds limit ${(this.riskLimits.maxDailyLoss * 100).toFixed(2)}%`,
        timestamp: Date.now(),
        action: 'STOP'
      });
    }
    
    // Volatility check
    if (this.riskMetrics.portfolioVolatility > this.riskLimits.maxVolatility) {
      alerts.push({
        type: 'VOLATILITY',
        severity: 'MEDIUM',
        message: `Portfolio volatility ${(this.riskMetrics.portfolioVolatility * 100).toFixed(2)}% exceeds limit`,
        timestamp: Date.now(),
        action: 'REDUCE'
      });
    }
    
    // Concentration check
    if (this.riskMetrics.concentrationRisk > this.riskLimits.maxConcentration) {
      alerts.push({
        type: 'CONCENTRATION',
        severity: 'MEDIUM',
        message: `Portfolio concentration risk ${(this.riskMetrics.concentrationRisk * 100).toFixed(2)}% too high`,
        timestamp: Date.now(),
        action: 'REDUCE'
      });
    }
    
    // VaR check
    if (this.riskMetrics.valueAtRisk > 0.1) { // 10% VaR threshold
      alerts.push({
        type: 'VAR_BREACH',
        severity: 'HIGH',
        message: `Value at Risk ${(this.riskMetrics.valueAtRisk * 100).toFixed(2)}% too high`,
        timestamp: Date.now(),
        action: 'REDUCE'
      });
    }
    
    // Return most severe alert or create low-risk alert
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');
    const highAlerts = alerts.filter(a => a.severity === 'HIGH');
    const mediumAlerts = alerts.filter(a => a.severity === 'MEDIUM');
    
    if (criticalAlerts.length > 0) {
      await this.triggerEmergencyHalt();
      return criticalAlerts[0];
    } else if (highAlerts.length > 0) {
      await this.broadcastRiskAlert(highAlerts[0]);
      return highAlerts[0];
    } else if (mediumAlerts.length > 0) {
      await this.broadcastRiskAlert(mediumAlerts[0]);
      return mediumAlerts[0];
    }
    
    return {
      type: 'CONCENTRATION', // Default type
      severity: 'LOW',
      message: 'All risk metrics within acceptable limits',
      timestamp: Date.now(),
      action: 'MONITOR'
    };
  }

  private async triggerEmergencyHalt(): Promise<void> {
    if (this.emergencyHaltActive) return;
    
    this.emergencyHaltActive = true;
    consola.error('🚨 EMERGENCY HALT TRIGGERED - All trading stopped');
    
    // Send emergency halt to coordinator
    await this.sendMessage('COORDINATOR', 'RISK_ALERT', {
      alertType: 'EMERGENCY_HALT',
      severity: 'CRITICAL',
      data: {
        reason: 'Risk limits breached',
        metrics: this.riskMetrics,
        timestamp: Date.now()
      }
    }, 'CRITICAL');
  }

  private async broadcastRiskAlert(alert: RiskAlert): Promise<void> {
    // Check cooldown to avoid spam
    const alertKey = `${alert.type}_${alert.severity}`;
    const lastAlert = this.alertCooldown.get(alertKey) || 0;
    const now = Date.now();
    
    if (now - lastAlert < 60000) return; // 1 minute cooldown
    
    this.alertCooldown.set(alertKey, now);
    this.alerts.push(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
    
    consola.warn(`⚠️ Risk Alert: ${alert.message}`);
    
    // Send to coordinator
    await this.sendMessage('COORDINATOR', 'RISK_ALERT', {
      alertType: alert.type,
      severity: alert.severity,
      data: alert
    }, alert.severity === 'HIGH' ? 'HIGH' : 'MEDIUM');
  }

  private startRiskMonitoring(): void {
    setInterval(async () => {
      if (this.marketData.length > 0) {
        const latestData = this.marketData[this.marketData.length - 1];
        await this.updateRiskMetrics(latestData);
        await this.assessCurrentRisk();
      }
    }, this.monitoringFrequency);
    
    consola.info('🔍 Risk monitoring started');
  }

  private async handlePositionUpdate(message: AgentMessage): Promise<void> {
    const { symbol, quantity, value } = message.data;
    
    // Update position tracking
    this.riskMetrics.positionSizes.set(symbol, value);
    
    // Check individual position risk
    const portfolioValue = this.calculateCurrentPortfolioValue();
    const positionWeight = value / portfolioValue;
    
    if (positionWeight > this.riskLimits.maxPositionSize) {
      await this.broadcastRiskAlert({
        type: 'POSITION_SIZE',
        severity: 'HIGH',
        message: `Position ${symbol} (${(positionWeight * 100).toFixed(2)}%) exceeds size limit`,
        timestamp: Date.now(),
        action: 'REDUCE',
        affectedAssets: [symbol]
      });
    }
  }

  private async handleCoordinationMessage(message: AgentMessage): Promise<void> {
    const { data } = message;
    
    if (data.type === 'RISK_LIMITS_UPDATE') {
      // Update risk limits dynamically
      this.riskLimits = { ...this.riskLimits, ...data.newLimits };
      consola.info('🛡️ Risk limits updated');
    } else if (data.type === 'EMERGENCY_RESET') {
      // Reset emergency halt
      this.emergencyHaltActive = false;
      consola.info('🔄 Emergency halt reset');
    }
  }

  private async handleMarketUpdate(message: AgentMessage): Promise<void> {
    const { data } = message;
    
    if (data.regime) {
      // Adjust risk limits based on market regime
      if (data.regime.volatility === 'HIGH') {
        this.riskLimits.maxPositionSize *= 0.8; // Reduce position sizes
        this.riskLimits.stopLossThreshold *= 0.8; // Tighter stops
      } else if (data.regime.volatility === 'LOW') {
        this.riskLimits.maxPositionSize *= 1.1; // Allow larger positions
      }
    }
  }

  // Stress testing functionality
  async runStressTest(scenarios: StressTestScenario[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    
    for (const scenario of scenarios) {
      const portfolioValue = this.calculateCurrentPortfolioValue();
      const stressedValue = portfolioValue * (1 + scenario.priceShock);
      const loss = (portfolioValue - stressedValue) / portfolioValue;
      
      results.set(scenario.name, loss);
      
      if (loss > this.riskLimits.maxDrawdown) {
        consola.warn(`🧪 Stress test "${scenario.name}" fails risk limits: ${(loss * 100).toFixed(2)}% loss`);
      }
    }
    
    return results;
  }

  // Public API methods
  getRiskMetrics(): RiskMetrics {
    return { ...this.riskMetrics };
  }

  getRiskLimits(): RiskLimits {
    return { ...this.riskLimits };
  }

  getRecentAlerts(count: number = 10): RiskAlert[] {
    return this.alerts.slice(-count);
  }

  updateRiskLimits(newLimits: Partial<RiskLimits>): void {
    this.riskLimits = { ...this.riskLimits, ...newLimits };
    consola.info('🛡️ Risk limits updated manually');
  }

  isEmergencyHaltActive(): boolean {
    return this.emergencyHaltActive;
  }

  resetEmergencyHalt(): void {
    this.emergencyHaltActive = false;
    consola.info('🔄 Emergency halt manually reset');
  }

  // Risk reporting
  generateRiskReport(): any {
    return {
      timestamp: Date.now(),
      riskMetrics: this.riskMetrics,
      riskLimits: this.riskLimits,
      recentAlerts: this.alerts.slice(-10),
      emergencyHaltActive: this.emergencyHaltActive,
      portfolioHealth: {
        drawdownStatus: this.riskMetrics.currentDrawdown < this.riskLimits.maxDrawdown * 0.5 ? 'HEALTHY' : 
                       this.riskMetrics.currentDrawdown < this.riskLimits.maxDrawdown * 0.8 ? 'CAUTION' : 'WARNING',
        volatilityStatus: this.riskMetrics.portfolioVolatility < this.riskLimits.maxVolatility * 0.8 ? 'HEALTHY' : 'HIGH',
        concentrationStatus: this.riskMetrics.concentrationRisk < this.riskLimits.maxConcentration * 0.8 ? 'HEALTHY' : 'HIGH'
      }
    };
  }
}