import { Response, NextFunction } from 'express';
import { AuthorizationMiddleware } from '../middleware/authorization';
import { PermissionService } from '../services/permissionService';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '../models/user';

// Mock PermissionService
jest.mock('../services/permissionService');

const mockPermissionService = new PermissionService() as jest.Mocked<PermissionService>;

describe('AuthorizationMiddleware', () => {
  let authorizationMiddleware: AuthorizationMiddleware;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    authorizationMiddleware = new AuthorizationMiddleware(mockPermissionService);
    mockRequest = {
      user: {
        userId: 'user-1',
        email: 'test@example.com',
        role: UserRole.LECTURER,
        tenantId: 'tenant-1'
      },
      params: {},
      query: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('requirePermission', () => {
    it('should allow access when permission is granted', () => {
      mockPermissionService.hasPermission.mockReturnValue(true);
      
      const middleware = authorizationMiddleware.requirePermission('venues', 'read');
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith(
        UserRole.LECTURER,
        'venues',
        'read',
        expect.objectContaining({
          userId: 'user-1',
          userRole: UserRole.LECTURER,
          userTenantId: 'tenant-1'
        })
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access when permission is not granted', () => {
      mockPermissionService.hasPermission.mockReturnValue(false);
      
      const middleware = authorizationMiddleware.requirePermission('venues', 'create');
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions for create on venues',
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated requests', () => {
      mockRequest.user = undefined;
      
      const middleware = authorizationMiddleware.requirePermission('venues', 'read');
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use context builder when provided', () => {
      mockPermissionService.hasPermission.mockReturnValue(true);
      mockRequest.params = { id: 'resource-1' };
      
      const contextBuilder = (req: AuthenticatedRequest) => ({
        resourceId: req.params.id
      });
      
      const middleware = authorizationMiddleware.requirePermission('venues', 'read', contextBuilder);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith(
        UserRole.LECTURER,
        'venues',
        'read',
        expect.objectContaining({
          userId: 'user-1',
          userRole: UserRole.LECTURER,
          userTenantId: 'tenant-1',
          resourceId: 'resource-1'
        })
      );
    });
  });

  describe('requireTenantAccess', () => {
    it('should allow access to same tenant', () => {
      mockPermissionService.canAccessTenant.mockReturnValue(true);
      
      const getTenantId = (req: AuthenticatedRequest) => 'tenant-1';
      const middleware = authorizationMiddleware.requireTenantAccess(getTenantId);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockPermissionService.canAccessTenant).toHaveBeenCalledWith(
        UserRole.LECTURER,
        'tenant-1',
        'tenant-1'
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access to different tenant', () => {
      mockPermissionService.canAccessTenant.mockReturnValue(false);
      
      const getTenantId = (req: AuthenticatedRequest) => 'tenant-2';
      const middleware = authorizationMiddleware.requireTenantAccess(getTenantId);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 'FORBIDDEN',
        message: 'Access denied to this tenant resource',
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated requests', () => {
      mockRequest.user = undefined;
      
      const getTenantId = (req: AuthenticatedRequest) => 'tenant-1';
      const middleware = authorizationMiddleware.requireTenantAccess(getTenantId);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnership', () => {
    it('should allow access to own resource', () => {
      const getResourceOwnerId = (req: AuthenticatedRequest) => 'user-1';
      const middleware = authorizationMiddleware.requireOwnership(getResourceOwnerId);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access to other user resource', () => {
      const getResourceOwnerId = (req: AuthenticatedRequest) => 'user-2';
      const middleware = authorizationMiddleware.requireOwnership(getResourceOwnerId);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 'FORBIDDEN',
        message: 'Access denied: resource ownership required',
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow admin access to any resource', () => {
      mockRequest.user!.role = UserRole.ADMIN;
      
      const getResourceOwnerId = (req: AuthenticatedRequest) => 'user-2';
      const middleware = authorizationMiddleware.requireOwnership(getResourceOwnerId);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated requests', () => {
      mockRequest.user = undefined;
      
      const getResourceOwnerId = (req: AuthenticatedRequest) => 'user-1';
      const middleware = authorizationMiddleware.requireOwnership(getResourceOwnerId);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('filterTenantData', () => {
    const testData = [
      { id: '1', name: 'Item 1', tenantId: 'tenant-1' },
      { id: '2', name: 'Item 2', tenantId: 'tenant-2' },
      { id: '3', name: 'Item 3', tenantId: 'tenant-1' }
    ];

    it('should filter data by tenant', () => {
      mockPermissionService.filterByTenant.mockReturnValue([
        { id: '1', name: 'Item 1', tenantId: 'tenant-1' },
        { id: '3', name: 'Item 3', tenantId: 'tenant-1' }
      ]);

      const filtered = authorizationMiddleware.filterTenantData(
        testData,
        mockRequest as AuthenticatedRequest
      );

      expect(mockPermissionService.filterByTenant).toHaveBeenCalledWith(
        UserRole.LECTURER,
        'tenant-1',
        testData
      );
      expect(filtered).toHaveLength(2);
    });

    it('should return empty array for unauthenticated requests', () => {
      mockRequest.user = undefined;

      const filtered = authorizationMiddleware.filterTenantData(
        testData,
        mockRequest as AuthenticatedRequest
      );

      expect(filtered).toEqual([]);
      expect(mockPermissionService.filterByTenant).not.toHaveBeenCalled();
    });
  });
});