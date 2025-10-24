// Middleware exports
// Middleware will be implemented in subsequent tasks

import { Request, Response, NextFunction } from 'express';

// Export monitoring middleware
export { createMonitoringMiddleware, MonitoringMiddleware } from './monitoring.js';

// Local type definition (will be replaced with shared types in future tasks)
type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
};

// Error handling middleware
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const timestamp = new Date().toISOString();
  const requestId = req.headers['x-request-id'] || 'unknown';

  // Log the error
  console.error(`[${timestamp}] Error in ${req.method} ${req.path}:`, error);

  // Determine error status and message
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';

  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Authentication required';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    message = 'Insufficient permissions';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = 'Resource not found';
  } else if (error.statusCode) {
    statusCode = error.statusCode;
    errorCode = error.code || errorCode;
    message = error.message || message;
  }

  const errorResponse: ApiResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp,
      requestId: requestId.toString(),
    },
  };

  res.status(statusCode).json(errorResponse);
};

// Request ID middleware
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  res.setHeader('x-request-id', req.headers['x-request-id']);
  next();
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation middleware factory
export const validateBody = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      const validationError = new Error(`Validation failed: ${error.message}`);
      validationError.name = 'ValidationError';
      next(validationError);
    }
  };
};

// Validation middleware for query parameters
export const validateQuery = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error: any) {
      const validationError = new Error(`Query validation failed: ${error.message}`);
      validationError.name = 'ValidationError';
      next(validationError);
    }
  };
};