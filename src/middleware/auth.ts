import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { JWTPayload } from '../types/auth';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ 
          code: 'UNAUTHORIZED',
          message: 'Access token required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      try {
        const payload = await this.authService.verifyAccessToken(token);
        req.user = payload;
        next();
      } catch (error) {
        res.status(401).json({ 
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired access token',
          timestamp: new Date().toISOString()
        });
        return;
      }
    } catch (error) {
      res.status(500).json({ 
        code: 'INTERNAL_ERROR',
        message: 'Authentication error',
        timestamp: new Date().toISOString()
      });
      return;
    }
  };

  requireRole = (allowedRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ 
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({ 
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          timestamp: new Date().toISOString()
        });
        return;
      }

      next();
    };
  };

  requireTenant = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Add tenant filter to query parameters for multi-tenant isolation
    req.query['tenantId'] = req.user.tenantId;
    next();
  };

  optional = async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        try {
          const payload = await this.authService.verifyAccessToken(token);
          req.user = payload;
        } catch (error) {
          // Token is invalid, but we continue without authentication
          // This allows endpoints to work for both authenticated and unauthenticated users
        }
      }
      
      next();
    } catch (error) {
      // Continue without authentication on any error
      next();
    }
  };
}