import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { PermissionService } from '../services/permissionService';

export class AuthorizationMiddleware {
  private permissionService: PermissionService;

  constructor(permissionService: PermissionService) {
    this.permissionService = permissionService;
  }

  requirePermission = (resource: string, action: string, contextBuilder?: (req: AuthenticatedRequest) => Record<string, any>) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Build context for permission checking
      const context = contextBuilder ? contextBuilder(req) : {};
      context['userId'] = req.user.userId;
      context['userRole'] = req.user.role;
      context['userTenantId'] = req.user.tenantId;

      // Check permission
      const hasPermission = this.permissionService.hasPermission(
        req.user.role,
        resource,
        action,
        context
      );

      if (!hasPermission) {
        res.status(403).json({
          code: 'FORBIDDEN',
          message: `Insufficient permissions for ${action} on ${resource}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      next();
    };
  };

  requireTenantAccess = (getTenantId: (req: AuthenticatedRequest) => string) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const resourceTenantId = getTenantId(req);
      const canAccess = this.permissionService.canAccessTenant(
        req.user.role,
        req.user.tenantId,
        resourceTenantId
      );

      if (!canAccess) {
        res.status(403).json({
          code: 'FORBIDDEN',
          message: 'Access denied to this tenant resource',
          timestamp: new Date().toISOString()
        });
        return;
      }

      next();
    };
  };

  requireOwnership = (getResourceOwnerId: (req: AuthenticatedRequest) => string) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const resourceOwnerId = getResourceOwnerId(req);
      
      // Admin can access any resource
      if (req.user.role === 'admin') {
        next();
        return;
      }

      // Check if user owns the resource
      if (req.user.userId !== resourceOwnerId) {
        res.status(403).json({
          code: 'FORBIDDEN',
          message: 'Access denied: resource ownership required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      next();
    };
  };

  filterTenantData = <T extends { tenantId: string }>(data: T[], req: AuthenticatedRequest): T[] => {
    if (!req.user) {
      return [];
    }

    return this.permissionService.filterByTenant(
      req.user.role,
      req.user.tenantId,
      data
    );
  };
}