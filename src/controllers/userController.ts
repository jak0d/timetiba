import { Response } from 'express';
import { UserService, UpdateUserRequest, UserSearchFilters } from '../services/userService';
import { CreateUserRequest, UserRole } from '../models/user';
import { AuthenticatedRequest } from '../middleware/auth';

export class UserController {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userData: CreateUserRequest = req.body;
      
      // Set tenant ID from authenticated user if not provided
      if (!userData.tenantId && req.user) {
        userData.tenantId = req.user.tenantId;
      }

      const user = await this.userService.createUser(userData);
      
      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
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
        code: 'USER_CREATION_ERROR',
        message: 'Failed to create user',
        timestamp: new Date().toISOString()
      });
    }
  };

  findAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const filters: UserSearchFilters = {
        role: req.query.role as UserRole,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        search: req.query.search as string
      };

      // Non-admin users can only see users from their tenant
      const tenantId = req.user.role === UserRole.ADMIN 
        ? req.query.tenantId as string || req.user.tenantId
        : req.user.tenantId;

      const result = await this.userService.getUsersByTenant(tenantId, filters, page, limit);
      
      res.json({
        success: true,
        data: result,
        message: 'Users retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        code: 'USER_FETCH_ERROR',
        message: 'Failed to retrieve users',
        timestamp: new Date().toISOString()
      });
    }
  };

  findById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      
      if (!user) {
        res.status(404).json({
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: user,
        message: 'User retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        code: 'USER_FETCH_ERROR',
        message: 'Failed to retrieve user',
        timestamp: new Date().toISOString()
      });
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData: UpdateUserRequest = req.body;
      
      const user = await this.userService.updateUser(id, updateData);
      
      if (!user) {
        res.status(404).json({
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: user,
        message: 'User updated successfully'
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Email already in use')) {
          res.status(409).json({
            code: 'EMAIL_EXISTS',
            message: error.message,
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      res.status(500).json({
        code: 'USER_UPDATE_ERROR',
        message: 'Failed to update user',
        timestamp: new Date().toISOString()
      });
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Prevent users from deleting themselves
      if (req.user && req.user.userId === id) {
        res.status(400).json({
          code: 'SELF_DELETE_ERROR',
          message: 'Cannot delete your own account',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const deleted = await this.userService.deleteUser(id);
      
      if (!deleted) {
        res.status(404).json({
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        code: 'USER_DELETE_ERROR',
        message: 'Failed to delete user',
        timestamp: new Date().toISOString()
      });
    }
  };

  deactivate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Prevent users from deactivating themselves
      if (req.user && req.user.userId === id) {
        res.status(400).json({
          code: 'SELF_DEACTIVATE_ERROR',
          message: 'Cannot deactivate your own account',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const deactivated = await this.userService.deactivateUser(id);
      
      if (!deactivated) {
        res.status(404).json({
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        message: 'User deactivated successfully'
      });
    } catch (error) {
      res.status(500).json({
        code: 'USER_DEACTIVATE_ERROR',
        message: 'Failed to deactivate user',
        timestamp: new Date().toISOString()
      });
    }
  };

  activate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const activated = await this.userService.activateUser(id);
      
      if (!activated) {
        res.status(404).json({
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        message: 'User activated successfully'
      });
    } catch (error) {
      res.status(500).json({
        code: 'USER_ACTIVATE_ERROR',
        message: 'Failed to activate user',
        timestamp: new Date().toISOString()
      });
    }
  };

  changeRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!Object.values(UserRole).includes(role)) {
        res.status(400).json({
          code: 'INVALID_ROLE',
          message: 'Invalid role specified',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const user = await this.userService.changeUserRole(id, role);
      
      if (!user) {
        res.status(404).json({
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: user,
        message: 'User role updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        code: 'ROLE_UPDATE_ERROR',
        message: 'Failed to update user role',
        timestamp: new Date().toISOString()
      });
    }
  };

  getStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Non-admin users can only see stats for their tenant
      const tenantId = req.user.role === UserRole.ADMIN 
        ? req.query.tenantId as string
        : req.user.tenantId;

      const stats = await this.userService.getUserStats(tenantId);
      
      res.json({
        success: true,
        data: stats,
        message: 'User statistics retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        code: 'STATS_ERROR',
        message: 'Failed to retrieve user statistics',
        timestamp: new Date().toISOString()
      });
    }
  };
}