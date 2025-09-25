import { Response, NextFunction } from 'express';
import { AuthMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AuthService } from '../services/authService';
import { UserRole } from '../models/user';

// Mock dependencies
jest.mock('../services/authService');

const mockAuthService = new AuthService({} as any, {} as any, {} as any) as jest.Mocked<AuthService>;

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    authMiddleware = new AuthMiddleware(mockAuthService);
    mockRequest = {
      headers: {},
      query: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token', async () => {
      const mockPayload = {
        userId: 'user-1',
        email: 'test@example.com',
        role: UserRole.LECTURER,
        tenantId: 'tenant-1'
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };
      mockAuthService.verifyAccessToken.mockResolvedValue(mockPayload);

      await authMiddleware.authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 for missing authorization header', async () => {
      await authMiddleware.authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 'UNAUTHORIZED',
        message: 'Access token required',
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid authorization format', async () => {
      mockRequest.headers = {
        authorization: 'Invalid format'
      };

      await authMiddleware.authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 'UNAUTHORIZED',
        message: 'Access token required',
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };
      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('Invalid token'));

      await authMiddleware.authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired access token',
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      mockRequest.user = {
        userId: 'user-1',
        email: 'test@example.com',
        role: UserRole.LECTURER,
        tenantId: 'tenant-1'
      };
    });

    it('should allow access for authorized role', () => {
      const middleware = authMiddleware.requireRole([UserRole.LECTURER, UserRole.ADMIN]);

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', () => {
      const middleware = authMiddleware.requireRole([UserRole.ADMIN]);

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated user', () => {
      delete mockRequest.user;
      const middleware = authMiddleware.requireRole([UserRole.LECTURER]);

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireTenant', () => {
    it('should add tenant filter to query', () => {
      mockRequest.user = {
        userId: 'user-1',
        email: 'test@example.com',
        role: UserRole.LECTURER,
        tenantId: 'tenant-1'
      };

      authMiddleware.requireTenant(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.query!['tenantId']).toBe('tenant-1');
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated user', () => {
      delete mockRequest.user;

      authMiddleware.requireTenant(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optional', () => {
    it('should set user for valid token', async () => {
      const mockPayload = {
        userId: 'user-1',
        email: 'test@example.com',
        role: UserRole.LECTURER,
        tenantId: 'tenant-1'
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };
      mockAuthService.verifyAccessToken.mockResolvedValue(mockPayload);

      await authMiddleware.optional(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without user for invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };
      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('Invalid token'));

      await authMiddleware.optional(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without user for missing token', async () => {
      await authMiddleware.optional(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});