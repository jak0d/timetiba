import { Router } from 'express';
import { courseController } from '../controllers/courseController';
import { validateRequest } from '../middleware/validation';
import { createCourseSchema, updateCourseSchema } from '../utils/validation';

const router = Router();

// Create course
router.post('/', validateRequest(createCourseSchema), (req, res) => {
  courseController.create(req, res);
});

// Get all courses with optional filtering
router.get('/', (req, res) => {
  courseController.findAll(req, res);
});

// Get course by ID
router.get('/:id', (req, res) => {
  courseController.findById(req, res);
});

// Update course
router.put('/:id', validateRequest(updateCourseSchema), (req, res) => {
  courseController.update(req, res);
});

// Delete course
router.delete('/:id', (req, res) => {
  courseController.delete(req, res);
});

// Get courses by department
router.get('/search/department', (req, res) => {
  courseController.findByDepartment(req, res);
});

// Get courses by lecturer
router.get('/search/lecturer', (req, res) => {
  courseController.findByLecturer(req, res);
});

// Get courses by student group
router.get('/search/student-group', (req, res) => {
  courseController.findByStudentGroup(req, res);
});

// Get courses by equipment requirement
router.get('/search/equipment', (req, res) => {
  courseController.findByEquipment(req, res);
});

// Add student group to course
router.post('/:id/student-groups', (req, res) => {
  courseController.addStudentGroup(req, res);
});

// Remove student group from course
router.delete('/:id/student-groups', (req, res) => {
  courseController.removeStudentGroup(req, res);
});

export default router;