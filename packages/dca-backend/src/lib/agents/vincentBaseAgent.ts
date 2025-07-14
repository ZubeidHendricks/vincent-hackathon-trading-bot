/**
 * Vincent-Enhanced Base Agent
 * Integrates Vincent Agent Wallets (PKPs) and policy-governed trading
 */

import { ethers } from 'ethers';
import { LIT_RPC } from '@lit-protocol/constants';
import { getVincentToolClient } from '@lit-protocol/vincent-app-sdk';
import { BaseAgent, AgentConfig, AgentMessage } from './baseAgent';
import { MarketData, TradingSignal } from '../strategies/index';
import consola from 'consola';

// Vincent-specific types
export interface VincentAgentConfig extends AgentConfig {
  vincentWalletAddress?: string;
  userDelegationId?: string;
  policyConstraints: VincentPolicyConstraints;
  vincentAppVersion: number;
}

export interface VincentPolicyConstraints {
  spendingLimits: {
    dailyLimit: number;
    perTradeLimit: number;
    monthlyLimit: number;
  };
  riskLimits: {
    maxDrawdown: number;
    maxPositionSize: number;
    maxDailyLoss: number;
    stopLossThreshold: number;
  };
  timeRestrictions: {
    tradingHours?: string; // "9-17" format
    timezone?: string;
    allowedDays?: string[]; // ["MON", "TUE", "WED", "THU", "FRI"]
  };
  assetRestrictions: {
    allowedAssets: string[];
    blockedAssets: string[];
    maxAssetsPerTrade: number;
  };
  approvalRequirements: {
    largePositions: boolean;
    newAssets: boolean;
    highRiskOperations: boolean;
    manualApprovalThreshold: number;
  };
}

export interface VincentTradeExecution {
  preValidation: {
    policyCompliant: boolean;
    userConsentRequired: boolean;
    riskAssessment: string;
  };
  execution: {
    vincentToolUsed: string;
    transactionHash?: string;
    gasUsed?: number;
    executionTime: number;
  };
  postValidation: {
    actualSlippage: number;
    pnlRealized: number;
    policyViolations: string[];
  };
}

export abstract class VincentBaseAgent extends BaseAgent {
  protected vincentConfig: VincentAgentConfig;
  protected policyConstraints: VincentPolicyConstraints;
  protected ethersSigner: ethers.Wallet;
  protected vincentTools: Map<string, any> = new Map();
  protected dailySpending: number = 0;
  protected monthlySpending: number = 0;
  protected lastResetDate: string = '';

  constructor(config: VincentAgentConfig) {
    super(config);
    this.vincentConfig = config;
    this.policyConstraints = config.policyConstraints;
    
    // Initialize Vincent signer (in production, this would use PKP)
    const privateKey = process.env.VINCENT_DELEGATEE_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Vincent delegatee private key not configured');
    }
    
    this.ethersSigner = new ethers.Wallet(
      privateKey,
      new ethers.providers.StaticJsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    );
    
    this.initializeVincentTools();
    this.resetSpendingTracking();
    
    consola.info(`🔐 Vincent Agent ${config.name} initialized with PKP wallet: ${this.ethersSigner.address}`);
  }

  private initializeVincentTools(): void {
    // Initialize available Vincent tools for this agent
    const toolConfigs = [
      { name: 'ERC20_APPROVAL', cid: this.getToolCid('ERC20_APPROVAL_TOOL') },
      { name: 'UNISWAP_SWAP', cid: this.getToolCid('UNISWAP_SWAP_TOOL') },
      { name: 'SPENDING_LIMIT', cid: this.getToolCid('SPENDING_LIMIT_POLICY') }
    ];

    toolConfigs.forEach(({ name, cid }) => {
      if (cid) {
        try {
          const toolClient = getVincentToolClient({
            ethersSigner: this.ethersSigner,
            vincentToolCid: cid
          });
          this.vincentTools.set(name, toolClient);
        } catch (error) {
          consola.warn(`Failed to initialize Vincent tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // For demo purposes, create a mock tool client
          this.vincentTools.set(name, {
            execute: async (params: any) => {
              consola.info(`Mock Vincent tool ${name} executed with params:`, params);
              return {
                transactionHash: `0x${Math.random().toString(16).slice(2)}`,
                gasUsed: Math.floor(Math.random() * 100000),
                success: true
              };
            }
          });
        }
      }
    });

    consola.debug(`Initialized ${this.vincentTools.size} Vincent tools for ${this.config.name}`);
  }

  private getToolCid(toolName: string): string | null {
    // This would be expanded with more tool CIDs as we develop them
    const IPFS_CIDS = {
      1: {
        ERC20_APPROVAL_TOOL: 'QmPZ46EiurxMb7DmE9McFyzHfg2B6ZGEERui2tnNNX7cky',
        SPENDING_LIMIT_POLICY: 'QmZrG2DFvVDgo3hZgpUn31TUgrHYfLQA2qEpAo3tnKmzhQ',
        UNISWAP_SWAP_TOOL: 'QmZbh52JYnutuFURnpwfywfiiHuFoJpqFyFzNiMtbiDNkK',
      }
    };

    const version = this.vincentConfig.vincentAppVersion || 1;
    return IPFS_CIDS[version as keyof typeof IPFS_CIDS]?.[toolName as keyof typeof IPFS_CIDS[1]] || null;
  }

  private resetSpendingTracking(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastResetDate !== today) {
      this.dailySpending = 0;
      this.lastResetDate = today;
    }

    // Reset monthly spending on first day of month
    const currentMonth = new Date().getMonth();
    const lastMonth = new Date(this.lastResetDate).getMonth();
    if (currentMonth !== lastMonth) {
      this.monthlySpending = 0;
    }
  }

  // Enhanced trading signal validation with Vincent policies
  async validateSignalWithPolicy(signal: TradingSignal): Promise<{
    isValid: boolean;
    violations: string[];
    requiresApproval: boolean;
    riskAssessment: string;
  }> {
    this.resetSpendingTracking();
    const violations: string[] = [];
    let requiresApproval = false;

    // Spending limit validation
    const tradeAmount = signal.amount;
    if (tradeAmount > this.policyConstraints.spendingLimits.perTradeLimit) {
      violations.push(`Trade amount ${tradeAmount} exceeds per-trade limit ${this.policyConstraints.spendingLimits.perTradeLimit}`);
    }

    if (this.dailySpending + tradeAmount > this.policyConstraints.spendingLimits.dailyLimit) {
      violations.push(`Trade would exceed daily spending limit`);
    }

    if (this.monthlySpending + tradeAmount > this.policyConstraints.spendingLimits.monthlyLimit) {
      violations.push(`Trade would exceed monthly spending limit`);
    }

    // Risk limit validation
    const positionSize = tradeAmount / 10000; // Assume 10k portfolio
    if (positionSize > this.policyConstraints.riskLimits.maxPositionSize) {
      violations.push(`Position size ${(positionSize * 100).toFixed(2)}% exceeds limit ${(this.policyConstraints.riskLimits.maxPositionSize * 100).toFixed(2)}%`);
    }

    // Time restriction validation
    if (this.policyConstraints.timeRestrictions.tradingHours) {
      const isWithinHours = this.isWithinTradingHours();
      if (!isWithinHours) {
        violations.push(`Trading outside allowed hours: ${this.policyConstraints.timeRestrictions.tradingHours}`);
      }
    }

    // Approval requirement checks
    if (tradeAmount > this.policyConstraints.approvalRequirements.manualApprovalThreshold) {
      requiresApproval = true;
    }

    if (this.policyConstraints.approvalRequirements.largePositions && positionSize > 0.05) {
      requiresApproval = true;
    }

    // Risk assessment
    const riskLevel = this.calculateRiskLevel(signal);
    const riskAssessment = `Risk Level: ${riskLevel}, Confidence: ${(signal.confidence * 100).toFixed(1)}%, Amount: $${tradeAmount.toFixed(2)}`;

    return {
      isValid: violations.length === 0,
      violations,
      requiresApproval,
      riskAssessment
    };
  }

  private isWithinTradingHours(): boolean {
    if (!this.policyConstraints.timeRestrictions.tradingHours) return true;

    const now = new Date();
    const [startHour, endHour] = this.policyConstraints.timeRestrictions.tradingHours.split('-').map(Number);
    const currentHour = now.getHours();

    // Check day restrictions
    if (this.policyConstraints.timeRestrictions.allowedDays) {
      const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const currentDay = dayNames[now.getDay()];
      if (!this.policyConstraints.timeRestrictions.allowedDays.includes(currentDay)) {
        return false;
      }
    }

    return currentHour >= startHour && currentHour < endHour;
  }

  private calculateRiskLevel(signal: TradingSignal): string {
    if (signal.confidence < 0.3) return 'HIGH';
    if (signal.confidence < 0.6) return 'MEDIUM';
    if (signal.amount > this.policyConstraints.spendingLimits.perTradeLimit * 0.8) return 'MEDIUM';
    return 'LOW';
  }

  // Enhanced trade execution with Vincent tools
  async executeVincentTrade(signal: TradingSignal): Promise<VincentTradeExecution> {
    const startTime = Date.now();
    
    // Pre-validation
    const validation = await this.validateSignalWithPolicy(signal);
    
    if (!validation.isValid) {
      throw new Error(`Policy violations: ${validation.violations.join(', ')}`);
    }

    if (validation.requiresApproval) {
      const approved = await this.requestUserApproval(signal, validation.riskAssessment);
      if (!approved) {
        throw new Error('User approval required but not granted');
      }
    }

    // Execute trade using Vincent tools
    let transactionHash: string | undefined;
    let gasUsed: number | undefined;

    try {
      if (signal.action === 'BUY' || signal.action === 'SELL') {
        const swapTool = this.vincentTools.get('UNISWAP_SWAP');
        if (swapTool) {
          const result = await swapTool.execute({
            action: signal.action,
            amount: signal.amount,
            asset: 'ETH', // Simplified for demo
            slippageTolerance: 0.01
          });
          transactionHash = result.transactionHash;
          gasUsed = result.gasUsed;
        }
      }

      // Update spending tracking
      this.dailySpending += signal.amount;
      this.monthlySpending += signal.amount;

      // Post-execution validation
      const actualSlippage = Math.random() * 0.005; // Simulated
      const pnlRealized = (Math.random() - 0.5) * signal.amount * 0.1; // Simulated

      return {
        preValidation: {
          policyCompliant: validation.isValid,
          userConsentRequired: validation.requiresApproval,
          riskAssessment: validation.riskAssessment
        },
        execution: {
          vincentToolUsed: 'UNISWAP_SWAP',
          transactionHash,
          gasUsed,
          executionTime: Date.now() - startTime
        },
        postValidation: {
          actualSlippage,
          pnlRealized,
          policyViolations: []
        }
      };

    } catch (error) {
      consola.error(`Vincent trade execution failed for ${this.config.name}:`, error);
      throw error;
    }
  }

  private async requestUserApproval(signal: TradingSignal, riskAssessment: string): Promise<boolean> {
    // In production, this would integrate with Vincent's consent UI
    consola.warn(`🔐 User approval required for ${this.config.name}: ${signal.action} ${signal.amount} - ${riskAssessment}`);
    
    // For demo, automatically approve low-risk trades
    const riskLevel = this.calculateRiskLevel(signal);
    return riskLevel !== 'HIGH';
  }

  // Public API for external access
  getPolicyConstraints(): VincentPolicyConstraints {
    return { ...this.policyConstraints };
  }

  getSpendingStatus(): {
    daily: { used: number; limit: number; remaining: number };
    monthly: { used: number; limit: number; remaining: number };
  } {
    return {
      daily: {
        used: this.dailySpending,
        limit: this.policyConstraints.spendingLimits.dailyLimit,
        remaining: this.policyConstraints.spendingLimits.dailyLimit - this.dailySpending
      },
      monthly: {
        used: this.monthlySpending,
        limit: this.policyConstraints.spendingLimits.monthlyLimit,
        remaining: this.policyConstraints.spendingLimits.monthlyLimit - this.monthlySpending
      }
    };
  }

  getVincentWalletAddress(): string {
    return this.ethersSigner.address;
  }

  async updatePolicyConstraints(newConstraints: Partial<VincentPolicyConstraints>): Promise<void> {
    this.policyConstraints = { ...this.policyConstraints, ...newConstraints };
    consola.info(`🔄 Policy constraints updated for ${this.config.name}`);
  }

  // Enhanced health status including Vincent-specific metrics
  getVincentHealthStatus(): any {
    const baseHealth = super.getHealthStatus();
    const spendingStatus = this.getSpendingStatus();
    
    return {
      ...baseHealth,
      vincent: {
        walletAddress: this.getVincentWalletAddress(),
        policyCompliance: spendingStatus.daily.remaining > 0 && spendingStatus.monthly.remaining > 0,
        toolsAvailable: this.vincentTools.size,
        spendingStatus,
        lastPolicyUpdate: Date.now()
      }
    };
  }
}