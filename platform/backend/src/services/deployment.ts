import { z } from 'zod';

// Deployment interfaces and types
export interface DeploymentEnvironment {
  id: string;
  name: string;
  type: 'development' | 'staging' | 'production';
  description: string;
  quickbaseAppId: string;
  quickbaseTableId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeploymentRecord {
  id: string;
  projectId: string;
  versionId: string;
  environmentId: string;
  deployedBy: string;
  deployedByName: string;
  status: 'pending' | 'in_progress' | 'deployed' | 'failed' | 'rolled_back';
  deploymentType: 'initial' | 'update' | 'rollback';
  quickbaseRecordId?: number;
  deploymentUrl?: string;
  deploymentLog: string[];
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  rollbackVersionId?: string;
  rollbackReason?: string;
}

export interface DeploymentPipeline {
  id: string;
  projectId: string;
  name: string;
  environments: string[]; // Environment IDs in deployment order
  autoPromote: boolean;
  requiresApproval: boolean;
  approvers: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface DeploymentApproval {
  id: string;
  deploymentId: string;
  environmentId: string;
  requestedBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  requestedAt: Date;
  respondedAt?: Date;
}

export interface CreateEnvironmentInput {
  name: string;
  type: 'development' | 'staging' | 'production';
  description: string;
  quickbaseAppId: string;
  quickbaseTableId?: string;
}

export interface CreateDeploymentInput {
  projectId: string;
  versionId: string;
  environmentId: string;
  deploymentType?: 'initial' | 'update';
}

export interface CreatePipelineInput {
  projectId: string;
  name: string;
  environments: string[];
  autoPromote?: boolean;
  requiresApproval?: boolean;
  approvers?: string[];
}

export interface RollbackInput {
  deploymentId: string;
  targetVersionId?: string;
  reason: string;
}

// Validation schemas
export const CreateEnvironmentSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['development', 'staging', 'production']),
  description: z.string().max(500),
  quickbaseAppId: z.string(),
  quickbaseTableId: z.string().optional(),
});

export const CreateDeploymentSchema = z.object({
  projectId: z.string(),
  versionId: z.string(),
  environmentId: z.string(),
  deploymentType: z.enum(['initial', 'update']).default('update'),
});

export const CreatePipelineSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(100),
  environments: z.array(z.string()).min(1),
  autoPromote: z.boolean().default(false),
  requiresApproval: z.boolean().default(true),
  approvers: z.array(z.string()).default([]),
});

export const RollbackSchema = z.object({
  deploymentId: z.string(),
  targetVersionId: z.string().optional(),
  reason: z.string().min(1).max(500),
});

export const ApprovalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
});

export class DeploymentService {
  private environments: Map<string, DeploymentEnvironment> = new Map();
  private deployments: Map<string, DeploymentRecord> = new Map();
  private pipelines: Map<string, DeploymentPipeline> = new Map();
  private approvals: Map<string, DeploymentApproval> = new Map();
  private quickbaseMCPAvailable: boolean = false;

  constructor() {
    this.checkQuickBaseMCPAvailability();
    this.initializeSampleData();
  }

  private async checkQuickBaseMCPAvailability(): Promise<void> {
    try {
      this.quickbaseMCPAvailable = process.env.QUICKBASE_MCP_ENABLED === 'true';
      console.log(`📦 QuickBase MCP Server availability for deployments: ${this.quickbaseMCPAvailable}`);
    } catch (error) {
      console.warn('⚠️ QuickBase MCP Server not available for deployments');
      this.quickbaseMCPAvailable = false;
    }
  }

  private initializeSampleData(): void {
    // Sample environments
    const devEnvironment: DeploymentEnvironment = {
      id: 'env-dev-001',
      name: 'Development',
      type: 'development',
      description: 'Development environment for testing codepages',
      quickbaseAppId: 'dev_app_id',
      quickbaseTableId: 'dev_codepages_table',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const stagingEnvironment: DeploymentEnvironment = {
      id: 'env-staging-001',
      name: 'Staging',
      type: 'staging',
      description: 'Staging environment for pre-production testing',
      quickbaseAppId: 'staging_app_id',
      quickbaseTableId: 'staging_codepages_table',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const prodEnvironment: DeploymentEnvironment = {
      id: 'env-prod-001',
      name: 'Production',
      type: 'production',
      description: 'Production environment for live codepages',
      quickbaseAppId: 'prod_app_id',
      quickbaseTableId: 'prod_codepages_table',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.environments.set(devEnvironment.id, devEnvironment);
    this.environments.set(stagingEnvironment.id, stagingEnvironment);
    this.environments.set(prodEnvironment.id, prodEnvironment);

    // Sample pipeline
    const samplePipeline: DeploymentPipeline = {
      id: 'pipeline-001',
      projectId: 'project-001',
      name: 'Standard Deployment Pipeline',
      environments: ['env-dev-001', 'env-staging-001', 'env-prod-001'],
      autoPromote: false,
      requiresApproval: true,
      approvers: ['admin-001', 'manager-001'],
      isActive: true,
      createdBy: 'admin-001',
      createdAt: new Date(),
    };

    this.pipelines.set(samplePipeline.id, samplePipeline);

    console.log('🚀 Initialized sample deployment environments and pipelines');
  }

  // Environment management

  async createEnvironment(input: CreateEnvironmentInput, createdBy: string): Promise<DeploymentEnvironment> {
    const environment: DeploymentEnvironment = {
      id: `env-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: input.name,
      type: input.type,
      description: input.description,
      quickbaseAppId: input.quickbaseAppId,
      quickbaseTableId: input.quickbaseTableId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.environments.set(environment.id, environment);

    console.log(`🌍 Created deployment environment: ${environment.name} (${environment.type})`);
    return environment;
  }

  async getEnvironments(): Promise<DeploymentEnvironment[]> {
    return Array.from(this.environments.values()).filter(env => env.isActive);
  }

  async getEnvironment(environmentId: string): Promise<DeploymentEnvironment | null> {
    return this.environments.get(environmentId) || null;
  }

  async updateEnvironment(
    environmentId: string, 
    updates: Partial<CreateEnvironmentInput>,
    updatedBy: string
  ): Promise<DeploymentEnvironment> {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      throw new Error('Environment not found');
    }

    if (updates.name !== undefined) environment.name = updates.name;
    if (updates.description !== undefined) environment.description = updates.description;
    if (updates.quickbaseAppId !== undefined) environment.quickbaseAppId = updates.quickbaseAppId;
    if (updates.quickbaseTableId !== undefined) environment.quickbaseTableId = updates.quickbaseTableId;
    environment.updatedAt = new Date();

    console.log(`📝 Updated environment: ${environment.name}`);
    return environment;
  }

  async deleteEnvironment(environmentId: string, deletedBy: string): Promise<void> {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      throw new Error('Environment not found');
    }

    // Check if environment has active deployments
    const activeDeployments = Array.from(this.deployments.values()).filter(
      d => d.environmentId === environmentId && d.status === 'deployed'
    );

    if (activeDeployments.length > 0) {
      throw new Error('Cannot delete environment with active deployments');
    }

    environment.isActive = false;
    environment.updatedAt = new Date();

    console.log(`🗑️ Deleted environment: ${environment.name}`);
  }

  // Deployment management

  async createDeployment(input: CreateDeploymentInput, deployedBy: string, deployedByName: string): Promise<DeploymentRecord> {
    const environment = await this.getEnvironment(input.environmentId);
    if (!environment) {
      throw new Error('Environment not found');
    }

    const deployment: DeploymentRecord = {
      id: `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: input.projectId,
      versionId: input.versionId,
      environmentId: input.environmentId,
      deployedBy,
      deployedByName,
      status: 'pending',
      deploymentType: input.deploymentType || 'update',
      deploymentLog: [],
      startedAt: new Date(),
    };

    this.deployments.set(deployment.id, deployment);

    // Start deployment process
    this.executeDeployment(deployment.id);

    console.log(`🚀 Created deployment ${deployment.id} for project ${input.projectId}`);
    return deployment;
  }

  private async executeDeployment(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error('Deployment not found');
    }

    try {
      deployment.status = 'in_progress';
      deployment.deploymentLog.push(`[${new Date().toISOString()}] Starting deployment to ${deployment.environmentId}`);

      const environment = await this.getEnvironment(deployment.environmentId);
      if (!environment) {
        throw new Error('Environment not found');
      }

      // Simulate deployment steps
      await this.deployToQuickBase(deployment, environment);
      await this.validateDeployment(deployment, environment);
      await this.updateDeploymentStatus(deployment, environment);

      deployment.status = 'deployed';
      deployment.completedAt = new Date();
      deployment.deploymentLog.push(`[${new Date().toISOString()}] Deployment completed successfully`);

      console.log(`✅ Deployment ${deploymentId} completed successfully`);

    } catch (error) {
      deployment.status = 'failed';
      deployment.completedAt = new Date();
      deployment.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      deployment.deploymentLog.push(`[${new Date().toISOString()}] Deployment failed: ${deployment.errorMessage}`);

      console.error(`❌ Deployment ${deploymentId} failed:`, error);
    }
  }

  private async deployToQuickBase(deployment: DeploymentRecord, environment: DeploymentEnvironment): Promise<void> {
    deployment.deploymentLog.push(`[${new Date().toISOString()}] Deploying codepage to QuickBase app ${environment.quickbaseAppId}`);

    if (this.quickbaseMCPAvailable) {
      // Simulate QuickBase MCP deployment
      deployment.deploymentLog.push(`[${new Date().toISOString()}] Using QuickBase MCP server for deployment`);
      
      // In a real implementation, this would:
      // 1. Get the codepage code from the version
      // 2. Deploy to QuickBase using MCP server methods
      // 3. Set up the codepage in the target application
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate deployment time
      
      deployment.quickbaseRecordId = Math.floor(Math.random() * 10000) + 1000;
      deployment.deploymentUrl = `https://quickbase.com/db/${environment.quickbaseAppId}`;
      
      deployment.deploymentLog.push(`[${new Date().toISOString()}] Codepage deployed with record ID: ${deployment.quickbaseRecordId}`);
    } else {
      deployment.deploymentLog.push(`[${new Date().toISOString()}] QuickBase MCP server not available, using fallback deployment`);
      
      // Simulate fallback deployment
      await new Promise(resolve => setTimeout(resolve, 1000));
      deployment.deploymentUrl = `https://quickbase.com/db/${environment.quickbaseAppId}`;
      
      deployment.deploymentLog.push(`[${new Date().toISOString()}] Fallback deployment completed`);
    }
  }

  private async validateDeployment(deployment: DeploymentRecord, environment: DeploymentEnvironment): Promise<void> {
    deployment.deploymentLog.push(`[${new Date().toISOString()}] Validating deployment in ${environment.name}`);

    // Simulate validation checks
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if codepage is accessible
    deployment.deploymentLog.push(`[${new Date().toISOString()}] Checking codepage accessibility`);
    
    // Check if codepage executes without errors
    deployment.deploymentLog.push(`[${new Date().toISOString()}] Validating codepage execution`);
    
    // Simulate random validation failure for testing
    if (Math.random() < 0.1) { // 10% chance of validation failure
      throw new Error('Codepage validation failed - syntax error detected');
    }

    deployment.deploymentLog.push(`[${new Date().toISOString()}] Deployment validation passed`);
  }

  private async updateDeploymentStatus(deployment: DeploymentRecord, environment: DeploymentEnvironment): Promise<void> {
    deployment.deploymentLog.push(`[${new Date().toISOString()}] Updating deployment status`);

    // Mark any previous deployments in this environment as inactive
    const previousDeployments = Array.from(this.deployments.values()).filter(
      d => d.environmentId === deployment.environmentId && 
           d.projectId === deployment.projectId && 
           d.id !== deployment.id &&
           d.status === 'deployed'
    );

    previousDeployments.forEach(prevDeployment => {
      prevDeployment.deploymentLog.push(`[${new Date().toISOString()}] Superseded by deployment ${deployment.id}`);
    });

    deployment.deploymentLog.push(`[${new Date().toISOString()}] Deployment status updated successfully`);
  }

  async getDeployment(deploymentId: string): Promise<DeploymentRecord | null> {
    return this.deployments.get(deploymentId) || null;
  }

  async getProjectDeployments(projectId: string, environmentId?: string): Promise<DeploymentRecord[]> {
    let deployments = Array.from(this.deployments.values()).filter(d => d.projectId === projectId);
    
    if (environmentId) {
      deployments = deployments.filter(d => d.environmentId === environmentId);
    }

    return deployments.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async getEnvironmentDeployments(environmentId: string): Promise<DeploymentRecord[]> {
    return Array.from(this.deployments.values())
      .filter(d => d.environmentId === environmentId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async getCurrentDeployment(projectId: string, environmentId: string): Promise<DeploymentRecord | null> {
    const deployments = Array.from(this.deployments.values()).filter(
      d => d.projectId === projectId && 
           d.environmentId === environmentId && 
           d.status === 'deployed'
    );

    if (deployments.length === 0) return null;

    return deployments.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];
  }

  // Rollback functionality

  async rollbackDeployment(input: RollbackInput, rolledBackBy: string, rolledBackByName: string): Promise<DeploymentRecord> {
    const originalDeployment = await this.getDeployment(input.deploymentId);
    if (!originalDeployment) {
      throw new Error('Original deployment not found');
    }

    if (originalDeployment.status !== 'deployed') {
      throw new Error('Can only rollback deployed versions');
    }

    // Determine target version for rollback
    let targetVersionId = input.targetVersionId;
    if (!targetVersionId) {
      // Find the previous successful deployment
      const previousDeployments = await this.getProjectDeployments(
        originalDeployment.projectId, 
        originalDeployment.environmentId
      );
      
      const previousSuccessful = previousDeployments.find(
        d => d.id !== originalDeployment.id && d.status === 'deployed'
      );
      
      if (!previousSuccessful) {
        throw new Error('No previous deployment found for rollback');
      }
      
      targetVersionId = previousSuccessful.versionId;
    }

    // Create rollback deployment
    const rollbackDeployment: DeploymentRecord = {
      id: `rollback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: originalDeployment.projectId,
      versionId: targetVersionId,
      environmentId: originalDeployment.environmentId,
      deployedBy: rolledBackBy,
      deployedByName: rolledBackByName,
      status: 'pending',
      deploymentType: 'rollback',
      deploymentLog: [],
      rollbackVersionId: originalDeployment.versionId,
      rollbackReason: input.reason,
      startedAt: new Date(),
    };

    this.deployments.set(rollbackDeployment.id, rollbackDeployment);

    // Mark original deployment as rolled back
    originalDeployment.status = 'rolled_back';
    originalDeployment.deploymentLog.push(
      `[${new Date().toISOString()}] Rolled back by ${rolledBackByName}: ${input.reason}`
    );

    // Execute rollback deployment
    this.executeDeployment(rollbackDeployment.id);

    console.log(`🔄 Created rollback deployment ${rollbackDeployment.id} for ${input.deploymentId}`);
    return rollbackDeployment;
  }

  // Pipeline management

  async createPipeline(input: CreatePipelineInput, createdBy: string): Promise<DeploymentPipeline> {
    // Validate that all environments exist
    for (const envId of input.environments) {
      const env = await this.getEnvironment(envId);
      if (!env) {
        throw new Error(`Environment ${envId} not found`);
      }
    }

    const pipeline: DeploymentPipeline = {
      id: `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: input.projectId,
      name: input.name,
      environments: input.environments,
      autoPromote: input.autoPromote || false,
      requiresApproval: input.requiresApproval !== false, // Default to true
      approvers: input.approvers || [],
      isActive: true,
      createdBy,
      createdAt: new Date(),
    };

    this.pipelines.set(pipeline.id, pipeline);

    console.log(`📋 Created deployment pipeline: ${pipeline.name}`);
    return pipeline;
  }

  async getPipeline(pipelineId: string): Promise<DeploymentPipeline | null> {
    return this.pipelines.get(pipelineId) || null;
  }

  async getProjectPipelines(projectId: string): Promise<DeploymentPipeline[]> {
    return Array.from(this.pipelines.values()).filter(p => p.projectId === projectId && p.isActive);
  }

  async deployToPipeline(
    pipelineId: string, 
    versionId: string, 
    deployedBy: string, 
    deployedByName: string
  ): Promise<DeploymentRecord[]> {
    const pipeline = await this.getPipeline(pipelineId);
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    const deployments: DeploymentRecord[] = [];

    // Deploy to first environment
    if (pipeline.environments.length > 0) {
      const firstEnvId = pipeline.environments[0];
      const deployment = await this.createDeployment({
        projectId: pipeline.projectId,
        versionId,
        environmentId: firstEnvId,
        deploymentType: 'update',
      }, deployedBy, deployedByName);

      deployments.push(deployment);

      // If auto-promote is enabled, continue to next environments
      if (pipeline.autoPromote && pipeline.environments.length > 1) {
        // Wait for first deployment to complete, then continue
        // In a real implementation, this would be handled by a background job
        setTimeout(async () => {
          await this.promoteToNextEnvironment(pipeline, deployment, deployedBy, deployedByName);
        }, 5000);
      }
    }

    return deployments;
  }

  private async promoteToNextEnvironment(
    pipeline: DeploymentPipeline,
    currentDeployment: DeploymentRecord,
    deployedBy: string,
    deployedByName: string
  ): Promise<void> {
    const currentEnvIndex = pipeline.environments.indexOf(currentDeployment.environmentId);
    if (currentEnvIndex === -1 || currentEnvIndex >= pipeline.environments.length - 1) {
      return; // No next environment
    }

    // Check if current deployment is successful
    const deployment = await this.getDeployment(currentDeployment.id);
    if (!deployment || deployment.status !== 'deployed') {
      console.log(`⚠️ Skipping promotion - current deployment not successful`);
      return;
    }

    const nextEnvId = pipeline.environments[currentEnvIndex + 1];
    
    if (pipeline.requiresApproval) {
      // Create approval request
      await this.createApprovalRequest(currentDeployment.id, nextEnvId, deployedBy);
    } else {
      // Auto-promote
      await this.createDeployment({
        projectId: pipeline.projectId,
        versionId: currentDeployment.versionId,
        environmentId: nextEnvId,
        deploymentType: 'update',
      }, deployedBy, deployedByName);
    }
  }

  // Approval management

  async createApprovalRequest(deploymentId: string, environmentId: string, requestedBy: string): Promise<DeploymentApproval> {
    const approval: DeploymentApproval = {
      id: `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      deploymentId,
      environmentId,
      requestedBy,
      status: 'pending',
      requestedAt: new Date(),
    };

    this.approvals.set(approval.id, approval);

    console.log(`📋 Created approval request ${approval.id} for deployment ${deploymentId}`);
    return approval;
  }

  async processApproval(
    approvalId: string, 
    action: 'approve' | 'reject', 
    approvedBy: string, 
    reason?: string
  ): Promise<DeploymentApproval> {
    const approval = this.approvals.get(approvalId);
    if (!approval) {
      throw new Error('Approval request not found');
    }

    if (approval.status !== 'pending') {
      throw new Error('Approval request already processed');
    }

    approval.status = action === 'approve' ? 'approved' : 'rejected';
    approval.approvedBy = approvedBy;
    approval.reason = reason;
    approval.respondedAt = new Date();

    if (action === 'approve') {
      // Continue with deployment to the approved environment
      const originalDeployment = await this.getDeployment(approval.deploymentId);
      if (originalDeployment) {
        await this.createDeployment({
          projectId: originalDeployment.projectId,
          versionId: originalDeployment.versionId,
          environmentId: approval.environmentId,
          deploymentType: 'update',
        }, approvedBy, `Approved by ${approvedBy}`);
      }
    }

    console.log(`✅ Processed approval ${approvalId}: ${action}`);
    return approval;
  }

  async getPendingApprovals(userId: string): Promise<DeploymentApproval[]> {
    return Array.from(this.approvals.values()).filter(a => a.status === 'pending');
  }

  async getApproval(approvalId: string): Promise<DeploymentApproval | null> {
    return this.approvals.get(approvalId) || null;
  }

  // Statistics and monitoring

  async getDeploymentStats(projectId?: string): Promise<{
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    rolledBackDeployments: number;
    averageDeploymentTime: number;
    deploymentsByEnvironment: Record<string, number>;
    recentDeployments: DeploymentRecord[];
  }> {
    let deployments = Array.from(this.deployments.values());
    
    if (projectId) {
      deployments = deployments.filter(d => d.projectId === projectId);
    }

    const successful = deployments.filter(d => d.status === 'deployed');
    const failed = deployments.filter(d => d.status === 'failed');
    const rolledBack = deployments.filter(d => d.status === 'rolled_back');

    const completedDeployments = deployments.filter(d => d.completedAt);
    const averageTime = completedDeployments.length > 0
      ? completedDeployments.reduce((sum, d) => {
          return sum + (d.completedAt!.getTime() - d.startedAt.getTime());
        }, 0) / completedDeployments.length
      : 0;

    const deploymentsByEnvironment: Record<string, number> = {};
    deployments.forEach(d => {
      deploymentsByEnvironment[d.environmentId] = (deploymentsByEnvironment[d.environmentId] || 0) + 1;
    });

    const recentDeployments = deployments
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, 10);

    return {
      totalDeployments: deployments.length,
      successfulDeployments: successful.length,
      failedDeployments: failed.length,
      rolledBackDeployments: rolledBack.length,
      averageDeploymentTime: averageTime,
      deploymentsByEnvironment,
      recentDeployments,
    };
  }

  async getEnvironmentStatus(): Promise<Array<{
    environment: DeploymentEnvironment;
    activeDeployments: number;
    lastDeployment?: DeploymentRecord;
    healthStatus: 'healthy' | 'warning' | 'error';
  }>> {
    const environments = await this.getEnvironments();
    const status = [];

    for (const env of environments) {
      const envDeployments = await this.getEnvironmentDeployments(env.id);
      const activeDeployments = envDeployments.filter(d => d.status === 'deployed').length;
      const lastDeployment = envDeployments[0];

      let healthStatus: 'healthy' | 'warning' | 'error' = 'healthy';
      if (lastDeployment) {
        if (lastDeployment.status === 'failed') {
          healthStatus = 'error';
        } else if (lastDeployment.status === 'rolled_back') {
          healthStatus = 'warning';
        }
      }

      status.push({
        environment: env,
        activeDeployments,
        lastDeployment,
        healthStatus,
      });
    }

    return status;
  }
}