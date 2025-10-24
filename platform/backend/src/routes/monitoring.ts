import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { MonitoringService, AlertRuleSchema } from '../services/monitoring.js';
import { AuthService } from '../services/auth.js';

// Request validation schemas
const GetMetricsQuerySchema = z.object({
  type: z.enum(['codepage_execution', 'api_response', 'system_resource']).optional(),
  name: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(10000).default(1000),
});

const GetMetricsSummaryQuerySchema = z.object({
  type: z.enum(['codepage_execution', 'api_response', 'system_resource']).optional(),
  timeWindow: z.coerce.number().min(1).max(1440).default(60), // 1 minute to 24 hours
});

const CreateAlertRuleSchema = AlertRuleSchema.extend({
  isActive: z.boolean().default(true),
});

const UpdateAlertRuleSchema = AlertRuleSchema.partial();

export function createMonitoringRoutes(
  monitoringService: MonitoringService,
  authService: AuthService
): Router {
  const router = Router();

  // Middleware to ensure user is authenticated and has appropriate permissions
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

  // Get system health status
  router.get('/health', requireAuth, async (req: Request, res: Response) => {
    try {
      const health = await monitoringService.getSystemHealth();
      
      res.json({
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting system health:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Failed to retrieve system health',
        },
      });
    }
  });

  // Get performance metrics
  router.get('/metrics', requireAuth, async (req: Request, res: Response) => {
    try {
      const query = GetMetricsQuerySchema.parse(req.query);
      
      const startTime = query.startTime ? new Date(query.startTime) : undefined;
      const endTime = query.endTime ? new Date(query.endTime) : undefined;
      
      const metrics = await monitoringService.getMetrics(
        query.type,
        query.name,
        startTime,
        endTime,
        query.limit
      );
      
      res.json({
        success: true,
        data: {
          metrics,
          count: metrics.length,
          filters: {
            type: query.type,
            name: query.name,
            startTime: startTime?.toISOString(),
            endTime: endTime?.toISOString(),
            limit: query.limit,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting metrics:', error);
      
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
          code: 'METRICS_FETCH_FAILED',
          message: 'Failed to retrieve metrics',
        },
      });
    }
  });

  // Get metrics summary
  router.get('/metrics/summary', requireAuth, async (req: Request, res: Response) => {
    try {
      const query = GetMetricsSummaryQuerySchema.parse(req.query);
      
      const summary = await monitoringService.getMetricsSummary(
        query.type,
        query.timeWindow
      );
      
      res.json({
        success: true,
        data: {
          summary,
          timeWindow: query.timeWindow,
          type: query.type,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting metrics summary:', error);
      
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
          code: 'SUMMARY_FETCH_FAILED',
          message: 'Failed to retrieve metrics summary',
        },
      });
    }
  });

  // Get alert rules
  router.get('/alerts/rules', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
    try {
      const rules = await monitoringService.getAlertRules();
      
      res.json({
        success: true,
        data: {
          rules,
          count: rules.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting alert rules:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RULES_FETCH_FAILED',
          message: 'Failed to retrieve alert rules',
        },
      });
    }
  });

  // Create alert rule
  router.post('/alerts/rules', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
    try {
      const ruleData = CreateAlertRuleSchema.parse(req.body);
      
      const rule = await monitoringService.createAlertRule(ruleData);
      
      res.status(201).json({
        success: true,
        data: rule,
        message: 'Alert rule created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating alert rule:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid alert rule data',
            details: error.errors,
          },
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'RULE_CREATION_FAILED',
          message: 'Failed to create alert rule',
        },
      });
    }
  });

  // Update alert rule
  router.put('/alerts/rules/:ruleId', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
    try {
      const { ruleId } = req.params;
      const updates = UpdateAlertRuleSchema.parse(req.body);
      
      const rule = await monitoringService.updateAlertRule(ruleId, updates);
      
      res.json({
        success: true,
        data: rule,
        message: 'Alert rule updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating alert rule:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update data',
            details: error.errors,
          },
        });
      }
      
      if (error instanceof Error && error.message === 'Alert rule not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RULE_NOT_FOUND',
            message: 'Alert rule not found',
          },
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'RULE_UPDATE_FAILED',
          message: 'Failed to update alert rule',
        },
      });
    }
  });

  // Delete alert rule
  router.delete('/alerts/rules/:ruleId', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
    try {
      const { ruleId } = req.params;
      
      await monitoringService.deleteAlertRule(ruleId);
      
      res.json({
        success: true,
        message: 'Alert rule deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error deleting alert rule:', error);
      
      if (error instanceof Error && error.message === 'Alert rule not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RULE_NOT_FOUND',
            message: 'Alert rule not found',
          },
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'RULE_DELETION_FAILED',
          message: 'Failed to delete alert rule',
        },
      });
    }
  });

  // Get active alerts
  router.get('/alerts', requireAuth, async (req: Request, res: Response) => {
    try {
      const activeAlerts = await monitoringService.getActiveAlerts();
      
      res.json({
        success: true,
        data: {
          alerts: activeAlerts,
          count: activeAlerts.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting active alerts:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ALERTS_FETCH_FAILED',
          message: 'Failed to retrieve active alerts',
        },
      });
    }
  });

  // Get all alerts (with pagination)
  router.get('/alerts/all', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
      
      const alerts = await monitoringService.getAllAlerts(limit);
      
      res.json({
        success: true,
        data: {
          alerts,
          count: alerts.length,
          limit,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting all alerts:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ALERTS_FETCH_FAILED',
          message: 'Failed to retrieve alerts',
        },
      });
    }
  });

  // Resolve alert
  router.post('/alerts/:alertId/resolve', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      
      await monitoringService.resolveAlert(alertId);
      
      res.json({
        success: true,
        message: 'Alert resolved successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      
      if (error instanceof Error && error.message === 'Alert not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ALERT_NOT_FOUND',
            message: 'Alert not found',
          },
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'ALERT_RESOLUTION_FAILED',
          message: 'Failed to resolve alert',
        },
      });
    }
  });

  // Manual metric recording (for testing or external integrations)
  router.post('/metrics', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
    try {
      const metricData = z.object({
        type: z.enum(['codepage_execution', 'api_response', 'system_resource']),
        name: z.string().min(1).max(100),
        value: z.number(),
        unit: z.string().min(1).max(20),
        metadata: z.record(z.any()).optional(),
      }).parse(req.body);
      
      await monitoringService.recordMetric(metricData);
      
      res.status(201).json({
        success: true,
        message: 'Metric recorded successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error recording metric:', error);
      
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
          message: 'Failed to record metric',
        },
      });
    }
  });

  return router;
}