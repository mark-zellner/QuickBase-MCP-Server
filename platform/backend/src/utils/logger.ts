import { config } from '../config/index.js';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
  requestId?: string;
  userId?: string;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = this.getLogLevel(config.logging.level);
  }

  private getLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(level: string, message: string, meta?: any, requestId?: string, userId?: string): string {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      ...(meta && { meta }),
      ...(requestId && { requestId }),
      ...(userId && { userId }),
    };

    if (config.server.isDevelopment) {
      // Pretty format for development
      let formatted = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
      if (requestId) formatted += ` (req: ${requestId})`;
      if (userId) formatted += ` (user: ${userId})`;
      if (meta) formatted += `\n  Meta: ${JSON.stringify(meta, null, 2)}`;
      return formatted;
    } else {
      // JSON format for production
      return JSON.stringify(logEntry);
    }
  }

  private writeLog(level: string, message: string, meta?: any, requestId?: string, userId?: string): void {
    const formatted = this.formatMessage(level, message, meta, requestId, userId);
    
    // Write to console
    console.log(formatted);
    
    // TODO: Write to file if configured
    if (config.logging.file) {
      // Implement file logging here
    }
    
    // TODO: Send to external logging service in production
    if (config.server.isProduction) {
      // Implement external logging here (e.g., CloudWatch, Datadog, etc.)
    }
  }

  error(message: string, meta?: any, requestId?: string, userId?: string): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.writeLog('ERROR', message, meta, requestId, userId);
    }
  }

  warn(message: string, meta?: any, requestId?: string, userId?: string): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.writeLog('WARN', message, meta, requestId, userId);
    }
  }

  info(message: string, meta?: any, requestId?: string, userId?: string): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.writeLog('INFO', message, meta, requestId, userId);
    }
  }

  debug(message: string, meta?: any, requestId?: string, userId?: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.writeLog('DEBUG', message, meta, requestId, userId);
    }
  }

  // Express middleware for request logging
  requestLogger() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();
      const requestId = req.headers['x-request-id'] || req.id || 'unknown';
      
      // Log request start
      this.info(`${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        query: req.query,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      }, requestId);

      // Log response
      res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'warn' : 'info';
        
        this[level as keyof Logger](`${req.method} ${req.path} - ${res.statusCode}`, {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          contentLength: res.get('Content-Length'),
        }, requestId);
      });

      next();
    };
  }

  // Error logging with stack trace
  logError(error: Error, context?: string, requestId?: string, userId?: string): void {
    this.error(`${context ? `${context}: ` : ''}${error.message}`, {
      name: error.name,
      stack: error.stack,
      context,
    }, requestId, userId);
  }

  // Performance logging
  logPerformance(operation: string, duration: number, meta?: any, requestId?: string): void {
    const level = duration > 1000 ? 'warn' : 'info';
    this[level as keyof Logger](`Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      ...meta,
    }, requestId);
  }

  // Security event logging
  logSecurityEvent(event: string, details: any, requestId?: string, userId?: string): void {
    this.warn(`Security Event: ${event}`, {
      event,
      ...details,
      timestamp: new Date().toISOString(),
    }, requestId, userId);
  }

  // Business event logging
  logBusinessEvent(event: string, details: any, requestId?: string, userId?: string): void {
    this.info(`Business Event: ${event}`, {
      event,
      ...details,
      timestamp: new Date().toISOString(),
    }, requestId, userId);
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Export logger for use in other modules
export default logger;