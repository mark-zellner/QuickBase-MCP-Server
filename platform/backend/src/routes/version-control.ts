import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { 
  VersionControlService,
  CreateVersionControlSchema,
  CreateBranchSchema,
  ResolveConflictSchema
} from '../services/version-control.js';
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
const GetVersionsSchema = z.object({
  branchName: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  page: z.coerce.number().min(1).default(1),
});

const CompareVersionsSchema = z.object({
  fromVersionId: z.string(),
  toVersionId: z.string(),
});

const SessionSchema = z.object({
  action: z.enum(['start', 'end']),
});

export function createVersionControlRoutes(
  versionControlService: VersionControlService, 
  authService: AuthService
): Router {
  const router = Router();
  const authMiddleware = new AuthMiddleware(authService);

  // All version control routes require authentication
  router.use(authMiddleware.authenticate);

  // GET /projects/:projectId/versions - Get project versions
  router.get('/:projectId/versions',
    validateQuery(GetVersionsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const { branchName, limit, page } = req.query as any;

        const versions = await versionControlService.getProjectVersions(projectId, branchName);
        
        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedVersions = versions.slice(startIndex, endIndex);

        const response: ApiResponse = {
          success: true,
          data: {
            versions: paginatedVersions,
          },
          meta: {
            page,
            limit,
            total: versions.length,
            hasMore: endIndex < versions.length,
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
    validateBody(CreateVersionControlSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const user = req.user!;
        
        const versionData = {
          ...req.body,
          projectId,
        };

        const version = await versionControlService.createVersion(
          versionData,
          user.id,
          user.name || user.email
        );

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

  // GET /projects/:projectId/versions/:versionId - Get specific version
  router.get('/:projectId/versions/:versionId',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId, versionId } = req.params;
        const version = await versionControlService.getVersion(projectId, versionId);

        if (!version) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'VERSION_NOT_FOUND',
              message: 'Version not found',
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

  // GET /projects/:projectId/versions/latest - Get latest version
  router.get('/:projectId/versions/latest',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const branchName = req.query.branchName as string || 'main';
        
        const version = await versionControlService.getLatestVersion(projectId, branchName);

        if (!version) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'VERSION_NOT_FOUND',
              message: 'No versions found for this project/branch',
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
            code: 'FETCH_LATEST_VERSION_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // POST /projects/:projectId/versions/compare - Compare two versions
  router.post('/:projectId/versions/compare',
    validateBody(CompareVersionsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const { fromVersionId, toVersionId } = req.body;

        const comparison = await versionControlService.compareVersions(
          projectId,
          fromVersionId,
          toVersionId
        );

        const response: ApiResponse = {
          success: true,
          data: {
            comparison,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'COMPARE_VERSIONS_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // GET /projects/:projectId/history - Get version history
  router.get('/:projectId/history',
    validateQuery(GetVersionsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const { branchName, limit } = req.query as any;

        const history = await versionControlService.getVersionHistory(projectId, branchName, limit);

        const response: ApiResponse = {
          success: true,
          data: {
            history,
          },
          meta: {
            total: history.length,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_HISTORY_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // Branch management routes

  // GET /projects/:projectId/branches - Get project branches
  router.get('/:projectId/branches',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const branches = await versionControlService.getProjectBranches(projectId);

        const response: ApiResponse = {
          success: true,
          data: {
            branches,
          },
          meta: {
            total: branches.length,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_BRANCHES_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // POST /projects/:projectId/branches - Create new branch
  router.post('/:projectId/branches',
    validateBody(CreateBranchSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const user = req.user!;
        
        const branchData = {
          ...req.body,
          projectId,
        };

        const branch = await versionControlService.createBranch(branchData, user.id);

        const response: ApiResponse = {
          success: true,
          data: {
            branch,
          },
        };

        res.status(201).json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'CREATE_BRANCH_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // GET /projects/:projectId/branches/:branchName - Get specific branch
  router.get('/:projectId/branches/:branchName',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId, branchName } = req.params;
        const branch = await versionControlService.getBranch(projectId, branchName);

        if (!branch) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'BRANCH_NOT_FOUND',
              message: 'Branch not found',
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
            branch,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_BRANCH_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // DELETE /projects/:projectId/branches/:branchName - Delete branch
  router.delete('/:projectId/branches/:branchName',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId, branchName } = req.params;
        const user = req.user!;

        await versionControlService.deleteBranch(projectId, branchName, user.id);

        const response: ApiResponse = {
          success: true,
          data: {
            message: `Branch '${branchName}' deleted successfully`,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'DELETE_BRANCH_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // Conflict resolution routes

  // GET /projects/:projectId/conflicts - Get project conflicts
  router.get('/:projectId/conflicts',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const conflicts = await versionControlService.getProjectConflicts(projectId);

        const response: ApiResponse = {
          success: true,
          data: {
            conflicts,
          },
          meta: {
            total: conflicts.length,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_CONFLICTS_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // GET /conflicts/:conflictId - Get specific conflict
  router.get('/conflicts/:conflictId',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { conflictId } = req.params;
        const conflict = await versionControlService.getConflict(conflictId);

        if (!conflict) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'CONFLICT_NOT_FOUND',
              message: 'Conflict not found',
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
            conflict,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_CONFLICT_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // POST /conflicts/:conflictId/resolve - Resolve conflict
  router.post('/conflicts/:conflictId/resolve',
    validateBody(ResolveConflictSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { conflictId } = req.params;
        const { resolvedCode } = req.body;
        const user = req.user!;

        const resolvedConflict = await versionControlService.resolveConflict(
          conflictId,
          resolvedCode,
          user.id
        );

        const response: ApiResponse = {
          success: true,
          data: {
            conflict: resolvedConflict,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'RESOLVE_CONFLICT_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // Session management routes

  // POST /projects/:projectId/editing-session - Start/end editing session
  router.post('/:projectId/editing-session',
    validateBody(SessionSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const { action } = req.body;
        const user = req.user!;

        if (action === 'start') {
          await versionControlService.startEditingSession(projectId, user.id);
        } else {
          await versionControlService.endEditingSession(projectId, user.id);
        }

        const activeEditors = await versionControlService.getActiveEditors(projectId);

        const response: ApiResponse = {
          success: true,
          data: {
            action,
            activeEditors,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'SESSION_MANAGEMENT_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // GET /projects/:projectId/active-editors - Get active editors
  router.get('/:projectId/active-editors',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const activeEditors = await versionControlService.getActiveEditors(projectId);

        const response: ApiResponse = {
          success: true,
          data: {
            activeEditors,
          },
          meta: {
            total: activeEditors.length,
          },
        };

        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FETCH_ACTIVE_EDITORS_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // Statistics and analytics routes

  // GET /projects/:projectId/version-stats - Get version statistics
  router.get('/:projectId/version-stats',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const stats = await versionControlService.getVersionStats(projectId);

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
            code: 'FETCH_VERSION_STATS_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // POST /projects/:projectId/versions/:versionId/tag - Tag a version
  router.post('/:projectId/versions/:versionId/tag',
    validateBody(z.object({ tag: z.string().min(1).max(50) })),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId, versionId } = req.params;
        const { tag } = req.body;

        const version = await versionControlService.tagVersion(projectId, versionId, tag);

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
            code: 'TAG_VERSION_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };

        res.status(400).json(response);
      }
    })
  );

  // GET /projects/:projectId/versions/by-tag/:tag - Get versions by tag
  router.get('/:projectId/versions/by-tag/:tag',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { projectId, tag } = req.params;
        const versions = await versionControlService.getVersionsByTag(projectId, tag);

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
            code: 'FETCH_VERSIONS_BY_TAG_FAILED',
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