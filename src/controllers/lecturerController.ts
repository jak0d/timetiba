import { Request, Response } from 'express';
import { lecturerRepository } from '../repositories/lecturerRepository';
import { 
  createLecturerSchema, 
  updateLecturerSchema, 
  validateAndThrow 
} from '../utils/validation';
import { ApiResponse } from '../types/api';
import { Lecturer, LecturerFilter } from '../models/lecturer';
import { TimeSlot } from '../models/common';

export class LecturerController {
  // Create a new lecturer
  async create(req: Request, res: Response): Promise<void> {
    try {
      const lecturerData = validateAndThrow(createLecturerSchema, req.body);
      const lecturer = await lecturerRepository.create(lecturerData);
      
      const response: ApiResponse<Lecturer> = {
        success: true,
        data: lecturer,
        message: 'Lecturer created successfully',
        timestamp: new Date()
      };
      
      res.status(201).json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to create lecturer');
    }
  }

  // Get all lecturers with optional filtering
  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const filters: LecturerFilter = {};
      
      // Parse query parameters
      if (req.query['department']) {
        filters.department = req.query['department'] as string;
      }
      if (req.query['subjects']) {
        const subjectsParam = req.query['subjects'] as string;
        filters.subjects = subjectsParam.split(',');
      }
      if (req.query['isActive']) {
        filters.isActive = req.query['isActive'] === 'true';
      }

      const lecturers = await lecturerRepository.findAll(filters);
      
      const response: ApiResponse<Lecturer[]> = {
        success: true,
        data: lecturers,
        message: `Found ${lecturers.length} lecturers`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve lecturers');
    }
  }

  // Get lecturer by ID
  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Lecturer ID is required',
          timestamp: new Date()
        });
        return;
      }

      const lecturer = await lecturerRepository.findById(id);
      
      if (!lecturer) {
        res.status(404).json({
          success: false,
          message: 'Lecturer not found',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse<Lecturer> = {
        success: true,
        data: lecturer,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve lecturer');
    }
  }

  // Update lecturer
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = { ...req.body, id };
      
      const validatedData = validateAndThrow(updateLecturerSchema, updateData);
      const lecturer = await lecturerRepository.update(id as string, validatedData);
      
      if (!lecturer) {
        res.status(404).json({
          success: false,
          message: 'Lecturer not found',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse<Lecturer> = {
        success: true,
        data: lecturer,
        message: 'Lecturer updated successfully',
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to update lecturer');
    }
  }

  // Delete lecturer (soft delete)
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Lecturer ID is required',
          timestamp: new Date()
        });
        return;
      }

      const success = await lecturerRepository.delete(id);
      
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Lecturer not found',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Lecturer deleted successfully',
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete lecturer');
    }
  }

  // Update lecturer availability
  async updateAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { availability } = req.body;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Lecturer ID is required',
          timestamp: new Date()
        });
        return;
      }

      if (!availability) {
        res.status(400).json({
          success: false,
          message: 'Availability data is required',
          timestamp: new Date()
        });
        return;
      }

      const success = await lecturerRepository.updateAvailability(id, availability);
      
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Lecturer not found',
          timestamp: new Date()
        });
        return;
      }

      // Get the updated lecturer to return
      const lecturer = await lecturerRepository.findById(id);

      const response: ApiResponse<Lecturer> = {
        success: true,
        data: lecturer!,
        message: 'Lecturer availability updated successfully',
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to update lecturer availability');
    }
  }

  // Update lecturer preferences
  async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { preferences } = req.body;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Lecturer ID is required',
          timestamp: new Date()
        });
        return;
      }

      if (!preferences) {
        res.status(400).json({
          success: false,
          message: 'Preferences data is required',
          timestamp: new Date()
        });
        return;
      }

      const success = await lecturerRepository.updatePreferences(id, preferences);
      
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Lecturer not found',
          timestamp: new Date()
        });
        return;
      }

      // Get the updated lecturer to return
      const lecturer = await lecturerRepository.findById(id);

      const response: ApiResponse<Lecturer> = {
        success: true,
        data: lecturer!,
        message: 'Lecturer preferences updated successfully',
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to update lecturer preferences');
    }
  }

  // Get lecturers by department
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

      const lecturers = await lecturerRepository.findByDepartment(department);
      
      const response: ApiResponse<Lecturer[]> = {
        success: true,
        data: lecturers,
        message: `Found ${lecturers.length} lecturers in ${department} department`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to find lecturers by department');
    }
  }

  // Get lecturers by subject
  async findBySubject(req: Request, res: Response): Promise<void> {
    try {
      const subject = req.query['subject'] as string;
      
      if (!subject) {
        res.status(400).json({
          success: false,
          message: 'Subject parameter is required',
          timestamp: new Date()
        });
        return;
      }

      const lecturers = await lecturerRepository.findBySubjects([subject]);
      
      const response: ApiResponse<Lecturer[]> = {
        success: true,
        data: lecturers,
        message: `Found ${lecturers.length} lecturers teaching ${subject}`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to find lecturers by subject');
    }
  }

  // Get available lecturers at specific time
  async findAvailableAt(req: Request, res: Response): Promise<void> {
    try {
      const dayOfWeek = req.query['dayOfWeek'];
      const startTime = req.query['startTime'];
      const endTime = req.query['endTime'];
      
      if (!dayOfWeek || !startTime || !endTime) {
        res.status(400).json({
          success: false,
          message: 'dayOfWeek, startTime, and endTime are required',
          timestamp: new Date()
        });
        return;
      }

      const timeSlot: TimeSlot = {
        dayOfWeek: dayOfWeek as any,
        startTime: startTime as string,
        endTime: endTime as string
      };

      const lecturers = await lecturerRepository.findAvailableAt(timeSlot);
      
      const response: ApiResponse<Lecturer[]> = {
        success: true,
        data: lecturers,
        message: `Found ${lecturers.length} available lecturers`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to find available lecturers');
    }
  }

  private handleError(res: Response, error: any, defaultMessage: string): void {
    console.error('Lecturer Controller Error:', error);
    
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
        message: 'Lecturer with this email already exists',
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

export const lecturerController = new LecturerController();