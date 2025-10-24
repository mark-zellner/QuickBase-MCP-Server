import { Request, Response, NextFunction } from 'express';
import { MonitoringService } from '../services/monitoring.js';

// Extend Express Request interface to include monitoring data
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      requestSize?: number;
    }
  }
}

export class MonitoringMiddleware {
  constructor(private monitoringService: MonitoringService) {}

  // Middleware to track API response times and metrics
  trackAPIMetrics() {
    const self = this;
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      req.startTime = startTime;
      
      // Calculate request size
      req.requestSize = self.calculateRequestSize(req);

      // Override res.end to capture response metrics
      const originalEnd = res.end.bind(res);
      let responseSize = 0;

      res.end = function(chunk?: any, encoding?: any, cb?: () => void): Response {
        if (chunk) {
          responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
        }

        const responseTime = Date.now() - startTime;
        
        // Record API metrics asynchronously
        setImmediate(async () => {
          try {
            await self.monitoringService.recordAPIResponse({
              endpoint: req.route?.path || req.path,
              method: req.method,
              statusCode: res.statusCode,
              responseTime,
              requestSize: req.requestSize || 0,
              responseSize,
              userId: (req as any).user?.id,
              userAgent: req.get('User-Agent'),
              timestamp: new Date(startTime),
            });
          } catch (error) {
            console.error('Error recording API metrics:', error);
          }
        });

        // Call original end method
        return originalEnd(chunk, encoding, cb);
      };

      next();
    };
  }

  // Middleware to track codepage execution metrics
  trackCodepageExecution() {
    const self = this;
    return async (req: Request, res: Response, next: NextFunction) => {
      // This middleware would be used specifically for codepage execution endpoints
      if (!req.path.includes('/codepages/execute') && !req.path.includes('/tests/execute')) {
        return next();
      }

      const originalJson = res.json;
      
      res.json = function(body: any) {
        // If this is a successful codepage execution, record metrics
        if (res.statusCode === 200 && body.success && body.data?.executionMetrics) {
          const metrics = body.data.executionMetrics;
          
          setImmediate(async () => {
            try {
              await self.monitoringService.recordCodepageExecution({
                codepageId: metrics.codepageId || 'unknown',
                projectId: metrics.projectId || 'unknown',
                versionId: metrics.versionId || 'current',
                executionTime: metrics.executionTime || 0,
                memoryUsage: metrics.memoryUsage || 0,
                cpuUsage: metrics.cpuUsage || 0,
                apiCallCount: metrics.apiCallCount || 0,
                errorCount: metrics.errorCount || 0,
                userId: (req as any).user?.id,
                environment: metrics.environment || 'development',
              });
            } catch (error) {
              console.error('Error recording codepage execution metrics:', error);
            }
          });
        }

        return originalJson.call(this, body);
      };

      next();
    };
  }

  // Middleware to add monitoring headers
  addMonitoringHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Add request ID for tracing
      const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      req.headers['x-request-id'] = requestId;
      res.setHeader('X-Request-ID', requestId);
      
      // Add server timestamp
      res.setHeader('X-Server-Time', new Date().toISOString());
      
      next();
    };
  }

  // Error tracking middleware
  trackErrors() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      // Record error metrics
      setImmediate(async () => {
        try {
          await this.monitoringService.recordMetric({
            type: 'api_response',
            name: 'api_errors',
            value: 1,
            unit: 'count',
            metadata: {
              endpoint: req.route?.path || req.path,
              method: req.method,
              errorMessage: error.message,
              errorStack: error.stack,
              userId: (req as any).user?.id,
              requestId: req.headers['x-request-id'],
            },
          });
        } catch (metricsError) {
          console.error('Error recording error metrics:', metricsError);
        }
      });

      next(error);
    };
  }

  private calculateRequestSize(req: Request): number {
    let size = 0;
    
    // Add headers size
    Object.entries(req.headers).forEach(([key, value]) => {
      size += Buffer.byteLength(key);
      if (typeof value === 'string') {
        size += Buffer.byteLength(value);
      } else if (Array.isArray(value)) {
        value.forEach(v => size += Buffer.byteLength(v));
      }
    });
    
    // Add URL size
    size += Buffer.byteLength(req.url);
    
    // Add method size
    size += Buffer.byteLength(req.method);
    
    // Add body size if available
    if (req.body) {
      try {
        size += Buffer.byteLength(JSON.stringify(req.body));
      } catch (error) {
        // If body can't be stringified, estimate size
        size += 1000; // Default estimate
      }
    }
    
    return size;
  }
}

// Factory function to create monitoring middleware
export function createMonitoringMiddleware(monitoringService: MonitoringService) {
  return new MonitoringMiddleware(monitoringService);
}