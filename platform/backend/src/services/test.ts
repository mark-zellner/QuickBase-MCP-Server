import { VM } from 'vm2';
import { z } from 'zod';
// Local type definitions for test functionality
export interface TestResult {
  id: string;
  projectId: string;
  versionId: string;
  status: 'passed' | 'failed' | 'error';
  executionTime: number;
  memoryUsage: number;
  apiCallCount: number;
  errors: TestError[];
  performanceMetrics: PerformanceMetrics;
  logs: string[];
  createdAt: Date;
  completedAt?: Date;
}

export interface TestConfig {
  timeout: number;
  memoryLimit: number;
  apiCallLimit: number;
  environment: 'development' | 'staging' | 'production';
}

export interface ExecuteTestInput {
  projectId: string;
  versionId?: string;
  config?: Partial<TestConfig>;
  testData?: any;
}

export interface TestError {
  message: string;
  stack?: string;
  type: string;
  lineNumber?: number;
  columnNumber?: number;
}

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  apiCallCount: number;
  apiResponseTime: number;
}
import { TestReportingService } from './test-reporting.js';

// Mock QuickBase API for safe testing
export interface MockQuickBaseAPI {
  api: {
    queryRecords: (params: any) => Promise<any>;
    createRecord: (params: any) => Promise<any>;
    updateRecord: (params: any) => Promise<any>;
    deleteRecord: (params: any) => Promise<any>;
    getRecord: (params: any) => Promise<any>;
    bulkCreateRecords: (params: any) => Promise<any>;
  };
  on: (event: string, callback: () => void) => void;
}

// Test execution context
export interface TestExecutionContext {
  testId: string;
  projectId: string;
  versionId: string;
  config: TestConfig;
  startTime: number;
  apiCalls: Array<{
    method: string;
    params: any;
    response: any;
    timestamp: number;
    duration: number;
  }>;
  logs: string[];
  memoryUsage: number[];
}

// Sandbox resource monitor
export interface ResourceMonitor {
  startTime: number;
  memoryUsage: number;
  apiCallCount: number;
  isTimedOut: boolean;
  isMemoryExceeded: boolean;
  isApiLimitExceeded: boolean;
}

export class TestEnvironmentService {
  private activeTests: Map<string, TestExecutionContext> = new Map();
  private mockData: Map<string, any> = new Map();
  private reportingService: TestReportingService;

  constructor() {
    this.reportingService = new TestReportingService();
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Initialize sample mock data for testing
    this.mockData.set('vehicles', [
      { id: 1, make: 'Toyota', model: 'Camry', price: 28000, status: 'Available' },
      { id: 2, make: 'Honda', model: 'Accord', price: 32000, status: 'Available' },
      { id: 3, make: 'Ford', model: 'F-150', price: 45000, status: 'Available' },
      { id: 4, make: 'BMW', model: 'X5', price: 65000, status: 'Sold' },
    ]);

    this.mockData.set('options', [
      { id: 'premium', name: 'Premium Package', price: 2500 },
      { id: 'navigation', name: 'Navigation System', price: 1200 },
      { id: 'sunroof', name: 'Sunroof', price: 800 },
      { id: 'leather', name: 'Leather Seats', price: 1500 },
    ]);

    this.mockData.set('discounts', [
      { id: 'loyalty', name: 'Loyalty Discount', amount: 1000 },
      { id: 'trade', name: 'Trade-in Credit', amount: 3000 },
      { id: 'military', name: 'Military Discount', amount: 500 },
    ]);

    console.log('🧪 Mock data initialized for test environment');
  }

  async executeTest(input: ExecuteTestInput): Promise<TestResult> {
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const config: TestConfig = {
      timeout: 30000,
      memoryLimit: 134217728, // 128MB
      apiCallLimit: 100,
      environment: 'development',
      ...input.config,
    };

    console.log(`🧪 Starting test execution: ${testId}`);

    const context: TestExecutionContext = {
      testId,
      projectId: input.projectId,
      versionId: input.versionId || 'current',
      config,
      startTime: Date.now(),
      apiCalls: [],
      logs: [],
      memoryUsage: [],
    };

    this.activeTests.set(testId, context);

    try {
      // Get the codepage code to test
      const codepageCode = await this.getCodepageForTest(input.projectId, input.versionId);
      
      // Create secure sandbox
      const sandbox = this.createSecureSandbox(context, input.testData);
      
      // Execute the codepage in sandbox
      const result = await this.executeInSandbox(sandbox, codepageCode, context);
      
      // Capture the result for reporting
      await this.reportingService.captureTestResult(result);
      
      return result;
    } catch (error) {
      console.error(`❌ Test execution failed: ${(error as Error).message}`);
      
      const errorResult = this.createErrorResult(context, error as Error);
      
      // Capture the error result for reporting
      await this.reportingService.captureTestResult(errorResult);
      
      return errorResult;
    } finally {
      this.activeTests.delete(testId);
    }
  }

  private async getCodepageForTest(projectId: string, versionId?: string): Promise<string> {
    // In a real implementation, this would fetch the codepage from the CodepageService
    // For now, return a sample codepage for testing
    return `
      // Sample codepage for testing
      (function() {
        'use strict';
        
        console.log('Test codepage starting...');
        
        // Test QuickBase API calls
        QB.api.queryRecords({
          tableId: 'vehicles_table_id',
          select: [6, 7, 8],
          where: "{9.EX.'Available'}"
        }).then(function(response) {
          console.log('Vehicles loaded:', response.data.length);
          
          // Test creating a record
          return QB.api.createRecord({
            tableId: 'quotes_table_id',
            fields: {
              'vehicle_id': { value: response.data[0].id },
              'total_price': { value: 28000 }
            }
          });
        }).then(function(createResponse) {
          console.log('Quote created with ID:', createResponse.id);
        }).catch(function(error) {
          console.error('API Error:', error);
        });
        
        console.log('Test codepage completed');
      })();
    `;
  }

  private createSecureSandbox(context: TestExecutionContext, testData?: any): VM {
    const resourceMonitor: ResourceMonitor = {
      startTime: Date.now(),
      memoryUsage: 0,
      apiCallCount: 0,
      isTimedOut: false,
      isMemoryExceeded: false,
      isApiLimitExceeded: false,
    };

    // Create mock QuickBase API
    const mockQB = this.createMockQuickBaseAPI(context, resourceMonitor);

    // Create sandbox with limited globals
    const sandbox = new VM({
      timeout: context.config.timeout,
      sandbox: {
        // Safe globals
        console: {
          log: (...args: any[]) => {
            const message = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            context.logs.push(`[${new Date().toISOString()}] ${message}`);
          },
          error: (...args: any[]) => {
            const message = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            context.logs.push(`[${new Date().toISOString()}] ERROR: ${message}`);
          },
          warn: (...args: any[]) => {
            const message = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            context.logs.push(`[${new Date().toISOString()}] WARN: ${message}`);
          },
        },
        
        // Mock QuickBase API
        QB: mockQB,
        
        // Test data
        testData: testData || {},
        
        // Safe utilities
        JSON: JSON,
        Math: Math,
        Date: Date,
        
        // Resource monitor (read-only)
        getResourceUsage: () => ({
          memoryUsage: resourceMonitor.memoryUsage,
          apiCallCount: resourceMonitor.apiCallCount,
          executionTime: Date.now() - resourceMonitor.startTime,
        }),
      },
      
      // Security restrictions
      eval: false,
      wasm: false,
      fixAsync: true,
    });

    // Set up memory monitoring
    const memoryInterval = setInterval(() => {
      const usage = process.memoryUsage();
      resourceMonitor.memoryUsage = usage.heapUsed;
      context.memoryUsage.push(usage.heapUsed);
      
      if (usage.heapUsed > context.config.memoryLimit) {
        resourceMonitor.isMemoryExceeded = true;
        clearInterval(memoryInterval);
      }
    }, 100);

    // Clean up interval when sandbox is done
    setTimeout(() => clearInterval(memoryInterval), context.config.timeout + 1000);

    return sandbox;
  }

  private createMockQuickBaseAPI(context: TestExecutionContext, monitor: ResourceMonitor): MockQuickBaseAPI {
    const self = this;
    
    const trackAPICall = async (method: string, params: any, response: any, duration: number) => {
      monitor.apiCallCount++;
      
      if (monitor.apiCallCount > context.config.apiCallLimit) {
        monitor.isApiLimitExceeded = true;
        throw new Error(`API call limit exceeded (${context.config.apiCallLimit})`);
      }
      
      context.apiCalls.push({
        method,
        params,
        response,
        timestamp: Date.now(),
        duration,
      });
    };

    return {
      api: {
        async queryRecords(params: any) {
          const startTime = Date.now();
          
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
          
          // Mock response based on table
          let mockResponse;
          if (params.tableId === 'vehicles_table_id') {
            const vehicles = self.mockData.get('vehicles') || [];
            mockResponse = {
              data: vehicles.filter((v: any) => 
                !params.where || params.where.includes('Available') ? v.status === 'Available' : true
              ),
              metadata: {
                totalRecords: vehicles.length,
                skip: 0,
                top: vehicles.length,
              },
            };
          } else {
            mockResponse = {
              data: [],
              metadata: { totalRecords: 0, skip: 0, top: 0 },
            };
          }
          
          const duration = Date.now() - startTime;
          await trackAPICall('queryRecords', params, mockResponse, duration);
          
          return mockResponse;
        },

        async createRecord(params: any) {
          const startTime = Date.now();
          
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
          
          const mockResponse = {
            id: Math.floor(Math.random() * 10000) + 1000,
            createdDate: new Date().toISOString(),
          };
          
          const duration = Date.now() - startTime;
          await trackAPICall('createRecord', params, mockResponse, duration);
          
          return mockResponse;
        },

        async updateRecord(params: any) {
          const startTime = Date.now();
          
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 80 + Math.random() * 150));
          
          const mockResponse = {
            id: params.recordId,
            updatedDate: new Date().toISOString(),
          };
          
          const duration = Date.now() - startTime;
          await trackAPICall('updateRecord', params, mockResponse, duration);
          
          return mockResponse;
        },

        async deleteRecord(params: any) {
          const startTime = Date.now();
          
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 60 + Math.random() * 100));
          
          const mockResponse = {
            id: params.recordId,
            deletedDate: new Date().toISOString(),
          };
          
          const duration = Date.now() - startTime;
          await trackAPICall('deleteRecord', params, mockResponse, duration);
          
          return mockResponse;
        },

        async getRecord(params: any) {
          const startTime = Date.now();
          
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 40 + Math.random() * 80));
          
          const mockResponse = {
            id: params.recordId,
            fields: {
              6: { value: 'Toyota' },
              7: { value: 'Camry' },
              8: { value: 28000 },
            },
          };
          
          const duration = Date.now() - startTime;
          await trackAPICall('getRecord', params, mockResponse, duration);
          
          return mockResponse;
        },

        async bulkCreateRecords(params: any) {
          const startTime = Date.now();
          
          // Simulate API delay based on record count
          const recordCount = params.records?.length || 1;
          await new Promise(resolve => setTimeout(resolve, recordCount * 50 + Math.random() * 200));
          
          const mockResponse = {
            metadata: {
              createdRecordIds: Array.from({ length: recordCount }, () => 
                Math.floor(Math.random() * 10000) + 1000
              ),
              totalNumberOfRecordsProcessed: recordCount,
            },
          };
          
          const duration = Date.now() - startTime;
          await trackAPICall('bulkCreateRecords', params, mockResponse, duration);
          
          return mockResponse;
        },
      },

      on(event: string, callback: () => void) {
        // Simulate QB ready event
        if (event === 'ready') {
          setTimeout(callback, 10);
        }
      },
    };
  }

  private async executeInSandbox(sandbox: VM, code: string, context: TestExecutionContext): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Execute the codepage code in the sandbox
      await sandbox.run(code);
      
      // Wait a bit for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const executionTime = Date.now() - startTime;
      const maxMemoryUsage = Math.max(...context.memoryUsage, 0);
      
      const performanceMetrics: PerformanceMetrics = {
        executionTime,
        memoryUsage: maxMemoryUsage,
        apiCallCount: context.apiCalls.length,
        apiResponseTime: context.apiCalls.length > 0 
          ? context.apiCalls.reduce((sum, call) => sum + call.duration, 0) / context.apiCalls.length
          : 0,
      };

      console.log(`✅ Test completed successfully: ${context.testId}`);
      console.log(`   Execution time: ${executionTime}ms`);
      console.log(`   Memory usage: ${Math.round(maxMemoryUsage / 1024 / 1024)}MB`);
      console.log(`   API calls: ${context.apiCalls.length}`);

      return {
        id: context.testId,
        projectId: context.projectId,
        versionId: context.versionId,
        status: 'passed',
        executionTime,
        memoryUsage: maxMemoryUsage,
        apiCallCount: context.apiCalls.length,
        errors: [],
        performanceMetrics,
        logs: context.logs,
        createdAt: new Date(context.startTime),
        completedAt: new Date(),
      };

    } catch (error) {
      console.error(`❌ Sandbox execution error: ${(error as Error).message}`);
      return this.createErrorResult(context, error as Error);
    }
  }

  private createErrorResult(context: TestExecutionContext, error: Error): TestResult {
    const executionTime = Date.now() - context.startTime;
    const maxMemoryUsage = Math.max(...context.memoryUsage, 0);

    const testError: TestError = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      type: error.constructor?.name || 'Error',
    };

    // Try to extract line/column numbers from VM2 errors
    if (error.stack && error.stack.includes('vm.js')) {
      const lineMatch = error.stack.match(/vm\.js:(\d+):(\d+)/);
      if (lineMatch) {
        testError.lineNumber = parseInt(lineMatch[1]);
        testError.columnNumber = parseInt(lineMatch[2]);
      }
    }

    const performanceMetrics: PerformanceMetrics = {
      executionTime,
      memoryUsage: maxMemoryUsage,
      apiCallCount: context.apiCalls.length,
      apiResponseTime: context.apiCalls.length > 0 
        ? context.apiCalls.reduce((sum, call) => sum + call.duration, 0) / context.apiCalls.length
        : 0,
    };

    return {
      id: context.testId,
      projectId: context.projectId,
      versionId: context.versionId,
      status: 'error',
      executionTime,
      memoryUsage: maxMemoryUsage,
      apiCallCount: context.apiCalls.length,
      errors: [testError],
      performanceMetrics,
      logs: context.logs,
      createdAt: new Date(context.startTime),
      completedAt: new Date(),
    };
  }

  // Utility methods

  async getActiveTests(): Promise<string[]> {
    return Array.from(this.activeTests.keys());
  }

  async getTestContext(testId: string): Promise<TestExecutionContext | null> {
    return this.activeTests.get(testId) || null;
  }

  async cancelTest(testId: string): Promise<boolean> {
    const context = this.activeTests.get(testId);
    if (context) {
      this.activeTests.delete(testId);
      console.log(`🛑 Test cancelled: ${testId}`);
      return true;
    }
    return false;
  }

  async updateMockData(key: string, data: any): Promise<void> {
    this.mockData.set(key, data);
    console.log(`📝 Mock data updated: ${key}`);
  }

  async getMockData(key?: string): Promise<any> {
    if (key) {
      return this.mockData.get(key);
    }
    return Object.fromEntries(this.mockData.entries());
  }

  async getTestStats(): Promise<{
    activeTests: number;
    totalMockDataSets: number;
    averageExecutionTime: number;
    averageMemoryUsage: number;
  }> {
    const activeContexts = Array.from(this.activeTests.values());
    
    return {
      activeTests: activeContexts.length,
      totalMockDataSets: this.mockData.size,
      averageExecutionTime: activeContexts.length > 0 
        ? activeContexts.reduce((sum, ctx) => sum + (Date.now() - ctx.startTime), 0) / activeContexts.length
        : 0,
      averageMemoryUsage: activeContexts.length > 0
        ? activeContexts.reduce((sum, ctx) => sum + Math.max(...ctx.memoryUsage, 0), 0) / activeContexts.length
        : 0,
    };
  }

  // Test reporting methods

  async generateTestReport(projectId: string, versionId: string, config?: any) {
    return this.reportingService.generateReport(projectId, versionId, config);
  }

  async getTestReport(reportId: string) {
    return this.reportingService.getReport(reportId);
  }

  async getProjectReports(projectId: string) {
    return this.reportingService.getProjectReports(projectId);
  }

  async getTestResults(projectId: string, versionId: string) {
    return this.reportingService.getTestResults(projectId, versionId);
  }

  async getReportingStats() {
    return this.reportingService.getReportingStats();
  }

  async cleanupOldResults(olderThanDays: number = 30) {
    return this.reportingService.deleteOldResults(olderThanDays);
  }
}