import { Request, Response } from 'express';
import { StudentGroupController } from '../controllers/studentGroupController';
import { studentGroupRepository } from '../repositories/studentGroupRepository';
import { StudentGroup } from '../models/studentGroup';

// Mock the student group repository
jest.mock('../repositories/studentGroupRepository');
const mockStudentGroupRepository = studentGroupRepository as jest.Mocked<typeof studentGroupRepository>;

describe('StudentGroupController Unit Tests', () => {
  let studentGroupController: StudentGroupController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    studentGroupController = new StudentGroupController();
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
    it('should create a student group successfully', async () => {
      const studentGroupData = {
        name: 'CS Year 1 Group A',
        size: 30,
        courses: ['123e4567-e89b-12d3-a456-426614174001'],
        yearLevel: 1,
        department: 'Computer Science',
        program: 'Bachelor of Computer Science',
        semester: 1,
        academicYear: '2024-2025'
      };

      const createdStudentGroup: StudentGroup = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...studentGroupData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.body = studentGroupData;
      mockStudentGroupRepository.create.mockResolvedValue(createdStudentGroup);

      await studentGroupController.create(mockRequest as Request, mockResponse as Response);

      expect(mockStudentGroupRepository.create).toHaveBeenCalledWith(studentGroupData);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: createdStudentGroup,
        message: 'Student group created successfully',
        timestamp: expect.any(Date)
      });
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        name: '', // Invalid empty name
        size: -1, // Invalid negative size
        yearLevel: 0 // Invalid year level
      };

      mockRequest.body = invalidData;

      await studentGroupController.create(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.any(Array),
        timestamp: expect.any(Date)
      });
    });
  });

  describe('findAll', () => {
    it('should return all student groups', async () => {
      const studentGroups: StudentGroup[] = [
        {
          id: '1',
          name: 'Group A',
          size: 25,
          courses: [],
          yearLevel: 1,
          department: 'Computer Science',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRequest.query = {};
      mockStudentGroupRepository.findAll.mockResolvedValue(studentGroups);

      await studentGroupController.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockStudentGroupRepository.findAll).toHaveBeenCalledWith({});
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: studentGroups,
        message: 'Found 1 student groups',
        timestamp: expect.any(Date)
      });
    });

    it('should filter student groups by department', async () => {
      mockRequest.query = { department: 'Computer Science' };
      mockStudentGroupRepository.findAll.mockResolvedValue([]);

      await studentGroupController.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockStudentGroupRepository.findAll).toHaveBeenCalledWith({
        department: 'Computer Science'
      });
    });

    it('should filter student groups by year level', async () => {
      mockRequest.query = { yearLevel: '2' };
      mockStudentGroupRepository.findAll.mockResolvedValue([]);

      await studentGroupController.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockStudentGroupRepository.findAll).toHaveBeenCalledWith({
        yearLevel: 2
      });
    });
  });

  describe('findById', () => {
    it('should return student group by ID', async () => {
      const studentGroup: StudentGroup = {
        id: '123',
        name: 'Test Group',
        size: 20,
        courses: [],
        yearLevel: 1,
        department: 'Test Department',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { id: '123' };
      mockStudentGroupRepository.findById.mockResolvedValue(studentGroup);

      await studentGroupController.findById(mockRequest as Request, mockResponse as Response);

      expect(mockStudentGroupRepository.findById).toHaveBeenCalledWith('123');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: studentGroup,
        timestamp: expect.any(Date)
      });
    });

    it('should return 404 for non-existent student group', async () => {
      mockRequest.params = { id: '123' };
      mockStudentGroupRepository.findById.mockResolvedValue(null);

      await studentGroupController.findById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Student group not found',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('delete', () => {
    it('should delete student group successfully', async () => {
      mockRequest.params = { id: '123' };
      mockStudentGroupRepository.delete.mockResolvedValue(true);

      await studentGroupController.delete(mockRequest as Request, mockResponse as Response);

      expect(mockStudentGroupRepository.delete).toHaveBeenCalledWith('123');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Student group deleted successfully',
        timestamp: expect.any(Date)
      });
    });

    it('should return 404 for non-existent student group deletion', async () => {
      mockRequest.params = { id: '123' };
      mockStudentGroupRepository.delete.mockResolvedValue(false);

      await studentGroupController.delete(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Student group not found',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('findByDepartment', () => {
    it('should find student groups by department', async () => {
      const studentGroups: StudentGroup[] = [];

      mockRequest.query = { department: 'Computer Science' };
      mockStudentGroupRepository.findByDepartment.mockResolvedValue(studentGroups);

      await studentGroupController.findByDepartment(mockRequest as Request, mockResponse as Response);

      expect(mockStudentGroupRepository.findByDepartment).toHaveBeenCalledWith('Computer Science');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: studentGroups,
        message: 'Found 0 student groups in Computer Science department',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 when department parameter is missing', async () => {
      mockRequest.query = {};

      await studentGroupController.findByDepartment(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Department parameter is required',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('addCourse', () => {
    it('should add course to student group successfully', async () => {
      mockRequest.params = { id: '123' };
      mockRequest.body = { courseId: '456' };
      mockStudentGroupRepository.addCourse.mockResolvedValue(true);

      await studentGroupController.addCourse(mockRequest as Request, mockResponse as Response);

      expect(mockStudentGroupRepository.addCourse).toHaveBeenCalledWith('123', '456');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Course added to student group successfully',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 for missing parameters', async () => {
      mockRequest.params = { id: '123' };
      mockRequest.body = {};

      await studentGroupController.addCourse(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Student group ID and course ID are required',
        timestamp: expect.any(Date)
      });
    });
  });
});