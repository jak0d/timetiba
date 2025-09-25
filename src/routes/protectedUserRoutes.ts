import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { validateRequest } from '../middleware/validation';
import { AuthMiddleware } from '../middleware/auth';
import { AuthorizationMiddleware } from '../middleware/authorization';
import { UserRole } from '../models/user';
import Joi from 'joi';

export function createProtectedUserRoutes(
  userController: UserController,
  authMiddleware: AuthMiddleware,
  authorizationMiddleware: AuthorizationMiddleware
): Router {
  const router = Router();

  // Apply authentication to all routes
  router.use(authMiddleware.authenticate);

  // Validation schemas
  const createUserSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    role: Joi.string().valid(...Object.values(UserRole)).required(),
    tenantId: Joi.string().optional()
  });

  const updateUserSchema = Joi.object({
    firstName: Joi.string().min(1).max(50),
    lastName: Joi.string().min(1).max(50),
    email: Joi.string().email(),
    role: Joi.string().valid(...Object.values(UserRole)),
    isActive: Joi.boolean()
  });

  const changeRoleSchema = Joi.object({
    role: Joi.string().valid(...Object.values(UserRole)).required()
  });

  // Create user - Admin only
  router.post('/', 
    authMiddleware.requireRole([UserRole.ADMIN]),
    authorizationMiddleware.requirePermission('users', 'create'),
    validateRequest(createUserSchema), 
    userController.create
  );

  // Get all users - Admin only (with tenant filtering)
  router.get('/', 
    authMiddleware.requireRole([UserRole.ADMIN]),
    authorizationMiddleware.requirePermission('users', 'read'),
    userController.findAll
  );

  // Get user statistics - Admin only
  router.get('/stats', 
    authMiddleware.requireRole([UserRole.ADMIN]),
    authorizationMiddleware.requirePermission('users', 'read'),
    userController.getStats
  );

  // Get user by ID - Admin or own profile
  router.get('/:id', 
    authorizationMiddleware.requirePermission('users', 'read', (req) => ({
      targetUserId: req.params['id']
    })),
    authorizationMiddleware.requireTenantAccess((req) => req.params['tenantId'] || req.user!.tenantId),
    userController.findById
  );

  // Update user - Admin or own profile (with field restrictions)
  router.put('/:id', 
    authorizationMiddleware.requirePermission('users', 'update', (req) => ({
      targetUserId: req.params['id']
    })),
    authorizationMiddleware.requireTenantAccess((req) => req.params['tenantId'] || req.user!.tenantId),
    validateRequest(updateUserSchema), 
    userController.update
  );

  // Delete user - Admin only
  router.delete('/:id', 
    authMiddleware.requireRole([UserRole.ADMIN]),
    authorizationMiddleware.requirePermission('users', 'delete'),
    authorizationMiddleware.requireTenantAccess((req) => req.params['tenantId'] || req.user!.tenantId),
    userController.delete
  );

  // Deactivate user - Admin only
  router.post('/:id/deactivate', 
    authMiddleware.requireRole([UserRole.ADMIN]),
    authorizationMiddleware.requirePermission('users', 'update'),
    authorizationMiddleware.requireTenantAccess((req) => req.params['tenantId'] || req.user!.tenantId),
    userController.deactivate
  );

  // Activate user - Admin only
  router.post('/:id/activate', 
    authMiddleware.requireRole([UserRole.ADMIN]),
    authorizationMiddleware.requirePermission('users', 'update'),
    authorizationMiddleware.requireTenantAccess((req) => req.params['tenantId'] || req.user!.tenantId),
    userController.activate
  );

  // Change user role - Admin only
  router.put('/:id/role', 
    authMiddleware.requireRole([UserRole.ADMIN]),
    authorizationMiddleware.requirePermission('users', 'update'),
    authorizationMiddleware.requireTenantAccess((req) => req.params['tenantId'] || req.user!.tenantId),
    validateRequest(changeRoleSchema), 
    userController.changeRole
  );

  return router;
}