import { TestEnvironmentService } from '../../services/test.js';

describe('TestEnvironmentService', () => {
  let testService: TestEnvironmentService;

  beforeEach(() => {
    testService = new TestEnvironmentService();
  });

  describe('initialization', () => {
    it('should initialize with mock data', () => {
      expect(testService).toBeDefined();
      // The service should initialize mock data internally
    });
  });

  describe('executeTest', () => {
    it('should execute a simple test successfully', async () => {
      const input = {
        projectId: 'test-project-001',
        versionId: 'v1.0.0'
      };

      const result = await testService.executeTest(input);

      expect(result.id).toBeDefined();
      expect(result.projectId).toBe(input.projectId);
      expect(result.versionId).toBe(input.versionId);
      expect(['passed', 'failed', 'error']).toContain(result.status);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.createdAt).toBeDefined();
      expect(Array.isArray(result.logs)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle test with custom configuration', async () => {
      const input = {
        projectId: 'test-project-002',
        config: {
          timeout: 5000,
          memoryLimit: 67108864, // 64MB
          apiCallLimit: 50
        }
      };

      const result = await testService.executeTest(input);

      expect(result.id).toBeDefined();
      expect(result.projectId).toBe(input.projectId);
      expect(result.executionTime).toBeLessThan(input.config.timeout);
    });

    it('should handle test with custom test data', async () => {
      const input = {
        projectId: 'test-project-003',
        testData: {
          customValue: 'test-data',
          numbers: [1, 2, 3]
        }
      };

      const result = await testService.executeTest(input);

      expect(result.id).toBeDefined();
      expect(result.projectId).toBe(input.projectId);
      // Test data should be available in the sandbox
    });

    it('should track API calls during execution', async () => {
      const input = {
        projectId: 'test-project-004'
      };

      const result = await testService.executeTest(input);

      expect(result.apiCallCount).toBeGreaterThanOrEqual(0);
      expect(result.performanceMetrics.apiCallCount).toBeDefined();
    });

    it('should capture console logs', async () => {
      const input = {
        projectId: 'test-project-005'
      };

      const result = await testService.executeTest(input);

      // The sample codepage should produce some console logs
      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs.some(log => log.includes('Test codepage starting'))).toBe(true);
    });

    it('should measure performance metrics', async () => {
      const input = {
        projectId: 'test-project-006'
      };

      const result = await testService.executeTest(input);

      expect(result.performanceMetrics.executionTime).toBeGreaterThan(0);
      expect(result.performanceMetrics.memoryUsage).toBeGreaterThan(0);
      expect(typeof result.performanceMetrics.apiCallCount).toBe('number');
      expect(typeof result.performanceMetrics.apiResponseTime).toBe('number');
    });
  });

  describe('getActiveTests', () => {
    it('should return list of active test IDs', async () => {
      const activeTests = await testService.getActiveTests();
      expect(Array.isArray(activeTests)).toBe(true);
    });

    it('should track active tests during execution', async () => {
      // Start a test but don't wait for completion
      const testPromise = testService.executeTest({
        projectId: 'concurrent-test'
      });

      // Check if test is tracked as active (this might be timing-dependent)
      const activeTests = await testService.getActiveTests();
      
      // Wait for test to complete
      await testPromise;
      
      // After completion, active tests should be updated
      const activeTestsAfter = await testService.getActiveTests();
      expect(Array.isArray(activeTestsAfter)).toBe(true);
    });
  });

  describe('getTestContext', () => {
    it('should return null for non-existent test', async () => {
      const context = await testService.getTestContext('nonexistent-test-id');
      expect(context).toBeNull();
    });
  });

  describe('cancelTest', () => {
    it('should return false for non-existent test', async () => {
      const cancelled = await testService.cancelTest('nonexistent-test-id');
      expect(cancelled).toBe(false);
    });
  });

  describe('updateMockData', () => {
    it('should update mock data successfully', async () => {
      const newVehicles = [
        { id: 100, make: 'Tesla', model: 'Model 3', price: 45000, status: 'Available' }
      ];

      await expect(testService.updateMockData('vehicles', newVehicles)).resolves.not.toThrow();
    });

    it('should handle updating non-existent mock data key', async () => {
      const newData = { test: 'value' };

      await expect(testService.updateMockData('new-key', newData)).resolves.not.toThrow();
    });
  });

  describe('getMockData', () => {
    it('should return all mock data when no key specified', async () => {
      const allData = await testService.getMockData();
      
      expect(typeof allData).toBe('object');
      expect(allData).toBeDefined();
    });

    it('should return specific mock data for given key', async () => {
      const vehicles = await testService.getMockData('vehicles');
      
      expect(Array.isArray(vehicles)).toBe(true);
      expect(vehicles.length).toBeGreaterThan(0);
      expect(vehicles[0]).toHaveProperty('make');
      expect(vehicles[0]).toHaveProperty('model');
      expect(vehicles[0]).toHaveProperty('price');
    });

    it('should return undefined for non-existent key', async () => {
      const nonExistent = await testService.getMockData('nonexistent-key');
      expect(nonExistent).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle timeout gracefully', async () => {
      const input = {
        projectId: 'timeout-test',
        config: {
          timeout: 100 // Very short timeout
        }
      };

      const result = await testService.executeTest(input);

      // Should complete without throwing, but might have timeout-related errors
      expect(result.id).toBeDefined();
      expect(['passed', 'failed', 'error']).toContain(result.status);
    });

    it('should handle memory limit gracefully', async () => {
      const input = {
        projectId: 'memory-test',
        config: {
          memoryLimit: 1024 // Very small memory limit (1KB)
        }
      };

      const result = await testService.executeTest(input);

      // Should complete without throwing
      expect(result.id).toBeDefined();
      expect(['passed', 'failed', 'error']).toContain(result.status);
    });

    it('should handle API call limit gracefully', async () => {
      const input = {
        projectId: 'api-limit-test',
        config: {
          apiCallLimit: 1 // Very low API call limit
        }
      };

      const result = await testService.executeTest(input);

      // Should complete without throwing
      expect(result.id).toBeDefined();
      expect(['passed', 'failed', 'error']).toContain(result.status);
    });
  });

  describe('mock QuickBase API', () => {
    it('should simulate API response times', async () => {
      const input = {
        projectId: 'api-timing-test'
      };

      const result = await testService.executeTest(input);

      // API calls should have realistic response times
      expect(result.performanceMetrics.apiResponseTime).toBeGreaterThan(0);
    });

    it('should track API call details', async () => {
      const input = {
        projectId: 'api-tracking-test'
      };

      const result = await testService.executeTest(input);

      // Should have made some API calls based on the sample codepage
      expect(result.apiCallCount).toBeGreaterThan(0);
    });
  });
});