import { Request, Response } from 'express';
import { studentGroupRepository } from '../repositories/studentGroupRepository';
import { 
  createStudentGroupSchema, 
  updateStudentGroupSchema, 
  validateAndThrow 
} from '../utils/validation';
import { ApiResponse } from '../types/api';
import { StudentGroup, StudentGroupFilter } from '../models/studentGroup';

export class StudentGroupController {
  // Create a new student group
  async create(req: Request, res: Response): Promise<void> {
    try {
      const studentGroupData = validateAndThrow(createStudentGroupSchema, req.body);
      const studentGroup = await studentGroupRepository.create(studentGroupData);
      
      const response: ApiResponse<StudentGroup> = {
        success: true,
        data: studentGroup,
        message: 'Student group created successfully',
        timestamp: new Date()
      };
      
      res.status(201).json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to create student group');
    }
  }

  // Get all student groups with optional filtering
  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const filters: StudentGroupFilter = {};
      
      // Parse query parameters
      if (req.query['department']) {
        filters.department = req.query['department'] as string;
      }
      if (req.query['yearLevel']) {
        filters.yearLevel = parseInt(req.query['yearLevel'] as string);
      }
      if (req.query['program']) {
        filters.program = req.query['program'] as string;
      }
      if (req.query['semester']) {
        filters.semester = parseInt(req.query['semester'] as string);
      }
      if (req.query['academicYear']) {
        filters.academicYear = req.query['academicYear'] as string;
      }
      if (req.query['isActive']) {
        filters.isActive = req.query['isActive'] === 'true';
      }
      if (req.query['courseId']) {
        filters.courseId = req.query['courseId'] as string;
      }

      const studentGroups = await studentGroupRepository.findAll(filters);
      
      const response: ApiResponse<StudentGroup[]> = {
        success: true,
        data: studentGroups,
        message: `Found ${studentGroups.length} student groups`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve student groups');
    }
  }

  // Get student group by ID
  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Student group ID is required',
          timestamp: new Date()
        });
        return;
      }

      const studentGroup = await studentGroupRepository.findById(id);
      
      if (!studentGroup) {
        res.status(404).json({
          success: false,
          message: 'Student group not found',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse<StudentGroup> = {
        success: true,
        data: studentGroup,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve student group');
    }
  }

  // Update student group
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = { ...req.body, id };
      
      const validatedData = validateAndThrow(updateStudentGroupSchema, updateData);
      const studentGroup = await studentGroupRepository.update(id as string, validatedData);
      
      if (!studentGroup) {
        res.status(404).json({
          success: false,
          message: 'Student group not found',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse<StudentGroup> = {
        success: true,
        data: studentGroup,
        message: 'Student group updated successfully',
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to update student group');
    }
  }

  // Delete student group (soft delete)
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Student group ID is required',
          timestamp: new Date()
        });
        return;
      }

      const success = await studentGroupRepository.delete(id);
      
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Student group not found',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Student group deleted successfully',
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete student group');
    }
  }

  // Get student groups by department
  async findByDepartment(req: Request, res: Response): Promise<void> {
    try {
      const department = req.query['department'] as string;
      
      if (!department) {
        res.status(400).json({
          success: false,
          message: 'Department parameter is required',
          timestamp: new Date()
        });
        return;
      }

      const studentGroups = await studentGroupRepository.findByDepartment(department);
      
      const response: ApiResponse<StudentGroup[]> = {
        success: true,
        data: studentGroups,
        message: `Found ${studentGroups.length} student groups in ${department} department`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to find student groups by department');
    }
  }

  // Get student groups by year level
  async findByYearLevel(req: Request, res: Response): Promise<void> {
    try {
      const yearLevel = parseInt(req.query['yearLevel'] as string);
      
      if (isNaN(yearLevel)) {
        res.status(400).json({
          success: false,
          message: 'Valid year level parameter is required',
          timestamp: new Date()
        });
        return;
      }

      const studentGroups = await studentGroupRepository.findByYearLevel(yearLevel);
      
      const response: ApiResponse<StudentGroup[]> = {
        success: true,
        data: studentGroups,
        message: `Found ${studentGroups.length} student groups in year ${yearLevel}`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to find student groups by year level');
    }
  }

  // Get student groups by course
  async findByCourse(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.query['courseId'] as string;
      
      if (!courseId) {
        res.status(400).json({
          success: false,
          message: 'Course ID parameter is required',
          timestamp: new Date()
        });
        return;
      }

      const studentGroups = await studentGroupRepository.findByCourse(courseId);
      
      const response: ApiResponse<StudentGroup[]> = {
        success: true,
        data: studentGroups,
        message: `Found ${studentGroups.length} student groups enrolled in course`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to find student groups by course');
    }
  }

  // Add course to student group
  async addCourse(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { courseId } = req.body;
      
      if (!id || !courseId) {
        res.status(400).json({
          success: false,
          message: 'Student group ID and course ID are required',
          timestamp: new Date()
        });
        return;
      }

      const success = await studentGroupRepository.addCourse(id, courseId);
      
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Student group or course not found',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Course added to student group successfully',
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to add course to student group');
    }
  }

  // Remove course from student group
  async removeCourse(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { courseId } = req.body;
      
      if (!id || !courseId) {
        res.status(400).json({
          success: false,
          message: 'Student group ID and course ID are required',
          timestamp: new Date()
        });
        return;
      }

      const success = await studentGroupRepository.removeCourse(id, courseId);
      
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Student group or course relationship not found',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Course removed from student group successfully',
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to remove course from student group');
    }
  }

  private handleError(res: Response, error: any, defaultMessage: string): void {
    console.error('Student Group Controller Error:', error);
    
    if (error.isJoi) {
      // Joi validation error
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((detail: any) => detail.message),
        timestamp: new Date()
      });
      return;
    }

    if (error.code === '23505') {
      // PostgreSQL unique constraint violation
      res.status(409).json({
        success: false,
        message: 'Student group with this name already exists',
        timestamp: new Date()
      });
      return;
    }

    if (error.code === '23503') {
      // PostgreSQL foreign key constraint violation
      res.status(400).json({
        success: false,
        message: 'Referenced entity does not exist',
        timestamp: new Date()
      });
      return;
    }

    // Generic error
    res.status(500).json({
      success: false,
      message: defaultMessage,
      timestamp: new Date()
    });
  }
}

export const studentGroupController = new StudentGroupController();