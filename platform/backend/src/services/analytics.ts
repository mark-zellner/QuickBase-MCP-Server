import { z } from 'zod';

// Analytics interfaces
export interface UsageMetric {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  duration?: number;
  success: boolean;
}

export interface UserActivity {
  userId: string;
  userName: string;
  userRole: string;
  totalSessions: number;
  totalActions: number;
  lastActivity: Date;
  favoriteFeatures: string[];
  averageSessionDuration: number;
}

export interface SystemHealthMetrics {
  timestamp: Date;
  activeUsers: number;
  totalCodepages: number;
  totalProjects: number;
  totalTests: number;
  averageResponseTime: number;
  errorRate: number;
  systemUptime: number;
}

export interface CodepageUsageStats {
  codepageId: string;
  codepageName: string;
  projectId: string;
  totalExecutions: number;
  totalUsers: number;
  averageExecutionTime: number;
  successRate: number;
  lastUsed: Date;
  popularityScore: number;
}

export interface ProjectAnalytics {
  projectId: string;
  projectName: string;
  ownerId: string;
  collaborators: number;
  totalCodepages: number;
  totalTests: number;
  totalExecutions: number;
  averageTestSuccessRate: number;
  lastActivity: Date;
  activityScore: number;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  type: 'usage' | 'performance' | 'audit' | 'system_health';
  parameters: Record<string, any>;
  generatedAt: Date;
  generatedBy: string;
  data: any;
  summary: {
    totalRecords: number;
    timeRange: { start: Date; end: Date };
    keyMetrics: Record<string, number>;
  };
}

// Validation schemas
export const UsageMetricSchema = z.object({
  userId: z.string(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  duration: z.number().optional(),
  success: z.boolean(),
});

export const GenerateReportSchema = z.object({
  type: z.enum(['usage', 'performance', 'audit', 'system_health']),
  name: z.string().min(1).max(100),
  parameters: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    userId: z.string().optional(),
    projectId: z.string().optional(),
    resourceType: z.string().optional(),
    includeDetails: z.boolean().default(false),
  }),
});

export class AnalyticsService {
  private usageMetrics: Map<string, UsageMetric> = new Map();
  private auditLogs: Map<string, AuditLogEntry> = new Map();
  private reports: Map<string, AnalyticsReport> = new Map();
  private userSessions: Map<string, { startTime: Date; lastActivity: Date; actions: number }> = new Map();

  constructor() {
    this.initializeSampleData();
    this.startPeriodicCleanup();
    console.log('📊 Analytics service initialized');
  }

  private initializeSampleData(): void {
    // Initialize with some sample usage metrics
    const sampleMetrics: Omit<UsageMetric, 'id' | 'timestamp'>[] = [
      {
        userId: 'user-001',
        action: 'codepage_execute',
        resource: 'codepage',
        resourceId: 'codepage-001',
        metadata: { executionTime: 1200, memoryUsage: 45000000 },
        duration: 1200,
        success: true,
      },
      {
        userId: 'user-002',
        action: 'project_create',
        resource: 'project',
        resourceId: 'project-002',
        metadata: { templateId: 'pricing-calculator' },
        duration: 5000,
        success: true,
      },
      {
        userId: 'user-001',
        action: 'test_execute',
        resource: 'test',
        resourceId: 'test-001',
        metadata: { testType: 'unit', passed: true },
        duration: 800,
        success: true,
      },
    ];

    sampleMetrics.forEach(metric => {
      this.recordUsageMetric(metric);
    });

    // Initialize sample audit logs
    const sampleAuditLogs: Omit<AuditLogEntry, 'id' | 'timestamp'>[] = [
      {
        userId: 'user-001',
        userName: 'John Developer',
        action: 'codepage_deploy',
        resource: 'codepage',
        resourceId: 'codepage-001',
        changes: { environment: 'production', version: '1.2.0' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        success: true,
      },
      {
        userId: 'user-002',
        userName: 'Jane Manager',
        action: 'schema_modify',
        resource: 'table',
        resourceId: 'table-vehicles',
        changes: { addedFields: ['warranty_expiry'] },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0...',
        success: true,
      },
    ];

    sampleAuditLogs.forEach(log => {
      this.recordAuditLog(log);
    });

    console.log('📊 Sample analytics data initialized');
  }

  private startPeriodicCleanup(): void {
    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000);
  }

  private cleanupOldData(): void {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Clean up old usage metrics
    for (const [id, metric] of this.usageMetrics.entries()) {
      if (metric.timestamp < thirtyDaysAgo) {
        this.usageMetrics.delete(id);
      }
    }

    // Clean up old audit logs (keep for 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    for (const [id, log] of this.auditLogs.entries()) {
      if (log.timestamp < ninetyDaysAgo) {
        this.auditLogs.delete(id);
      }
    }

    console.log('🧹 Cleaned up old analytics data');
  }

  // Usage tracking methods

  async recordUsageMetric(input: Omit<UsageMetric, 'id' | 'timestamp'>): Promise<void> {
    const metric: UsageMetric = {
      ...input,
      id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.usageMetrics.set(metric.id, metric);

    // Update user session tracking
    this.updateUserSession(metric.userId, metric.action);

    console.log(`📊 Recorded usage metric: ${metric.action} by ${metric.userId}`);
  }

  private updateUserSession(userId: string, action: string): void {
    const now = new Date();
    
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        startTime: now,
        lastActivity: now,
        actions: 1,
      });
    } else {
      const session = this.userSessions.get(userId)!;
      session.lastActivity = now;
      session.actions++;
    }
  }

  async recordAuditLog(input: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditLog: AuditLogEntry = {
      ...input,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.auditLogs.set(auditLog.id, auditLog);

    console.log(`📋 Recorded audit log: ${auditLog.action} by ${auditLog.userName}`);
  }

  // Analytics query methods

  async getUserActivity(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UserActivity[]> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    let metrics = Array.from(this.usageMetrics.values())
      .filter(m => m.timestamp >= start && m.timestamp <= end);

    if (userId) {
      metrics = metrics.filter(m => m.userId === userId);
    }

    // Group by user
    const userMetrics = new Map<string, UsageMetric[]>();
    metrics.forEach(metric => {
      if (!userMetrics.has(metric.userId)) {
        userMetrics.set(metric.userId, []);
      }
      userMetrics.get(metric.userId)!.push(metric);
    });

    const activities: UserActivity[] = [];

    for (const [uid, userMetricsList] of userMetrics.entries()) {
      // Calculate session information
      const sessions = this.calculateUserSessions(userMetricsList);
      
      // Calculate favorite features
      const actionCounts = new Map<string, number>();
      userMetricsList.forEach(m => {
        actionCounts.set(m.action, (actionCounts.get(m.action) || 0) + 1);
      });
      
      const favoriteFeatures = Array.from(actionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([action]) => action);

      activities.push({
        userId: uid,
        userName: `User ${uid}`, // In real implementation, would fetch from user service
        userRole: 'developer', // In real implementation, would fetch from user service
        totalSessions: sessions.length,
        totalActions: userMetricsList.length,
        lastActivity: Math.max(...userMetricsList.map(m => m.timestamp.getTime())) 
          ? new Date(Math.max(...userMetricsList.map(m => m.timestamp.getTime())))
          : new Date(),
        favoriteFeatures,
        averageSessionDuration: sessions.length > 0 
          ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length
          : 0,
      });
    }

    return activities.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  private calculateUserSessions(metrics: UsageMetric[]): { duration: number; actions: number }[] {
    if (metrics.length === 0) return [];

    // Sort by timestamp
    const sortedMetrics = metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const sessions: { duration: number; actions: number }[] = [];
    let currentSession = { start: sortedMetrics[0].timestamp, actions: 1 };
    
    for (let i = 1; i < sortedMetrics.length; i++) {
      const timeDiff = sortedMetrics[i].timestamp.getTime() - sortedMetrics[i - 1].timestamp.getTime();
      
      // If more than 30 minutes between actions, consider it a new session
      if (timeDiff > 30 * 60 * 1000) {
        sessions.push({
          duration: sortedMetrics[i - 1].timestamp.getTime() - currentSession.start.getTime(),
          actions: currentSession.actions,
        });
        currentSession = { start: sortedMetrics[i].timestamp, actions: 1 };
      } else {
        currentSession.actions++;
      }
    }
    
    // Add the last session
    sessions.push({
      duration: sortedMetrics[sortedMetrics.length - 1].timestamp.getTime() - currentSession.start.getTime(),
      actions: currentSession.actions,
    });

    return sessions;
  }

  async getCodepageUsageStats(
    projectId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CodepageUsageStats[]> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    let metrics = Array.from(this.usageMetrics.values())
      .filter(m => 
        m.timestamp >= start && 
        m.timestamp <= end && 
        m.resource === 'codepage' && 
        m.action === 'codepage_execute'
      );

    if (projectId) {
      metrics = metrics.filter(m => m.metadata?.projectId === projectId);
    }

    // Group by codepage
    const codepageMetrics = new Map<string, UsageMetric[]>();
    metrics.forEach(metric => {
      const codepageId = metric.resourceId || 'unknown';
      if (!codepageMetrics.has(codepageId)) {
        codepageMetrics.set(codepageId, []);
      }
      codepageMetrics.get(codepageId)!.push(metric);
    });

    const stats: CodepageUsageStats[] = [];

    for (const [codepageId, codepageMetricsList] of codepageMetrics.entries()) {
      const uniqueUsers = new Set(codepageMetricsList.map(m => m.userId)).size;
      const totalExecutions = codepageMetricsList.length;
      const successfulExecutions = codepageMetricsList.filter(m => m.success).length;
      const executionTimes = codepageMetricsList
        .map(m => m.duration || 0)
        .filter(d => d > 0);
      
      const averageExecutionTime = executionTimes.length > 0
        ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
        : 0;

      const lastUsed = Math.max(...codepageMetricsList.map(m => m.timestamp.getTime()))
        ? new Date(Math.max(...codepageMetricsList.map(m => m.timestamp.getTime())))
        : new Date();

      // Calculate popularity score based on usage frequency and recency
      const daysSinceLastUse = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
      const popularityScore = Math.max(0, (totalExecutions * uniqueUsers) / Math.max(1, daysSinceLastUse));

      stats.push({
        codepageId,
        codepageName: `Codepage ${codepageId}`, // In real implementation, would fetch from codepage service
        projectId: codepageMetricsList[0]?.metadata?.projectId || 'unknown',
        totalExecutions,
        totalUsers: uniqueUsers,
        averageExecutionTime,
        successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
        lastUsed,
        popularityScore,
      });
    }

    return stats.sort((a, b) => b.popularityScore - a.popularityScore);
  }

  async getProjectAnalytics(
    ownerId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ProjectAnalytics[]> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    let metrics = Array.from(this.usageMetrics.values())
      .filter(m => m.timestamp >= start && m.timestamp <= end);

    if (ownerId) {
      metrics = metrics.filter(m => m.userId === ownerId);
    }

    // Group by project
    const projectMetrics = new Map<string, UsageMetric[]>();
    metrics.forEach(metric => {
      const projectId = metric.metadata?.projectId || 'unknown';
      if (!projectMetrics.has(projectId)) {
        projectMetrics.set(projectId, []);
      }
      projectMetrics.get(projectId)!.push(metric);
    });

    const analytics: ProjectAnalytics[] = [];

    for (const [projectId, projectMetricsList] of projectMetrics.entries()) {
      const collaborators = new Set(projectMetricsList.map(m => m.userId)).size;
      const codepageMetrics = projectMetricsList.filter(m => m.resource === 'codepage');
      const testMetrics = projectMetricsList.filter(m => m.resource === 'test');
      
      const totalCodepages = new Set(
        codepageMetrics.map(m => m.resourceId).filter(Boolean)
      ).size;
      
      const totalTests = testMetrics.length;
      const totalExecutions = codepageMetrics.filter(m => m.action === 'codepage_execute').length;
      
      const successfulTests = testMetrics.filter(m => m.success).length;
      const averageTestSuccessRate = totalTests > 0 ? successfulTests / totalTests : 0;

      const lastActivity = Math.max(...projectMetricsList.map(m => m.timestamp.getTime()))
        ? new Date(Math.max(...projectMetricsList.map(m => m.timestamp.getTime())))
        : new Date();

      // Calculate activity score based on recent activity and engagement
      const daysSinceLastActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
      const activityScore = Math.max(0, (totalExecutions + totalTests) / Math.max(1, daysSinceLastActivity));

      analytics.push({
        projectId,
        projectName: `Project ${projectId}`, // In real implementation, would fetch from project service
        ownerId: projectMetricsList[0]?.userId || 'unknown',
        collaborators,
        totalCodepages,
        totalTests,
        totalExecutions,
        averageTestSuccessRate,
        lastActivity,
        activityScore,
      });
    }

    return analytics.sort((a, b) => b.activityScore - a.activityScore);
  }

  async getSystemHealthMetrics(
    startDate?: Date,
    endDate?: Date,
    interval: 'hour' | 'day' = 'hour'
  ): Promise<SystemHealthMetrics[]> {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const metrics = Array.from(this.usageMetrics.values())
      .filter(m => m.timestamp >= start && m.timestamp <= end);

    const intervalMs = interval === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const healthMetrics: SystemHealthMetrics[] = [];

    // Create time buckets
    for (let time = start.getTime(); time < end.getTime(); time += intervalMs) {
      const bucketStart = new Date(time);
      const bucketEnd = new Date(time + intervalMs);
      
      const bucketMetrics = metrics.filter(m => 
        m.timestamp >= bucketStart && m.timestamp < bucketEnd
      );

      const activeUsers = new Set(bucketMetrics.map(m => m.userId)).size;
      const totalCodepages = new Set(
        bucketMetrics
          .filter(m => m.resource === 'codepage')
          .map(m => m.resourceId)
          .filter(Boolean)
      ).size;
      
      const totalProjects = new Set(
        bucketMetrics
          .map(m => m.metadata?.projectId)
          .filter(Boolean)
      ).size;
      
      const totalTests = bucketMetrics.filter(m => m.resource === 'test').length;
      
      const executionTimes = bucketMetrics
        .map(m => m.duration || 0)
        .filter(d => d > 0);
      const averageResponseTime = executionTimes.length > 0
        ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
        : 0;

      const totalActions = bucketMetrics.length;
      const failedActions = bucketMetrics.filter(m => !m.success).length;
      const errorRate = totalActions > 0 ? failedActions / totalActions : 0;

      healthMetrics.push({
        timestamp: bucketStart,
        activeUsers,
        totalCodepages,
        totalProjects,
        totalTests,
        averageResponseTime,
        errorRate,
        systemUptime: process.uptime(),
      });
    }

    return healthMetrics;
  }

  async getAuditLogs(
    userId?: string,
    action?: string,
    resource?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    let logs = Array.from(this.auditLogs.values())
      .filter(log => log.timestamp >= start && log.timestamp <= end);

    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }
    if (action) {
      logs = logs.filter(log => log.action === action);
    }
    if (resource) {
      logs = logs.filter(log => log.resource === resource);
    }

    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Report generation methods

  async generateReport(
    type: AnalyticsReport['type'],
    name: string,
    parameters: Record<string, any>,
    generatedBy: string
  ): Promise<AnalyticsReport> {
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let data: any;
    let keyMetrics: Record<string, number> = {};
    
    const startDate = parameters.startDate ? new Date(parameters.startDate) : undefined;
    const endDate = parameters.endDate ? new Date(parameters.endDate) : undefined;

    switch (type) {
      case 'usage':
        data = await this.generateUsageReport(parameters, startDate, endDate);
        keyMetrics = {
          totalUsers: data.userActivities?.length || 0,
          totalActions: data.totalActions || 0,
          averageSessionDuration: data.averageSessionDuration || 0,
        };
        break;

      case 'performance':
        data = await this.generatePerformanceReport(parameters, startDate, endDate);
        keyMetrics = {
          averageResponseTime: data.averageResponseTime || 0,
          totalExecutions: data.totalExecutions || 0,
          successRate: data.successRate || 0,
        };
        break;

      case 'audit':
        data = await this.generateAuditReport(parameters, startDate, endDate);
        keyMetrics = {
          totalAuditEntries: data.auditLogs?.length || 0,
          uniqueUsers: data.uniqueUsers || 0,
          failedActions: data.failedActions || 0,
        };
        break;

      case 'system_health':
        data = await this.generateSystemHealthReport(parameters, startDate, endDate);
        keyMetrics = {
          averageActiveUsers: data.averageActiveUsers || 0,
          totalProjects: data.totalProjects || 0,
          systemUptime: data.systemUptime || 0,
        };
        break;

      default:
        throw new Error(`Unknown report type: ${type}`);
    }

    const report: AnalyticsReport = {
      id: reportId,
      name,
      type,
      parameters,
      generatedAt: new Date(),
      generatedBy,
      data,
      summary: {
        totalRecords: Array.isArray(data) ? data.length : Object.keys(data).length,
        timeRange: {
          start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: endDate || new Date(),
        },
        keyMetrics,
      },
    };

    this.reports.set(reportId, report);
    console.log(`📊 Generated ${type} report: ${name} (ID: ${reportId})`);
    
    return report;
  }

  private async generateUsageReport(
    parameters: Record<string, any>,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const userActivities = await this.getUserActivity(
      parameters.userId,
      startDate,
      endDate
    );

    const codepageStats = await this.getCodepageUsageStats(
      parameters.projectId,
      startDate,
      endDate
    );

    const projectAnalytics = await this.getProjectAnalytics(
      parameters.userId,
      startDate,
      endDate
    );

    const totalActions = userActivities.reduce((sum, user) => sum + user.totalActions, 0);
    const averageSessionDuration = userActivities.length > 0
      ? userActivities.reduce((sum, user) => sum + user.averageSessionDuration, 0) / userActivities.length
      : 0;

    return {
      userActivities,
      codepageStats,
      projectAnalytics,
      totalActions,
      averageSessionDuration,
      summary: {
        totalUsers: userActivities.length,
        mostActiveUser: userActivities[0]?.userName || 'N/A',
        mostPopularCodepage: codepageStats[0]?.codepageName || 'N/A',
        mostActiveProject: projectAnalytics[0]?.projectName || 'N/A',
      },
    };
  }

  private async generatePerformanceReport(
    parameters: Record<string, any>,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    let metrics = Array.from(this.usageMetrics.values())
      .filter(m => m.timestamp >= start && m.timestamp <= end);

    if (parameters.projectId) {
      metrics = metrics.filter(m => m.metadata?.projectId === parameters.projectId);
    }

    const executionMetrics = metrics.filter(m => 
      m.action === 'codepage_execute' && m.duration
    );

    const executionTimes = executionMetrics.map(m => m.duration!);
    const averageResponseTime = executionTimes.length > 0
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
      : 0;

    const successfulExecutions = executionMetrics.filter(m => m.success).length;
    const successRate = executionMetrics.length > 0
      ? successfulExecutions / executionMetrics.length
      : 0;

    // Performance trends over time
    const performanceTrends = await this.getSystemHealthMetrics(startDate, endDate, 'day');

    return {
      totalExecutions: executionMetrics.length,
      averageResponseTime,
      successRate,
      performanceTrends,
      slowestExecutions: executionMetrics
        .sort((a, b) => (b.duration || 0) - (a.duration || 0))
        .slice(0, 10)
        .map(m => ({
          codepageId: m.resourceId,
          duration: m.duration,
          timestamp: m.timestamp,
          userId: m.userId,
        })),
      summary: {
        performanceGrade: successRate > 0.95 ? 'A' : successRate > 0.9 ? 'B' : successRate > 0.8 ? 'C' : 'D',
        averageResponseTimeMs: Math.round(averageResponseTime),
        totalFailures: executionMetrics.length - successfulExecutions,
      },
    };
  }

  private async generateAuditReport(
    parameters: Record<string, any>,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const auditLogs = await this.getAuditLogs(
      parameters.userId,
      parameters.action,
      parameters.resource,
      startDate,
      endDate,
      parameters.limit || 1000
    );

    const uniqueUsers = new Set(auditLogs.map(log => log.userId)).size;
    const failedActions = auditLogs.filter(log => !log.success).length;
    
    // Group by action type
    const actionCounts = new Map<string, number>();
    auditLogs.forEach(log => {
      actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
    });

    // Group by resource type
    const resourceCounts = new Map<string, number>();
    auditLogs.forEach(log => {
      resourceCounts.set(log.resource, (resourceCounts.get(log.resource) || 0) + 1);
    });

    return {
      auditLogs: parameters.includeDetails ? auditLogs : auditLogs.slice(0, 50),
      uniqueUsers,
      failedActions,
      actionBreakdown: Object.fromEntries(actionCounts),
      resourceBreakdown: Object.fromEntries(resourceCounts),
      summary: {
        totalEntries: auditLogs.length,
        successRate: auditLogs.length > 0 ? (auditLogs.length - failedActions) / auditLogs.length : 0,
        mostCommonAction: Array.from(actionCounts.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
        mostAffectedResource: Array.from(resourceCounts.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
      },
    };
  }

  private async generateSystemHealthReport(
    parameters: Record<string, any>,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const healthMetrics = await this.getSystemHealthMetrics(startDate, endDate, 'hour');
    
    const averageActiveUsers = healthMetrics.length > 0
      ? healthMetrics.reduce((sum, m) => sum + m.activeUsers, 0) / healthMetrics.length
      : 0;

    const totalProjects = Math.max(...healthMetrics.map(m => m.totalProjects), 0);
    const systemUptime = process.uptime();

    const averageErrorRate = healthMetrics.length > 0
      ? healthMetrics.reduce((sum, m) => sum + m.errorRate, 0) / healthMetrics.length
      : 0;

    return {
      healthMetrics,
      averageActiveUsers,
      totalProjects,
      systemUptime,
      averageErrorRate,
      summary: {
        healthStatus: averageErrorRate < 0.01 ? 'Excellent' : averageErrorRate < 0.05 ? 'Good' : 'Needs Attention',
        peakActiveUsers: Math.max(...healthMetrics.map(m => m.activeUsers), 0),
        uptimeDays: Math.floor(systemUptime / (24 * 60 * 60)),
      },
    };
  }

  async getReport(reportId: string): Promise<AnalyticsReport | null> {
    return this.reports.get(reportId) || null;
  }

  async getReports(
    type?: AnalyticsReport['type'],
    generatedBy?: string,
    limit: number = 50
  ): Promise<AnalyticsReport[]> {
    let reports = Array.from(this.reports.values());

    if (type) {
      reports = reports.filter(r => r.type === type);
    }
    if (generatedBy) {
      reports = reports.filter(r => r.generatedBy === generatedBy);
    }

    return reports
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }

  async deleteReport(reportId: string): Promise<boolean> {
    return this.reports.delete(reportId);
  }

  // Dashboard data methods

  async getDashboardData(userId?: string): Promise<{
    overview: {
      totalUsers: number;
      totalProjects: number;
      totalCodepages: number;
      totalExecutions: number;
    };
    recentActivity: UserActivity[];
    topCodepages: CodepageUsageStats[];
    systemHealth: SystemHealthMetrics;
    recentAuditLogs: AuditLogEntry[];
  }> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get overview metrics
    const allMetrics = Array.from(this.usageMetrics.values());
    const totalUsers = new Set(allMetrics.map(m => m.userId)).size;
    const totalProjects = new Set(allMetrics.map(m => m.metadata?.projectId).filter(Boolean)).size;
    const totalCodepages = new Set(
      allMetrics.filter(m => m.resource === 'codepage').map(m => m.resourceId).filter(Boolean)
    ).size;
    const totalExecutions = allMetrics.filter(m => m.action === 'codepage_execute').length;

    // Get recent activity
    const recentActivity = await this.getUserActivity(userId, last7Days);

    // Get top codepages
    const topCodepages = await this.getCodepageUsageStats(undefined, last7Days);

    // Get current system health
    const healthMetrics = await this.getSystemHealthMetrics(last24Hours);
    const systemHealth = healthMetrics[healthMetrics.length - 1] || {
      timestamp: new Date(),
      activeUsers: 0,
      totalCodepages: 0,
      totalProjects: 0,
      totalTests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      systemUptime: process.uptime(),
    };

    // Get recent audit logs
    const recentAuditLogs = await this.getAuditLogs(undefined, undefined, undefined, last7Days, undefined, 10);

    return {
      overview: {
        totalUsers,
        totalProjects,
        totalCodepages,
        totalExecutions,
      },
      recentActivity: recentActivity.slice(0, 10),
      topCodepages: topCodepages.slice(0, 5),
      systemHealth,
      recentAuditLogs,
    };
  }
}