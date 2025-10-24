import { z } from 'zod';

// Performance monitoring interfaces
export interface PerformanceMetric {
  id: string;
  type: 'codepage_execution' | 'api_response' | 'system_resource';
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CodepageExecutionMetrics {
  codepageId: string;
  projectId: string;
  versionId: string;
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  apiCallCount: number;
  errorCount: number;
  userId?: string;
  environment: 'development' | 'staging' | 'production';
}

export interface APIResponseMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestSize: number;
  responseSize: number;
  userId?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface SystemResourceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIO: {
    bytesIn: number;
    bytesOut: number;
  };
  activeConnections: number;
  timestamp: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  type: 'threshold' | 'anomaly' | 'error_rate';
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  timeWindow: number; // minutes
  isActive: boolean;
  notificationChannels: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  triggerValue: number;
  threshold: number;
  metadata: Record<string, any>;
  isResolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

// Validation schemas
export const PerformanceMetricSchema = z.object({
  type: z.enum(['codepage_execution', 'api_response', 'system_resource']),
  name: z.string().min(1).max(100),
  value: z.number(),
  unit: z.string().min(1).max(20),
  metadata: z.record(z.any()).optional(),
});

export const AlertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['threshold', 'anomaly', 'error_rate']),
  metric: z.string().min(1),
  condition: z.enum(['greater_than', 'less_than', 'equals', 'not_equals']),
  threshold: z.number(),
  timeWindow: z.number().min(1).max(1440), // 1 minute to 24 hours
  notificationChannels: z.array(z.string()),
});

export class MonitoringService {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private metricBuffer: PerformanceMetric[] = [];
  private readonly BUFFER_SIZE = 1000;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.initializeDefaultAlertRules();
    this.startMetricsFlushing();
    this.startSystemMonitoring();
    console.log('📊 Monitoring service initialized');
  }

  private initializeDefaultAlertRules(): void {
    const defaultRules: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'High Codepage Execution Time',
        type: 'threshold',
        metric: 'codepage_execution_time',
        condition: 'greater_than',
        threshold: 10000, // 10 seconds
        timeWindow: 5,
        isActive: true,
        notificationChannels: ['console', 'log'],
      },
      {
        name: 'High Memory Usage',
        type: 'threshold',
        metric: 'codepage_memory_usage',
        condition: 'greater_than',
        threshold: 134217728, // 128MB
        timeWindow: 5,
        isActive: true,
        notificationChannels: ['console', 'log'],
      },
      {
        name: 'High API Response Time',
        type: 'threshold',
        metric: 'api_response_time',
        condition: 'greater_than',
        threshold: 5000, // 5 seconds
        timeWindow: 10,
        isActive: true,
        notificationChannels: ['console', 'log'],
      },
      {
        name: 'High Error Rate',
        type: 'error_rate',
        metric: 'api_error_rate',
        condition: 'greater_than',
        threshold: 0.1, // 10% error rate
        timeWindow: 15,
        isActive: true,
        notificationChannels: ['console', 'log'],
      },
      {
        name: 'System CPU Usage',
        type: 'threshold',
        metric: 'system_cpu_usage',
        condition: 'greater_than',
        threshold: 80, // 80% CPU usage
        timeWindow: 5,
        isActive: true,
        notificationChannels: ['console', 'log'],
      },
    ];

    defaultRules.forEach(rule => {
      const alertRule: AlertRule = {
        ...rule,
        id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.alertRules.set(alertRule.id, alertRule);
    });

    console.log(`🚨 Initialized ${defaultRules.length} default alert rules`);
  }

  private startMetricsFlushing(): void {
    setInterval(() => {
      this.flushMetrics();
    }, this.FLUSH_INTERVAL);
  }

  private startSystemMonitoring(): void {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 60000); // Every minute
  }

  // Core metric collection methods

  async recordCodepageExecution(metrics: CodepageExecutionMetrics): Promise<void> {
    const timestamp = new Date();

    // Record individual metrics
    await Promise.all([
      this.recordMetric({
        type: 'codepage_execution',
        name: 'codepage_execution_time',
        value: metrics.executionTime,
        unit: 'ms',
        metadata: {
          codepageId: metrics.codepageId,
          projectId: metrics.projectId,
          versionId: metrics.versionId,
          environment: metrics.environment,
          userId: metrics.userId,
        },
      }),
      this.recordMetric({
        type: 'codepage_execution',
        name: 'codepage_memory_usage',
        value: metrics.memoryUsage,
        unit: 'bytes',
        metadata: {
          codepageId: metrics.codepageId,
          projectId: metrics.projectId,
          versionId: metrics.versionId,
          environment: metrics.environment,
        },
      }),
      this.recordMetric({
        type: 'codepage_execution',
        name: 'codepage_cpu_usage',
        value: metrics.cpuUsage,
        unit: 'percent',
        metadata: {
          codepageId: metrics.codepageId,
          projectId: metrics.projectId,
          environment: metrics.environment,
        },
      }),
      this.recordMetric({
        type: 'codepage_execution',
        name: 'codepage_api_calls',
        value: metrics.apiCallCount,
        unit: 'count',
        metadata: {
          codepageId: metrics.codepageId,
          projectId: metrics.projectId,
          environment: metrics.environment,
        },
      }),
      this.recordMetric({
        type: 'codepage_execution',
        name: 'codepage_errors',
        value: metrics.errorCount,
        unit: 'count',
        metadata: {
          codepageId: metrics.codepageId,
          projectId: metrics.projectId,
          environment: metrics.environment,
        },
      }),
    ]);

    console.log(`📊 Recorded codepage execution metrics for ${metrics.codepageId}`);
  }

  async recordAPIResponse(metrics: APIResponseMetrics): Promise<void> {
    await Promise.all([
      this.recordMetric({
        type: 'api_response',
        name: 'api_response_time',
        value: metrics.responseTime,
        unit: 'ms',
        metadata: {
          endpoint: metrics.endpoint,
          method: metrics.method,
          statusCode: metrics.statusCode,
          userId: metrics.userId,
          userAgent: metrics.userAgent,
        },
      }),
      this.recordMetric({
        type: 'api_response',
        name: 'api_request_size',
        value: metrics.requestSize,
        unit: 'bytes',
        metadata: {
          endpoint: metrics.endpoint,
          method: metrics.method,
        },
      }),
      this.recordMetric({
        type: 'api_response',
        name: 'api_response_size',
        value: metrics.responseSize,
        unit: 'bytes',
        metadata: {
          endpoint: metrics.endpoint,
          method: metrics.method,
          statusCode: metrics.statusCode,
        },
      }),
    ]);

    // Check for error rates
    if (metrics.statusCode >= 400) {
      await this.recordMetric({
        type: 'api_response',
        name: 'api_errors',
        value: 1,
        unit: 'count',
        metadata: {
          endpoint: metrics.endpoint,
          method: metrics.method,
          statusCode: metrics.statusCode,
        },
      });
    }
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Calculate CPU percentage (simplified)
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      
      const systemMetrics: SystemResourceMetrics = {
        cpuUsage: Math.min(cpuPercent, 100), // Cap at 100%
        memoryUsage: memUsage.heapUsed,
        diskUsage: 0, // Would need additional library for disk usage
        networkIO: {
          bytesIn: 0, // Would need network monitoring
          bytesOut: 0,
        },
        activeConnections: 0, // Would track WebSocket/HTTP connections
        timestamp: new Date(),
      };

      await Promise.all([
        this.recordMetric({
          type: 'system_resource',
          name: 'system_cpu_usage',
          value: systemMetrics.cpuUsage,
          unit: 'percent',
        }),
        this.recordMetric({
          type: 'system_resource',
          name: 'system_memory_usage',
          value: systemMetrics.memoryUsage,
          unit: 'bytes',
        }),
        this.recordMetric({
          type: 'system_resource',
          name: 'system_heap_total',
          value: memUsage.heapTotal,
          unit: 'bytes',
        }),
        this.recordMetric({
          type: 'system_resource',
          name: 'system_external_memory',
          value: memUsage.external,
          unit: 'bytes',
        }),
      ]);

    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  async recordMetric(input: Omit<PerformanceMetric, 'id' | 'timestamp'>): Promise<void> {
    const metric: PerformanceMetric = {
      ...input,
      id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    // Add to buffer
    this.metricBuffer.push(metric);

    // Check if we need to flush
    if (this.metricBuffer.length >= this.BUFFER_SIZE) {
      await this.flushMetrics();
    }

    // Check alert rules
    await this.checkAlertRules(metric);
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricBuffer.length === 0) return;

    const metricsToFlush = [...this.metricBuffer];
    this.metricBuffer = [];

    try {
      // Store metrics (in a real implementation, this would go to a time-series database)
      metricsToFlush.forEach(metric => {
        this.metrics.set(metric.id, metric);
      });

      // Keep only recent metrics in memory (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      for (const [id, metric] of this.metrics.entries()) {
        if (metric.timestamp < oneDayAgo) {
          this.metrics.delete(id);
        }
      }

      console.log(`📊 Flushed ${metricsToFlush.length} metrics to storage`);
    } catch (error) {
      console.error('Error flushing metrics:', error);
      // Re-add metrics to buffer for retry
      this.metricBuffer.unshift(...metricsToFlush);
    }
  }

  // Alert management methods

  private async checkAlertRules(metric: PerformanceMetric): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.isActive) continue;

      try {
        const shouldAlert = await this.evaluateAlertRule(rule, metric);
        if (shouldAlert) {
          await this.triggerAlert(rule, metric);
        }
      } catch (error) {
        console.error(`Error evaluating alert rule ${rule.name}:`, error);
      }
    }
  }

  private async evaluateAlertRule(rule: AlertRule, metric: PerformanceMetric): Promise<boolean> {
    // Check if this metric matches the rule
    if (metric.name !== rule.metric) return false;

    // Get recent metrics for this rule's time window
    const windowStart = new Date(Date.now() - rule.timeWindow * 60 * 1000);
    const recentMetrics = Array.from(this.metrics.values())
      .filter(m => m.name === rule.metric && m.timestamp >= windowStart)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (recentMetrics.length === 0) return false;

    let triggerValue: number;

    switch (rule.type) {
      case 'threshold':
        triggerValue = metric.value;
        break;
      
      case 'error_rate':
        // Calculate error rate over the time window
        const totalRequests = recentMetrics.length;
        const errorRequests = recentMetrics.filter(m => 
          m.metadata?.statusCode >= 400 || m.name.includes('error')
        ).length;
        triggerValue = totalRequests > 0 ? errorRequests / totalRequests : 0;
        break;
      
      case 'anomaly':
        // Simple anomaly detection: check if current value is significantly different from average
        const values = recentMetrics.slice(1).map(m => m.value); // Exclude current metric
        if (values.length < 5) return false; // Need enough data points
        
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length);
        
        triggerValue = Math.abs(metric.value - average) / (stdDev || 1);
        break;
      
      default:
        return false;
    }

    // Evaluate condition
    switch (rule.condition) {
      case 'greater_than':
        return triggerValue > rule.threshold;
      case 'less_than':
        return triggerValue < rule.threshold;
      case 'equals':
        return Math.abs(triggerValue - rule.threshold) < 0.001;
      case 'not_equals':
        return Math.abs(triggerValue - rule.threshold) >= 0.001;
      default:
        return false;
    }
  }

  private async triggerAlert(rule: AlertRule, metric: PerformanceMetric): Promise<void> {
    // Check if there's already an active alert for this rule
    const existingAlert = Array.from(this.activeAlerts.values())
      .find(alert => alert.ruleId === rule.id && !alert.isResolved);

    if (existingAlert) {
      // Update existing alert
      existingAlert.triggerValue = metric.value;
      existingAlert.metadata = { ...existingAlert.metadata, ...metric.metadata };
      return;
    }

    // Create new alert
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: this.calculateAlertSeverity(rule, metric.value),
      message: this.generateAlertMessage(rule, metric),
      triggerValue: metric.value,
      threshold: rule.threshold,
      metadata: metric.metadata || {},
      isResolved: false,
      createdAt: new Date(),
    };

    this.activeAlerts.set(alert.id, alert);

    // Send notifications
    await this.sendAlertNotifications(alert, rule.notificationChannels);

    console.log(`🚨 Alert triggered: ${alert.message}`);
  }

  private calculateAlertSeverity(rule: AlertRule, value: number): Alert['severity'] {
    const ratio = Math.abs(value - rule.threshold) / rule.threshold;
    
    if (ratio >= 2) return 'critical';
    if (ratio >= 1) return 'high';
    if (ratio >= 0.5) return 'medium';
    return 'low';
  }

  private generateAlertMessage(rule: AlertRule, metric: PerformanceMetric): string {
    const unit = metric.unit;
    const value = metric.value;
    const threshold = rule.threshold;
    
    return `${rule.name}: ${metric.name} is ${value}${unit} (threshold: ${threshold}${unit})`;
  }

  private async sendAlertNotifications(alert: Alert, channels: string[]): Promise<void> {
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'console':
            console.warn(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
            break;
          
          case 'log':
            // In a real implementation, this would write to a structured log
            console.log(JSON.stringify({
              type: 'alert',
              level: alert.severity,
              message: alert.message,
              alertId: alert.id,
              ruleId: alert.ruleId,
              timestamp: alert.createdAt.toISOString(),
              metadata: alert.metadata,
            }));
            break;
          
          case 'email':
            // Would integrate with email service
            console.log(`📧 Email alert sent: ${alert.message}`);
            break;
          
          case 'slack':
            // Would integrate with Slack API
            console.log(`💬 Slack alert sent: ${alert.message}`);
            break;
          
          default:
            console.warn(`Unknown notification channel: ${channel}`);
        }
      } catch (error) {
        console.error(`Error sending alert to ${channel}:`, error);
      }
    }
  }

  // Public API methods

  async createAlertRule(input: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> {
    const rule: AlertRule = {
      ...input,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.alertRules.set(rule.id, rule);
    console.log(`🚨 Created alert rule: ${rule.name}`);
    
    return rule;
  }

  async updateAlertRule(ruleId: string, updates: Partial<Omit<AlertRule, 'id' | 'createdAt'>>): Promise<AlertRule> {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      throw new Error('Alert rule not found');
    }

    Object.assign(rule, updates, { updatedAt: new Date() });
    this.alertRules.set(ruleId, rule);
    
    console.log(`📝 Updated alert rule: ${rule.name}`);
    return rule;
  }

  async deleteAlertRule(ruleId: string): Promise<void> {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      throw new Error('Alert rule not found');
    }

    this.alertRules.delete(ruleId);
    
    // Resolve any active alerts for this rule
    for (const alert of this.activeAlerts.values()) {
      if (alert.ruleId === ruleId && !alert.isResolved) {
        alert.isResolved = true;
        alert.resolvedAt = new Date();
      }
    }

    console.log(`🗑️ Deleted alert rule: ${rule.name}`);
  }

  async getAlertRules(): Promise<AlertRule[]> {
    return Array.from(this.alertRules.values());
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.isResolved);
  }

  async getAllAlerts(limit: number = 100): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.isResolved = true;
    alert.resolvedAt = new Date();
    
    console.log(`✅ Resolved alert: ${alert.message}`);
  }

  async getMetrics(
    type?: PerformanceMetric['type'],
    name?: string,
    startTime?: Date,
    endTime?: Date,
    limit: number = 1000
  ): Promise<PerformanceMetric[]> {
    let metrics = Array.from(this.metrics.values());

    // Apply filters
    if (type) {
      metrics = metrics.filter(m => m.type === type);
    }
    if (name) {
      metrics = metrics.filter(m => m.name === name);
    }
    if (startTime) {
      metrics = metrics.filter(m => m.timestamp >= startTime);
    }
    if (endTime) {
      metrics = metrics.filter(m => m.timestamp <= endTime);
    }

    // Sort by timestamp (newest first) and limit
    return metrics
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getMetricsSummary(
    type?: PerformanceMetric['type'],
    timeWindow: number = 60 // minutes
  ): Promise<{
    totalMetrics: number;
    averageValue: number;
    minValue: number;
    maxValue: number;
    timeRange: { start: Date; end: Date };
  }> {
    const windowStart = new Date(Date.now() - timeWindow * 60 * 1000);
    let metrics = Array.from(this.metrics.values())
      .filter(m => m.timestamp >= windowStart);

    if (type) {
      metrics = metrics.filter(m => m.type === type);
    }

    if (metrics.length === 0) {
      return {
        totalMetrics: 0,
        averageValue: 0,
        minValue: 0,
        maxValue: 0,
        timeRange: { start: windowStart, end: new Date() },
      };
    }

    const values = metrics.map(m => m.value);
    
    return {
      totalMetrics: metrics.length,
      averageValue: values.reduce((sum, val) => sum + val, 0) / values.length,
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
      timeRange: {
        start: windowStart,
        end: new Date(),
      },
    };
  }

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    activeAlerts: number;
    criticalAlerts: number;
    systemMetrics: {
      cpuUsage: number;
      memoryUsage: number;
      responseTime: number;
    };
    uptime: number;
  }> {
    const activeAlerts = Array.from(this.activeAlerts.values()).filter(a => !a.isResolved);
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    
    // Get recent system metrics
    const recentMetrics = await this.getMetrics('system_resource', undefined, 
      new Date(Date.now() - 5 * 60 * 1000), undefined, 10);
    
    const cpuMetrics = recentMetrics.filter(m => m.name === 'system_cpu_usage');
    const memoryMetrics = recentMetrics.filter(m => m.name === 'system_memory_usage');
    
    const avgCpu = cpuMetrics.length > 0 
      ? cpuMetrics.reduce((sum, m) => sum + m.value, 0) / cpuMetrics.length 
      : 0;
    const avgMemory = memoryMetrics.length > 0 
      ? memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length 
      : 0;

    // Get average API response time
    const apiMetrics = await this.getMetrics('api_response', 'api_response_time',
      new Date(Date.now() - 5 * 60 * 1000), undefined, 50);
    const avgResponseTime = apiMetrics.length > 0
      ? apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length
      : 0;

    // Determine overall health status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalAlerts.length > 0 || avgCpu > 90 || avgResponseTime > 10000) {
      status = 'critical';
    } else if (activeAlerts.length > 0 || avgCpu > 70 || avgResponseTime > 5000) {
      status = 'warning';
    }

    return {
      status,
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      systemMetrics: {
        cpuUsage: Math.round(avgCpu * 100) / 100,
        memoryUsage: Math.round(avgMemory / 1024 / 1024 * 100) / 100, // MB
        responseTime: Math.round(avgResponseTime * 100) / 100,
      },
      uptime: process.uptime(),
    };
  }
}