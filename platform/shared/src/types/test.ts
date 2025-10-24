import { z } from 'zod';

// Test Status Enum
export const TestStatusSchema = z.enum(['passed', 'failed', 'error', 'running', 'pending']);
export type TestStatus = z.infer<typeof TestStatusSchema>;

// Test Error Schema
export const TestErrorSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  lineNumber: z.number().optional(),
  columnNumber: z.number().optional(),
  type: z.string(),
});

export type TestError = z.infer<typeof TestErrorSchema>;

// Performance Metrics Schema
export const PerformanceMetricsSchema = z.object({
  executionTime: z.number(), // milliseconds
  memoryUsage: z.number(), // bytes
  cpuUsage: z.number().optional(), // percentage
  apiCallCount: z.number(),
  apiResponseTime: z.number(), // average milliseconds
});

export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

// Test Coverage Schema
export const TestCoverageSchema = z.object({
  linesTotal: z.number(),
  linesCovered: z.number(),
  functionsTotal: z.number(),
  functionsCovered: z.number(),
  branchesTotal: z.number(),
  branchesCovered: z.number(),
  percentage: z.number(),
});

export type TestCoverage = z.infer<typeof TestCoverageSchema>;

// Test Result Schema
export const TestResultSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  versionId: z.string(),
  status: TestStatusSchema,
  executionTime: z.number(),
  memoryUsage: z.number(),
  apiCallCount: z.number(),
  errors: z.array(TestErrorSchema),
  coverage: TestCoverageSchema.optional(),
  performanceMetrics: PerformanceMetricsSchema,
  logs: z.array(z.string()).optional(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
});

export type TestResult = z.infer<typeof TestResultSchema>;

// Test Configuration Schema
export const TestConfigSchema = z.object({
  timeout: z.number().default(30000), // 30 seconds
  memoryLimit: z.number().default(134217728), // 128MB in bytes
  apiCallLimit: z.number().default(100),
  mockData: z.record(z.any()).optional(),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
});

export type TestConfig = z.infer<typeof TestConfigSchema>;

// Test Execution Input
export const ExecuteTestSchema = z.object({
  projectId: z.string(),
  versionId: z.string().optional(), // If not provided, uses current version
  config: TestConfigSchema.optional(),
  testData: z.record(z.any()).optional(),
});

export type ExecuteTestInput = z.infer<typeof ExecuteTestSchema>;