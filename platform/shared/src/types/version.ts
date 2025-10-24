import { z } from 'zod';
import { DeploymentStatusSchema, type DeploymentStatus } from './deployment.js';

// Enhanced Codepage Version Schema with Version Control
export const CodepageVersionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  versionNumber: z.string(),
  code: z.string(),
  changelog: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  parentVersionId: z.string().optional(),
  branchName: z.string(),
  tags: z.array(z.string()),
  commitHash: z.string(),
  testResults: z.string().optional(), // Reference to test result ID
  deploymentStatus: DeploymentStatusSchema,
  isActive: z.boolean(),
  createdAt: z.date(),
});

export type CodepageVersion = z.infer<typeof CodepageVersionSchema>;

// Version Creation Input
export const CreateVersionSchema = z.object({
  projectId: z.string(),
  code: z.string(),
  changelog: z.string().max(1000),
  branchName: z.string().default('main'),
  tags: z.array(z.string()).default([]),
  parentVersionId: z.string().optional(),
});

export type CreateVersionInput = z.infer<typeof CreateVersionSchema>;

// Code Difference Schema
export const CodeDifferenceSchema = z.object({
  type: z.enum(['addition', 'deletion', 'modification']),
  lineNumber: z.number(),
  oldLineNumber: z.number().optional(),
  newLineNumber: z.number().optional(),
  content: z.string(),
  oldContent: z.string().optional(),
  newContent: z.string().optional(),
});

export type CodeDifference = z.infer<typeof CodeDifferenceSchema>;

// Version Comparison Schema
export const VersionComparisonSchema = z.object({
  fromVersion: CodepageVersionSchema,
  toVersion: CodepageVersionSchema,
  differences: z.array(CodeDifferenceSchema),
  summary: z.object({
    linesAdded: z.number(),
    linesRemoved: z.number(),
    linesModified: z.number(),
    totalChanges: z.number(),
  }),
});

export type VersionComparison = z.infer<typeof VersionComparisonSchema>;

// Branch Information Schema
export const BranchInfoSchema = z.object({
  name: z.string(),
  projectId: z.string(),
  baseVersionId: z.string(),
  headVersionId: z.string(),
  createdBy: z.string(),
  createdAt: z.date(),
  isActive: z.boolean(),
  description: z.string().optional(),
});

export type BranchInfo = z.infer<typeof BranchInfoSchema>;

// Merge Conflict Schema
export const MergeConflictSchema = z.object({
  id: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  baseContent: z.string(),
  incomingContent: z.string(),
  currentContent: z.string(),
  type: z.enum(['content', 'deletion', 'addition']),
});

export type MergeConflict = z.infer<typeof MergeConflictSchema>;

// Conflict Resolution Schema
export const ConflictResolutionSchema = z.object({
  conflictId: z.string(),
  projectId: z.string(),
  baseVersionId: z.string(),
  incomingVersionId: z.string(),
  conflicts: z.array(MergeConflictSchema),
  resolvedCode: z.string().optional(),
  resolvedBy: z.string().optional(),
  resolvedAt: z.date().optional(),
  status: z.enum(['pending', 'resolved', 'abandoned']),
});

export type ConflictResolution = z.infer<typeof ConflictResolutionSchema>;