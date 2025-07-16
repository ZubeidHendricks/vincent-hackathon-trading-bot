/**
 * Competition Trading Engine
 * Main orchestrator for hackathon trading competition
 */

import { EventEmitter } from 'events';

import consola from 'consola';

import { getUniswapToolClient, getErc20ApprovalToolClient } from '../agenda/jobs/executeDCASwap/vincentTools';
import { RealTimeDataFeed } from '../dataFeeds/realTimeDataFeed';
import { env } from '../env';
import { MarketData, TradingSignal } from '../strategies/index';
import { StrategyManager } from '../strategies/strategyManager';



interface CompetitionConfig {
  // Maximum risk per trade as percentage of portfolio
  competitionDuration: number;
  initialBalance: number; 
  maxDrawdown: number; 
  // Maximum allowed drawdown percentage
  riskPerTrade: number; // Duration in hours
  tradingPairs: string[];
  updateFrequency: number; // How often to check for trades (ms)
}

interface TradeRecord {
  action: 'BUY' | 'SELL';
  amount: number;
  confidence: number;
  id: string;
  price: number;
  profit?: number;
  status: 'PENDING' | 'EXECUTED' | 'FAILED';
  strategy: string;
  symbol: string;
  timestamp: number;
  txHash?: string;
}

interface PortfolioSnapshot {
  cashBalance: number;
  maxDrawdown: number;
  pnl: number;
  pnlPercent: number;
  positions: Map<string, number>;
  timestamp: number;
  totalValue: number;
  tradeCount: number;
  winRate: number;
}

export class CompetitionTrader extends EventEmitter {
  private strategyManager: StrategyManager;

  private dataFeed: RealTimeDataFeed;

  private config: CompetitionConfig;
  
  private isRunning: boolean = false;

  private startTime: number = 0;

  private cashBalance: number = 0;

  private positions: Map<string, number> = new Map(); // symbol -> quantity

  private tradeHistory: TradeRecord[] = [];

  private portfolioHistory: PortfolioSnapshot[] = [];
  
  private tradingInterval: NodeJS.Timeout | null = null;

  private lastTradeTime: number = 0;

  private readonly MIN_TRADE_INTERVAL = 30000; // 30 seconds minimum between trades

  constructor(config?: Partial<CompetitionConfig>) {
    super();
    
    this.config = {
      // 5% risk per trade
competitionDuration: 24, 
      
initialBalance: 10000, 
      
// $10,000 starting balance
maxDrawdown: 0.15, 
      // 15% max drawdown
riskPerTrade: 0.05, // 24 hours
      tradingPairs: ['WETH', 'WBTC', 'UNI', 'LINK', 'AAVE'],
      updateFrequency: 10000, // Check every 10 seconds
      ...config
    };
    
    this.strategyManager = new StrategyManager();
    this.dataFeed = new RealTimeDataFeed();
    this.cashBalance = this.config.initialBalance;
    
    this.setupEventListeners();
    consola.info('Competition Trader initialized', this.config);
  }

  private setupEventListeners(): void {
    this.dataFeed.on('priceUpdate', ({ data, symbol }) => {
      this.handlePriceUpdate(symbol, data);
    });
  }

  async startCompetition(): Promise<void> {
    if (this.isRunning) {
      consola.warn('Competition already running');
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    
    consola.info('🚀 Starting competition trading!');
    consola.info(`Initial balance: $${this.cashBalance.toFixed(2)}`);
    consola.info(`Trading pairs: ${this.config.tradingPairs.join(', ')}`);
    consola.info(`Duration: ${this.config.competitionDuration} hours`);

    // Test data feed connection
    const connectionOk = await this.dataFeed.testConnection();
    if (!connectionOk) {
      throw new Error('Failed to connect to data feeds');
    }

    // Start trading loop
    this.tradingInterval = setInterval(() => {
      this.executeTradingCycle();
    }, this.config.updateFrequency);

    // Schedule competition end
    setTimeout(() => {
      this.stopCompetition();
    }, this.config.competitionDuration * 60 * 60 * 1000);

    this.emit('competitionStarted', { config: this.config, startTime: this.startTime });
  }

  async stopCompetition(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
      this.tradingInterval = null;
    }

    this.dataFeed.stop();

    const finalSnapshot = this.takePortfolioSnapshot();
    const duration = (Date.now() - this.startTime) / 1000 / 60 / 60; // hours
    
    consola.info('🏁 Competition ended!');
    consola.info(`Duration: ${duration.toFixed(2)} hours`);
    consola.info(`Final portfolio value: $${finalSnapshot.totalValue.toFixed(2)}`);
    consola.info(`Total P&L: $${finalSnapshot.pnl.toFixed(2)} (${finalSnapshot.pnlPercent.toFixed(2)}%)`);
    consola.info(`Max drawdown: ${(finalSnapshot.maxDrawdown * 100).toFixed(2)}%`);
    consola.info(`Win rate: ${(finalSnapshot.winRate * 100).toFixed(1)}%`);
    consola.info(`Total trades: ${finalSnapshot.tradeCount}`);

    this.emit('competitionEnded', { 
      duration, 
      finalSnapshot, 
      tradeHistory: this.tradeHistory 
    });
  }

  private async executeTradingCycle(): Promise<void> {
    try {
      if (!this.isRunning) return;

      // Check risk limits
      const currentSnapshot = this.takePortfolioSnapshot();
      if (currentSnapshot.maxDrawdown > this.config.maxDrawdown) {
        consola.warn(`⚠️  Maximum drawdown exceeded: ${(currentSnapshot.maxDrawdown * 100).toFixed(2)}%`);
        this.stopCompetition();
        return;
      }

      // Check each trading pair
      for (const symbol of this.config.tradingPairs) {
        await this.analyzeAndTrade(symbol);
      }

      // Take periodic portfolio snapshot
      if (this.portfolioHistory.length === 0 || Date.now() - this.portfolioHistory[this.portfolioHistory.length - 1].timestamp > 60000) {
        this.portfolioHistory.push(currentSnapshot);
      }

    } catch (error) {
      consola.error('Trading cycle error:', error);
    }
  }

  private async analyzeAndTrade(symbol: string): Promise<void> {
    try {
      const currentData = this.dataFeed.getCurrentPrice(symbol);
      if (!currentData) {
        consola.debug(`No price data available for ${symbol}`);
        return;
      }

      // Get trading signal from strategy manager
      const portfolioSignal = await this.strategyManager.analyzeMarket(currentData);
      
      if (portfolioSignal.finalAction === 'HOLD' || portfolioSignal.confidence < 0.3) {
        return; // Not confident enough to trade
      }

      // Check minimum time between trades
      if (Date.now() - this.lastTradeTime < this.MIN_TRADE_INTERVAL) {
        return;
      }

      // Calculate position size based on risk management
      const positionSize = this.calculatePositionSize(
        portfolioSignal.totalAmount,
        portfolioSignal.confidence,
        currentData.price
      );

      if (positionSize <= 0) {
        return; // No valid position size
      }

      // Execute the trade
      await this.executeTrade({
        symbol,
        action: portfolioSignal.finalAction,
        amount: positionSize,
        confidence: portfolioSignal.confidence,
        price: currentData.price,
        reasoning: portfolioSignal.reasoning,
        strategy: 'multi-strategy'
      });

    } catch (error) {
      consola.error(`Analysis failed for ${symbol}:`, error);
    }
  }

  private calculatePositionSize(signalAmount: number, confidence: number, price: number): number {
    const currentValue = this.getPortfolioValue();
    const maxRiskAmount = currentValue * this.config.riskPerTrade;
    
    // Scale position size by confidence
    const confidenceAdjustedAmount = Math.min(signalAmount, maxRiskAmount) * confidence;
    
    // Convert USD amount to quantity
    const quantity = confidenceAdjustedAmount / price;
    
    // Ensure we have enough cash (for buys) or position (for sells)
    if (signalAmount > 0) { // BUY
      return Math.min(quantity, this.cashBalance / price * 0.95); // Leave 5% buffer
    }  // SELL
      const currentPosition = this.positions.get(symbol) || 0;
      return Math.min(Math.abs(quantity), currentPosition);
    
  }

  private async executeTrade(tradeRequest: {
    action: 'BUY' | 'SELL';
    amount: number;
    confidence: number;
    price: number;
    reasoning: string;
    strategy: string;
    symbol: string;
  }): Promise<void> {
    const tradeId = this.generateTradeId();
    
    const trade: TradeRecord = {
      action: tradeRequest.action,
      amount: tradeRequest.amount,
      confidence: tradeRequest.confidence,
      id: tradeId,
      price: tradeRequest.price,
      status: 'PENDING',
      strategy: tradeRequest.strategy,
      symbol: tradeRequest.symbol,
      timestamp: Date.now()
    };

    this.tradeHistory.push(trade);
    this.lastTradeTime = Date.now();

    consola.info(`🔄 Executing ${trade.action}: ${trade.amount.toFixed(4)} ${trade.symbol} @ $${trade.price.toFixed(4)} (${(trade.confidence * 100).toFixed(1)}% confidence)`);

    try {
      // For simulation, we'll immediately execute the trade
      // In production, this would call Vincent AI tools for actual execution
      await this.simulateTradeExecution(trade);
      
      trade.status = 'EXECUTED';
      trade.txHash = `0x${Math.random().toString(16).slice(2, 10)}...`; // Mock tx hash
      
      // Update portfolio
      this.updatePortfolioAfterTrade(trade);
      
      consola.info(`✅ Trade executed: ${trade.id} - ${trade.txHash}`);
      this.emit('tradeExecuted', trade);

    } catch (error) {
      trade.status = 'FAILED';
      consola.error(`❌ Trade failed: ${trade.id}`, error);
      this.emit('tradeFailed', { error, trade });
    }
  }

  private async simulateTradeExecution(trade: TradeRecord): Promise<void> {
    // Simulate network latency and potential failures
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
    
    // Simulate 5% chance of trade failure
    if (Math.random() < 0.05) {
      throw new Error('Simulated trade execution failure');
    }
    
    // Simulate slippage (0-0.5%)
    const slippage = Math.random() * 0.005;
    trade.price *= (1 + (trade.action === 'BUY' ? slippage : -slippage));
  }

  private updatePortfolioAfterTrade(trade: TradeRecord): void {
    const tradeValue = trade.amount * trade.price;
    
    if (trade.action === 'BUY') {
      // Update cash balance
      this.cashBalance -= tradeValue;
      
      // Update position
      const currentPosition = this.positions.get(trade.symbol) || 0;
      this.positions.set(trade.symbol, currentPosition + trade.amount);
      
    } else { // SELL
      // Update cash balance
      this.cashBalance += tradeValue;
      
      // Update position
      const currentPosition = this.positions.get(trade.symbol) || 0;
      const newPosition = currentPosition - trade.amount;
      if (newPosition <= 0) {
        this.positions.delete(trade.symbol);
      } else {
        this.positions.set(trade.symbol, newPosition);
      }
    }
  }

  private takePortfolioSnapshot(): PortfolioSnapshot {
    const totalValue = this.getPortfolioValue();
    const pnl = totalValue - this.config.initialBalance;
    const pnlPercent = pnl / this.config.initialBalance;
    
    // Calculate max drawdown
    const allTimeHigh = this.portfolioHistory.length > 0 
      ? Math.max(...this.portfolioHistory.map(s => s.totalValue), totalValue)
      : totalValue;
    const maxDrawdown = (allTimeHigh - totalValue) / allTimeHigh;
    
    // Calculate win rate
    const completedTrades = this.tradeHistory.filter(t => t.status === 'EXECUTED');
    const winningTrades = completedTrades.filter(t => (t.profit || 0) > 0);
    const winRate = completedTrades.length > 0 ? winningTrades.length / completedTrades.length : 0;

    return {
      maxDrawdown,
      pnl,
      pnlPercent,
      totalValue,
      winRate,
      cashBalance: this.cashBalance,
      positions: new Map(this.positions),
      timestamp: Date.now(),
      tradeCount: completedTrades.length
    };
  }

  private getPortfolioValue(): number {
    let totalValue = this.cashBalance;
    
    for (const [symbol, quantity] of this.positions) {
      const currentPrice = this.dataFeed.getCurrentPrice(symbol);
      if (currentPrice) {
        totalValue += quantity * currentPrice.price;
      }
    }
    
    return totalValue;
  }

  private handlePriceUpdate(symbol: string, data: MarketData): void {
    // Update P&L for existing positions
    this.updatePositionPnL();
    
    // Emit portfolio update
    if (this.isRunning) {
      this.emit('portfolioUpdate', {
        symbol,
        portfolioValue: this.getPortfolioValue(),
        positions: Object.fromEntries(this.positions),
        price: data.price
      });
    }
  }

  private updatePositionPnL(): void {
    // Calculate and update P&L for each completed trade
    for (const trade of this.tradeHistory) {
      if (trade.status === 'EXECUTED' && trade.profit === undefined) {
        const currentPrice = this.dataFeed.getCurrentPrice(trade.symbol);
        if (currentPrice) {
          const pnl = trade.action === 'BUY' 
            ? (currentPrice.price - trade.price) * trade.amount
            : (trade.price - currentPrice.price) * trade.amount;
          trade.profit = pnl;
        }
      }
    }
  }

  private generateTradeId(): string {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  getPortfolioSnapshot(): PortfolioSnapshot {
    return this.takePortfolioSnapshot();
  }

  getTradeHistory(): TradeRecord[] {
    return [...this.tradeHistory];
  }

  getCurrentPositions(): Map<string, number> {
    return new Map(this.positions);
  }

  getPerformanceMetrics(): {
    maxDrawdown: number;
    profitFactor: number;
    sharpeRatio: number;
    totalReturn: number;
    winRate: number;
  } {
    const snapshot = this.takePortfolioSnapshot();
    const returns = this.portfolioHistory.map(s => s.pnlPercent);
    
    // Calculate Sharpe ratio (simplified)
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnStdDev = Math.sqrt(returns.reduce((sum, r) => sum + (r - avgReturn)**2, 0) / returns.length);
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
    
    // Calculate profit factor
    const winningTrades = this.tradeHistory.filter(t => (t.profit || 0) > 0);
    const losingTrades = this.tradeHistory.filter(t => (t.profit || 0) < 0);
    const grossProfit = winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

    return {
      profitFactor,
      sharpeRatio,
      maxDrawdown: snapshot.maxDrawdown,
      totalReturn: snapshot.pnlPercent,
      winRate: snapshot.winRate
    };
  }

  isCompetitionRunning(): boolean {
    return this.isRunning;
  }
}