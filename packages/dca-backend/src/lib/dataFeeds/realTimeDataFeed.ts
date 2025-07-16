/**
 * Real-Time Data Feed Manager
 * Aggregates price data from multiple sources for trading decisions
 */

import { EventEmitter } from 'events';

import consola from 'consola';

import { MarketData } from '../strategies/index';

interface DataSource {
  active: boolean;
  lastUpdate: number;
  name: string;
  priority: number;
  url: string;
}

interface PriceUpdate {
  price: number;
  priceChange24h: number;
  source: string;
  symbol: string;
  timestamp: number;
  volume24h: number;
}

export class RealTimeDataFeed extends EventEmitter {
  private dataSources: DataSource[] = [];

  private currentPrices: Map<string, MarketData> = new Map();

  private priceHistory: Map<string, MarketData[]> = new Map();

  private updateInterval: NodeJS.Timeout | null = null;

  private readonly UPDATE_FREQUENCY = 5000; // 5 seconds

  constructor() {
    super();
    this.initializeDataSources();
    this.startPriceUpdates();
  }

  private initializeDataSources(): void {
    this.dataSources = [
      {
        active: true,
        lastUpdate: 0,
        name: 'coingecko',
        priority: 1,
        url: 'https://api.coingecko.com/api/v3'
      },
      {
        active: true,
        lastUpdate: 0,
        name: 'coinmarketcap',
        priority: 2,
        url: 'https://pro-api.coinmarketcap.com/v1'
      },
      {
        active: true,
        lastUpdate: 0,
        name: 'binance',
        priority: 3,
        url: 'https://api.binance.com/api/v3'
      },
      {
        active: true,
        lastUpdate: 0,
        name: 'dexscreener',
        priority: 4,
        url: 'https://api.dexscreener.com/latest'
      }
    ];

    consola.info(`Initialized ${this.dataSources.length} data sources`);
  }

  private startPriceUpdates(): void {
    this.updateInterval = setInterval(async () => {
      await this.fetchPriceUpdates();
    }, this.UPDATE_FREQUENCY);

    consola.info(`Started real-time price updates every ${this.UPDATE_FREQUENCY}ms`);
  }

  private async fetchPriceUpdates(): Promise<void> {
    const symbols = ['WETH', 'USDC', 'WBTC', 'UNI', 'LINK', 'AAVE']; // Base trading pairs

    for (const symbol of symbols) {
      try {
        const priceData = await this.fetchPriceFromSources(symbol);
        if (priceData) {
          this.updatePriceData(symbol, priceData);
        }
      } catch (error) {
        consola.debug(`Failed to fetch price for ${symbol}:`, error);
      }
    }
  }

  private async fetchPriceFromSources(symbol: string): Promise<MarketData | null> {
    // Try sources in priority order
    const activeSources = this.dataSources
      .filter(s => s.active)
      .sort((a, b) => a.priority - b.priority);

    for (const source of activeSources) {
      try {
        const data = await this.fetchFromSource(source, symbol);
        if (data) {
          source.lastUpdate = Date.now();
          return data;
        }
      } catch (error) {
        consola.debug(`Source ${source.name} failed for ${symbol}:`, error);
        continue;
      }
    }

    return null;
  }

  private async fetchFromSource(source: DataSource, symbol: string): Promise<MarketData | null> {
    // Simulate fetching real price data
    // In production, this would make actual API calls to each source
    
    try {
      switch (source.name) {
        case 'coingecko':
          return this.simulateCoingeckoAPI(symbol);
        case 'binance':
          return this.simulateBinanceAPI(symbol);
        case 'dexscreener':
          return this.simulateDexScreenerAPI(symbol);
        default:
          return this.simulateGenericAPI(symbol);
      }
    } catch (error) {
      consola.debug(`API call failed for ${source.name}:`, error);
      return null;
    }
  }

  private simulateCoingeckoAPI(symbol: string): MarketData {
    // Simulate realistic price movements
    const basePrice = this.getBasePriceForSymbol(symbol);
    const volatility = 0.02; // 2% volatility
    const change = (Math.random() - 0.5) * volatility * 2;
    
    return {
      symbol,
      price: basePrice * (1 + change),
      // 1M - 11M volume
priceChange24h: change, 
      timestamp: Date.now(),
      volume24h: Math.random() * 10000000 + 1000000
    };
  }

  private simulateBinanceAPI(symbol: string): MarketData {
    const basePrice = this.getBasePriceForSymbol(symbol);
    const volatility = 0.015; // Slightly lower volatility than CoinGecko
    const change = (Math.random() - 0.5) * volatility * 2;
    
    return {
      symbol,
      price: basePrice * (1 + change),
      // Higher volume
priceChange24h: change, 
      timestamp: Date.now(),
      volume24h: Math.random() * 15000000 + 2000000
    };
  }

  private simulateDexScreenerAPI(symbol: string): MarketData {
    const basePrice = this.getBasePriceForSymbol(symbol);
    const volatility = 0.025; // Higher volatility for DEX data
    const change = (Math.random() - 0.5) * volatility * 2;
    
    return {
      symbol,
      price: basePrice * (1 + change),
      // Lower DEX volume
priceChange24h: change, 
      timestamp: Date.now(),
      volume24h: Math.random() * 5000000 + 500000
    };
  }

  private simulateGenericAPI(symbol: string): MarketData {
    const basePrice = this.getBasePriceForSymbol(symbol);
    const change = (Math.random() - 0.5) * 0.02;
    
    return {
      symbol,
      price: basePrice * (1 + change),
      priceChange24h: change,
      timestamp: Date.now(),
      volume24h: Math.random() * 8000000 + 1000000
    };
  }

  private getBasePriceForSymbol(symbol: string): number {
    // Base prices for simulation (in USD)
    const basePrices: Record<string, number> = {
      'AAVE': 85.0,
      'LINK': 15.0,
      'UNI': 7.5,
      'USDC': 1.0,
      'WBTC': 43000,
      'WETH': 2000
    };
    
    return basePrices[symbol] || 100;
  }

  private updatePriceData(symbol: string, data: MarketData): void {
    // Update current price
    this.currentPrices.set(symbol, data);
    
    // Update price history
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }
    
    const history = this.priceHistory.get(symbol)!;
    history.push(data);
    
    // Keep only last 200 data points per symbol
    if (history.length > 200) {
      history.splice(0, history.length - 200);
    }
    
    // Emit price update event
    this.emit('priceUpdate', { data, symbol });
    
    consola.debug(`Price update: ${symbol} = $${data.price.toFixed(4)} (${(data.priceChange24h * 100).toFixed(2)}%)`);
  }

  getCurrentPrice(symbol: string): MarketData | null {
    return this.currentPrices.get(symbol) || null;
  }

  getPriceHistory(symbol: string, count?: number): MarketData[] {
    const history = this.priceHistory.get(symbol) || [];
    return count ? history.slice(-count) : history;
  }

  getAllCurrentPrices(): Map<string, MarketData> {
    return new Map(this.currentPrices);
  }

  getDataSourceStatus(): DataSource[] {
    return [...this.dataSources];
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    consola.info('Stopped real-time data feed');
  }

  async testConnection(): Promise<boolean> {
    try {
      const testData = await this.fetchPriceFromSources('WETH');
      return testData !== null;
    } catch (error) {
      consola.error('Data feed connection test failed:', error);
      return false;
    }
  }
}