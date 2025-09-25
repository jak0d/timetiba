import { Request, Response } from 'express';
import { VenueController } from '../controllers/venueController';
import { venueRepository } from '../repositories/venueRepository';
import { Equipment, DayOfWeek } from '../models/common';
import { Venue } from '../models/venue';

// Mock the venue repository
jest.mock('../repositories/venueRepository');
const mockVenueRepository = venueRepository as jest.Mocked<typeof venueRepository>;

describe('VenueController Unit Tests', () => {
  let venueController: VenueController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    venueController = new VenueController();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {};
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a venue successfully', async () => {
      const venueData = {
        name: 'Test Hall',
        capacity: 100,
        equipment: [Equipment.PROJECTOR],
        availability: [],
        location: 'Building A',
        accessibility: []
      };

      const createdVenue: Venue = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...venueData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.body = venueData;
      mockVenueRepository.create.mockResolvedValue(createdVenue);

      await venueController.create(mockRequest as Request, mockResponse as Response);

      expect(mockVenueRepository.create).toHaveBeenCalledWith(venueData);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: createdVenue,
        message: 'Venue created successfully',
        timestamp: expect.any(Date)
      });
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        name: '', // Invalid empty name
        capacity: -1 // Invalid negative capacity
      };

      mockRequest.body = invalidData;

      await venueController.create(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.any(Array),
        timestamp: expect.any(Date)
      });
    });

    it('should handle database errors', async () => {
      const venueData = {
        name: 'Test Hall',
        capacity: 100,
        equipment: [],
        availability: [],
        location: 'Building A',
        accessibility: []
      };

      mockRequest.body = venueData;
      mockVenueRepository.create.mockRejectedValue(new Error('Database error'));

      await venueController.create(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create venue',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('findAll', () => {
    it('should return all venues', async () => {
      const venues: Venue[] = [
        {
          id: '1',
          name: 'Hall A',
          capacity: 100,
          equipment: [Equipment.PROJECTOR],
          availability: [],
          location: 'Building A',
          accessibility: [],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          name: 'Hall B',
          capacity: 50,
          equipment: [Equipment.WHITEBOARD],
          availability: [],
          location: 'Building B',
          accessibility: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRequest.query = {};
      mockVenueRepository.findAll.mockResolvedValue(venues);

      await venueController.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockVenueRepository.findAll).toHaveBeenCalledWith({});
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: venues,
        message: 'Found 2 venues',
        timestamp: expect.any(Date)
      });
    });

    it('should filter venues by capacity', async () => {
      const filteredVenues: Venue[] = [
        {
          id: '1',
          name: 'Large Hall',
          capacity: 200,
          equipment: [],
          availability: [],
          location: 'Building A',
          accessibility: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRequest.query = { minCapacity: '100', maxCapacity: '300' };
      mockVenueRepository.findAll.mockResolvedValue(filteredVenues);

      await venueController.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockVenueRepository.findAll).toHaveBeenCalledWith({
        minCapacity: 100,
        maxCapacity: 300
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: filteredVenues,
        message: 'Found 1 venues',
        timestamp: expect.any(Date)
      });
    });

    it('should filter venues by equipment', async () => {
      mockRequest.query = { equipment: 'PROJECTOR,WHITEBOARD' };
      mockVenueRepository.findAll.mockResolvedValue([]);

      await venueController.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockVenueRepository.findAll).toHaveBeenCalledWith({
        requiredEquipment: ['PROJECTOR', 'WHITEBOARD']
      });
    });
  });

  describe('findById', () => {
    it('should return venue by ID', async () => {
      const venue: Venue = {
        id: '123',
        name: 'Test Hall',
        capacity: 100,
        equipment: [],
        availability: [],
        location: 'Building A',
        accessibility: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { id: '123' };
      mockVenueRepository.findById.mockResolvedValue(venue);

      await venueController.findById(mockRequest as Request, mockResponse as Response);

      expect(mockVenueRepository.findById).toHaveBeenCalledWith('123');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: venue,
        timestamp: expect.any(Date)
      });
    });

    it('should return 404 for non-existent venue', async () => {
      mockRequest.params = { id: '123' };
      mockVenueRepository.findById.mockResolvedValue(null);

      await venueController.findById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Venue not found',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 for missing ID', async () => {
      mockRequest.params = {};

      await venueController.findById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Venue ID is required',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('update', () => {
    it('should update venue successfully', async () => {
      const updateData = {
        name: 'Updated Hall',
        capacity: 150
      };

      const updatedVenue: Venue = {
        id: '123',
        name: 'Updated Hall',
        capacity: 150,
        equipment: [],
        availability: [],
        location: 'Building A',
        accessibility: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const validId = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.params = { id: validId };
      mockRequest.body = updateData;
      mockVenueRepository.update.mockResolvedValue(updatedVenue);

      await venueController.update(mockRequest as Request, mockResponse as Response);

      expect(mockVenueRepository.update).toHaveBeenCalledWith(validId, {
        ...updateData,
        id: validId
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: updatedVenue,
        message: 'Venue updated successfully',
        timestamp: expect.any(Date)
      });
    });

    it('should return 404 for non-existent venue update', async () => {
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.params = { id: validId };
      mockRequest.body = { name: 'Updated Name' };
      mockVenueRepository.update.mockResolvedValue(null);

      await venueController.update(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Venue not found',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('delete', () => {
    it('should delete venue successfully', async () => {
      mockRequest.params = { id: '123' };
      mockVenueRepository.delete.mockResolvedValue(true);

      await venueController.delete(mockRequest as Request, mockResponse as Response);

      expect(mockVenueRepository.delete).toHaveBeenCalledWith('123');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Venue deleted successfully',
        timestamp: expect.any(Date)
      });
    });

    it('should return 404 for non-existent venue deletion', async () => {
      mockRequest.params = { id: '123' };
      mockVenueRepository.delete.mockResolvedValue(false);

      await venueController.delete(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Venue not found',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 for missing ID', async () => {
      mockRequest.params = {};

      await venueController.delete(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Venue ID is required',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('findByCapacityRange', () => {
    it('should find venues by capacity range', async () => {
      const venues: Venue[] = [
        {
          id: '1',
          name: 'Medium Hall',
          capacity: 75,
          equipment: [],
          availability: [],
          location: 'Building A',
          accessibility: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRequest.query = { min: '50', max: '100' };
      mockVenueRepository.findByCapacityRange.mockResolvedValue(venues);

      await venueController.findByCapacityRange(mockRequest as Request, mockResponse as Response);

      expect(mockVenueRepository.findByCapacityRange).toHaveBeenCalledWith(50, 100);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: venues,
        message: 'Found 1 venues with capacity between 50 and 100',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 for invalid capacity parameters', async () => {
      mockRequest.query = { min: 'invalid', max: '100' };

      await venueController.findByCapacityRange(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Valid min and max capacity values are required',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('findByEquipment', () => {
    it('should find venues by equipment', async () => {
      const venues: Venue[] = [
        {
          id: '1',
          name: 'Tech Room',
          capacity: 50,
          equipment: [Equipment.PROJECTOR, Equipment.COMPUTER],
          availability: [],
          location: 'Building B',
          accessibility: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRequest.query = { equipment: 'PROJECTOR,COMPUTER' };
      mockVenueRepository.findByEquipment.mockResolvedValue(venues);

      await venueController.findByEquipment(mockRequest as Request, mockResponse as Response);

      expect(mockVenueRepository.findByEquipment).toHaveBeenCalledWith(['PROJECTOR', 'COMPUTER']);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: venues,
        message: 'Found 1 venues with required equipment',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 when equipment parameter is missing', async () => {
      mockRequest.query = {};

      await venueController.findByEquipment(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Equipment parameter is required',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('findAvailableAt', () => {
    it('should find available venues at specific time', async () => {
      const venues: Venue[] = [
        {
          id: '1',
          name: 'Available Room',
          capacity: 40,
          equipment: [],
          availability: [
            {
              dayOfWeek: DayOfWeek.MONDAY,
              startTime: '09:00',
              endTime: '17:00'
            }
          ],
          location: 'Building C',
          accessibility: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRequest.query = {
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '12:00'
      };
      mockVenueRepository.findAvailableAt.mockResolvedValue(venues);

      await venueController.findAvailableAt(mockRequest as Request, mockResponse as Response);

      expect(mockVenueRepository.findAvailableAt).toHaveBeenCalledWith({
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '12:00'
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: venues,
        message: 'Found 1 available venues',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 for missing parameters', async () => {
      mockRequest.query = { dayOfWeek: 'MONDAY' }; // Missing startTime and endTime

      await venueController.findAvailableAt(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'dayOfWeek, startTime, and endTime are required',
        timestamp: expect.any(Date)
      });
    });
  });
});