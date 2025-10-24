import { Request, Response } from 'express';
import { createClient } from 'redis';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  services: {
    redis: ServiceHealth;
    quickbase: ServiceHealth;
    websocket: ServiceHealth;
  };
  metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    activeConnections: number;
  };
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

export class HealthService {
  private redisClient: any;
  private startTime: number;
  private cpuUsageStart: NodeJS.CpuUsage;

  constructor() {
    this.startTime = Date.now();
    this.cpuUsageStart = process.cpuUsage();
    this.initializeRedisClient();
  }

  private async initializeRedisClient() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redisClient = createClient({ url: redisUrl });
      
      this.redisClient.on('error', (err: Error) => {
        console.error('Redis client error:', err);
      });
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
    }
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;
    const version = process.env.npm_package_version || '1.0.0';
    const environment = process.env.NODE_ENV || 'development';

    // Check service health
    const [redisHealth, quickbaseHealth, websocketHealth] = await Promise.all([
      this.checkRedisHealth(),
      this.checkQuickBaseHealth(),
      this.checkWebSocketHealth(),
    ]);

    // Get system metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.cpuUsageStart);
    const activeConnections = this.getActiveConnections();

    // Determine overall status
    const services = { redis: redisHealth, quickbase: quickbaseHealth, websocket: websocketHealth };
    const overallStatus = this.determineOverallStatus(services);

    return {
      status: overallStatus,
      timestamp,
      version,
      environment,
      uptime,
      services,
      metrics: {
        memoryUsage,
        cpuUsage,
        activeConnections,
      },
    };
  }

  private async checkRedisHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      if (!this.redisClient) {
        return {
          status: 'unknown',
          lastCheck: new Date().toISOString(),
          error: 'Redis client not initialized',
        };
      }

      await this.redisClient.ping();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkQuickBaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Simple check - verify environment variables are set
      const requiredVars = ['QB_REALM', 'QB_USER_TOKEN', 'QB_APP_ID'];
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        return {
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          error: `Missing environment variables: ${missingVars.join(', ')}`,
        };
      }

      // TODO: Add actual QuickBase API health check when MCP client is available
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkWebSocketHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Check if WebSocket server is configured
      const wsPort = process.env.WS_PORT || '3002';
      
      // TODO: Add actual WebSocket health check
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private determineOverallStatus(services: HealthStatus['services']): 'healthy' | 'unhealthy' | 'degraded' {
    const serviceStatuses = Object.values(services).map(service => service.status);
    
    if (serviceStatuses.every(status => status === 'healthy')) {
      return 'healthy';
    }
    
    if (serviceStatuses.some(status => status === 'unhealthy')) {
      return 'degraded';
    }
    
    return 'unhealthy';
  }

  private getActiveConnections(): number {
    // TODO: Implement actual connection counting
    // This would typically track WebSocket connections, HTTP connections, etc.
    return 0;
  }

  // Express middleware for health check endpoint
  async healthCheckHandler(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = await this.getHealthStatus();
      
      const statusCode = healthStatus.status === 'healthy' ? 200 : 
                        healthStatus.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json({
        success: true,
        data: healthStatus,
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Health check failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  // Readiness probe (for Kubernetes/Docker)
  async readinessHandler(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = await this.getHealthStatus();
      
      if (healthStatus.status === 'healthy') {
        res.status(200).json({ status: 'ready' });
      } else {
        res.status(503).json({ status: 'not ready', reason: healthStatus.status });
      }
    } catch (error) {
      res.status(503).json({ 
        status: 'not ready', 
        reason: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // Liveness probe (for Kubernetes/Docker)
  async livenessHandler(req: Request, res: Response): Promise<void> {
    // Simple liveness check - if the process is running, it's alive
    res.status(200).json({ 
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    });
  }
}