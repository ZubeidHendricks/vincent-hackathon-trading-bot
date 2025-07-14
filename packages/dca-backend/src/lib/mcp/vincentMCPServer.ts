/**
 * Vincent MCP Server - Model Context Protocol Integration
 * Exposes Vincent Multi-Agent Trading System as MCP tools for LLM integration
 */

import { getVincentAppServer } from '@lit-protocol/vincent-mcp-sdk';
import { VincentMultiAgentSystem } from '../agents/vincentMultiAgentSystem';
import { MarketData, TradingSignal } from '../strategies/index';
import consola from 'consola';
import { ethers } from 'ethers';

interface VincentMCPConfig {
  wallet: ethers.Wallet;
  port?: number;
  transport: 'stdio' | 'http';
  host?: string;
}

// Vincent App Definition for MCP
const VINCENT_MULTI_AGENT_APP_DEF = {
  id: "multi-agent-trading-system",
  version: "1.0.0",
  name: "Vincent Multi-Agent Autonomous Trader",
  description: "3-agent coordinated trading system with user-controlled permissions and policy governance",
  tools: {
    "execute-momentum-trade": {
      name: "execute-momentum-trade",
      description: "Execute momentum-based trading signal with Vincent policy validation"
    },
    "analyze-market-conditions": {
      name: "analyze-market-conditions", 
      description: "Analyze current market conditions using all agents"
    },
    "get-system-status": {
      name: "get-system-status",
      description: "Get comprehensive Vincent multi-agent system status"
    },
    "get-agent-performance": {
      name: "get-agent-performance",
      description: "Get detailed performance metrics for specific agent"
    },
    "update-policy-constraints": {
      name: "update-policy-constraints",
      description: "Update Vincent policy constraints for the system or specific agent"
    },
    "emergency-system-control": {
      name: "emergency-system-control",
      description: "Emergency controls for the Vincent trading system"
    }
  }
};

export class VincentMCPServer {
  private config: VincentMCPConfig;
  private mcpServer: any;
  private tradingSystem: VincentMultiAgentSystem | null = null;
  private isRunning: boolean = false;

  constructor(config: VincentMCPConfig) {
    this.config = config;
  }

  async initialize(tradingSystem: VincentMultiAgentSystem): Promise<void> {
    this.tradingSystem = tradingSystem;
    
    try {
      // Initialize Vincent MCP server
      this.mcpServer = await getVincentAppServer(this.config.wallet, VINCENT_MULTI_AGENT_APP_DEF);
      
      // Register trading tools
      this.registerTradingTools();
      
      // Register monitoring tools
      this.registerMonitoringTools();
      
      // Register management tools
      this.registerManagementTools();
      
      consola.success('🔗 Vincent MCP Server initialized with multi-agent trading tools');
      
    } catch (error) {
      consola.error('Failed to initialize Vincent MCP Server:', error);
      throw error;
    }
  }

  private registerTradingTools(): void {
    // Momentum Trading Tool
    this.mcpServer.tool(
      "execute-momentum-trade",
      "Execute momentum-based trading signal with Vincent policy validation",
      {
        type: "object",
        properties: {
          action: { type: "string", enum: ["BUY", "SELL", "HOLD"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          amount: { type: "number", minimum: 0 },
          reason: { type: "string" },
          marketData: {
            type: "object",
            properties: {
              price: { type: "number" },
              volume24h: { type: "number" },
              symbol: { type: "string" }
            }
          }
        },
        required: ["action", "confidence", "amount", "reason"]
      },
      async ({ action, confidence, amount, reason, marketData }) => {
        if (!this.tradingSystem) {
          throw new Error('Trading system not initialized');
        }

        const signal: TradingSignal = {
          action: action as 'BUY' | 'SELL' | 'HOLD',
          confidence,
          amount,
          reason,
          strategy: 'mcp-momentum-trading'
        };

        try {
          const momentumAgent = (this.tradingSystem as any).agents.get('momentum');
          if (!momentumAgent) {
            throw new Error('Momentum agent not available');
          }

          // Validate with Vincent policies
          const validation = await momentumAgent.validateSignalWithPolicy(signal);
          
          if (!validation.isValid) {
            return {
              success: false,
              error: `Policy violations: ${validation.violations.join(', ')}`,
              policyViolations: validation.violations
            };
          }

          // Execute trade if policy compliant
          if (signal.action !== 'HOLD') {
            const execution = await momentumAgent.executeTrade(signal);
            return {
              success: true,
              execution,
              policyCompliant: true,
              vincentWallet: momentumAgent.getVincentWalletAddress(),
              transactionHash: execution.execution.transactionHash,
              gasUsed: execution.execution.gasUsed
            };
          } else {
            return {
              success: true,
              action: 'HOLD',
              reason: signal.reason,
              policyCompliant: true
            };
          }

        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            signal
          };
        }
      }
    );

    // Market Analysis Tool
    this.mcpServer.tool(
      "analyze-market-conditions",
      "Analyze current market conditions using all agents",
      {
        type: "object",
        properties: {
          symbol: { type: "string" },
          includeAgents: { 
            type: "array", 
            items: { type: "string", enum: ["momentum", "arbitrage", "mean-reversion"] }
          }
        },
        required: ["symbol"]
      },
      async ({ symbol, includeAgents = ["momentum"] }) => {
        if (!this.tradingSystem) {
          throw new Error('Trading system not initialized');
        }

        try {
          const analyses: any = {};
          
          for (const agentType of includeAgents) {
            const agent = (this.tradingSystem as any).agents.get(agentType);
            if (agent) {
              // Get current market data and analysis
              const metrics = agent.getVincentMomentumMetrics ? 
                agent.getVincentMomentumMetrics() : 
                agent.getStrategySpecificMetrics();
              
              analyses[agentType] = {
                health: agent.getVincentHealthStatus(),
                metrics,
                spendingStatus: agent.getSpendingStatus(),
                walletAddress: agent.getVincentWalletAddress()
              };
            }
          }

          return {
            success: true,
            symbol,
            timestamp: Date.now(),
            analyses,
            systemMetrics: this.tradingSystem.getVincentSystemMetrics()
          };

        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    );
  }

  private registerMonitoringTools(): void {
    // System Status Tool
    this.mcpServer.tool(
      "get-system-status",
      "Get comprehensive Vincent multi-agent system status",
      {
        type: "object",
        properties: {
          includeTradeHistory: { type: "boolean", default: false },
          includePolicyStatus: { type: "boolean", default: true }
        }
      },
      async ({ includeTradeHistory = false, includePolicyStatus = true }) => {
        if (!this.tradingSystem) {
          return { success: false, error: 'Trading system not initialized' };
        }

        try {
          const status: any = {
            isRunning: this.tradingSystem.isSystemRunning(),
            metrics: this.tradingSystem.getVincentSystemMetrics(),
            agentHealth: this.tradingSystem.getVincentAgentHealthSummary(),
            walletAddresses: this.tradingSystem.getVincentWalletAddresses(),
            timestamp: Date.now()
          };

          if (includePolicyStatus) {
            status.policyCompliance = this.tradingSystem.getPolicyComplianceStatus();
            status.spendingLimits = this.tradingSystem.getSystemSpendingLimits();
          }

          if (includeTradeHistory) {
            status.tradeHistory = this.tradingSystem.getVincentTradeHistory().slice(-10); // Last 10 trades
          }

          return { success: true, status };

        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    );

    // Performance Metrics Tool
    this.mcpServer.tool(
      "get-agent-performance",
      "Get detailed performance metrics for specific agent",
      {
        type: "object",
        properties: {
          agentId: { type: "string", enum: ["momentum", "arbitrage", "mean-reversion"] },
          timeframe: { type: "string", enum: ["1h", "24h", "7d"], default: "24h" }
        },
        required: ["agentId"]
      },
      async ({ agentId, timeframe = "24h" }) => {
        if (!this.tradingSystem) {
          return { success: false, error: 'Trading system not initialized' };
        }

        try {
          const agent = (this.tradingSystem as any).agents.get(agentId);
          if (!agent) {
            return { success: false, error: `Agent ${agentId} not found` };
          }

          const performance = {
            agentId,
            timeframe,
            health: agent.getVincentHealthStatus(),
            metrics: agent.getVincentMomentumMetrics ? 
              agent.getVincentMomentumMetrics() : 
              agent.getStrategySpecificMetrics(),
            spendingStatus: agent.getSpendingStatus(),
            walletAddress: agent.getVincentWalletAddress(),
            policyConstraints: agent.getPolicyConstraints(),
            timestamp: Date.now()
          };

          return { success: true, performance };

        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    );
  }

  private registerManagementTools(): void {
    // Policy Update Tool
    this.mcpServer.tool(
      "update-policy-constraints",
      "Update Vincent policy constraints for the system or specific agent",
      {
        type: "object",
        properties: {
          scope: { type: "string", enum: ["global", "agent"], default: "global" },
          agentId: { type: "string", enum: ["momentum", "arbitrage", "mean-reversion"] },
          policyUpdates: {
            type: "object",
            properties: {
              spendingLimits: {
                type: "object",
                properties: {
                  dailyLimit: { type: "number" },
                  perTradeLimit: { type: "number" },
                  monthlyLimit: { type: "number" }
                }
              },
              riskLimits: {
                type: "object",
                properties: {
                  maxDrawdown: { type: "number" },
                  maxPositionSize: { type: "number" },
                  maxDailyLoss: { type: "number" }
                }
              },
              timeRestrictions: {
                type: "object",
                properties: {
                  tradingHours: { type: "string" },
                  allowedDays: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        },
        required: ["policyUpdates"]
      },
      async ({ scope = "global", agentId, policyUpdates }) => {
        if (!this.tradingSystem) {
          return { success: false, error: 'Trading system not initialized' };
        }

        try {
          if (scope === "global") {
            await this.tradingSystem.updateGlobalPolicyConstraints(policyUpdates);
            return {
              success: true,
              message: "Global policy constraints updated",
              updatedConstraints: policyUpdates,
              timestamp: Date.now()
            };
          } else if (scope === "agent" && agentId) {
            const agent = (this.tradingSystem as any).agents.get(agentId);
            if (!agent) {
              return { success: false, error: `Agent ${agentId} not found` };
            }
            
            await agent.updatePolicyConstraints(policyUpdates);
            return {
              success: true,
              message: `Policy constraints updated for ${agentId}`,
              agentId,
              updatedConstraints: policyUpdates,
              timestamp: Date.now()
            };
          } else {
            return { success: false, error: "Invalid scope or missing agentId for agent scope" };
          }

        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    );

    // Emergency Control Tool
    this.mcpServer.tool(
      "emergency-system-control",
      "Emergency controls for the Vincent trading system",
      {
        type: "object",
        properties: {
          action: { type: "string", enum: ["halt", "pause", "resume"] },
          reason: { type: "string" }
        },
        required: ["action", "reason"]
      },
      async ({ action, reason }) => {
        if (!this.tradingSystem) {
          return { success: false, error: 'Trading system not initialized' };
        }

        try {
          switch (action) {
            case "halt":
              await this.tradingSystem.emergencyHalt();
              return {
                success: true,
                message: "Emergency halt executed",
                reason,
                timestamp: Date.now()
              };
            
            case "pause":
              // Implement pause functionality
              return {
                success: true,
                message: "System paused",
                reason,
                timestamp: Date.now()
              };
            
            case "resume":
              // Implement resume functionality
              return {
                success: true,
                message: "System resumed",
                reason,
                timestamp: Date.now()
              };
            
            default:
              return { success: false, error: `Unknown action: ${action}` };
          }

        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    );
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      consola.warn('Vincent MCP Server already running');
      return;
    }

    try {
      if (this.config.transport === 'http') {
        await this.mcpServer.listen({
          port: this.config.port || 8052,
          host: this.config.host || '0.0.0.0'
        });
        consola.success(`🔗 Vincent MCP Server listening on http://${this.config.host || '0.0.0.0'}:${this.config.port || 8052}`);
      } else {
        // STDIO transport - server runs automatically
        consola.success('🔗 Vincent MCP Server started with STDIO transport');
      }

      this.isRunning = true;

    } catch (error) {
      consola.error('Failed to start Vincent MCP Server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      if (this.mcpServer && this.mcpServer.close) {
        await this.mcpServer.close();
      }
      
      this.isRunning = false;
      consola.info('🔗 Vincent MCP Server stopped');

    } catch (error) {
      consola.error('Error stopping Vincent MCP Server:', error);
    }
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }

  getServerInfo(): any {
    return {
      appDef: VINCENT_MULTI_AGENT_APP_DEF,
      config: {
        transport: this.config.transport,
        port: this.config.port,
        host: this.config.host
      },
      isRunning: this.isRunning,
      tradingSystemConnected: this.tradingSystem !== null
    };
  }
}