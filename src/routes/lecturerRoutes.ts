import { Router } from 'express';
import { lecturerController } from '../controllers/lecturerController';
import { validateRequest } from '../middleware/validation';
import { createLecturerSchema, updateLecturerSchema } from '../utils/validation';

const router = Router();

// Create lecturer
router.post('/', validateRequest(createLecturerSchema), (req, res) => {
  lecturerController.create(req, res);
});

// Get all lecturers with optional filtering
router.get('/', (req, res) => {
  lecturerController.findAll(req, res);
});

// Get lecturer by ID
router.get('/:id', (req, res) => {
  lecturerController.findById(req, res);
});

// Update lecturer
router.put('/:id', validateRequest(updateLecturerSchema), (req, res) => {
  lecturerController.update(req, res);
});

// Delete lecturer
router.delete('/:id', (req, res) => {
  lecturerController.delete(req, res);
});

// Update lecturer availability
router.put('/:id/availability', (req, res) => {
  lecturerController.updateAvailability(req, res);
});

// Update lecturer preferences
router.put('/:id/preferences', (req, res) => {
  lecturerController.updatePreferences(req, res);
});

// Get lecturers by department
router.get('/search/department', (req, res) => {
  lecturerController.findByDepartment(req, res);
});

// Get lecturers by subject
router.get('/search/subject', (req, res) => {
  lecturerController.findBySubject(req, res);
});

// Get available lecturers at specific time
router.get('/search/available', (req, res) => {
  lecturerController.findAvailableAt(req, res);
});

export default router;