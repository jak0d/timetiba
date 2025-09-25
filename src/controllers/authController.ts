import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { CreateUserRequest, LoginRequest, RefreshTokenRequest } from '../models/user';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const userData: CreateUserRequest = req.body;
      
      // Validate required fields
      if (!userData.email || !userData.password || !userData.firstName || !userData.lastName || !userData.role) {
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: 'email, password, firstName, lastName, and role are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Set tenant ID from authenticated user or default for admin registration
      if (!userData.tenantId) {
        userData.tenantId = 'default'; // This should be handled by tenant management
      }

      const user = await this.authService.register(userData);
      
      res.status(201).json({
        success: true,
        data: user,
        message: 'User registered successfully'
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({
            code: 'USER_EXISTS',
            message: error.message,
            timestamp: new Date().toISOString()
          });
          return;
        }
        
        if (error.message.includes('Password must')) {
          res.status(400).json({
            code: 'WEAK_PASSWORD',
            message: error.message,
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      res.status(500).json({
        code: 'REGISTRATION_ERROR',
        message: 'Failed to register user',
        timestamp: new Date().toISOString()
      });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const loginData: LoginRequest = req.body;
      
      if (!loginData.email || !loginData.password) {
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.authService.login(loginData);
      
      res.json({
        success: true,
        data: result,
        message: 'Login successful'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid credentials') {
        res.status(401).json({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        code: 'LOGIN_ERROR',
        message: 'Failed to login',
        timestamp: new Date().toISOString()
      });
    }
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const refreshData: RefreshTokenRequest = req.body;
      
      if (!refreshData.refreshToken) {
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.authService.refreshToken(refreshData);
      
      res.json({
        success: true,
        data: result,
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      res.status(401).json({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
        timestamp: new Date().toISOString()
      });
    }
  };

  logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      await this.authService.logout(req.user.userId);
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      res.status(500).json({
        code: 'LOGOUT_ERROR',
        message: 'Failed to logout',
        timestamp: new Date().toISOString()
      });
    }
  };

  getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: req.user,
        message: 'Profile retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        code: 'PROFILE_ERROR',
        message: 'Failed to retrieve profile',
        timestamp: new Date().toISOString()
      });
    }
  };

  validateToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: { valid: true, user: req.user },
        message: 'Token is valid'
      });
    } catch (error) {
      res.status(500).json({
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate token',
        timestamp: new Date().toISOString()
      });
    }
  };
}