import { Request, Response } from 'express';
import { courseRepository } from '../repositories/courseRepository';
import { 
  createCourseSchema, 
  updateCourseSchema, 
  validateAndThrow 
} from '../utils/validation';
import { ApiResponse } from '../types/api';
import { Course, CourseFilter } from '../models/course';
import { Equipment } from '../models/common';

export class CourseController {
  // Create a new course
  async create(req: Request, res: Response): Promise<void> {
    try {
      const courseData = validateAndThrow(createCourseSchema, req.body);
      const course = await courseRepository.create(courseData);
      
      const response: ApiResponse<Course> = {
        success: true,
        data: course,
        message: 'Course created successfully',
        timestamp: new Date()
      };
      
      res.status(201).json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to create course');
    }
  }

  // Get all courses with optional filtering
  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const filters: CourseFilter = {};
      
      // Parse query parameters
      if (req.query['department']) {
        filters.department = req.query['department'] as string;
      }
      if (req.query['lecturerId']) {
        filters.lecturerId = req.query['lecturerId'] as string;
      }
      if (req.query['studentGroupId']) {
        filters.studentGroupId = req.query['studentGroupId'] as string;
      }
      if (req.query['isActive']) {
        filters.isActive = req.query['isActive'] === 'true';
      }
      if (req.query['credits']) {
        filters.credits = parseInt(req.query['credits'] as string);
      }

      const courses = await courseRepository.findAll(filters);
      
      const response: ApiResponse<Course[]> = {
        success: true,
        data: courses,
        message: `Found ${courses.length} courses`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve courses');
    }
  }

  // Get course by ID
  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Course ID is required',
          timestamp: new Date()
        });
        return;
      }

      const course = await courseRepository.findById(id);
      
      if (!course) {
        res.status(404).json({
          success: false,
          message: 'Course not found',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse<Course> = {
        success: true,
        data: course,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve course');
    }
  }

  // Update course
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = { ...req.body, id };
      
      const validatedData = validateAndThrow(updateCourseSchema, updateData);
      const course = await courseRepository.update(id as string, validatedData);
      
      if (!course) {
        res.status(404).json({
          success: false,
          message: 'Course not found',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse<Course> = {
        success: true,
        data: course,
        message: 'Course updated successfully',
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to update course');
    }
  }

  // Delete course (soft delete)
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Course ID is required',
          timestamp: new Date()
        });
        return;
      }

      const success = await courseRepository.delete(id);
      
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Course not found',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Course deleted successfully',
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete course');
    }
  }

  // Get courses by department
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

      const courses = await courseRepository.findByDepartment(department);
      
      const response: ApiResponse<Course[]> = {
        success: true,
        data: courses,
        message: `Found ${courses.length} courses in ${department} department`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to find courses by department');
    }
  }

  // Get courses by lecturer
  async findByLecturer(req: Request, res: Response): Promise<void> {
    try {
      const lecturerId = req.query['lecturerId'] as string;
      
      if (!lecturerId) {
        res.status(400).json({
          success: false,
          message: 'Lecturer ID parameter is required',
          timestamp: new Date()
        });
        return;
      }

      const courses = await courseRepository.findByLecturer(lecturerId);
      
      const response: ApiResponse<Course[]> = {
        success: true,
        data: courses,
        message: `Found ${courses.length} courses for lecturer`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to find courses by lecturer');
    }
  }

  // Get courses by student group
  async findByStudentGroup(req: Request, res: Response): Promise<void> {
    try {
      const studentGroupId = req.query['studentGroupId'] as string;
      
      if (!studentGroupId) {
        res.status(400).json({
          success: false,
          message: 'Student group ID parameter is required',
          timestamp: new Date()
        });
        return;
      }

      const courses = await courseRepository.findByStudentGroup(studentGroupId);
      
      const response: ApiResponse<Course[]> = {
        success: true,
        data: courses,
        message: `Found ${courses.length} courses for student group`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to find courses by student group');
    }
  }

  // Get courses by equipment requirement
  async findByEquipment(req: Request, res: Response): Promise<void> {
    try {
      const equipmentParam = req.query['equipment'] as string;
      
      if (!equipmentParam) {
        res.status(400).json({
          success: false,
          message: 'Equipment parameter is required',
          timestamp: new Date()
        });
        return;
      }

      const equipment = equipmentParam.split(',') as Equipment[];
      const courses = await courseRepository.findByEquipment(equipment);
      
      const response: ApiResponse<Course[]> = {
        success: true,
        data: courses,
        message: `Found ${courses.length} courses requiring specified equipment`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to find courses by equipment');
    }
  }

  // Add student group to course
  async addStudentGroup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { studentGroupId } = req.body;
      
      if (!id || !studentGroupId) {
        res.status(400).json({
          success: false,
          message: 'Course ID and student group ID are required',
          timestamp: new Date()
        });
        return;
      }

      const success = await courseRepository.addStudentGroup(id, studentGroupId);
      
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Course or student group not found',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Student group added to course successfully',
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to add student group to course');
    }
  }

  // Remove student group from course
  async removeStudentGroup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { studentGroupId } = req.body;
      
      if (!id || !studentGroupId) {
        res.status(400).json({
          success: false,
          message: 'Course ID and student group ID are required',
          timestamp: new Date()
        });
        return;
      }

      const success = await courseRepository.removeStudentGroup(id, studentGroupId);
      
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Course or student group relationship not found',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Student group removed from course successfully',
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to remove student group from course');
    }
  }

  private handleError(res: Response, error: any, defaultMessage: string): void {
    console.error('Course Controller Error:', error);
    
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
        message: 'Course with this code already exists',
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

export const courseController = new CourseController();