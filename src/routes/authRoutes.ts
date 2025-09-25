import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { AuthMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';
import { UserRole } from '../models/user';

export function createAuthRoutes(authController: AuthController, authMiddleware: AuthMiddleware): Router {
  const router = Router();

  // Validation schemas
  const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    role: Joi.string().valid(...Object.values(UserRole)).required(),
    tenantId: Joi.string().optional()
  });

  const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required()
  });

  // Public routes
  router.post('/register', 
    validateRequest(registerSchema), 
    authController.register
  );

  router.post('/login', 
    validateRequest(loginSchema), 
    authController.login
  );

  router.post('/refresh-token', 
    validateRequest(refreshTokenSchema), 
    authController.refreshToken
  );

  // Protected routes
  router.post('/logout', 
    authMiddleware.authenticate, 
    authController.logout
  );

  router.get('/profile', 
    authMiddleware.authenticate, 
    authController.getProfile
  );

  router.get('/validate-token', 
    authMiddleware.authenticate, 
    authController.validateToken
  );

  return router;
}