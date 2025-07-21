#!/usr/bin/env tsx
/**
 * Simple Recall Network API Test
 * Tests the Recall Network integration without full environment dependencies
 */
import { consola } from 'consola';

// Simple environment variables for testing
const RECALL_SANDBOX_API_KEY = "a3f5a86721cc7b41_980608531aaaa82f";
const RECALL_PRODUCTION_API_KEY = "2bf3ce7bdca9b965_e88602a160595172";

interface RecallNetworkTestClient {
  baseUrl: string;
  apiKey: string;
}

class SimpleRecallTestClient {
  private config: RecallNetworkTestClient;

  constructor(environment: 'sandbox' | 'production') {
    this.config = {
      baseUrl: environment === 'production' 
        ? 'https://api.competitions.recall.network'
        : 'https://api.sandbox.competitions.recall.network',
      apiKey: environment === 'production' 
        ? RECALL_PRODUCTION_API_KEY 
        : RECALL_SANDBOX_API_KEY
    };
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    consola.info(`Making request to: ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Vincent-Hackathon-Trading-Bot/1.0.0',
        ...options.headers,
      },
    });

    consola.info(`Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Recall Network API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  }

  async testBasicConnectivity(): Promise<any> {
    // Test basic connectivity - this might return 404 but should not be a network error
    try {
      return await this.makeRequest('/health');
    } catch (error) {
      consola.info('Health endpoint might not exist, trying alternate endpoints...');
      throw error;
    }
  }

  async testTradeExecution(): Promise<any> {
    // Test the trade execution endpoint based on the documentation
    const tradePayload = {
      fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",   // WETH
      amount: "10", // Small test amount
      reason: "Vincent Hackathon Bot - Connectivity Test"
    };

    return await this.makeRequest('/api/trade/execute', {
      method: 'POST',
      body: JSON.stringify(tradePayload)
    });
  }

  async testAgentRegistration(): Promise<any> {
    const registrationPayload = {
      name: 'Vincent-Hackathon-Trading-Bot',
      version: '1.0.0',
      capabilities: [
        'autonomous-trading',
        'multi-agent-coordination', 
        'dca-strategy',
        'momentum-trading',
        'arbitrage-detection',
        'mean-reversion',
        'risk-management'
      ],
      description: 'Multi-agent trading system built for Vincent AI Agent Hackathon'
    };

    return await this.makeRequest('/api/agents/register', {
      method: 'POST',
      body: JSON.stringify(registrationPayload)
    });
  }
}

async function runRecallNetworkTests() {
  consola.start('🧪 Starting Recall Network API Tests');
  
  // Test Sandbox first
  consola.info('🏖️ Testing Sandbox Environment');
  const sandboxClient = new SimpleRecallTestClient('sandbox');
  
  try {
    consola.info('📡 Testing basic connectivity...');
    try {
      const healthResult = await sandboxClient.testBasicConnectivity();
      consola.success('✅ Health check passed:', healthResult);
    } catch (error) {
      consola.warn('⚠️ Health endpoint not available, continuing with other tests...');
    }

    consola.info('🤖 Testing agent registration...');
    try {
      const registrationResult = await sandboxClient.testAgentRegistration();
      consola.success('✅ Agent registration successful:', registrationResult);
    } catch (error) {
      consola.warn('⚠️ Agent registration failed:', error.message);
      if (error.message.includes('401')) {
        consola.error('🔑 Authentication failed - API key might be invalid');
      }
    }

    consola.info('💱 Testing trade execution...');
    try {
      const tradeResult = await sandboxClient.testTradeExecution();
      consola.success('✅ Trade execution test passed:', tradeResult);
    } catch (error) {
      consola.warn('⚠️ Trade execution failed:', error.message);
      if (error.message.includes('insufficient balance')) {
        consola.info('💡 This is expected - use the Recall faucet to get test tokens');
      }
    }

    consola.success('🎉 Sandbox tests completed!');

  } catch (error) {
    consola.error('❌ Sandbox tests failed:', error);
  }

  // Test Production (just connectivity, no actual trades)
  consola.info(''); // Empty line
  consola.info('🏭 Testing Production Environment (connectivity only)');
  const productionClient = new SimpleRecallTestClient('production');
  
  try {
    await productionClient.testBasicConnectivity();
    consola.success('✅ Production connectivity verified');
  } catch (error) {
    consola.warn('⚠️ Production connectivity test:', error.message);
  }

  consola.success('🚀 Recall Network integration setup complete!');
  consola.info('');
  consola.info('📋 Next Steps:');
  consola.info('1. Get test tokens from: https://faucet.recall.network');
  consola.info('2. Run your agent in sandbox mode first');
  consola.info('3. Once verified, switch to production for live competition');
  consola.info('');
  consola.info('🔧 Your API Keys:');
  consola.info(`   Sandbox: ${RECALL_SANDBOX_API_KEY.substring(0, 8)}...`);
  consola.info(`   Production: ${RECALL_PRODUCTION_API_KEY.substring(0, 8)}...`);
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runRecallNetworkTests().catch(consola.error);
}