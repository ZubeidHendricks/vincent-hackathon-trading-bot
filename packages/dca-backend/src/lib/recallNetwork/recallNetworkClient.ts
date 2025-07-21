import { env } from '../env.js';

export interface RecallNetworkConfig {
  environment: 'sandbox' | 'production';
  apiKey: string;
  baseUrl: string;
}

export interface AgentRegistration {
  agentId: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'error';
}

export interface CompetitionData {
  competitionId: string;
  status: 'active' | 'completed' | 'pending';
  participants: string[];
  leaderboard: Array<{
    agentId: string;
    score: number;
    rank: number;
  }>;
}

/**
 * Recall Network Client for Agent Competition
 * Handles communication with both sandbox and production environments
 */
export class RecallNetworkClient {
  private config: RecallNetworkConfig;

  constructor() {
    this.config = this.getConfig();
  }

  private getConfig(): RecallNetworkConfig {
    const environment = env.RECALL_NETWORK_ENVIRONMENT;
    const apiKey = environment === 'production' 
      ? env.RECALL_NETWORK_PRODUCTION_API_KEY 
      : env.RECALL_NETWORK_SANDBOX_API_KEY;

    const baseUrl = environment === 'production'
      ? 'https://api.recall.network/v1'
      : 'https://sandbox-api.recall.network/v1';

    return {
      environment,
      apiKey,
      baseUrl,
    };
  }

  /**
   * Get current API key being used
   */
  public getCurrentApiKey(): string {
    return this.config.apiKey;
  }

  /**
   * Get current environment
   */
  public getCurrentEnvironment(): 'sandbox' | 'production' {
    return this.config.environment;
  }

  /**
   * Switch to production environment
   */
  public switchToProduction(): void {
    this.config = {
      environment: 'production',
      apiKey: env.RECALL_NETWORK_PRODUCTION_API_KEY,
      baseUrl: 'https://api.recall.network/v1',
    };
  }

  /**
   * Switch to sandbox environment
   */
  public switchToSandbox(): void {
    this.config = {
      environment: 'sandbox',
      apiKey: env.RECALL_NETWORK_SANDBOX_API_KEY,
      baseUrl: 'https://sandbox-api.recall.network/v1',
    };
  }

  /**
   * Make authenticated API request to Recall Network
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Vincent-Hackathon-Trading-Bot/1.0.0',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Recall Network API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Execute a trade on Recall Network
   * This is the main trading method based on the working API
   */
  async executeTrade(tradeParams: {
    fromToken: string;
    toToken: string;
    amount: string;
    reason?: string;
  }): Promise<any> {
    return this.makeRequest('/api/trade/execute', {
      method: 'POST',
      body: JSON.stringify(tradeParams),
    });
  }

  /**
   * Register agent with Recall Network (fallback method)
   * Note: This endpoint might not exist yet, using trade execution for verification
   */
  async registerAgent(capabilities: string[]): Promise<AgentRegistration> {
    // Since the register endpoint doesn't exist, we'll create a mock registration
    // and verify the agent through a test trade
    try {
      const testTrade = await this.executeTrade({
        fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
        toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",   // WETH
        amount: "1", // Minimal test amount
        reason: "Agent registration verification"
      });

      return {
        agentId: testTrade.transaction.agentId,
        capabilities,
        status: 'active' as const
      };
    } catch (error) {
      // If trade fails, create a mock registration for development
      return {
        agentId: `vincent-agent-${Date.now()}`,
        capabilities,
        status: 'error' as const
      };
    }
  }

  /**
   * Update agent status (mock implementation)
   */
  async updateAgentStatus(agentId: string, status: 'active' | 'inactive' | 'error'): Promise<void> {
    // Mock implementation since endpoint might not exist
    // In a real implementation, this would update the agent status
    console.log(`Agent ${agentId} status updated to: ${status}`);
  }

  /**
   * Get competition information (mock implementation)
   */
  async getCompetitionData(): Promise<CompetitionData> {
    // Mock competition data since endpoint structure is unknown
    return {
      competitionId: 'vincent-hackathon-competition',
      status: 'active' as const,
      participants: [],
      leaderboard: []
    };
  }

  /**
   * Submit trading result/performance data (via trade execution)
   */
  async submitPerformanceData(data: {
    agentId: string;
    timestamp: number;
    performance: {
      totalReturn: number;
      sharpeRatio: number;
      drawdown: number;
      trades: number;
    };
    metadata?: Record<string, any>;
  }): Promise<void> {
    // Performance tracking through trade execution
    // Each trade automatically reports performance to Recall Network
    console.log('Performance data logged:', data);
  }

  /**
   * Health check - test connection
   */
  async healthCheck(): Promise<{ status: string; environment: string }> {
    return this.makeRequest<{ status: string; environment: string }>('/health');
  }

  /**
   * Get agent leaderboard position (mock implementation)
   */
  async getLeaderboard(): Promise<Array<{
    agentId: string;
    score: number;
    rank: number;
    performance: Record<string, number>;
  }>> {
    // Mock leaderboard data
    return [{
      agentId: 'vincent-hackathon-agent',
      score: 1000,
      rank: 1,
      performance: { totalReturn: 0.1, trades: 50 }
    }];
  }

  /**
   * Get trade history for the agent
   */
  async getTradeHistory(): Promise<any[]> {
    // This would return the agent's trade history
    // For now, we'll track trades through the executeTrade method
    return [];
  }

  /**
   * Get current portfolio/balance information
   */
  async getPortfolioInfo(): Promise<any> {
    // This would return current portfolio state
    return {
      totalValue: 0,
      positions: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

// Singleton instance for use throughout the application
export const recallNetworkClient = new RecallNetworkClient();