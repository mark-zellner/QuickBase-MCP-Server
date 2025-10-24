import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TestEnvironmentService } from '../services/test.js';
import { AuthService } from '../services/auth.js';
import { ExecuteTestInput } from '../services/test.js';
import { z } from 'zod';

const ExecuteTestSchema = z.object({
  projectId: z.string(),
  versionId: z.string().optional(),
  config: z.object({
    timeout: z.number().optional(),
    memoryLimit: z.number().optional(),
    apiCallLimit: z.number().optional(),
    environment: z.enum(['development', 'staging', 'production']).optional(),
  }).optional(),
  testData: z.record(z.any()).optional(),
});
import '../types/express.js';

// Request validation schemas
const UpdateMockDataSchema = z.object({
  key: z.string().min(1),
  data: z.any(),
});

const GetMockDataSchema = z.object({
  key: z.string().optional(),
});

export function createTestRoutes(testService: TestEnvironmentService, authService: AuthService): Router {
  const router = Router();

  // Middleware to require authentication
  const requireAuth = async (req: Request, res: Response, next: any) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication token required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const user = await authService.verifyToken(token);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  };

  // Execute a test
  router.post('/execute', requireAuth, async (req: Request, res: Response) => {
    try {
      const input = ExecuteTestSchema.parse(req.body);
      
      console.log(`🧪 Test execution requested by user ${req.user?.id} for project ${input.projectId}`);
      
      const result = await testService.executeTest(input);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
      
    } catch (error) {
      console.error('Test execution error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid test execution parameters',
            details: error.errors,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'TEST_EXECUTION_ERROR',
          message: (error as Error).message || 'Test execution failed',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Get active tests
  router.get('/active', requireAuth, async (req: Request, res: Response) => {
    try {
      const activeTests = await testService.getActiveTests();
      
      res.json({
        success: true,
        data: {
          activeTests,
          count: activeTests.length,
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
      
    } catch (error) {
      console.error('Error getting active tests:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ACTIVE_TESTS_ERROR',
          message: 'Failed to retrieve active tests',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Get test context
  router.get('/context/:testId', requireAuth, async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      const context = await testService.getTestContext(testId);
      
      if (!context) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TEST_NOT_FOUND',
            message: 'Test context not found',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }
      
      res.json({
        success: true,
        data: context,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
      
    } catch (error) {
      console.error('Error getting test context:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEST_CONTEXT_ERROR',
          message: 'Failed to retrieve test context',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Cancel a test
  router.delete('/:testId', requireAuth, async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      const cancelled = await testService.cancelTest(testId);
      
      if (!cancelled) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TEST_NOT_FOUND',
            message: 'Test not found or already completed',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }
      
      res.json({
        success: true,
        data: {
          testId,
          cancelled: true,
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
      
    } catch (error) {
      console.error('Error cancelling test:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEST_CANCEL_ERROR',
          message: 'Failed to cancel test',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Update mock data
  router.put('/mock-data', requireAuth, async (req: Request, res: Response) => {
    try {
      const { key, data } = UpdateMockDataSchema.parse(req.body);
      
      await testService.updateMockData(key, data);
      
      res.json({
        success: true,
        data: {
          key,
          updated: true,
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
      
    } catch (error) {
      console.error('Error updating mock data:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid mock data parameters',
            details: error.errors,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'MOCK_DATA_ERROR',
          message: 'Failed to update mock data',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Get mock data
  router.get('/mock-data', requireAuth, async (req: Request, res: Response) => {
    try {
      const { key } = req.query;
      const data = await testService.getMockData(key as string);
      
      res.json({
        success: true,
        data: key ? { [key as string]: data } : data,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
      
    } catch (error) {
      console.error('Error getting mock data:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'MOCK_DATA_ERROR',
          message: 'Failed to retrieve mock data',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Get test statistics
  router.get('/stats', requireAuth, async (req: Request, res: Response) => {
    try {
      const stats = await testService.getTestStats();
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
      
    } catch (error) {
      console.error('Error getting test stats:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEST_STATS_ERROR',
          message: 'Failed to retrieve test statistics',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Generate test report
  router.post('/reports', requireAuth, async (req: Request, res: Response) => {
    try {
      const { projectId, versionId, config } = req.body;
      
      if (!projectId || !versionId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'projectId and versionId are required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }
      
      const report = await testService.generateTestReport(projectId, versionId, config);
      
      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
      
    } catch (error) {
      console.error('Error generating test report:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REPORT_GENERATION_ERROR',
          message: (error as Error).message || 'Failed to generate test report',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Get test report
  router.get('/reports/:reportId', requireAuth, async (req: Request, res: Response) => {
    try {
      const { reportId } = req.params;
      const report = await testService.getTestReport(reportId);
      
      if (!report) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'REPORT_NOT_FOUND',
            message: 'Test report not found',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }
      
      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
      
    } catch (error) {
      console.error('Error getting test report:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REPORT_RETRIEVAL_ERROR',
          message: 'Failed to retrieve test report',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Get project reports
  router.get('/projects/:projectId/reports', requireAuth, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const reports = await testService.getProjectReports(projectId);
      
      res.json({
        success: true,
        data: {
          reports,
          count: reports.length,
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
      
    } catch (error) {
      console.error('Error getting project reports:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PROJECT_REPORTS_ERROR',
          message: 'Failed to retrieve project reports',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Get test results
  router.get('/projects/:projectId/versions/:versionId/results', requireAuth, async (req: Request, res: Response) => {
    try {
      const { projectId, versionId } = req.params;
      const results = await testService.getTestResults(projectId, versionId);
      
      res.json({
        success: true,
        data: {
          results,
          count: results.length,
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
      
    } catch (error) {
      console.error('Error getting test results:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEST_RESULTS_ERROR',
          message: 'Failed to retrieve test results',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Get reporting statistics
  router.get('/reporting/stats', requireAuth, async (req: Request, res: Response) => {
    try {
      const stats = await testService.getReportingStats();
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
      
    } catch (error) {
      console.error('Error getting reporting stats:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REPORTING_STATS_ERROR',
          message: 'Failed to retrieve reporting statistics',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Cleanup old results
  router.delete('/cleanup', requireAuth, async (req: Request, res: Response) => {
    try {
      // Only allow admin users to cleanup
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required for cleanup operations',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      const { olderThanDays } = req.query;
      const days = olderThanDays ? parseInt(olderThanDays as string) : 30;
      
      const deletedCount = await testService.cleanupOldResults(days);
      
      res.json({
        success: true,
        data: {
          deletedCount,
          olderThanDays: days,
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
      
    } catch (error) {
      console.error('Error cleaning up old results:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CLEANUP_ERROR',
          message: 'Failed to cleanup old results',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  // Health check for test environment
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const stats = await testService.getTestStats();
      
      res.json({
        success: true,
        data: {
          status: 'healthy',
          activeTests: stats.activeTests,
          mockDataSets: stats.totalMockDataSets,
          uptime: process.uptime(),
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
      
    } catch (error) {
      console.error('Test environment health check failed:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Test environment health check failed',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  });

  return router;
}