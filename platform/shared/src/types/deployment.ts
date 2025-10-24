import { z } from 'zod';

// Environment Type Enum
export const EnvironmentTypeSchema = z.enum(['development', 'staging', 'production']);
export type EnvironmentType = z.infer<typeof EnvironmentTypeSchema>;

// Deployment Status Enum
export const DeploymentStatusSchema = z.enum(['pending', 'in_progress', 'deployed', 'failed', 'rolled_back']);
export type DeploymentStatus = z.infer<typeof DeploymentStatusSchema>;

// Deployment Type Enum
export const DeploymentTypeSchema = z.enum(['initial', 'update', 'rollback']);
export type DeploymentType = z.infer<typeof DeploymentTypeSchema>;

// Approval Status Enum
export const ApprovalStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

// Health Status Enum
export const HealthStatusSchema = z.enum(['healthy', 'warning', 'error']);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

// Deployment Environment Schema
export const DeploymentEnvironmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: EnvironmentTypeSchema,
  description: z.string(),
  quickbaseAppId: z.string(),
  quickbaseTableId: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DeploymentEnvironment = z.infer<typeof DeploymentEnvironmentSchema>;

// Deployment Record Schema
export const DeploymentRecordSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  versionId: z.string(),
  environmentId: z.string(),
  deployedBy: z.string(),
  deployedByName: z.string(),
  status: DeploymentStatusSchema,
  deploymentType: DeploymentTypeSchema,
  quickbaseRecordId: z.number().optional(),
  deploymentUrl: z.string().optional(),
  deploymentLog: z.array(z.string()),
  errorMessage: z.string().optional(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  rollbackVersionId: z.string().optional(),
  rollbackReason: z.string().optional(),
});

export type DeploymentRecord = z.infer<typeof DeploymentRecordSchema>;

// Deployment Pipeline Schema
export const DeploymentPipelineSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  environments: z.array(z.string()),
  autoPromote: z.boolean(),
  requiresApproval: z.boolean(),
  approvers: z.array(z.string()),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: z.date(),
});

export type DeploymentPipeline = z.infer<typeof DeploymentPipelineSchema>;

// Deployment Approval Schema
export const DeploymentApprovalSchema = z.object({
  id: z.string(),
  deploymentId: z.string(),
  environmentId: z.string(),
  requestedBy: z.string(),
  approvedBy: z.string().optional(),
  status: ApprovalStatusSchema,
  reason: z.string().optional(),
  requestedAt: z.date(),
  respondedAt: z.date().optional(),
});

export type DeploymentApproval = z.infer<typeof DeploymentApprovalSchema>;

// Input Schemas

// Create Environment Input
export const CreateEnvironmentSchema = z.object({
  name: z.string().min(1).max(100),
  type: EnvironmentTypeSchema,
  description: z.string().max(500),
  quickbaseAppId: z.string(),
  quickbaseTableId: z.string().optional(),
});

export type CreateEnvironmentInput = z.infer<typeof CreateEnvironmentSchema>;

// Create Deployment Input
export const CreateDeploymentSchema = z.object({
  projectId: z.string(),
  versionId: z.string(),
  environmentId: z.string(),
  deploymentType: DeploymentTypeSchema.default('update'),
});

export type CreateDeploymentInput = z.infer<typeof CreateDeploymentSchema>;

// Create Pipeline Input
export const CreatePipelineSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(100),
  environments: z.array(z.string()).min(1),
  autoPromote: z.boolean().default(false),
  requiresApproval: z.boolean().default(true),
  approvers: z.array(z.string()).default([]),
});

export type CreatePipelineInput = z.infer<typeof CreatePipelineSchema>;

// Rollback Input
export const RollbackSchema = z.object({
  deploymentId: z.string(),
  targetVersionId: z.string().optional(),
  reason: z.string().min(1).max(500),
});

export type RollbackInput = z.infer<typeof RollbackSchema>;

// Approval Action Input
export const ApprovalActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
});

export type ApprovalActionInput = z.infer<typeof ApprovalActionSchema>;

// Statistics Schemas

// Deployment Statistics
export const DeploymentStatsSchema = z.object({
  totalDeployments: z.number(),
  successfulDeployments: z.number(),
  failedDeployments: z.number(),
  rolledBackDeployments: z.number(),
  averageDeploymentTime: z.number(),
  deploymentsByEnvironment: z.record(z.string(), z.number()),
  recentDeployments: z.array(DeploymentRecordSchema),
});

export type DeploymentStats = z.infer<typeof DeploymentStatsSchema>;

// Environment Status
export const EnvironmentStatusSchema = z.object({
  environment: DeploymentEnvironmentSchema,
  activeDeployments: z.number(),
  lastDeployment: DeploymentRecordSchema.optional(),
  healthStatus: HealthStatusSchema,
});

export type EnvironmentStatus = z.infer<typeof EnvironmentStatusSchema>;