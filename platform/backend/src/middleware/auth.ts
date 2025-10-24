import { Request, Response, NextFunction } from 'express';
import { AuthService, UserRole, User, TokenPayload } from '../services/auth.js';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: TokenPayload;
    }
  }
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  // Middleware to authenticate JWT token
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication token required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const tokenPayload = this.authService.verifyToken(token);
      
      // Get user details
      const user = await this.authService.getUserById(tokenPayload.userId);
      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or inactive user',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
        return;
      }

      // Attach user and token to request
      req.user = user;
      req.token = tokenPayload;
      
      next();
    } catch (error: any) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: error.message || 'Authentication failed',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  };

  // Middleware to check if user has required role
  requireRole = (requiredRole: UserRole) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
        return;
      }

      if (!this.authService.hasPermission(req.user.role, requiredRole)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Insufficient permissions. Required role: ${requiredRole}`,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
        return;
      }

      next();
    };
  };

  // Middleware to check if user has any of the specified roles
  requireAnyRole = (roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
        return;
      }

      const hasPermission = roles.some(role => 
        this.authService.hasPermission(req.user!.role, role)
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Insufficient permissions. Required roles: ${roles.join(', ')}`,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
        return;
      }

      next();
    };
  };

  // Middleware to check if user owns the resource or has admin privileges
  requireOwnershipOrAdmin = (getResourceOwnerId: (req: Request) => string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
        return;
      }

      const resourceOwnerId = getResourceOwnerId(req);
      const isOwner = req.user.id === resourceOwnerId;
      const isAdmin = this.authService.hasPermission(req.user.role, UserRole.ADMIN);

      if (!isOwner && !isAdmin) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. You can only access your own resources or need admin privileges.',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
          },
        });
        return;
      }

      next();
    };
  };

  // Optional authentication - doesn't fail if no token provided
  optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const tokenPayload = this.authService.verifyToken(token);
        
        const user = await this.authService.getUserById(tokenPayload.userId);
        if (user && user.isActive) {
          req.user = user;
          req.token = tokenPayload;
        }
      }
      
      next();
    } catch (error) {
      // Ignore authentication errors for optional auth
      next();
    }
  };
}