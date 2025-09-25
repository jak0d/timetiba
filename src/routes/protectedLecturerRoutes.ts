import { Router } from 'express';
import { lecturerController } from '../controllers/lecturerController';
import { validateRequest } from '../middleware/validation';
import { AuthMiddleware } from '../middleware/auth';
import { AuthorizationMiddleware } from '../middleware/authorization';
import { UserRole } from '../models/user';
import Joi from 'joi';

export function createProtectedLecturerRoutes(
  authMiddleware: AuthMiddleware,
  authorizationMiddleware: AuthorizationMiddleware
): Router {
  const router = Router();

  // Apply authentication to all routes
  router.use(authMiddleware.authenticate);

  // Validation schemas
  const createLecturerSchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    department: Joi.string().required(),
    subjects: Joi.array().items(Joi.string()).required(),
    availability: Joi.object().required(),
    preferences: Joi.object().required()
  });

  const updateLecturerSchema = Joi.object({
    name: Joi.string(),
    email: Joi.string().email(),
    department: Joi.string(),
    subjects: Joi.array().items(Joi.string()),
    availability: Joi.object(),
    preferences: Joi.object()
  });

  const updateAvailabilitySchema = Joi.object({
    availability: Joi.object().required()
  });

  const updatePreferencesSchema = Joi.object({
    preferences: Joi.object().required()
  });

  // Create lecturer - Admin only
  router.post('/', 
    authMiddleware.requireRole([UserRole.ADMIN]),
    authorizationMiddleware.requirePermission('lecturers', 'create'),
    validateRequest(createLecturerSchema), 
    (req, res) => {
      lecturerController.create(req, res);
    }
  );

  // Get all lecturers - Admin and Lecturers can read
  router.get('/', 
    authorizationMiddleware.requirePermission('lecturers', 'read'),
    authMiddleware.requireTenant,
    (req, res) => {
      lecturerController.findAll(req, res);
    }
  );

  // Get lecturer by ID - Admin, own profile, or related users
  router.get('/:id', 
    authorizationMiddleware.requirePermission('lecturers', 'read', (req) => ({
      resourceOwnerId: req.params.id,
      targetUserId: req.params.id
    })),
    authorizationMiddleware.requireTenantAccess((req) => req.params.tenantId || req.user!.tenantId),
    (req, res) => {
      lecturerController.findById(req, res);
    }
  );

  // Update lecturer - Admin or own profile
  router.put('/:id', 
    authorizationMiddleware.requirePermission('lecturers', 'update', (req) => ({
      resourceOwnerId: req.params.id,
      targetUserId: req.params.id
    })),
    authorizationMiddleware.requireTenantAccess((req) => req.params.tenantId || req.user!.tenantId),
    validateRequest(updateLecturerSchema), 
    (req, res) => {
      lecturerController.update(req, res);
    }
  );

  // Delete lecturer - Admin only
  router.delete('/:id', 
    authMiddleware.requireRole([UserRole.ADMIN]),
    authorizationMiddleware.requirePermission('lecturers', 'delete'),
    authorizationMiddleware.requireTenantAccess((req) => req.params.tenantId || req.user!.tenantId),
    (req, res) => {
      lecturerController.delete(req, res);
    }
  );

  // Update availability - Admin or own profile
  router.put('/:id/availability', 
    authorizationMiddleware.requirePermission('availability', 'update', (req) => ({
      resourceOwnerId: req.params.id,
      targetUserId: req.params.id
    })),
    authorizationMiddleware.requireTenantAccess((req) => req.params.tenantId || req.user!.tenantId),
    validateRequest(updateAvailabilitySchema), 
    (req, res) => {
      lecturerController.updateAvailability(req, res);
    }
  );

  // Get availability - Admin or own profile
  router.get('/:id/availability', 
    authorizationMiddleware.requirePermission('availability', 'read', (req) => ({
      resourceOwnerId: req.params.id,
      targetUserId: req.params.id
    })),
    authorizationMiddleware.requireTenantAccess((req) => req.params.tenantId || req.user!.tenantId),
    (req, res) => {
      lecturerController.getAvailability(req, res);
    }
  );

  // Update preferences - Admin or own profile
  router.put('/:id/preferences', 
    authorizationMiddleware.requirePermission('preferences', 'update', (req) => ({
      resourceOwnerId: req.params.id,
      targetUserId: req.params.id
    })),
    authorizationMiddleware.requireTenantAccess((req) => req.params.tenantId || req.user!.tenantId),
    validateRequest(updatePreferencesSchema), 
    (req, res) => {
      lecturerController.updatePreferences(req, res);
    }
  );

  // Get preferences - Admin or own profile
  router.get('/:id/preferences', 
    authorizationMiddleware.requirePermission('preferences', 'read', (req) => ({
      resourceOwnerId: req.params.id,
      targetUserId: req.params.id
    })),
    authorizationMiddleware.requireTenantAccess((req) => req.params.tenantId || req.user!.tenantId),
    (req, res) => {
      lecturerController.getPreferences(req, res);
    }
  );

  // Find lecturers by subject - All authenticated users
  router.get('/search/subject/:subject', 
    authorizationMiddleware.requirePermission('lecturers', 'read'),
    authMiddleware.requireTenant,
    (req, res) => {
      lecturerController.findBySubject(req, res);
    }
  );

  // Find available lecturers at specific time - Admin only
  router.get('/search/available', 
    authMiddleware.requireRole([UserRole.ADMIN]),
    authorizationMiddleware.requirePermission('lecturers', 'read'),
    authMiddleware.requireTenant,
    (req, res) => {
      lecturerController.findAvailableAt(req, res);
    }
  );

  return router;
}