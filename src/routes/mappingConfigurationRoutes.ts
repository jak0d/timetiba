import { Router } from 'express';
import { MappingConfigurationController } from '../controllers/mappingConfigurationController';

const router = Router();
const controller = new MappingConfigurationController();

// Create a new mapping configuration
router.post('/', (req, res) => controller.create(req, res));

// Get all mapping configurations (with optional fileType filter)
router.get('/', (req, res) => controller.getAll(req, res));

// Get a mapping configuration by ID
router.get('/:id', (req, res) => controller.getById(req, res));

// Update a mapping configuration
router.put('/:id', (req, res) => controller.update(req, res));

// Delete a mapping configuration
router.delete('/:id', (req, res) => controller.delete(req, res));

// Validate a mapping configuration
router.post('/validate', (req, res) => controller.validate(req, res));

// Find similar configurations
router.post('/find-similar', (req, res) => controller.findSimilar(req, res));

// Create a template from existing configuration
router.post('/:id/template', (req, res) => controller.createTemplate(req, res));

// Apply a template to source columns
router.post('/:id/apply', (req, res) => controller.applyTemplate(req, res));

// Mark configuration as used
router.patch('/:id/mark-used', (req, res) => controller.markAsUsed(req, res));

export default router;