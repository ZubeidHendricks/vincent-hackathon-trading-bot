/**
 * Model Registry - Centralized model version management for Vincent agents
 * Handles model versioning, deployment, rollback, and performance tracking
 */

import { EventEmitter } from 'events';
import consola from 'consola';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export interface ModelMetadata {
  modelId: string;
  version: string;
  agentType: string;
  deploymentTimestamp: number;
  trainedOn: number;
  trainingData: {
    experienceCount: number;
    successRate: number;
    averageReward: number;
  };
  performance: {
    accuracy: number;
    latency: number;
    profitability: number;
    riskScore: number;
    validationScore: number;
  };
  parameters: Map<string, any>;
  rollbackVersion?: string;
  status: 'active' | 'deprecated' | 'archived';
  tags: string[];
  notes?: string;
}

export interface ModelDeployment {
  modelId: string;
  version: string;
  agentId: string;
  deploymentTime: number;
  status: 'deployed' | 'failed' | 'rollback';
  performanceMetrics?: any;
  errorLogs?: string[];
}

export interface ModelComparison {
  modelA: ModelMetadata;
  modelB: ModelMetadata;
  performanceDiff: {
    accuracy: number;
    latency: number;
    profitability: number;
    riskScore: number;
  };
  recommendation: 'upgrade' | 'downgrade' | 'maintain';
  confidence: number;
}

export class ModelRegistry extends EventEmitter {
  private models: Map<string, ModelMetadata> = new Map();
  private deployments: Map<string, ModelDeployment[]> = new Map();
  private activeModels: Map<string, string> = new Map(); // agentId -> modelVersion
  private modelStoragePath: string;
  private maxVersionsPerModel: number = 10;
  private compressionThreshold: number = 0.05; // 5% improvement threshold

  constructor(storagePath: string = './models') {
    super();
    this.modelStoragePath = storagePath;
    this.initializeStorage();
    this.loadRegistry();
  }

  /**
   * Register a new model version
   */
  async registerModel(metadata: Omit<ModelMetadata, 'status' | 'deploymentTimestamp'>): Promise<void> {
    const fullMetadata: ModelMetadata = {
      ...metadata,
      status: 'active',
      deploymentTimestamp: Date.now()
    };

    const modelKey = `${metadata.modelId}:${metadata.version}`;
    this.models.set(modelKey, fullMetadata);

    // Save model parameters to disk
    await this.saveModelToDisk(fullMetadata);

    // Clean up old versions if needed
    await this.cleanupOldVersions(metadata.modelId);

    this.emit('modelRegistered', fullMetadata);
    consola.info(`📝 Model registered: ${metadata.modelId} v${metadata.version}`);
  }

  /**
   * Deploy a model to an agent
   */
  async deployModel(modelId: string, version: string, agentId: string): Promise<boolean> {
    const modelKey = `${modelId}:${version}`;
    const model = this.models.get(modelKey);

    if (!model) {
      consola.error(`Model not found: ${modelKey}`);
      return false;
    }

    try {
      // Check if deployment is safe
      const safeToDeploy = await this.validateDeployment(model, agentId);
      if (!safeToDeploy) {
        consola.warn(`Deployment validation failed for ${modelKey} -> ${agentId}`);
        return false;
      }

      // Create deployment record
      const deployment: ModelDeployment = {
        modelId,
        version,
        agentId,
        deploymentTime: Date.now(),
        status: 'deployed'
      };

      if (!this.deployments.has(agentId)) {
        this.deployments.set(agentId, []);
      }
      this.deployments.get(agentId)!.push(deployment);

      // Update active model tracking
      this.activeModels.set(agentId, `${modelId}:${version}`);

      this.emit('modelDeployed', deployment);
      consola.success(`🚀 Model deployed: ${modelKey} -> ${agentId}`);
      return true;

    } catch (error) {
      consola.error(`Deployment failed for ${modelKey}:`, error);
      
      // Record failed deployment
      const failedDeployment: ModelDeployment = {
        modelId,
        version,
        agentId,
        deploymentTime: Date.now(),
        status: 'failed',
        errorLogs: [error instanceof Error ? error.message : String(error)]
      };

      if (!this.deployments.has(agentId)) {
        this.deployments.set(agentId, []);
      }
      this.deployments.get(agentId)!.push(failedDeployment);

      return false;
    }
  }

  /**
   * Rollback to a previous model version
   */
  async rollbackModel(agentId: string, targetVersion?: string): Promise<boolean> {
    const currentModel = this.activeModels.get(agentId);
    if (!currentModel) {
      consola.error(`No active model for agent: ${agentId}`);
      return false;
    }

    const agentDeployments = this.deployments.get(agentId) || [];
    const successfulDeployments = agentDeployments.filter(d => d.status === 'deployed');

    if (successfulDeployments.length < 2) {
      consola.error(`No previous successful deployment for rollback: ${agentId}`);
      return false;
    }

    // Find target version
    let targetDeployment: ModelDeployment;
    if (targetVersion) {
      targetDeployment = successfulDeployments.find(d => d.version === targetVersion)!;
      if (!targetDeployment) {
        consola.error(`Target version not found: ${targetVersion}`);
        return false;
      }
    } else {
      // Use previous successful deployment
      const currentDeployment = successfulDeployments[successfulDeployments.length - 1];
      targetDeployment = successfulDeployments[successfulDeployments.length - 2];
    }

    try {
      // Perform rollback
      const rollbackDeployment: ModelDeployment = {
        modelId: targetDeployment.modelId,
        version: targetDeployment.version,
        agentId,
        deploymentTime: Date.now(),
        status: 'rollback'
      };

      agentDeployments.push(rollbackDeployment);
      this.activeModels.set(agentId, `${targetDeployment.modelId}:${targetDeployment.version}`);

      this.emit('modelRollback', rollbackDeployment);
      consola.success(`🔄 Model rolled back: ${agentId} -> v${targetDeployment.version}`);
      return true;

    } catch (error) {
      consola.error(`Rollback failed for ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Compare two model versions
   */
  async compareModels(modelId: string, versionA: string, versionB: string): Promise<ModelComparison | null> {
    const modelA = this.models.get(`${modelId}:${versionA}`);
    const modelB = this.models.get(`${modelId}:${versionB}`);

    if (!modelA || !modelB) {
      consola.error(`Models not found for comparison: ${versionA}, ${versionB}`);
      return null;
    }

    const performanceDiff = {
      accuracy: modelB.performance.accuracy - modelA.performance.accuracy,
      latency: modelA.performance.latency - modelB.performance.latency, // Lower is better
      profitability: modelB.performance.profitability - modelA.performance.profitability,
      riskScore: modelA.performance.riskScore - modelB.performance.riskScore // Lower is better
    };

    // Calculate overall performance score
    const scoreA = this.calculatePerformanceScore(modelA.performance);
    const scoreB = this.calculatePerformanceScore(modelB.performance);
    const scoreDiff = scoreB - scoreA;

    let recommendation: 'upgrade' | 'downgrade' | 'maintain';
    let confidence: number;

    if (scoreDiff > this.compressionThreshold) {
      recommendation = 'upgrade';
      confidence = Math.min(0.95, scoreDiff * 2);
    } else if (scoreDiff < -this.compressionThreshold) {
      recommendation = 'downgrade';
      confidence = Math.min(0.95, Math.abs(scoreDiff) * 2);
    } else {
      recommendation = 'maintain';
      confidence = 1 - Math.abs(scoreDiff) * 2;
    }

    return {
      modelA,
      modelB,
      performanceDiff,
      recommendation,
      confidence
    };
  }

  /**
   * Get model by agent ID
   */
  getActiveModel(agentId: string): ModelMetadata | null {
    const activeModelKey = this.activeModels.get(agentId);
    if (!activeModelKey) {
      return null;
    }

    return this.models.get(activeModelKey) || null;
  }

  /**
   * Get all models for a specific model ID
   */
  getModelVersions(modelId: string): ModelMetadata[] {
    const versions: ModelMetadata[] = [];
    
    this.models.forEach((model, key) => {
      if (key.startsWith(`${modelId}:`)) {
        versions.push(model);
      }
    });

    return versions.sort((a, b) => b.deploymentTimestamp - a.deploymentTimestamp);
  }

  /**
   * Get deployment history for an agent
   */
  getDeploymentHistory(agentId: string): ModelDeployment[] {
    return this.deployments.get(agentId) || [];
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): any {
    const stats = {
      totalModels: this.models.size,
      activeModels: this.activeModels.size,
      totalDeployments: 0,
      successfulDeployments: 0,
      failedDeployments: 0,
      rollbacks: 0,
      modelsByType: new Map<string, number>(),
      averagePerformance: {
        accuracy: 0,
        latency: 0,
        profitability: 0,
        riskScore: 0
      }
    };

    // Count deployments
    this.deployments.forEach(deployments => {
      stats.totalDeployments += deployments.length;
      deployments.forEach(deployment => {
        switch (deployment.status) {
          case 'deployed':
            stats.successfulDeployments++;
            break;
          case 'failed':
            stats.failedDeployments++;
            break;
          case 'rollback':
            stats.rollbacks++;
            break;
        }
      });
    });

    // Count models by type
    this.models.forEach(model => {
      const count = stats.modelsByType.get(model.agentType) || 0;
      stats.modelsByType.set(model.agentType, count + 1);
    });

    // Calculate average performance
    const activeModels = Array.from(this.models.values()).filter(m => m.status === 'active');
    if (activeModels.length > 0) {
      stats.averagePerformance.accuracy = activeModels.reduce((sum, m) => sum + m.performance.accuracy, 0) / activeModels.length;
      stats.averagePerformance.latency = activeModels.reduce((sum, m) => sum + m.performance.latency, 0) / activeModels.length;
      stats.averagePerformance.profitability = activeModels.reduce((sum, m) => sum + m.performance.profitability, 0) / activeModels.length;
      stats.averagePerformance.riskScore = activeModels.reduce((sum, m) => sum + m.performance.riskScore, 0) / activeModels.length;
    }

    return stats;
  }

  /**
   * Archive old model versions
   */
  async archiveOldModels(retentionDays: number = 30): Promise<void> {
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const archivedCount = 0;

    this.models.forEach(async (model, key) => {
      if (model.deploymentTimestamp < cutoffTime && model.status !== 'active') {
        model.status = 'archived';
        await this.saveModelToDisk(model);
        consola.info(`📦 Model archived: ${key}`);
      }
    });

    this.emit('modelsArchived', { count: archivedCount, cutoffTime });
  }

  /**
   * Export registry data
   */
  async exportRegistry(): Promise<any> {
    return {
      models: Array.from(this.models.entries()),
      deployments: Array.from(this.deployments.entries()),
      activeModels: Array.from(this.activeModels.entries()),
      exportTimestamp: Date.now()
    };
  }

  /**
   * Import registry data
   */
  async importRegistry(data: any): Promise<void> {
    this.models = new Map(data.models);
    this.deployments = new Map(data.deployments);
    this.activeModels = new Map(data.activeModels);
    
    await this.saveRegistry();
    consola.info(`📥 Registry imported: ${this.models.size} models`);
  }

  // Private methods

  private async initializeStorage(): Promise<void> {
    try {
      if (!existsSync(this.modelStoragePath)) {
        await mkdir(this.modelStoragePath, { recursive: true });
      }
    } catch (error) {
      consola.error('Failed to initialize model storage:', error);
    }
  }

  private async loadRegistry(): Promise<void> {
    try {
      const registryPath = join(this.modelStoragePath, 'registry.json');
      if (existsSync(registryPath)) {
        const registryData = await readFile(registryPath, 'utf-8');
        const data = JSON.parse(registryData);
        await this.importRegistry(data);
      }
    } catch (error) {
      consola.warn('Failed to load registry:', error);
    }
  }

  private async saveRegistry(): Promise<void> {
    try {
      const registryPath = join(this.modelStoragePath, 'registry.json');
      const data = await this.exportRegistry();
      await writeFile(registryPath, JSON.stringify(data, null, 2));
    } catch (error) {
      consola.error('Failed to save registry:', error);
    }
  }

  private async saveModelToDisk(model: ModelMetadata): Promise<void> {
    try {
      const modelPath = join(this.modelStoragePath, `${model.modelId}-${model.version}.json`);
      const modelData = {
        ...model,
        parameters: Array.from(model.parameters.entries())
      };
      await writeFile(modelPath, JSON.stringify(modelData, null, 2));
    } catch (error) {
      consola.error(`Failed to save model to disk: ${model.modelId}-${model.version}`, error);
    }
  }

  private async cleanupOldVersions(modelId: string): Promise<void> {
    const versions = this.getModelVersions(modelId);
    
    if (versions.length > this.maxVersionsPerModel) {
      const versionsToArchive = versions.slice(this.maxVersionsPerModel);
      
      versionsToArchive.forEach(model => {
        if (model.status === 'active') {
          model.status = 'deprecated';
        }
      });
      
      consola.info(`🧹 Cleaned up ${versionsToArchive.length} old versions for ${modelId}`);
    }
  }

  private async validateDeployment(model: ModelMetadata, agentId: string): Promise<boolean> {
    // Check if model is active
    if (model.status !== 'active') {
      return false;
    }

    // Check validation score threshold
    if (model.performance.validationScore < 0.6) {
      return false;
    }

    // Check if there's a recent failed deployment
    const recentDeployments = this.deployments.get(agentId) || [];
    const recentFailures = recentDeployments.filter(d => 
      d.status === 'failed' && 
      Date.now() - d.deploymentTime < 5 * 60 * 1000 // 5 minutes
    );

    if (recentFailures.length > 2) {
      return false;
    }

    return true;
  }

  private calculatePerformanceScore(performance: ModelMetadata['performance']): number {
    // Weighted performance score
    const weights = {
      accuracy: 0.3,
      profitability: 0.4,
      validationScore: 0.2,
      riskScore: -0.1 // Negative because lower is better
    };

    return (
      performance.accuracy * weights.accuracy +
      performance.profitability * weights.profitability +
      performance.validationScore * weights.validationScore +
      performance.riskScore * weights.riskScore
    );
  }
}