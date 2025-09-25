import { Request, Response } from 'express';
import { LecturerController } from '../controllers/lecturerController';
import { lecturerRepository } from '../repositories/lecturerRepository';
import { DayOfWeek } from '../models/common';
import { Lecturer } from '../models/lecturer';

// Mock the lecturer repository
jest.mock('../repositories/lecturerRepository');
const mockLecturerRepository = lecturerRepository as jest.Mocked<typeof lecturerRepository>;

describe('LecturerController Unit Tests', () => {
  let lecturerController: LecturerController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    lecturerController = new LecturerController();
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
    it('should create a lecturer successfully', async () => {
      const lecturerData = {
        name: 'Dr. John Smith',
        email: 'john.smith@university.edu',
        department: 'Computer Science',
        subjects: ['Programming', 'Data Structures'],
        availability: {
          [DayOfWeek.MONDAY]: [{ dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '17:00' }],
          [DayOfWeek.TUESDAY]: [],
          [DayOfWeek.WEDNESDAY]: [],
          [DayOfWeek.THURSDAY]: [],
          [DayOfWeek.FRIDAY]: [],
          [DayOfWeek.SATURDAY]: [],
          [DayOfWeek.SUNDAY]: []
        },
        preferences: {
          preferredTimeSlots: [],
          maxHoursPerDay: 8,
          maxHoursPerWeek: 40,
          minimumBreakBetweenClasses: 15,
          preferredDays: [DayOfWeek.MONDAY],
          avoidBackToBackClasses: false
        },
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40
      };

      const createdLecturer: Lecturer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...lecturerData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.body = lecturerData;
      mockLecturerRepository.create.mockResolvedValue(createdLecturer);

      await lecturerController.create(mockRequest as Request, mockResponse as Response);

      expect(mockLecturerRepository.create).toHaveBeenCalledWith(lecturerData);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: createdLecturer,
        message: 'Lecturer created successfully',
        timestamp: expect.any(Date)
      });
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        name: '', // Invalid empty name
        email: 'invalid-email' // Invalid email format
      };

      mockRequest.body = invalidData;

      await lecturerController.create(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.any(Array),
        timestamp: expect.any(Date)
      });
    });

    it('should handle database errors', async () => {
      const lecturerData = {
        name: 'Dr. John Smith',
        email: 'john.smith@university.edu',
        department: 'Computer Science',
        subjects: ['Programming'],
        availability: {
          [DayOfWeek.MONDAY]: [],
          [DayOfWeek.TUESDAY]: [],
          [DayOfWeek.WEDNESDAY]: [],
          [DayOfWeek.THURSDAY]: [],
          [DayOfWeek.FRIDAY]: [],
          [DayOfWeek.SATURDAY]: [],
          [DayOfWeek.SUNDAY]: []
        },
        preferences: {
          preferredTimeSlots: [],
          maxHoursPerDay: 8,
          maxHoursPerWeek: 40,
          minimumBreakBetweenClasses: 15,
          preferredDays: [],
          avoidBackToBackClasses: false
        },
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40
      };

      mockRequest.body = lecturerData;
      mockLecturerRepository.create.mockRejectedValue(new Error('Database error'));

      await lecturerController.create(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create lecturer',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('findAll', () => {
    it('should return all lecturers', async () => {
      const lecturers: Lecturer[] = [
        {
          id: '1',
          name: 'Dr. John Smith',
          email: 'john@university.edu',
          department: 'Computer Science',
          subjects: ['Programming'],
          availability: {
            [DayOfWeek.MONDAY]: [],
            [DayOfWeek.TUESDAY]: [],
            [DayOfWeek.WEDNESDAY]: [],
            [DayOfWeek.THURSDAY]: [],
            [DayOfWeek.FRIDAY]: [],
            [DayOfWeek.SATURDAY]: [],
            [DayOfWeek.SUNDAY]: []
          },
          preferences: {
            preferredTimeSlots: [],
            maxHoursPerDay: 8,
            maxHoursPerWeek: 40,
            minimumBreakBetweenClasses: 15,
            preferredDays: [],
            avoidBackToBackClasses: false
          },
          maxHoursPerDay: 8,
          maxHoursPerWeek: 40,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRequest.query = {};
      mockLecturerRepository.findAll.mockResolvedValue(lecturers);

      await lecturerController.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockLecturerRepository.findAll).toHaveBeenCalledWith({});
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: lecturers,
        message: 'Found 1 lecturers',
        timestamp: expect.any(Date)
      });
    });

    it('should filter lecturers by department', async () => {
      const filteredLecturers: Lecturer[] = [];

      mockRequest.query = { department: 'Computer Science' };
      mockLecturerRepository.findAll.mockResolvedValue(filteredLecturers);

      await lecturerController.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockLecturerRepository.findAll).toHaveBeenCalledWith({
        department: 'Computer Science'
      });
    });

    it('should filter lecturers by subjects', async () => {
      mockRequest.query = { subjects: 'Programming,Mathematics' };
      mockLecturerRepository.findAll.mockResolvedValue([]);

      await lecturerController.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockLecturerRepository.findAll).toHaveBeenCalledWith({
        subjects: ['Programming', 'Mathematics']
      });
    });

    it('should filter lecturers by active status', async () => {
      mockRequest.query = { isActive: 'true' };
      mockLecturerRepository.findAll.mockResolvedValue([]);

      await lecturerController.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockLecturerRepository.findAll).toHaveBeenCalledWith({
        isActive: true
      });
    });
  });

  describe('findById', () => {
    it('should return lecturer by ID', async () => {
      const lecturer: Lecturer = {
        id: '123',
        name: 'Dr. John Smith',
        email: 'john@university.edu',
        department: 'Computer Science',
        subjects: ['Programming'],
        availability: {
          [DayOfWeek.MONDAY]: [],
          [DayOfWeek.TUESDAY]: [],
          [DayOfWeek.WEDNESDAY]: [],
          [DayOfWeek.THURSDAY]: [],
          [DayOfWeek.FRIDAY]: [],
          [DayOfWeek.SATURDAY]: [],
          [DayOfWeek.SUNDAY]: []
        },
        preferences: {
          preferredTimeSlots: [],
          maxHoursPerDay: 8,
          maxHoursPerWeek: 40,
          minimumBreakBetweenClasses: 15,
          preferredDays: [],
          avoidBackToBackClasses: false
        },
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { id: '123' };
      mockLecturerRepository.findById.mockResolvedValue(lecturer);

      await lecturerController.findById(mockRequest as Request, mockResponse as Response);

      expect(mockLecturerRepository.findById).toHaveBeenCalledWith('123');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: lecturer,
        timestamp: expect.any(Date)
      });
    });

    it('should return 404 for non-existent lecturer', async () => {
      mockRequest.params = { id: '123' };
      mockLecturerRepository.findById.mockResolvedValue(null);

      await lecturerController.findById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Lecturer not found',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 for missing ID', async () => {
      mockRequest.params = {};

      await lecturerController.findById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Lecturer ID is required',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('update', () => {
    it('should update lecturer successfully', async () => {
      const updateData = {
        name: 'Dr. John Updated',
        department: 'Mathematics'
      };

      const updatedLecturer: Lecturer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Dr. John Updated',
        email: 'john@university.edu',
        department: 'Mathematics',
        subjects: ['Programming'],
        availability: {
          [DayOfWeek.MONDAY]: [],
          [DayOfWeek.TUESDAY]: [],
          [DayOfWeek.WEDNESDAY]: [],
          [DayOfWeek.THURSDAY]: [],
          [DayOfWeek.FRIDAY]: [],
          [DayOfWeek.SATURDAY]: [],
          [DayOfWeek.SUNDAY]: []
        },
        preferences: {
          preferredTimeSlots: [],
          maxHoursPerDay: 8,
          maxHoursPerWeek: 40,
          minimumBreakBetweenClasses: 15,
          preferredDays: [],
          avoidBackToBackClasses: false
        },
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const validId = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.params = { id: validId };
      mockRequest.body = updateData;
      mockLecturerRepository.update.mockResolvedValue(updatedLecturer);

      await lecturerController.update(mockRequest as Request, mockResponse as Response);

      expect(mockLecturerRepository.update).toHaveBeenCalledWith(validId, {
        ...updateData,
        id: validId
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: updatedLecturer,
        message: 'Lecturer updated successfully',
        timestamp: expect.any(Date)
      });
    });

    it('should return 404 for non-existent lecturer update', async () => {
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.params = { id: validId };
      mockRequest.body = { name: 'Updated Name' };
      mockLecturerRepository.update.mockResolvedValue(null);

      await lecturerController.update(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Lecturer not found',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('delete', () => {
    it('should delete lecturer successfully', async () => {
      mockRequest.params = { id: '123' };
      mockLecturerRepository.delete.mockResolvedValue(true);

      await lecturerController.delete(mockRequest as Request, mockResponse as Response);

      expect(mockLecturerRepository.delete).toHaveBeenCalledWith('123');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Lecturer deleted successfully',
        timestamp: expect.any(Date)
      });
    });

    it('should return 404 for non-existent lecturer deletion', async () => {
      mockRequest.params = { id: '123' };
      mockLecturerRepository.delete.mockResolvedValue(false);

      await lecturerController.delete(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Lecturer not found',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('updateAvailability', () => {
    it('should update lecturer availability successfully', async () => {
      const availability = {
        [DayOfWeek.MONDAY]: [{ dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '17:00' }],
        [DayOfWeek.TUESDAY]: [],
        [DayOfWeek.WEDNESDAY]: [],
        [DayOfWeek.THURSDAY]: [],
        [DayOfWeek.FRIDAY]: [],
        [DayOfWeek.SATURDAY]: [],
        [DayOfWeek.SUNDAY]: []
      };

      const updatedLecturer: Lecturer = {
        id: '123',
        name: 'Dr. John Smith',
        email: 'john@university.edu',
        department: 'Computer Science',
        subjects: ['Programming'],
        availability,
        preferences: {
          preferredTimeSlots: [],
          maxHoursPerDay: 8,
          maxHoursPerWeek: 40,
          minimumBreakBetweenClasses: 15,
          preferredDays: [],
          avoidBackToBackClasses: false
        },
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { id: '123' };
      mockRequest.body = { availability };
      mockLecturerRepository.updateAvailability.mockResolvedValue(true);
      mockLecturerRepository.findById.mockResolvedValue(updatedLecturer);

      await lecturerController.updateAvailability(mockRequest as Request, mockResponse as Response);

      expect(mockLecturerRepository.updateAvailability).toHaveBeenCalledWith('123', availability);
      expect(mockLecturerRepository.findById).toHaveBeenCalledWith('123');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: updatedLecturer,
        message: 'Lecturer availability updated successfully',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 for missing availability data', async () => {
      mockRequest.params = { id: '123' };
      mockRequest.body = {};

      await lecturerController.updateAvailability(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Availability data is required',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('updatePreferences', () => {
    it('should update lecturer preferences successfully', async () => {
      const preferences = {
        preferredTimeSlots: [],
        maxHoursPerDay: 6,
        maxHoursPerWeek: 30,
        minimumBreakBetweenClasses: 30,
        preferredDays: [DayOfWeek.MONDAY],
        avoidBackToBackClasses: true
      };

      const updatedLecturer: Lecturer = {
        id: '123',
        name: 'Dr. John Smith',
        email: 'john@university.edu',
        department: 'Computer Science',
        subjects: ['Programming'],
        availability: {
          [DayOfWeek.MONDAY]: [],
          [DayOfWeek.TUESDAY]: [],
          [DayOfWeek.WEDNESDAY]: [],
          [DayOfWeek.THURSDAY]: [],
          [DayOfWeek.FRIDAY]: [],
          [DayOfWeek.SATURDAY]: [],
          [DayOfWeek.SUNDAY]: []
        },
        preferences,
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { id: '123' };
      mockRequest.body = { preferences };
      mockLecturerRepository.updatePreferences.mockResolvedValue(true);
      mockLecturerRepository.findById.mockResolvedValue(updatedLecturer);

      await lecturerController.updatePreferences(mockRequest as Request, mockResponse as Response);

      expect(mockLecturerRepository.updatePreferences).toHaveBeenCalledWith('123', preferences);
      expect(mockLecturerRepository.findById).toHaveBeenCalledWith('123');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: updatedLecturer,
        message: 'Lecturer preferences updated successfully',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 for missing preferences data', async () => {
      mockRequest.params = { id: '123' };
      mockRequest.body = {};

      await lecturerController.updatePreferences(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Preferences data is required',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('findByDepartment', () => {
    it('should find lecturers by department', async () => {
      const lecturers: Lecturer[] = [];

      mockRequest.query = { department: 'Computer Science' };
      mockLecturerRepository.findByDepartment.mockResolvedValue(lecturers);

      await lecturerController.findByDepartment(mockRequest as Request, mockResponse as Response);

      expect(mockLecturerRepository.findByDepartment).toHaveBeenCalledWith('Computer Science');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: lecturers,
        message: 'Found 0 lecturers in Computer Science department',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 when department parameter is missing', async () => {
      mockRequest.query = {};

      await lecturerController.findByDepartment(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Department parameter is required',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('findBySubject', () => {
    it('should find lecturers by subject', async () => {
      const lecturers: Lecturer[] = [];

      mockRequest.query = { subject: 'Programming' };
      mockLecturerRepository.findBySubjects.mockResolvedValue(lecturers);

      await lecturerController.findBySubject(mockRequest as Request, mockResponse as Response);

      expect(mockLecturerRepository.findBySubjects).toHaveBeenCalledWith(['Programming']);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: lecturers,
        message: 'Found 0 lecturers teaching Programming',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 when subject parameter is missing', async () => {
      mockRequest.query = {};

      await lecturerController.findBySubject(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Subject parameter is required',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('findAvailableAt', () => {
    it('should find available lecturers at specific time', async () => {
      const lecturers: Lecturer[] = [];

      mockRequest.query = {
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '12:00'
      };
      mockLecturerRepository.findAvailableAt.mockResolvedValue(lecturers);

      await lecturerController.findAvailableAt(mockRequest as Request, mockResponse as Response);

      expect(mockLecturerRepository.findAvailableAt).toHaveBeenCalledWith({
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '12:00'
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: lecturers,
        message: 'Found 0 available lecturers',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 for missing parameters', async () => {
      mockRequest.query = { dayOfWeek: 'MONDAY' }; // Missing startTime and endTime

      await lecturerController.findAvailableAt(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'dayOfWeek, startTime, and endTime are required',
        timestamp: expect.any(Date)
      });
    });
  });
});