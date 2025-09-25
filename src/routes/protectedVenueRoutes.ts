import { Router } from 'express';
import { venueController } from '../controllers/venueController';
import { validateRequest } from '../middleware/validation';
import { createVenueSchema, updateVenueSchema } from '../utils/validation';
import { AuthMiddleware } from '../middleware/auth';
import { AuthorizationMiddleware } from '../middleware/authorization';
import { UserRole } from '../models/user';

export function createProtectedVenueRoutes(
  authMiddleware: AuthMiddleware,
  authorizationMiddleware: AuthorizationMiddleware
): Router {
  const router = Router();

  // Apply authentication to all routes
  router.use(authMiddleware.authenticate);

  // Create venue - Admin only
  router.post('/', 
    authMiddleware.requireRole([UserRole.ADMIN]),
    authorizationMiddleware.requirePermission('venues', 'create'),
    validateRequest(createVenueSchema), 
    (req, res) => {
      venueController.create(req, res);
    }
  );

  // Get all venues - All authenticated users can read
  router.get('/', 
    authorizationMiddleware.requirePermission('venues', 'read'),
    authMiddleware.requireTenant,
    (req, res) => {
      venueController.findAll(req, res);
    }
  );

  // Get venue by ID - All authenticated users can read
  router.get('/:id', 
    authorizationMiddleware.requirePermission('venues', 'read'),
    authorizationMiddleware.requireTenantAccess((req) => req.params.tenantId || req.user!.tenantId),
    (req, res) => {
      venueController.findById(req, res);
    }
  );

  // Update venue - Admin only
  router.put('/:id', 
    authMiddleware.requireRole([UserRole.ADMIN]),
    authorizationMiddleware.requirePermission('venues', 'update'),
    authorizationMiddleware.requireTenantAccess((req) => req.params.tenantId || req.user!.tenantId),
    validateRequest(updateVenueSchema), 
    (req, res) => {
      venueController.update(req, res);
    }
  );

  // Delete venue - Admin only
  router.delete('/:id', 
    authMiddleware.requireRole([UserRole.ADMIN]),
    authorizationMiddleware.requirePermission('venues', 'delete'),
    authorizationMiddleware.requireTenantAccess((req) => req.params.tenantId || req.user!.tenantId),
    (req, res) => {
      venueController.delete(req, res);
    }
  );

  // Get venues by capacity range - All authenticated users
  router.get('/search/capacity', 
    authorizationMiddleware.requirePermission('venues', 'read'),
    authMiddleware.requireTenant,
    (req, res) => {
      venueController.findByCapacityRange(req, res);
    }
  );

  // Get venues by equipment - All authenticated users
  router.get('/search/equipment', 
    authorizationMiddleware.requirePermission('venues', 'read'),
    authMiddleware.requireTenant,
    (req, res) => {
      venueController.findByEquipment(req, res);
    }
  );

  // Get available venues at specific time - All authenticated users
  router.get('/search/available', 
    authorizationMiddleware.requirePermission('venues', 'read'),
    authMiddleware.requireTenant,
    (req, res) => {
      venueController.findAvailableAt(req, res);
    }
  );

  return router;
}