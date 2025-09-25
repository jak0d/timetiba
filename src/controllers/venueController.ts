import { Request, Response } from 'express';
import { venueRepository } from '../repositories/venueRepository';
import { 
  createVenueSchema, 
  updateVenueSchema, 
  validateAndThrow 
} from '../utils/validation';
import { ApiResponse } from '../types/api';
import { Venue, VenueFilter } from '../models/venue';
import { Equipment, AccessibilityFeature, TimeSlot } from '../models/common';

export class VenueController {
  // Create a new venue
  async create(req: Request, res: Response): Promise<void> {
    try {
      const venueData = validateAndThrow(createVenueSchema, req.body);
      const venue = await venueRepository.create(venueData);
      
      const response: ApiResponse<Venue> = {
        success: true,
        data: venue,
        message: 'Venue created successfully',
        timestamp: new Date()
      };
      
      res.status(201).json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to create venue');
    }
  }

  // Get all venues with optional filtering
  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const filters: VenueFilter = {};
      
      // Parse query parameters
      if (req.query['minCapacity']) {
        filters.minCapacity = parseInt(req.query['minCapacity'] as string);
      }
      if (req.query['maxCapacity']) {
        filters.maxCapacity = parseInt(req.query['maxCapacity'] as string);
      }
      if (req.query['building']) {
        filters.building = req.query['building'] as string;
      }
      if (req.query['floor']) {
        filters.floor = parseInt(req.query['floor'] as string);
      }
      if (req.query['equipment']) {
        const equipmentParam = req.query['equipment'] as string;
        filters.requiredEquipment = equipmentParam.split(',') as Equipment[];
      }
      if (req.query['accessibility']) {
        const accessibilityParam = req.query['accessibility'] as string;
        filters.requiredAccessibility = accessibilityParam.split(',') as AccessibilityFeature[];
      }

      const venues = await venueRepository.findAll(filters);
      
      const response: ApiResponse<Venue[]> = {
        success: true,
        data: venues,
        message: `Found ${venues.length} venues`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve venues');
    }
  }

  // Get venue by ID
  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Venue ID is required',
          timestamp: new Date()
        });
        return;
      }

      const venue = await venueRepository.findById(id);
      
      if (!venue) {
        res.status(404).json({
          success: false,
          message: 'Venue not found',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse<Venue> = {
        success: true,
        data: venue,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve venue');
    }
  }

  // Update venue
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = { ...req.body, id };
      
      const validatedData = validateAndThrow(updateVenueSchema, updateData);
      const venue = await venueRepository.update(id as string, validatedData);
      
      if (!venue) {
        res.status(404).json({
          success: false,
          message: 'Venue not found',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse<Venue> = {
        success: true,
        data: venue,
        message: 'Venue updated successfully',
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to update venue');
    }
  }

  // Delete venue (soft delete)
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Venue ID is required',
          timestamp: new Date()
        });
        return;
      }

      const success = await venueRepository.delete(id);
      
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Venue not found',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Venue deleted successfully',
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete venue');
    }
  }

  // Get venues by capacity range
  async findByCapacityRange(req: Request, res: Response): Promise<void> {
    try {
      const minCapacity = parseInt(req.query['min'] as string);
      const maxCapacity = parseInt(req.query['max'] as string);
      
      if (isNaN(minCapacity) || isNaN(maxCapacity)) {
        res.status(400).json({
          success: false,
          message: 'Valid min and max capacity values are required',
          timestamp: new Date()
        });
        return;
      }

      const venues = await venueRepository.findByCapacityRange(minCapacity, maxCapacity);
      
      const response: ApiResponse<Venue[]> = {
        success: true,
        data: venues,
        message: `Found ${venues.length} venues with capacity between ${minCapacity} and ${maxCapacity}`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to find venues by capacity range');
    }
  }

  // Get venues by equipment
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
      const venues = await venueRepository.findByEquipment(equipment);
      
      const response: ApiResponse<Venue[]> = {
        success: true,
        data: venues,
        message: `Found ${venues.length} venues with required equipment`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to find venues by equipment');
    }
  }

  // Get available venues at specific time
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

      const venues = await venueRepository.findAvailableAt(timeSlot);
      
      const response: ApiResponse<Venue[]> = {
        success: true,
        data: venues,
        message: `Found ${venues.length} available venues`,
        timestamp: new Date()
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to find available venues');
    }
  }

  private handleError(res: Response, error: any, defaultMessage: string): void {
    console.error('Venue Controller Error:', error);
    
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
        message: 'Venue with this name already exists',
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

export const venueController = new VenueController();