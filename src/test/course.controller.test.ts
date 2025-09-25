import { Request, Response } from 'express';
import { CourseController } from '../controllers/courseController';
import { courseRepository } from '../repositories/courseRepository';
import { Equipment, Frequency } from '../models/common';
import { Course } from '../models/course';

// Mock the course repository
jest.mock('../repositories/courseRepository');
const mockCourseRepository = courseRepository as jest.Mocked<typeof courseRepository>;

describe('CourseController Unit Tests', () => {
  let courseController: CourseController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    courseController = new CourseController();
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
    it('should create a course successfully', async () => {
      const courseData = {
        name: 'Introduction to Programming',
        code: 'CS101',
        duration: 90,
        frequency: Frequency.WEEKLY,
        requiredEquipment: [Equipment.COMPUTER, Equipment.PROJECTOR],
        studentGroups: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002'],
        lecturerId: '123e4567-e89b-12d3-a456-426614174003',
        constraints: [],
        department: 'Computer Science',
        credits: 3,
        description: 'Basic programming concepts'
      };

      const createdCourse: Course = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...courseData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.body = courseData;
      mockCourseRepository.create.mockResolvedValue(createdCourse);

      await courseController.create(mockRequest as Request, mockResponse as Response);

      expect(mockCourseRepository.create).toHaveBeenCalledWith(courseData);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: createdCourse,
        message: 'Course created successfully',
        timestamp: expect.any(Date)
      });
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        name: '', // Invalid empty name
        code: '', // Invalid empty code
        duration: -1 // Invalid negative duration
      };

      mockRequest.body = invalidData;

      await courseController.create(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.any(Array),
        timestamp: expect.any(Date)
      });
    });

    it('should handle database errors', async () => {
      const courseData = {
        name: 'Test Course',
        code: 'TEST101',
        duration: 60,
        frequency: Frequency.WEEKLY,
        requiredEquipment: [],
        studentGroups: [],
        lecturerId: '123e4567-e89b-12d3-a456-426614174003',
        constraints: [],
        department: 'Test Department',
        credits: 3
      };

      mockRequest.body = courseData;
      mockCourseRepository.create.mockRejectedValue(new Error('Database error'));

      await courseController.create(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create course',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('findAll', () => {
    it('should return all courses', async () => {
      const courses: Course[] = [
        {
          id: '1',
          name: 'Course A',
          code: 'A101',
          duration: 60,
          frequency: Frequency.WEEKLY,
          requiredEquipment: [Equipment.PROJECTOR],
          studentGroups: [],
          lecturerId: '123e4567-e89b-12d3-a456-426614174003',
          constraints: [],
          department: 'Department A',
          credits: 3,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRequest.query = {};
      mockCourseRepository.findAll.mockResolvedValue(courses);

      await courseController.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockCourseRepository.findAll).toHaveBeenCalledWith({});
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: courses,
        message: 'Found 1 courses',
        timestamp: expect.any(Date)
      });
    });

    it('should filter courses by department', async () => {
      const filteredCourses: Course[] = [];

      mockRequest.query = { department: 'Computer Science' };
      mockCourseRepository.findAll.mockResolvedValue(filteredCourses);

      await courseController.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockCourseRepository.findAll).toHaveBeenCalledWith({
        department: 'Computer Science'
      });
    });

    it('should filter courses by lecturer', async () => {
      mockRequest.query = { lecturerId: 'lecturer123' };
      mockCourseRepository.findAll.mockResolvedValue([]);

      await courseController.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockCourseRepository.findAll).toHaveBeenCalledWith({
        lecturerId: 'lecturer123'
      });
    });

    it('should filter courses by credits', async () => {
      mockRequest.query = { credits: '3' };
      mockCourseRepository.findAll.mockResolvedValue([]);

      await courseController.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockCourseRepository.findAll).toHaveBeenCalledWith({
        credits: 3
      });
    });
  });

  describe('findById', () => {
    it('should return course by ID', async () => {
      const course: Course = {
        id: '123',
        name: 'Test Course',
        code: 'TEST101',
        duration: 60,
        frequency: Frequency.WEEKLY,
        requiredEquipment: [],
        studentGroups: [],
        lecturerId: '123e4567-e89b-12d3-a456-426614174003',
        constraints: [],
        department: 'Test Department',
        credits: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { id: '123' };
      mockCourseRepository.findById.mockResolvedValue(course);

      await courseController.findById(mockRequest as Request, mockResponse as Response);

      expect(mockCourseRepository.findById).toHaveBeenCalledWith('123');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: course,
        timestamp: expect.any(Date)
      });
    });

    it('should return 404 for non-existent course', async () => {
      mockRequest.params = { id: '123' };
      mockCourseRepository.findById.mockResolvedValue(null);

      await courseController.findById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Course not found',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 for missing ID', async () => {
      mockRequest.params = {};

      await courseController.findById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Course ID is required',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('update', () => {
    it('should update course successfully', async () => {
      const updateData = {
        name: 'Updated Course',
        credits: 4
      };

      const updatedCourse: Course = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Updated Course',
        code: 'TEST101',
        duration: 60,
        frequency: Frequency.WEEKLY,
        requiredEquipment: [],
        studentGroups: [],
        lecturerId: '123e4567-e89b-12d3-a456-426614174003',
        constraints: [],
        department: 'Test Department',
        credits: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const validId = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.params = { id: validId };
      mockRequest.body = updateData;
      mockCourseRepository.update.mockResolvedValue(updatedCourse);

      await courseController.update(mockRequest as Request, mockResponse as Response);

      expect(mockCourseRepository.update).toHaveBeenCalledWith(validId, {
        ...updateData,
        id: validId
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: updatedCourse,
        message: 'Course updated successfully',
        timestamp: expect.any(Date)
      });
    });

    it('should return 404 for non-existent course update', async () => {
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.params = { id: validId };
      mockRequest.body = { name: 'Updated Name' };
      mockCourseRepository.update.mockResolvedValue(null);

      await courseController.update(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Course not found',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('delete', () => {
    it('should delete course successfully', async () => {
      mockRequest.params = { id: '123' };
      mockCourseRepository.delete.mockResolvedValue(true);

      await courseController.delete(mockRequest as Request, mockResponse as Response);

      expect(mockCourseRepository.delete).toHaveBeenCalledWith('123');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Course deleted successfully',
        timestamp: expect.any(Date)
      });
    });

    it('should return 404 for non-existent course deletion', async () => {
      mockRequest.params = { id: '123' };
      mockCourseRepository.delete.mockResolvedValue(false);

      await courseController.delete(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Course not found',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('findByDepartment', () => {
    it('should find courses by department', async () => {
      const courses: Course[] = [];

      mockRequest.query = { department: 'Computer Science' };
      mockCourseRepository.findByDepartment.mockResolvedValue(courses);

      await courseController.findByDepartment(mockRequest as Request, mockResponse as Response);

      expect(mockCourseRepository.findByDepartment).toHaveBeenCalledWith('Computer Science');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: courses,
        message: 'Found 0 courses in Computer Science department',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 when department parameter is missing', async () => {
      mockRequest.query = {};

      await courseController.findByDepartment(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Department parameter is required',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('findByLecturer', () => {
    it('should find courses by lecturer', async () => {
      const courses: Course[] = [];

      mockRequest.query = { lecturerId: 'lecturer123' };
      mockCourseRepository.findByLecturer.mockResolvedValue(courses);

      await courseController.findByLecturer(mockRequest as Request, mockResponse as Response);

      expect(mockCourseRepository.findByLecturer).toHaveBeenCalledWith('lecturer123');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: courses,
        message: 'Found 0 courses for lecturer',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 when lecturer ID parameter is missing', async () => {
      mockRequest.query = {};

      await courseController.findByLecturer(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Lecturer ID parameter is required',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('findByEquipment', () => {
    it('should find courses by equipment', async () => {
      const courses: Course[] = [];

      mockRequest.query = { equipment: 'PROJECTOR,COMPUTER' };
      mockCourseRepository.findByEquipment.mockResolvedValue(courses);

      await courseController.findByEquipment(mockRequest as Request, mockResponse as Response);

      expect(mockCourseRepository.findByEquipment).toHaveBeenCalledWith(['PROJECTOR', 'COMPUTER']);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: courses,
        message: 'Found 0 courses requiring specified equipment',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 when equipment parameter is missing', async () => {
      mockRequest.query = {};

      await courseController.findByEquipment(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Equipment parameter is required',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('addStudentGroup', () => {
    it('should add student group to course successfully', async () => {
      mockRequest.params = { id: '123' };
      mockRequest.body = { studentGroupId: 'group456' };
      mockCourseRepository.addStudentGroup.mockResolvedValue(true);

      await courseController.addStudentGroup(mockRequest as Request, mockResponse as Response);

      expect(mockCourseRepository.addStudentGroup).toHaveBeenCalledWith('123', 'group456');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Student group added to course successfully',
        timestamp: expect.any(Date)
      });
    });

    it('should return 400 for missing parameters', async () => {
      mockRequest.params = { id: '123' };
      mockRequest.body = {};

      await courseController.addStudentGroup(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Course ID and student group ID are required',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('removeStudentGroup', () => {
    it('should remove student group from course successfully', async () => {
      mockRequest.params = { id: '123' };
      mockRequest.body = { studentGroupId: 'group456' };
      mockCourseRepository.removeStudentGroup.mockResolvedValue(true);

      await courseController.removeStudentGroup(mockRequest as Request, mockResponse as Response);

      expect(mockCourseRepository.removeStudentGroup).toHaveBeenCalledWith('123', 'group456');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Student group removed from course successfully',
        timestamp: expect.any(Date)
      });
    });

    it('should return 404 when relationship not found', async () => {
      mockRequest.params = { id: '123' };
      mockRequest.body = { studentGroupId: 'group456' };
      mockCourseRepository.removeStudentGroup.mockResolvedValue(false);

      await courseController.removeStudentGroup(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Course or student group relationship not found',
        timestamp: expect.any(Date)
      });
    });
  });
});