#!/usr/bin/env tsx
import { recallNetworkClient } from './lib/recallNetwork/index.js';
import { consola } from 'consola';

/**
 * Test script to verify Recall Network connectivity
 * Run with: pnpm exec tsx src/testRecallNetwork.ts
 */
async function testRecallNetworkConnection() {
  consola.info('🚀 Testing Recall Network Connection...');
  
  try {
    // Display current configuration
    consola.info(`Environment: ${recallNetworkClient.getCurrentEnvironment()}`);
    consola.info(`API Key: ${recallNetworkClient.getCurrentApiKey().substring(0, 8)}...`);

    // Test health check
    consola.info('⚕️ Testing health check...');
    const healthStatus = await recallNetworkClient.healthCheck();
    consola.success('Health check successful:', healthStatus);

    // Test agent registration
    consola.info('📝 Testing agent registration...');
    const registration = await recallNetworkClient.registerAgent([
      'trading',
      'dca-strategy',
      'risk-management',
      'multi-agent-coordination',
      'arbitrage',
      'momentum-trading',
      'mean-reversion'
    ]);
    consola.success('Agent registration successful:', registration);

    // Test competition data retrieval
    consola.info('🏆 Testing competition data retrieval...');
    const competitionData = await recallNetworkClient.getCompetitionData();
    consola.success('Competition data retrieved:', competitionData);

    // Test leaderboard retrieval
    consola.info('📊 Testing leaderboard retrieval...');
    const leaderboard = await recallNetworkClient.getLeaderboard();
    consola.success('Leaderboard retrieved:', leaderboard);

    // Test performance data submission (sample data)
    consola.info('📈 Testing performance data submission...');
    await recallNetworkClient.submitPerformanceData({
      agentId: registration.agentId,
      timestamp: Date.now(),
      performance: {
        totalReturn: 0.05, // 5% return
        sharpeRatio: 1.2,
        drawdown: -0.02, // 2% drawdown
        trades: 10
      },
      metadata: {
        testRun: true,
        strategy: 'dca-multi-agent',
        version: '1.0.0'
      }
    });
    consola.success('Performance data submitted successfully');

    consola.success('✅ All Recall Network tests passed!');
    consola.info('🎯 Agent is ready for competition');

  } catch (error) {
    consola.error('❌ Recall Network connection test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        consola.error('🔑 Authentication failed - check your API key');
      } else if (error.message.includes('404')) {
        consola.error('🌐 API endpoint not found - check the base URL');
      } else if (error.message.includes('fetch')) {
        consola.error('🔗 Network connection failed - check your internet connection');
      }
    }
    
    process.exit(1);
  }
}

// Test both environments
async function runFullTest() {
  consola.start('🧪 Starting Recall Network Integration Tests');
  
  // Test sandbox first
  consola.info('🏖️ Testing Sandbox Environment');
  recallNetworkClient.switchToSandbox();
  await testRecallNetworkConnection();
  
  consola.info(''); // Empty line for separation
  
  // Ask user if they want to test production
  consola.info('🏭 Production Environment Test');
  consola.warn('⚠️ Production testing should be done carefully');
  consola.info('To test production, uncomment the lines below and run again');
  
  // Uncomment these lines to test production environment
  // recallNetworkClient.switchToProduction();
  // await testRecallNetworkConnection();
  
  consola.success('🎉 Recall Network integration setup complete!');
}

// Execute the test
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullTest().catch(consola.error);
}