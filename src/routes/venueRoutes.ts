import { Router } from 'express';
import { venueController } from '../controllers/venueController';
import { validateRequest } from '../middleware/validation';
import { createVenueSchema, updateVenueSchema } from '../utils/validation';

const router = Router();

// Create venue
router.post('/', validateRequest(createVenueSchema), (req, res) => {
  venueController.create(req, res);
});

// Get all venues with optional filtering
router.get('/', (req, res) => {
  venueController.findAll(req, res);
});

// Get venue by ID
router.get('/:id', (req, res) => {
  venueController.findById(req, res);
});

// Update venue
router.put('/:id', validateRequest(updateVenueSchema), (req, res) => {
  venueController.update(req, res);
});

// Delete venue
router.delete('/:id', (req, res) => {
  venueController.delete(req, res);
});

// Get venues by capacity range
router.get('/search/capacity', (req, res) => {
  venueController.findByCapacityRange(req, res);
});

// Get venues by equipment
router.get('/search/equipment', (req, res) => {
  venueController.findByEquipment(req, res);
});

// Get available venues at specific time
router.get('/search/available', (req, res) => {
  venueController.findAvailableAt(req, res);
});

export default router;