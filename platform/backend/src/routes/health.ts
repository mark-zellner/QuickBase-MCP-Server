import { Router } from 'express';
import { asyncHandler } from '../middleware/index.js';
import { HealthService } from '../services/health.js';

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

const router = Router();
const healthService = new HealthService();

// Basic health check
router.get('/', asyncHandler(healthService.healthCheckHandler.bind(healthService)));

// Detailed status check (same as basic for now)
router.get('/status', asyncHandler(healthService.healthCheckHandler.bind(healthService)));

// Readiness probe
router.get('/ready', asyncHandler(healthService.readinessHandler.bind(healthService)));

// Liveness probe
router.get('/live', asyncHandler(healthService.livenessHandler.bind(healthService)));



export { router as healthRoutes };