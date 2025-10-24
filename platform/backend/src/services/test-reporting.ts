import { z } from 'zod';
import { TestResult, TestError, PerformanceMetrics } from './test.js';

// Test report generation interfaces
export interface TestReport {
  id: string;
  projectId: string;
  versionId: string;
  testResults: TestResult[];
  summary: TestSummary;
  performanceAnalysis: PerformanceAnalysis;
  errorAnalysis: ErrorAnalysis;
  recommendations: string[];
  generatedAt: Date;
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  errorTests: number;
  successRate: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  averageMemoryUsage: number;
  totalApiCalls: number;
}

export interface PerformanceAnalysis {
  executionTimeDistribution: {
    min: number;
    max: number;
    average: number;
    median: number;
    p95: number;
  };
  memoryUsageDistribution: {
    min: number;
    max: number;
    average: number;
    median: number;
    p95: number;
  };
  apiPerformance: {
    totalCalls: number;
    averageResponseTime: number;
    slowestCalls: Array<{
      method: string;
      responseTime: number;
      timestamp: number;
    }>;
  };
  performanceIssues: string[];
}

export interface ErrorAnalysis {
  errorsByType: Map<string, number>;
  commonErrors: Array<{
    message: string;
    count: number;
    affectedTests: string[];
  }>;
  errorTrends: Array<{
    timestamp: number;
    errorCount: number;
    errorRate: number;
  }>;
  criticalErrors: TestError[];
}

// Test execution pipeline for capturing detailed results
export interface TestExecutionPipeline {
  captureApiCalls: boolean;
  capturePerformanceMetrics: boolean;
  captureErrorDetails: boolean;
  captureStackTraces: boolean;
  generateReport: boolean;
}

// Validation schemas
export const TestReportConfigSchema = z.object({
  includePerformanceAnalysis: z.boolean().default(true),
  includeErrorAnalysis: z.boolean().default(true),
  includeRecommendations: z.boolean().default(true),
  detailLevel: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed'),
});

export type TestReportConfig = z.infer<typeof TestReportConfigSchema>;

export class TestReportingService {
  private testResults: Map<string, TestResult[]> = new Map();
  private testReports: Map<string, TestReport> = new Map();

  constructor() {
    console.log('📊 Test Reporting Service initialized');
  }

  // Capture and store test results
  async captureTestResult(result: TestResult): Promise<void> {
    const projectKey = `${result.projectId}-${result.versionId}`;
    
    if (!this.testResults.has(projectKey)) {
      this.testResults.set(projectKey, []);
    }
    
    const results = this.testResults.get(projectKey)!;
    results.push(result);
    
    // Keep only the last 100 results per project/version
    if (results.length > 100) {
      results.splice(0, results.length - 100);
    }
    
    console.log(`📊 Test result captured: ${result.id} (${result.status})`);
    
    // Auto-generate report if this is a significant result
    if (result.status === 'error' || result.errors.length > 0) {
      await this.generateReport(result.projectId, result.versionId, { 
        detailLevel: 'detailed',
        includePerformanceAnalysis: true,
        includeErrorAnalysis: true,
        includeRecommendations: true
      });
    }
  }

  // Generate comprehensive test report
  async generateReport(
    projectId: string, 
    versionId: string, 
    config: Partial<TestReportConfig> = {}
  ): Promise<TestReport> {
    const projectKey = `${projectId}-${versionId}`;
    const results = this.testResults.get(projectKey) || [];
    
    if (results.length === 0) {
      throw new Error('No test results found for the specified project and version');
    }

    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`📊 Generating test report: ${reportId} for ${projectKey}`);

    const summary = this.generateTestSummary(results);
    const performanceAnalysis = config.includePerformanceAnalysis !== false 
      ? this.generatePerformanceAnalysis(results) 
      : this.getEmptyPerformanceAnalysis();
    const errorAnalysis = config.includeErrorAnalysis !== false 
      ? this.generateErrorAnalysis(results) 
      : this.getEmptyErrorAnalysis();
    const recommendations = config.includeRecommendations !== false 
      ? this.generateRecommendations(summary, performanceAnalysis, errorAnalysis) 
      : [];

    const report: TestReport = {
      id: reportId,
      projectId,
      versionId,
      testResults: results.slice(-20), // Include last 20 results in report
      summary,
      performanceAnalysis,
      errorAnalysis,
      recommendations,
      generatedAt: new Date(),
    };

    this.testReports.set(reportId, report);
    
    console.log(`✅ Test report generated: ${reportId}`);
    console.log(`   Total tests: ${summary.totalTests}`);
    console.log(`   Success rate: ${summary.successRate.toFixed(1)}%`);
    console.log(`   Average execution time: ${summary.averageExecutionTime}ms`);

    return report;
  }

  private generateTestSummary(results: TestResult[]): TestSummary {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'passed').length;
    const failedTests = results.filter(r => r.status === 'failed').length;
    const errorTests = results.filter(r => r.status === 'error').length;
    
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    
    const totalExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0);
    const averageExecutionTime = totalTests > 0 ? totalExecutionTime / totalTests : 0;
    
    const totalMemoryUsage = results.reduce((sum, r) => sum + r.memoryUsage, 0);
    const averageMemoryUsage = totalTests > 0 ? totalMemoryUsage / totalTests : 0;
    
    const totalApiCalls = results.reduce((sum, r) => sum + r.apiCallCount, 0);

    return {
      totalTests,
      passedTests,
      failedTests,
      errorTests,
      successRate,
      averageExecutionTime: Math.round(averageExecutionTime),
      totalExecutionTime,
      averageMemoryUsage: Math.round(averageMemoryUsage),
      totalApiCalls,
    };
  }

  private generatePerformanceAnalysis(results: TestResult[]): PerformanceAnalysis {
    const executionTimes = results.map(r => r.executionTime).sort((a, b) => a - b);
    const memoryUsages = results.map(r => r.memoryUsage).sort((a, b) => a - b);
    
    const executionTimeDistribution = {
      min: executionTimes[0] || 0,
      max: executionTimes[executionTimes.length - 1] || 0,
      average: executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length || 0,
      median: this.calculateMedian(executionTimes),
      p95: this.calculatePercentile(executionTimes, 95),
    };

    const memoryUsageDistribution = {
      min: memoryUsages[0] || 0,
      max: memoryUsages[memoryUsages.length - 1] || 0,
      average: memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length || 0,
      median: this.calculateMedian(memoryUsages),
      p95: this.calculatePercentile(memoryUsages, 95),
    };

    const totalApiCalls = results.reduce((sum, r) => sum + r.apiCallCount, 0);
    const totalApiResponseTime = results.reduce((sum, r) => 
      sum + (r.performanceMetrics?.apiResponseTime || 0) * r.apiCallCount, 0
    );
    const averageResponseTime = totalApiCalls > 0 ? totalApiResponseTime / totalApiCalls : 0;

    // Identify performance issues
    const performanceIssues: string[] = [];
    
    if (executionTimeDistribution.p95 > 10000) { // 10 seconds
      performanceIssues.push('95th percentile execution time exceeds 10 seconds');
    }
    
    if (memoryUsageDistribution.p95 > 100 * 1024 * 1024) { // 100MB
      performanceIssues.push('95th percentile memory usage exceeds 100MB');
    }
    
    if (averageResponseTime > 1000) { // 1 second
      performanceIssues.push('Average API response time exceeds 1 second');
    }

    const apiPerformance = {
      totalCalls: totalApiCalls,
      averageResponseTime: Math.round(averageResponseTime),
      slowestCalls: this.identifySlowestApiCalls(results),
    };

    return {
      executionTimeDistribution: {
        ...executionTimeDistribution,
        average: Math.round(executionTimeDistribution.average),
        median: Math.round(executionTimeDistribution.median),
        p95: Math.round(executionTimeDistribution.p95),
      },
      memoryUsageDistribution: {
        ...memoryUsageDistribution,
        average: Math.round(memoryUsageDistribution.average),
        median: Math.round(memoryUsageDistribution.median),
        p95: Math.round(memoryUsageDistribution.p95),
      },
      apiPerformance,
      performanceIssues,
    };
  }

  private generateErrorAnalysis(results: TestResult[]): ErrorAnalysis {
    const errorsByType = new Map<string, number>();
    const errorMessages = new Map<string, { count: number; affectedTests: string[] }>();
    const criticalErrors: TestError[] = [];

    // Analyze errors
    results.forEach(result => {
      result.errors.forEach((error: TestError) => {
        // Count by error type
        const count = errorsByType.get(error.type) || 0;
        errorsByType.set(error.type, count + 1);

        // Count by error message
        const messageKey = error.message.substring(0, 100); // Truncate for grouping
        if (!errorMessages.has(messageKey)) {
          errorMessages.set(messageKey, { count: 0, affectedTests: [] });
        }
        const messageData = errorMessages.get(messageKey)!;
        messageData.count++;
        messageData.affectedTests.push(result.id);

        // Identify critical errors
        if (error.type === 'ReferenceError' || error.type === 'TypeError' || 
            error.message.includes('timeout') || error.message.includes('memory')) {
          criticalErrors.push(error);
        }
      });
    });

    // Convert to arrays and sort
    const commonErrors = Array.from(errorMessages.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 most common errors

    // Generate error trends (simplified - would be more sophisticated in production)
    const errorTrends = this.generateErrorTrends(results);

    return {
      errorsByType,
      commonErrors,
      errorTrends,
      criticalErrors: criticalErrors.slice(0, 5), // Top 5 critical errors
    };
  }

  private generateRecommendations(
    summary: TestSummary, 
    performance: PerformanceAnalysis, 
    errors: ErrorAnalysis
  ): string[] {
    const recommendations: string[] = [];

    // Success rate recommendations
    if (summary.successRate < 80) {
      recommendations.push('Test success rate is below 80%. Review and fix failing tests to improve reliability.');
    } else if (summary.successRate < 95) {
      recommendations.push('Test success rate could be improved. Consider investigating intermittent failures.');
    }

    // Performance recommendations
    if (performance.executionTimeDistribution.average > 5000) {
      recommendations.push('Average execution time exceeds 5 seconds. Consider optimizing codepage logic or reducing API calls.');
    }

    if (performance.memoryUsageDistribution.average > 50 * 1024 * 1024) {
      recommendations.push('Average memory usage exceeds 50MB. Review memory-intensive operations and consider optimization.');
    }

    if (performance.apiPerformance.averageResponseTime > 500) {
      recommendations.push('API response times are high. Consider caching frequently accessed data or optimizing queries.');
    }

    // Error-based recommendations
    if (errors.criticalErrors.length > 0) {
      recommendations.push('Critical errors detected. Prioritize fixing ReferenceError, TypeError, and timeout issues.');
    }

    if (errors.commonErrors.length > 0 && errors.commonErrors[0].count > summary.totalTests * 0.1) {
      recommendations.push(`Most common error affects ${errors.commonErrors[0].count} tests. Focus on resolving: "${errors.commonErrors[0].message}"`);
    }

    // API usage recommendations
    if (summary.totalApiCalls > summary.totalTests * 20) {
      recommendations.push('High API call volume detected. Consider batching operations or implementing caching.');
    }

    // General recommendations
    if (summary.totalTests < 10) {
      recommendations.push('Consider adding more comprehensive test cases to improve coverage and reliability.');
    }

    return recommendations;
  }

  // Utility methods

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0 
      ? (values[mid - 1] + values[mid]) / 2 
      : values[mid];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, Math.min(index, values.length - 1))];
  }

  private identifySlowestApiCalls(results: TestResult[]): Array<{
    method: string;
    responseTime: number;
    timestamp: number;
  }> {
    // This would analyze API call logs from test execution
    // For now, return mock data based on performance metrics
    return results
      .filter(r => r.performanceMetrics?.apiResponseTime && r.performanceMetrics.apiResponseTime > 1000)
      .map(r => ({
        method: 'queryRecords', // Would be extracted from actual API logs
        responseTime: r.performanceMetrics!.apiResponseTime,
        timestamp: r.createdAt.getTime(),
      }))
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 5);
  }

  private generateErrorTrends(results: TestResult[]): Array<{
    timestamp: number;
    errorCount: number;
    errorRate: number;
  }> {
    // Group results by time periods (e.g., hourly)
    const timeGroups = new Map<number, { total: number; errors: number }>();
    
    results.forEach(result => {
      const hourTimestamp = Math.floor(result.createdAt.getTime() / (1000 * 60 * 60)) * (1000 * 60 * 60);
      
      if (!timeGroups.has(hourTimestamp)) {
        timeGroups.set(hourTimestamp, { total: 0, errors: 0 });
      }
      
      const group = timeGroups.get(hourTimestamp)!;
      group.total++;
      if (result.status === 'error' || result.errors.length > 0) {
        group.errors++;
      }
    });

    return Array.from(timeGroups.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        errorCount: data.errors,
        errorRate: data.total > 0 ? (data.errors / data.total) * 100 : 0,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  private getEmptyPerformanceAnalysis(): PerformanceAnalysis {
    return {
      executionTimeDistribution: { min: 0, max: 0, average: 0, median: 0, p95: 0 },
      memoryUsageDistribution: { min: 0, max: 0, average: 0, median: 0, p95: 0 },
      apiPerformance: { totalCalls: 0, averageResponseTime: 0, slowestCalls: [] },
      performanceIssues: [],
    };
  }

  private getEmptyErrorAnalysis(): ErrorAnalysis {
    return {
      errorsByType: new Map(),
      commonErrors: [],
      errorTrends: [],
      criticalErrors: [],
    };
  }

  // Public API methods

  async getReport(reportId: string): Promise<TestReport | null> {
    return this.testReports.get(reportId) || null;
  }

  async getProjectReports(projectId: string): Promise<TestReport[]> {
    return Array.from(this.testReports.values())
      .filter(report => report.projectId === projectId)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  async getTestResults(projectId: string, versionId: string): Promise<TestResult[]> {
    const projectKey = `${projectId}-${versionId}`;
    return this.testResults.get(projectKey) || [];
  }

  async deleteOldResults(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    // Clean up test results
    Array.from(this.testResults.entries()).forEach(([key, results]) => {
      const filteredResults = results.filter(r => r.createdAt > cutoffDate);
      if (filteredResults.length !== results.length) {
        deletedCount += results.length - filteredResults.length;
        this.testResults.set(key, filteredResults);
      }
    });

    // Clean up reports
    Array.from(this.testReports.entries()).forEach(([reportId, report]) => {
      if (report.generatedAt < cutoffDate) {
        this.testReports.delete(reportId);
        deletedCount++;
      }
    });

    console.log(`🧹 Cleaned up ${deletedCount} old test results and reports`);
    return deletedCount;
  }

  async getReportingStats(): Promise<{
    totalResults: number;
    totalReports: number;
    oldestResult: Date | null;
    newestResult: Date | null;
    averageResultsPerProject: number;
  }> {
    let totalResults = 0;
    let oldestResult: Date | null = null;
    let newestResult: Date | null = null;

    Array.from(this.testResults.values()).forEach(results => {
      totalResults += results.length;
      
      results.forEach(result => {
        if (!oldestResult || result.createdAt < oldestResult) {
          oldestResult = result.createdAt;
        }
        if (!newestResult || result.createdAt > newestResult) {
          newestResult = result.createdAt;
        }
      });
    });

    const averageResultsPerProject = this.testResults.size > 0 
      ? totalResults / this.testResults.size 
      : 0;

    return {
      totalResults,
      totalReports: this.testReports.size,
      oldestResult,
      newestResult,
      averageResultsPerProject: Math.round(averageResultsPerProject),
    };
  }
}