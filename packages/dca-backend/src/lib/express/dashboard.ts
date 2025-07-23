/**
 * Dashboard API Routes - Production Trading Data
 * Connects to live VincentMultiAgentSystem for real-time metrics
 */

import { Request, Response } from 'express';
import { VincentMultiAgentSystem } from '../agents/vincentMultiAgentSystem';
import { serviceLogger } from '../logger';

// Global reference to running trading system
let globalTradingSystem: VincentMultiAgentSystem | null = null;

export const setTradingSystemReference = (system: VincentMultiAgentSystem) => {
  globalTradingSystem = system;
  serviceLogger.info('Dashboard API connected to live trading system');
};

export const handleAgentStatusRoute = async (req: Request, res: Response) => {
  try {
    if (!globalTradingSystem) {
      return res.status(503).json({
        error: 'Trading system not running',
        status: 'offline'
      });
    }

    const agentStatuses = globalTradingSystem.getAgentStatuses();
    const systemMetrics = globalTradingSystem.getSystemMetrics();

    res.json({
      timestamp: Date.now(),
      status: 'online',
      agents: {
        momentum: {
          active: agentStatuses.momentum?.isActive || false,
          currentSignal: agentStatuses.momentum?.currentSignal || 'HOLD',
          position: agentStatuses.momentum?.currentPosition || 0,
          pnl: agentStatuses.momentum?.unrealizedPnL || 0,
          trades: agentStatuses.momentum?.totalTrades || 0,
          winRate: agentStatuses.momentum?.winRate || 0
        },
        arbitrage: {
          active: agentStatuses.arbitrage?.isActive || false,
          currentSignal: agentStatuses.arbitrage?.currentSignal || 'HOLD',
          position: agentStatuses.arbitrage?.currentPosition || 0,
          pnl: agentStatuses.arbitrage?.unrealizedPnL || 0,
          trades: agentStatuses.arbitrage?.totalTrades || 0,
          winRate: agentStatuses.arbitrage?.winRate || 0
        },
        meanReversion: {
          active: agentStatuses.meanReversion?.isActive || false,
          currentSignal: agentStatuses.meanReversion?.currentSignal || 'HOLD',
          position: agentStatuses.meanReversion?.currentPosition || 0,
          pnl: agentStatuses.meanReversion?.unrealizedPnL || 0,
          trades: agentStatuses.meanReversion?.totalTrades || 0,
          winRate: agentStatuses.meanReversion?.winRate || 0
        }
      },
      systemUptime: systemMetrics?.systemUptime || 0,
      totalAgents: 3,
      activeAgents: Object.values(agentStatuses).filter(agent => agent?.isActive).length
    });

  } catch (error) {
    serviceLogger.error('Dashboard agent status error:', error);
    res.status(500).json({ error: 'Failed to get agent status' });
  }
};

export const handlePerformanceMetricsRoute = async (req: Request, res: Response) => {
  try {
    if (!globalTradingSystem) {
      return res.status(503).json({
        error: 'Trading system not running',
        totalValue: 0,
        totalPnL: 0
      });
    }

    const metrics = globalTradingSystem.getSystemMetrics();
    const portfolioSnapshot = globalTradingSystem.getPortfolioSnapshot();

    res.json({
      timestamp: Date.now(),
      portfolio: {
        totalValue: metrics?.totalValue || 0,
        totalPnL: metrics?.totalPnL || 0,
        totalReturn: metrics?.totalReturn || 0,
        sharpeRatio: metrics?.sharpeRatio || 0,
        maxDrawdown: metrics?.maxDrawdown || 0,
        winRate: metrics?.winRate || 0,
        totalTrades: metrics?.totalTrades || 0
      },
      positions: portfolioSnapshot || [],
      performance: {
        daily: {
          pnl: metrics?.dailyPnL || 0,
          trades: metrics?.dailyTrades || 0,
          winRate: metrics?.dailyWinRate || 0
        },
        weekly: {
          pnl: metrics?.weeklyPnL || 0,
          trades: metrics?.weeklyTrades || 0,
          winRate: metrics?.weeklyWinRate || 0
        }
      }
    });

  } catch (error) {
    serviceLogger.error('Dashboard performance metrics error:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
};

export const handleVincentPolicyStatusRoute = async (req: Request, res: Response) => {
  try {
    if (!globalTradingSystem) {
      return res.status(503).json({
        error: 'Trading system not running',
        policyCompliant: false
      });
    }

    const metrics = globalTradingSystem.getSystemMetrics();
    const vincentMetrics = metrics?.vincentMetrics;

    res.json({
      timestamp: Date.now(),
      policyCompliance: {
        spendingLimits: {
          daily: {
            spent: vincentMetrics?.totalSpending.daily || 0,
            limit: 500,
            remaining: Math.max(0, 500 - (vincentMetrics?.totalSpending.daily || 0)),
            compliant: (vincentMetrics?.totalSpending.daily || 0) <= 500
          },
          monthly: {
            spent: vincentMetrics?.totalSpending.monthly || 0,
            limit: 5000,
            remaining: Math.max(0, 5000 - (vincentMetrics?.totalSpending.monthly || 0)),
            compliant: (vincentMetrics?.totalSpending.monthly || 0) <= 5000
          }
        },
        riskLimits: {
          maxDrawdown: {
            current: metrics?.maxDrawdown || 0,
            limit: 0.15,
            compliant: (metrics?.maxDrawdown || 0) <= 0.15
          },
          dailyLoss: {
            current: Math.abs(metrics?.dailyPnL || 0) / (metrics?.totalValue || 10000),
            limit: 0.05,
            compliant: Math.abs(metrics?.dailyPnL || 0) / (metrics?.totalValue || 10000) <= 0.05
          }
        }
      },
      violations: vincentMetrics?.policyViolations || 0,
      approvalRequests: vincentMetrics?.approvalRequests || 0,
      walletAddresses: vincentMetrics?.walletAddresses || [],
      toolsUsed: Object.fromEntries(vincentMetrics?.toolsUsed || [])
    });

  } catch (error) {
    serviceLogger.error('Dashboard Vincent policy status error:', error);
    res.status(500).json({ error: 'Failed to get Vincent policy status' });
  }
};

export const handleRecentTradesRoute = async (req: Request, res: Response) => {
  try {
    if (!globalTradingSystem) {
      return res.status(503).json({
        error: 'Trading system not running',
        trades: []
      });
    }

    const recentTrades = globalTradingSystem.getRecentTrades(20); // Last 20 trades

    res.json({
      timestamp: Date.now(),
      trades: recentTrades.map(trade => ({
        id: trade.id,
        timestamp: trade.timestamp,
        agent: trade.agentType,
        pair: trade.symbol,
        side: trade.side,
        size: trade.quantity,
        price: trade.price,
        pnl: trade.realizedPnL || 0,
        status: trade.status
      }))
    });

  } catch (error) {
    serviceLogger.error('Dashboard recent trades error:', error);
    res.status(500).json({ error: 'Failed to get recent trades' });
  }
};

export const handleMarketDataRoute = async (req: Request, res: Response) => {
  try {
    if (!globalTradingSystem) {
      return res.status(503).json({
        error: 'Trading system not running',
        marketData: {}
      });
    }

    const marketData = globalTradingSystem.getCurrentMarketData();

    res.json({
      timestamp: Date.now(),
      markets: {
        'BTC/USDT': {
          price: marketData['BTC/USDT']?.price || 0,
          change24h: marketData['BTC/USDT']?.priceChange24h || 0,
          volume: marketData['BTC/USDT']?.volume24h || 0,
          lastUpdate: marketData['BTC/USDT']?.timestamp || Date.now()
        },
        'ETH/USDT': {
          price: marketData['ETH/USDT']?.price || 0,
          change24h: marketData['ETH/USDT']?.priceChange24h || 0,
          volume: marketData['ETH/USDT']?.volume24h || 0,
          lastUpdate: marketData['ETH/USDT']?.timestamp || Date.now()
        },
        'SOL/USDT': {
          price: marketData['SOL/USDT']?.price || 0,
          change24h: marketData['SOL/USDT']?.priceChange24h || 0,
          volume: marketData['SOL/USDT']?.volume24h || 0,
          lastUpdate: marketData['SOL/USDT']?.timestamp || Date.now()
        }
      }
    });

  } catch (error) {
    serviceLogger.error('Dashboard market data error:', error);
    res.status(500).json({ error: 'Failed to get market data' });
  }
};