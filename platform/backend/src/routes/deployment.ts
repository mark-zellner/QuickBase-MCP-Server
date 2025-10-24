import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { 
  DeploymentService,
  CreateEnvironmentSchema,
  CreateDeploymentSchema,
  CreatePipelineSchema,
  RollbackSchema,
  ApprovalSchema
} from '../services/deployment.js';
import { AuthMiddleware } from '../middleware/auth.js';
import { AuthService, UserRole } from '../services/auth.js';
import { asyncHandler, validateBody, validateQuery } from '../middleware/index.js';

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

// Query validation schemas
const GetDeploymentsSchema = z.object({
  projectId: z.string().optional(),
  environmentId: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
});

const DeployToPipelineSchema = z.object({
  versionId: z.string(),
});

export function createDeploymentRoutes(
  deploymentService: DeploymentService, 
  authService: AuthService
): Router {
  const router = Router();
  const authMiddleware = new AuthMiddleware(authService);

  // All deployment routes require authentication
  router.use(authMiddleware.authenticate);

  // Environment management routes

  // GET /environments - Get all environments
  router.get('/environments',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const environments = await deploymentService.getEnvironments();

        const response: ApiResponse = {
          success: true,
          data: {
            environments,
          },
          meta: {
            total: environments.length,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_ENVIRONMENTS_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // POST /environments - Create new environment (admin only)
  router.post('/environments',
    authMiddleware.requireRole(UserRole.ADMIN),
    validateBody(CreateEnvironmentSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const environment = await deploymentService.createEnvironment(req.body, user.id);

        const response: ApiResponse = {
          success: true,
          data: {
            environment,
          },
        };

        res.status(201).json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'CREATE_ENVIRONMENT_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // GET /environments/:environmentId - Get specific environment
  router.get('/environments/:environmentId',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { environmentId } = req.params;
        const environment = await deploymentService.getEnvironment(environmentId);

        if (!environment) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'ENVIRONMENT_NOT_FOUND',
              message: 'Environment not found',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']?.toString() || 'unknown',
            },
          };

          res.status(404).json(response);
          return;
        }

        const response: ApiResponse = {
          success: true,
          data: {
            environment,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_ENVIRONMENT_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // PUT /environments/:environmentId - Update environment (admin only)
  router.put('/environments/:environmentId',
    authMiddleware.requireRole(UserRole.ADMIN),
    validateBody(CreateEnvironmentSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { environmentId } = req.params;
        const user = req.user!;
        
        const environment = await deploymentService.updateEnvironment(
          environmentId, 
          req.body, 
          user.id
        );

        const response: ApiResponse = {
          success: true,
          data: {
            environment,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UPDATE_ENVIRONMENT_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // DELETE /environments/:environmentId - Delete environment (admin only)
  router.delete('/environments/:environmentId',
    authMiddleware.requireRole(UserRole.ADMIN),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { environmentId } = req.params;
        const user = req.user!;
        
        await deploymentService.deleteEnvironment(environmentId, user.id);

        const response: ApiResponse = {
          success: true,
          data: {
            message: 'Environment deleted successfully',
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'DELETE_ENVIRONMENT_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // Deployment management routes

  // GET /deployments - Get deployments
  router.get('/deployments',
    validateQuery(GetDeploymentsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId, environmentId, status, limit, page } = req.query as any;
        
        let deployments;
        if (projectId) {
          deployments = await deploymentService.getProjectDeployments(projectId, environmentId);
        } else if (environmentId) {
          deployments = await deploymentService.getEnvironmentDeployments(environmentId);
        } else {
          // Get all deployments (admin/manager only)
          const user = req.user!;
          if (!authService.hasPermission(user.role, UserRole.MANAGER)) {
            const response: ApiResponse = {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Insufficient permissions to view all deployments',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']?.toString() || 'unknown',
              },
            };

            res.status(403).json(response);
            return;
          }
          
          deployments = []; // Would get all deployments in real implementation
        }

        // Apply status filter
        if (status) {
          deployments = deployments.filter(d => d.status === status);
        }

        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedDeployments = deployments.slice(startIndex, endIndex);

        const response: ApiResponse = {
          success: true,
          data: {
            deployments: paginatedDeployments,
          },
          meta: {
            page,
            limit,
            total: deployments.length,
            hasMore: endIndex < deployments.length,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_DEPLOYMENTS_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // POST /deployments - Create new deployment
  router.post('/deployments',
    authMiddleware.requireRole(UserRole.DEVELOPER),
    validateBody(CreateDeploymentSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const deployment = await deploymentService.createDeployment(
          req.body,
          user.id,
          user.name || user.email
        );

        const response: ApiResponse = {
          success: true,
          data: {
            deployment,
          },
        };

        res.status(201).json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'CREATE_DEPLOYMENT_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // GET /deployments/:deploymentId - Get specific deployment
  router.get('/deployments/:deploymentId',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { deploymentId } = req.params;
        const deployment = await deploymentService.getDeployment(deploymentId);

        if (!deployment) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'DEPLOYMENT_NOT_FOUND',
              message: 'Deployment not found',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']?.toString() || 'unknown',
            },
          };

          res.status(404).json(response);
          return;
        }

        const response: ApiResponse = {
          success: true,
          data: {
            deployment,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_DEPLOYMENT_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // GET /projects/:projectId/environments/:environmentId/current - Get current deployment
  router.get('/projects/:projectId/environments/:environmentId/current',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId, environmentId } = req.params;
        const deployment = await deploymentService.getCurrentDeployment(projectId, environmentId);

        if (!deployment) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'NO_CURRENT_DEPLOYMENT',
              message: 'No current deployment found for this project/environment',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']?.toString() || 'unknown',
            },
          };

          res.status(404).json(response);
          return;
        }

        const response: ApiResponse = {
          success: true,
          data: {
            deployment,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_CURRENT_DEPLOYMENT_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // Rollback routes

  // POST /deployments/:deploymentId/rollback - Rollback deployment
  router.post('/deployments/:deploymentId/rollback',
    authMiddleware.requireRole(UserRole.DEVELOPER),
    validateBody(RollbackSchema.omit({ deploymentId: true })),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { deploymentId } = req.params;
        const user = req.user!;
        
        const rollbackInput = {
          deploymentId,
          ...req.body,
        };

        const rollbackDeployment = await deploymentService.rollbackDeployment(
          rollbackInput,
          user.id,
          user.name || user.email
        );

        const response: ApiResponse = {
          success: true,
          data: {
            deployment: rollbackDeployment,
          },
        };

        res.status(201).json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'ROLLBACK_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // Pipeline management routes

  // GET /pipelines - Get pipelines for project
  router.get('/pipelines',
    validateQuery(z.object({ projectId: z.string() })),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.query as any;
        const pipelines = await deploymentService.getProjectPipelines(projectId);

        const response: ApiResponse = {
          success: true,
          data: {
            pipelines,
          },
          meta: {
            total: pipelines.length,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_PIPELINES_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // POST /pipelines - Create new pipeline
  router.post('/pipelines',
    authMiddleware.requireRole(UserRole.DEVELOPER),
    validateBody(CreatePipelineSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const pipeline = await deploymentService.createPipeline(req.body, user.id);

        const response: ApiResponse = {
          success: true,
          data: {
            pipeline,
          },
        };

        res.status(201).json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'CREATE_PIPELINE_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // GET /pipelines/:pipelineId - Get specific pipeline
  router.get('/pipelines/:pipelineId',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { pipelineId } = req.params;
        const pipeline = await deploymentService.getPipeline(pipelineId);

        if (!pipeline) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'PIPELINE_NOT_FOUND',
              message: 'Pipeline not found',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']?.toString() || 'unknown',
            },
          };

          res.status(404).json(response);
          return;
        }

        const response: ApiResponse = {
          success: true,
          data: {
            pipeline,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_PIPELINE_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // POST /pipelines/:pipelineId/deploy - Deploy to pipeline
  router.post('/pipelines/:pipelineId/deploy',
    authMiddleware.requireRole(UserRole.DEVELOPER),
    validateBody(DeployToPipelineSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { pipelineId } = req.params;
        const { versionId } = req.body;
        const user = req.user!;

        const deployments = await deploymentService.deployToPipeline(
          pipelineId,
          versionId,
          user.id,
          user.name || user.email
        );

        const response: ApiResponse = {
          success: true,
          data: {
            deployments,
          },
        };

        res.status(201).json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'DEPLOY_TO_PIPELINE_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // Approval management routes

  // GET /approvals - Get pending approvals for user
  router.get('/approvals',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const user = req.user!;
        const approvals = await deploymentService.getPendingApprovals(user.id);

        const response: ApiResponse = {
          success: true,
          data: {
            approvals,
          },
          meta: {
            total: approvals.length,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_APPROVALS_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // POST /approvals/:approvalId - Process approval
  router.post('/approvals/:approvalId',
    authMiddleware.requireRole(UserRole.MANAGER),
    validateBody(ApprovalSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { approvalId } = req.params;
        const { action, reason } = req.body;
        const user = req.user!;

        const approval = await deploymentService.processApproval(
          approvalId,
          action,
          user.id,
          reason
        );

        const response: ApiResponse = {
          success: true,
          data: {
            approval,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'PROCESS_APPROVAL_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // Statistics and monitoring routes

  // GET /stats - Get deployment statistics
  router.get('/stats',
    validateQuery(z.object({ projectId: z.string().optional() })),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.query as any;
        const stats = await deploymentService.getDeploymentStats(projectId);

        const response: ApiResponse = {
          success: true,
          data: {
            stats,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_DEPLOYMENT_STATS_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // GET /environment-status - Get environment health status
  router.get('/environment-status',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const status = await deploymentService.getEnvironmentStatus();

        const response: ApiResponse = {
          success: true,
          data: {
            environments: status,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_ENVIRONMENT_STATUS_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  return router;
}