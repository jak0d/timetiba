import request from 'supertest';
import express from 'express';
import { AuthController } from '../controllers/authController';
import { AuthService } from '../services/authService';
// import { AuthMiddleware } from '../middleware/auth';
import { createAuthRoutes } from '../routes/authRoutes';
import { UserRole } from '../models/user';

// Mock dependencies
jest.mock('../services/authService');

const mockAuthService = new AuthService({} as any, {} as any, {} as any) as jest.Mocked<AuthService>;
const mockAuthMiddleware = {
  authenticate: jest.fn((req, _res, next) => {
    req.user = {
      userId: 'user-1',
      email: 'test@example.com',
      role: UserRole.LECTURER,
      tenantId: 'tenant-1'
    };
    next();
  })
} as any;

describe('AuthController', () => {
  let app: express.Application;
  let authController: AuthController;

  beforeEach(() => {
    authController = new AuthController(mockAuthService);
    app = express();
    app.use(express.json());
    app.use('/auth', createAuthRoutes(authController, mockAuthMiddleware));
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    const registerData = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.LECTURER,
      tenantId: 'tenant-1'
    };

    it('should register user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: registerData.email,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        role: registerData.role,
        tenantId: registerData.tenantId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockAuthService.register.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockUser,
        message: 'User registered successfully'
      });
      expect(mockAuthService.register).toHaveBeenCalledWith(registerData);
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = { email: 'test@example.com' };

      const response = await request(app)
        .post('/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for existing user', async () => {
      mockAuthService.register.mockRejectedValue(new Error('User with this email already exists'));

      const response = await request(app)
        .post('/auth/register')
        .send(registerData)
        .expect(409);

      expect(response.body.code).toBe('USER_EXISTS');
    });

    it('should return 400 for weak password', async () => {
      mockAuthService.register.mockRejectedValue(new Error('Password must be at least 8 characters long'));

      const response = await request(app)
        .post('/auth/register')
        .send(registerData)
        .expect(400);

      expect(response.body.code).toBe('WEAK_PASSWORD');
    });
  });

  describe('POST /auth/login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('should login successfully', async () => {
      const mockLoginResponse = {
        user: {
          id: 'user-1',
          email: loginData.email,
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.LECTURER,
          tenantId: 'tenant-1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockLoginResponse,
        message: 'Login successful'
      });
      expect(mockAuthService.login).toHaveBeenCalledWith(loginData);
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /auth/refresh-token', () => {
    const refreshTokenData = {
      refreshToken: 'valid-refresh-token'
    };

    it('should refresh token successfully', async () => {
      const mockRefreshResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      mockAuthService.refreshToken.mockResolvedValue(mockRefreshResponse);

      const response = await request(app)
        .post('/auth/refresh-token')
        .send(refreshTokenData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockRefreshResponse,
        message: 'Token refreshed successfully'
      });
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshTokenData);
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh-token')
        .send({})
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 for invalid refresh token', async () => {
      mockAuthService.refreshToken.mockRejectedValue(new Error('Invalid refresh token'));

      const response = await request(app)
        .post('/auth/refresh-token')
        .send(refreshTokenData)
        .expect(401);

      expect(response.body.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      mockAuthService.logout.mockResolvedValue();

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Logout successful'
      });
      expect(mockAuthService.logout).toHaveBeenCalledWith('user-1');
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          userId: 'user-1',
          email: 'test@example.com',
          role: UserRole.LECTURER,
          tenantId: 'tenant-1'
        },
        message: 'Profile retrieved successfully'
      });
    });
  });

  describe('GET /auth/validate-token', () => {
    it('should validate token successfully', async () => {
      const response = await request(app)
        .get('/auth/validate-token')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          valid: true,
          user: {
            userId: 'user-1',
            email: 'test@example.com',
            role: UserRole.LECTURER,
            tenantId: 'tenant-1'
          }
        },
        message: 'Token is valid'
      });
    });
  });
});