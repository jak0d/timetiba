import { Router } from 'express';
import { studentGroupController } from '../controllers/studentGroupController';
import { validateRequest } from '../middleware/validation';
import { createStudentGroupSchema, updateStudentGroupSchema } from '../utils/validation';

const router = Router();

// Create student group
router.post('/', validateRequest(createStudentGroupSchema), (req, res) => {
  studentGroupController.create(req, res);
});

// Get all student groups with optional filtering
router.get('/', (req, res) => {
  studentGroupController.findAll(req, res);
});

// Get student group by ID
router.get('/:id', (req, res) => {
  studentGroupController.findById(req, res);
});

// Update student group
router.put('/:id', validateRequest(updateStudentGroupSchema), (req, res) => {
  studentGroupController.update(req, res);
});

// Delete student group
router.delete('/:id', (req, res) => {
  studentGroupController.delete(req, res);
});

// Get student groups by department
router.get('/search/department', (req, res) => {
  studentGroupController.findByDepartment(req, res);
});

// Get student groups by year level
router.get('/search/year-level', (req, res) => {
  studentGroupController.findByYearLevel(req, res);
});

// Get student groups by course
router.get('/search/course', (req, res) => {
  studentGroupController.findByCourse(req, res);
});

// Add course to student group
router.post('/:id/courses', (req, res) => {
  studentGroupController.addCourse(req, res);
});

// Remove course from student group
router.delete('/:id/courses', (req, res) => {
  studentGroupController.removeCourse(req, res);
});

export default router;