import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { entityImportService } from '../../services/import/entityImportService';
import { venueRepository } from '../../repositories/venueRepository';
import { lecturerRepository } from '../../repositories/lecturerRepository';
import { courseRepository } from '../../repositories/courseRepository';
import { studentGroupRepository } from '../../repositories/studentGroupRepository';
import { 
  MappedImportData, 
  EntityMatchResults, 
  MatchResult 
} from '../../types/import';
import { Venue } from '../../models/venue';
import { Lecturer } from '../../models/lecturer';
import { Course } from '../../models/course';
import { StudentGroup } from '../../models/studentGroup';
import { Frequency } from '../../models/common';

// Mock repositories
jest.mock('../../repositories/venueRepository');
jest.mock('../../repositories/lecturerRepository');
jest.mock('../../repositories/courseRepository');
jest.mock('../../repositories/studentGroupRepository');

const mockVenueRepository = venueRepository as jest.Mocked<typeof venueRepository>;
const mockLecturerRepository = lecturerRepository as jest.Mocked<typeof lecturerRepository>;
const mockCourseRepository = courseRepository as jest.Mocked<typeof courseRepository>;
const mockStudentGroupRepository = studentGroupRepository as jest.Mocked<typeof studentGroupRepository>;

describe('EntityImportService', () => {
  let mockMappedData: MappedImportData;
  let mockMatchResults: EntityMatchResults;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock data
    mockMappedData = {
      venues: [
        {
          name: 'Test Venue 1',
          capacity: 50,
          equipment: [],
          location: 'Building A',
          accessibility: []
        }
      ],
      lecturers: [
        {
          name: 'Test Lecturer 1',
          email: 'lecturer1@test.com',
          department: 'Computer Science',
          subjects: ['Programming']
        }
      ],
      courses: [
        {
          name: 'Test Course 1',
          code: 'CS101',
          duration: 60,
          frequency: Frequency.WEEKLY,
          department: 'Computer Science'
        }
      ],
      studentGroups: [
        {
          name: 'Test Group 1',
          size: 25,
          yearLevel: 1,
          department: 'Computer Science'
        }
      ],
      schedules: [],
      metadata: {
        sourceFile: 'test-file.csv',
        mappingConfig: 'test-mapping',
        importedAt: new Date(),
        importedBy: 'test-user'
      }
    };

    mockMatchResults = {
      venues: new Map(),
      lecturers: new Map(),
      courses: new Map(),
      studentGroups: new Map()
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('importEntities', () => {
    it('should successfully import all entity types', async () => {
      // Mock successful repository operations
      const mockVenue: Venue = {
        id: 'venue-1',
        name: 'Test Venue 1',
        capacity: 50,
        equipment: [],
        availability: [],
        location: 'Building A',
        accessibility: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockLecturer: Lecturer = {
        id: 'lecturer-1',
        name: 'Test Lecturer 1',
        email: 'lecturer1@test.com',
        department: 'Computer Science',
        subjects: ['Programming'],
        availability: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: []
        },
        preferences: {
          preferredTimeSlots: [],
          maxHoursPerDay: 8,
          maxHoursPerWeek: 40,
          minimumBreakBetweenClasses: 15,
          preferredDays: [],
          avoidBackToBackClasses: false,
          preferredVenues: []
        },
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockCourse: Course = {
        id: 'course-1',
        name: 'Test Course 1',
        code: 'CS101',
        duration: 60,
        frequency: Frequency.WEEKLY,
        requiredEquipment: [],
        studentGroups: [],
        lecturerId: 'lecturer-1',
        constraints: [],
        department: 'Computer Science',
        credits: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockStudentGroup: StudentGroup = {
        id: 'group-1',
        name: 'Test Group 1',
        size: 25,
        courses: [],
        yearLevel: 1,
        department: 'Computer Science',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockVenueRepository.create.mockResolvedValue(mockVenue);
      mockLecturerRepository.create.mockResolvedValue(mockLecturer);
      mockCourseRepository.create.mockResolvedValue(mockCourse);
      mockStudentGroupRepository.create.mockResolvedValue(mockStudentGroup);

      const result = await entityImportService.importEntities(mockMappedData, mockMatchResults);

      expect(result.venues.created).toBe(1);
      expect(result.venues.failed).toBe(0);
      expect(result.lecturers.created).toBe(1);
      expect(result.lecturers.failed).toBe(0);
      expect(result.courses.created).toBe(1);
      expect(result.courses.failed).toBe(0);
      expect(result.studentGroups.created).toBe(1);
      expect(result.studentGroups.failed).toBe(0);

      expect(mockVenueRepository.create).toHaveBeenCalledTimes(1);
      expect(mockLecturerRepository.create).toHaveBeenCalledTimes(1);
      expect(mockCourseRepository.create).toHaveBeenCalledTimes(1);
      expect(mockStudentGroupRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should update existing entities when matches are found', async () => {
      // Setup match results for existing entities
      const venueMatch: MatchResult = {
        entityId: 'existing-venue-1',
        confidence: 1.0,
        matchType: 'exact',
        suggestedMatches: []
      };

      mockMatchResults.venues.set(0, venueMatch);

      const mockUpdatedVenue: Venue = {
        id: 'existing-venue-1',
        name: 'Test Venue 1',
        capacity: 50,
        equipment: [],
        availability: [],
        location: 'Building A',
        accessibility: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockVenueRepository.update.mockResolvedValue(mockUpdatedVenue);
      mockLecturerRepository.create.mockResolvedValue({} as Lecturer);
      mockCourseRepository.create.mockResolvedValue({} as Course);
      mockStudentGroupRepository.create.mockResolvedValue({} as StudentGroup);

      const result = await entityImportService.importEntities(mockMappedData, mockMatchResults);

      expect(result.venues.updated).toBe(1);
      expect(result.venues.created).toBe(0);
      expect(mockVenueRepository.update).toHaveBeenCalledWith(
        'existing-venue-1',
        expect.objectContaining({
          id: 'existing-venue-1',
          name: 'Test Venue 1'
        })
      );
    });

    it('should handle repository errors gracefully', async () => {
      mockVenueRepository.create.mockRejectedValue(new Error('Database connection failed'));
      mockLecturerRepository.create.mockResolvedValue({} as Lecturer);
      mockCourseRepository.create.mockResolvedValue({} as Course);
      mockStudentGroupRepository.create.mockResolvedValue({} as StudentGroup);

      const result = await entityImportService.importEntities(mockMappedData, mockMatchResults);

      expect(result.venues.failed).toBe(1);
      expect(result.venues.created).toBe(0);
      expect(result.venues.errors).toHaveLength(1);
      expect(result.venues.errors[0]?.error).toBe('Database connection failed');
      expect(result.venues.errors[0]?.entityType).toBe('venue');
      expect(result.venues.errors[0]?.operation).toBe('create');
    });

    it('should handle empty data sets', async () => {
      const emptyMappedData: MappedImportData = {
        venues: [],
        lecturers: [],
        courses: [],
        studentGroups: [],
        schedules: [],
        metadata: mockMappedData.metadata
      };

      const emptyMatchResults: EntityMatchResults = {
        venues: new Map(),
        lecturers: new Map(),
        courses: new Map(),
        studentGroups: new Map()
      };

      const result = await entityImportService.importEntities(emptyMappedData, emptyMatchResults);

      expect(result.venues.created).toBe(0);
      expect(result.lecturers.created).toBe(0);
      expect(result.courses.created).toBe(0);
      expect(result.studentGroups.created).toBe(0);

      expect(mockVenueRepository.create).not.toHaveBeenCalled();
      expect(mockLecturerRepository.create).not.toHaveBeenCalled();
      expect(mockCourseRepository.create).not.toHaveBeenCalled();
      expect(mockStudentGroupRepository.create).not.toHaveBeenCalled();
    });

    it('should handle partial failures', async () => {
      mockVenueRepository.create.mockResolvedValue({} as Venue);
      mockLecturerRepository.create.mockRejectedValue(new Error('Lecturer creation failed'));
      mockCourseRepository.create.mockResolvedValue({} as Course);
      mockStudentGroupRepository.create.mockRejectedValue(new Error('Student group creation failed'));

      const result = await entityImportService.importEntities(mockMappedData, mockMatchResults);

      expect(result.venues.created).toBe(1);
      expect(result.venues.failed).toBe(0);
      expect(result.lecturers.created).toBe(0);
      expect(result.lecturers.failed).toBe(1);
      expect(result.courses.created).toBe(1);
      expect(result.courses.failed).toBe(0);
      expect(result.studentGroups.created).toBe(0);
      expect(result.studentGroups.failed).toBe(1);
    });

    it('should handle update failures for existing entities', async () => {
      const venueMatch: MatchResult = {
        entityId: 'existing-venue-1',
        confidence: 1.0,
        matchType: 'exact',
        suggestedMatches: []
      };

      mockMatchResults.venues.set(0, venueMatch);

      mockVenueRepository.update.mockResolvedValue(null); // Simulate entity not found
      mockLecturerRepository.create.mockResolvedValue({} as Lecturer);
      mockCourseRepository.create.mockResolvedValue({} as Course);
      mockStudentGroupRepository.create.mockResolvedValue({} as StudentGroup);

      const result = await entityImportService.importEntities(mockMappedData, mockMatchResults);

      expect(result.venues.updated).toBe(0);
      expect(result.venues.failed).toBe(1);
      expect(result.venues.errors[0]?.error).toBe('Failed to update venue - entity not found');
    });
  });

  describe('entity mapping', () => {
    it('should correctly map venue data for creation', async () => {
      const venueData = {
        name: 'Test Venue',
        capacity: 100,
        equipment: ['projector'],
        location: 'Building B',
        accessibility: ['wheelchair_accessible'],
        building: 'Main Building',
        floor: 2,
        roomNumber: '201',
        description: 'Large lecture hall'
      };

      mockMappedData.venues = [venueData];
      mockVenueRepository.create.mockResolvedValue({} as Venue);
      mockLecturerRepository.create.mockResolvedValue({} as Lecturer);
      mockCourseRepository.create.mockResolvedValue({} as Course);
      mockStudentGroupRepository.create.mockResolvedValue({} as StudentGroup);

      await entityImportService.importEntities(mockMappedData, mockMatchResults);

      expect(mockVenueRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Venue',
          capacity: 100,
          equipment: ['projector'],
          location: 'Building B',
          accessibility: ['wheelchair_accessible'],
          building: 'Main Building',
          floor: 2,
          roomNumber: '201',
          description: 'Large lecture hall'
        })
      );
    });

    it('should provide default values for missing required fields', async () => {
      const incompleteVenueData = {
        name: 'Incomplete Venue'
        // Missing capacity, equipment, location, accessibility
      };

      mockMappedData.venues = [incompleteVenueData];
      mockVenueRepository.create.mockResolvedValue({} as Venue);
      mockLecturerRepository.create.mockResolvedValue({} as Lecturer);
      mockCourseRepository.create.mockResolvedValue({} as Course);
      mockStudentGroupRepository.create.mockResolvedValue({} as StudentGroup);

      await entityImportService.importEntities(mockMappedData, mockMatchResults);

      expect(mockVenueRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Incomplete Venue',
          capacity: 0,
          equipment: [],
          location: '',
          accessibility: [],
          availability: []
        })
      );
    });
  });
});