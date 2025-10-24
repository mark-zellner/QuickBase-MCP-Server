import { Router, Request, Response } from 'express';
import { 
  ProjectService, 
  CreateProjectInput, 
  UpdateProjectInput,
  CreateVersionInput,
  CreateProjectSchema,
  UpdateProjectSchema,
  CreateVersionSchema,
  AddCollaboratorSchema
} from '../services/project.js';
import { AuthMiddleware } from '../middleware/auth.js';
import { AuthService, UserRole } from '../services/auth.js';
import { asyncHandler, validateBody, validateQuery } from '../middleware/index.js';
import { z } from 'zod';

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
const SearchProjectsSchema = z.object({
  query: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export function createProjectRoutes(projectService: ProjectService, authService: AuthService): Router {
  const router = Router();
  const authMiddleware = new AuthMiddleware(authService);

  // All project routes require authentication
  router.use(authMiddleware.authenticate);

  // GET /projects - Get user's projects or all projects (admin/manager)
  router.get('/',
    validateQuery(SearchProjectsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { query, status, page, limit } = req.query as any;
        const user = req.user!;

        let projects;
        
        // Admins and managers can see all projects, others see only their own
        if (authService.hasPermission(user.role, UserRole.MANAGER)) {
          projects = await projectService.getAllProjects();
        } else {
          projects = await projectService.getUserProjects(user.id);
        }

        // Apply search filter
        if (query) {
          projects = await projectService.searchProjects(query, user.id);
        }

        // Apply status filter
        if (status) {
          projects = projects.filter(p => p.status === status);
        }

        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedProjects = projects.slice(startIndex, endIndex);

        const response: ApiResponse = {
          success: true,
          data: {
            projects: paginatedProjects,
          },
          meta: {
            page,
            limit,
            total: projects.length,
            hasMore: endIndex < projects.length,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_PROJECTS_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // POST /projects - Create new project
  router.post('/',
    validateBody(CreateProjectSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const input: CreateProjectInput = req.body;
        const project = await projectService.createProject(input, req.user!.id);

        const response: ApiResponse = {
          success: true,
          data: {
            project,
          },
        };

        res.status(201).json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'CREATE_PROJECT_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // GET /projects/:projectId - Get specific project
  router.get('/:projectId',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const project = await projectService.getProject(projectId);

        if (!project) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'PROJECT_NOT_FOUND',
              message: 'Project not found',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']?.toString() || 'unknown',
            },
          };

          res.status(404).json(response);
          return;
        }

        // Check if user has access to this project
        const user = req.user!;
        const hasAccess = project.ownerId === user.id || 
                         project.collaborators.includes(user.id) ||
                         authService.hasPermission(user.role, UserRole.MANAGER);

        if (!hasAccess) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied to this project',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']?.toString() || 'unknown',
            },
          };

          res.status(403).json(response);
          return;
        }

        const response: ApiResponse = {
          success: true,
          data: {
            project,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_PROJECT_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // PUT /projects/:projectId - Update project
  router.put('/:projectId',
    validateBody(UpdateProjectSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const input: UpdateProjectInput = req.body;
        const project = await projectService.updateProject(projectId, input, req.user!.id);

        const response: ApiResponse = {
          success: true,
          data: {
            project,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UPDATE_PROJECT_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // DELETE /projects/:projectId - Delete project
  router.delete('/:projectId',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        await projectService.deleteProject(projectId, req.user!.id);

        const response: ApiResponse = {
          success: true,
          data: {
            message: 'Project deleted successfully',
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'DELETE_PROJECT_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // POST /projects/:projectId/collaborators - Add collaborator
  router.post('/:projectId/collaborators',
    validateBody(AddCollaboratorSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const { userId } = req.body;
        const project = await projectService.addCollaborator(projectId, userId, req.user!.id);

        const response: ApiResponse = {
          success: true,
          data: {
            project,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'ADD_COLLABORATOR_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // DELETE /projects/:projectId/collaborators/:userId - Remove collaborator
  router.delete('/:projectId/collaborators/:userId',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId, userId } = req.params;
        const project = await projectService.removeCollaborator(projectId, userId, req.user!.id);

        const response: ApiResponse = {
          success: true,
          data: {
            project,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'REMOVE_COLLABORATOR_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // Version management routes

  // GET /projects/:projectId/versions - Get project versions
  router.get('/:projectId/versions',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        
        // Check project access first
        const project = await projectService.getProject(projectId);
        if (!project) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'PROJECT_NOT_FOUND',
              message: 'Project not found',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']?.toString() || 'unknown',
            },
          };

          res.status(404).json(response);
          return;
        }

        const user = req.user!;
        const hasAccess = project.ownerId === user.id || 
                         project.collaborators.includes(user.id) ||
                         authService.hasPermission(user.role, UserRole.MANAGER);

        if (!hasAccess) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied to this project',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']?.toString() || 'unknown',
            },
          };

          res.status(403).json(response);
          return;
        }

        const versions = await projectService.getProjectVersions(projectId);

        const response: ApiResponse = {
          success: true,
          data: {
            versions,
          },
          meta: {
            total: versions.length,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_VERSIONS_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // POST /projects/:projectId/versions - Create new version
  router.post('/:projectId/versions',
    validateBody(CreateVersionSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const input: CreateVersionInput = req.body;
        const version = await projectService.createVersion(projectId, input, req.user!.id);

        const response: ApiResponse = {
          success: true,
          data: {
            version,
          },
        };

        res.status(201).json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'CREATE_VERSION_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // GET /projects/:projectId/versions/current - Get current version
  router.get('/:projectId/versions/current',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const version = await projectService.getCurrentVersion(projectId);

        if (!version) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'VERSION_NOT_FOUND',
              message: 'Current version not found',
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
            version,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_VERSION_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // GET /projects/:projectId/stats - Get project statistics
  router.get('/:projectId/stats',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const stats = await projectService.getProjectStats(projectId);

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
            code: 'FETCH_STATS_FAILED',
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