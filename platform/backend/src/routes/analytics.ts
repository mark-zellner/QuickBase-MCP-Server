import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AnalyticsService, GenerateReportSchema } from '../services/analytics.js';
import { AuthService } from '../services/auth.js';

// Request validation schemas
const GetUserActivityQuerySchema = z.object({
  userId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const GetCodepageStatsQuerySchema = z.object({
  projectId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const GetProjectAnalyticsQuerySchema = z.object({
  ownerId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const GetSystemHealthQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  interval: z.enum(['hour', 'day']).default('hour'),
});

const GetAuditLogsQuerySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
});

const GetReportsQuerySchema = z.object({
  type: z.enum(['usage', 'performance', 'audit', 'system_health']).optional(),
  generatedBy: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export function createAnalyticsRoutes(
  analyticsService: AnalyticsService,
  authService: AuthService
): Router {
  const router = Router();

  // Middleware to ensure user is authenticated
  const requireAuth = async (req: Request, res: Response, next: Function) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication token required',
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
          },
        });
      }

      (req as any).user = user;
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
        },
      });
    }
  };

  const requireAdminOrManager = (req: Request, res: Response, next: Function) => {
    const user = (req as any).user;
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Admin or manager role required',
        },
      });
    }
    next();
  };

  // Dashboard overview
  router.get('/dashboard', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userId = user.role === 'admin' || user.role === 'manager' ? undefined : user.id;
      
      const dashboardData = await analyticsService.getDashboardData(userId);
      
      res.json({
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_FETCH_FAILED',
          message: 'Failed to retrieve dashboard data',
        },
      });
    }
  });

  // User activity analytics
  router.get('/user-activity', requireAuth, async (req: Request, res: Response) => {
    try {
      const query = GetUserActivityQuerySchema.parse(req.query);
      const user = (req as any).user;
      
      // Non-admin users can only see their own activity
      const userId = (user.role === 'admin' || user.role === 'manager') 
        ? query.userId 
        : user.id;
      
      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;
      
      const userActivity = await analyticsService.getUserActivity(userId, startDate, endDate);
      
      res.json({
        success: true,
        data: {
          userActivity,
          count: userActivity.length,
          filters: {
            userId,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting user activity:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
          },
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'USER_ACTIVITY_FETCH_FAILED',
          message: 'Failed to retrieve user activity',
        },
      });
    }
  });

  // Codepage usage statistics
  router.get('/codepage-stats', requireAuth, async (req: Request, res: Response) => {
    try {
      const query = GetCodepageStatsQuerySchema.parse(req.query);
      
      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;
      
      const codepageStats = await analyticsService.getCodepageUsageStats(
        query.projectId,
        startDate,
        endDate
      );
      
      res.json({
        success: true,
        data: {
          codepageStats,
          count: codepageStats.length,
          filters: {
            projectId: query.projectId,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting codepage stats:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
          },
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'CODEPAGE_STATS_FETCH_FAILED',
          message: 'Failed to retrieve codepage statistics',
        },
      });
    }
  });

  // Project analytics
  router.get('/project-analytics', requireAuth, async (req: Request, res: Response) => {
    try {
      const query = GetProjectAnalyticsQuerySchema.parse(req.query);
      const user = (req as any).user;
      
      // Non-admin users can only see projects they own
      const ownerId = (user.role === 'admin' || user.role === 'manager') 
        ? query.ownerId 
        : user.id;
      
      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;
      
      const projectAnalytics = await analyticsService.getProjectAnalytics(
        ownerId,
        startDate,
        endDate
      );
      
      res.json({
        success: true,
        data: {
          projectAnalytics,
          count: projectAnalytics.length,
          filters: {
            ownerId,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting project analytics:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
          },
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'PROJECT_ANALYTICS_FETCH_FAILED',
          message: 'Failed to retrieve project analytics',
        },
      });
    }
  });

  // System health metrics
  router.get('/system-health', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
    try {
      const query = GetSystemHealthQuerySchema.parse(req.query);
      
      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;
      
      const systemHealth = await analyticsService.getSystemHealthMetrics(
        startDate,
        endDate,
        query.interval
      );
      
      res.json({
        success: true,
        data: {
          systemHealth,
          count: systemHealth.length,
          filters: {
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
            interval: query.interval,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting system health:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
          },
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SYSTEM_HEALTH_FETCH_FAILED',
          message: 'Failed to retrieve system health metrics',
        },
      });
    }
  });

  // Audit logs
  router.get('/audit-logs', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
    try {
      const query = GetAuditLogsQuerySchema.parse(req.query);
      
      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;
      
      const auditLogs = await analyticsService.getAuditLogs(
        query.userId,
        query.action,
        query.resource,
        startDate,
        endDate,
        query.limit
      );
      
      res.json({
        success: true,
        data: {
          auditLogs,
          count: auditLogs.length,
          filters: {
            userId: query.userId,
            action: query.action,
            resource: query.resource,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
            limit: query.limit,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting audit logs:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
          },
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'AUDIT_LOGS_FETCH_FAILED',
          message: 'Failed to retrieve audit logs',
        },
      });
    }
  });

  // Generate report
  router.post('/reports', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
    try {
      const reportData = GenerateReportSchema.parse(req.body);
      const user = (req as any).user;
      
      const report = await analyticsService.generateReport(
        reportData.type,
        reportData.name,
        reportData.parameters,
        user.id
      );
      
      res.status(201).json({
        success: true,
        data: report,
        message: 'Report generated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error generating report:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid report parameters',
            details: error.errors,
          },
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'REPORT_GENERATION_FAILED',
          message: 'Failed to generate report',
        },
      });
    }
  });

  // Get reports
  router.get('/reports', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
    try {
      const query = GetReportsQuerySchema.parse(req.query);
      
      const reports = await analyticsService.getReports(
        query.type,
        query.generatedBy,
        query.limit
      );
      
      res.json({
        success: true,
        data: {
          reports,
          count: reports.length,
          filters: {
            type: query.type,
            generatedBy: query.generatedBy,
            limit: query.limit,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting reports:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
          },
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'REPORTS_FETCH_FAILED',
          message: 'Failed to retrieve reports',
        },
      });
    }
  });

  // Get specific report
  router.get('/reports/:reportId', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
    try {
      const { reportId } = req.params;
      
      const report = await analyticsService.getReport(reportId);
      
      if (!report) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'REPORT_NOT_FOUND',
            message: 'Report not found',
          },
        });
      }
      
      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting report:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REPORT_FETCH_FAILED',
          message: 'Failed to retrieve report',
        },
      });
    }
  });

  // Delete report
  router.delete('/reports/:reportId', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
    try {
      const { reportId } = req.params;
      
      const deleted = await analyticsService.deleteReport(reportId);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'REPORT_NOT_FOUND',
            message: 'Report not found',
          },
        });
      }
      
      res.json({
        success: true,
        message: 'Report deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error deleting report:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REPORT_DELETION_FAILED',
          message: 'Failed to delete report',
        },
      });
    }
  });

  // Record usage metric (for external integrations)
  router.post('/usage-metrics', requireAuth, async (req: Request, res: Response) => {
    try {
      const metricData = z.object({
        action: z.string(),
        resource: z.string(),
        resourceId: z.string().optional(),
        metadata: z.record(z.any()).optional(),
        duration: z.number().optional(),
        success: z.boolean(),
      }).parse(req.body);
      
      const user = (req as any).user;
      
      await analyticsService.recordUsageMetric({
        ...metricData,
        userId: user.id,
      });
      
      res.status(201).json({
        success: true,
        message: 'Usage metric recorded successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error recording usage metric:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid metric data',
            details: error.errors,
          },
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'METRIC_RECORDING_FAILED',
          message: 'Failed to record usage metric',
        },
      });
    }
  });

  // Record audit log (for external integrations)
  router.post('/audit-logs', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
    try {
      const auditData = z.object({
        action: z.string(),
        resource: z.string(),
        resourceId: z.string(),
        changes: z.record(z.any()).optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        success: z.boolean(),
        errorMessage: z.string().optional(),
      }).parse(req.body);
      
      const user = (req as any).user;
      
      await analyticsService.recordAuditLog({
        ...auditData,
        userId: user.id,
        userName: user.name || `User ${user.id}`,
      });
      
      res.status(201).json({
        success: true,
        message: 'Audit log recorded successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error recording audit log:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid audit log data',
            details: error.errors,
          },
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'AUDIT_LOG_RECORDING_FAILED',
          message: 'Failed to record audit log',
        },
      });
    }
  });

  return router;
}