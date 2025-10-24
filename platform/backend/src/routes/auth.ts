import { Router, Request, Response } from 'express';
import { AuthService, UserRole, LoginInput, RegisterInput } from '../services/auth.js';
import { AuthMiddleware } from '../middleware/auth.js';
import { asyncHandler, validateBody } from '../middleware/index.js';
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

// Validation schemas
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  role: z.nativeEnum(UserRole).optional(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
});

export function createAuthRoutes(authService: AuthService): Router {
  const router = Router();
  const authMiddleware = new AuthMiddleware(authService);

  // POST /auth/register - Register new user
  router.post('/register', 
    validateBody(RegisterSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const input: RegisterInput = req.body;
      
      try {
        const result = await authService.register(input);
        
        const response: ApiResponse = {
          success: true,
          data: {
            user: result.user,
            token: result.token,
          },
        };
        
        res.status(201).json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'REGISTRATION_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };
        
        res.status(400).json(response);
      }
    })
  );

  // POST /auth/login - User login
  router.post('/login',
    validateBody(LoginSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const input: LoginInput = req.body;
      
      try {
        const result = await authService.login(input);
        
        const response: ApiResponse = {
          success: true,
          data: {
            user: result.user,
            token: result.token,
          },
        };
        
        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'LOGIN_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };
        
        res.status(401).json(response);
      }
    })
  );

  // POST /auth/refresh - Refresh JWT token
  router.post('/refresh',
    authMiddleware.authenticate,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const currentToken = req.headers.authorization?.substring(7);
        if (!currentToken) {
          throw new Error('No token provided');
        }
        
        const newToken = await authService.refreshToken(currentToken);
        
        const response: ApiResponse = {
          success: true,
          data: {
            token: newToken,
          },
        };
        
        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'TOKEN_REFRESH_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };
        
        res.status(401).json(response);
      }
    })
  );

  // GET /auth/me - Get current user profile
  router.get('/me',
    authMiddleware.authenticate,
    asyncHandler(async (req: Request, res: Response) => {
      const response: ApiResponse = {
        success: true,
        data: {
          user: req.user,
        },
      };
      
      res.json(response);
    })
  );

  // PUT /auth/me - Update current user profile
  router.put('/me',
    authMiddleware.authenticate,
    validateBody(UpdateUserSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const updates = req.body;
        const updatedUser = await authService.updateUser(req.user!.id, updates);
        
        const response: ApiResponse = {
          success: true,
          data: {
            user: updatedUser,
          },
        };
        
        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };
        
        res.status(400).json(response);
      }
    })
  );

  // POST /auth/change-password - Change user password
  router.post('/change-password',
    authMiddleware.authenticate,
    validateBody(ChangePasswordSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { currentPassword, newPassword } = req.body;
        await authService.changePassword(req.user!.id, currentPassword, newPassword);
        
        const response: ApiResponse = {
          success: true,
          data: {
            message: 'Password changed successfully',
          },
        };
        
        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'PASSWORD_CHANGE_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };
        
        res.status(400).json(response);
      }
    })
  );

  // Admin routes
  
  // GET /auth/users - Get all users (admin only)
  router.get('/users',
    authMiddleware.authenticate,
    authMiddleware.requireRole(UserRole.ADMIN),
    asyncHandler(async (req: Request, res: Response) => {
      const users = await authService.getAllUsers();
      
      const response: ApiResponse = {
        success: true,
        data: {
          users,
        },
        meta: {
          total: users.length,
        },
      };
      
      res.json(response);
    })
  );

  // PUT /auth/users/:userId - Update user (admin only)
  router.put('/users/:userId',
    authMiddleware.authenticate,
    authMiddleware.requireRole(UserRole.ADMIN),
    validateBody(UpdateUserSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const updates = req.body;
        const updatedUser = await authService.updateUser(userId, updates);
        
        const response: ApiResponse = {
          success: true,
          data: {
            user: updatedUser,
          },
        };
        
        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']?.toString() || 'unknown',
          },
        };
        
        res.status(400).json(response);
      }
    })
  );

  // DELETE /auth/users/:userId - Delete user (admin only)
  router.delete('/users/:userId',
    authMiddleware.authenticate,
    authMiddleware.requireRole(UserRole.ADMIN),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        
        // Prevent admin from deleting themselves
        if (userId === req.user!.id) {
          const response: ApiResponse = {
            success: false,
            error: {
              code: 'SELF_DELETE_FORBIDDEN',
              message: 'Cannot delete your own account',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']?.toString() || 'unknown',
            },
          };
          
          res.status(400).json(response);
          return;
        }
        
        await authService.deleteUser(userId);
        
        const response: ApiResponse = {
          success: true,
          data: {
            message: 'User deleted successfully',
          },
        };
        
        res.json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'DELETE_FAILED',
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