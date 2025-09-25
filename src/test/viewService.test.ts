import { ViewService } from '../services/viewService';
import { UserRole, ViewFilter, PersonalizedTimetableRequest } from '../types/view';
import { Schedule, ScheduleStatus } from '../models/schedule';
import { DayOfWeek } from '../models/common';
import { ScheduleRepository } from '../repositories/scheduleRepository';
import { VenueRepository } from '../repositories/venueRepository';
import { LecturerRepository } from '../repositories/lecturerRepository';
import { CourseRepository } from '../repositories/courseRepository';
import { StudentGroupRepository } from '../repositories/studentGroupRepository';
import { ClashDetector } from '../services/clashDetector';

// Mock repositories and services
jest.mock('../repositories/scheduleRepository');
jest.mock('../repositories/venueRepository');
jest.mock('../repositories/lecturerRepository');
jest.mock('../repositories/courseRepository');
jest.mock('../repositories/studentGroupRepository');
jest.mock('../services/clashDetector');

describe('ViewService', () => {
  let viewService: ViewService;
  let mockScheduleRepository: jest.Mocked<ScheduleRepository>;
  let mockVenueRepository: jest.Mocked<VenueRepository>;
  let mockLecturerRepository: jest.Mocked<LecturerRepository>;
  let mockCourseRepository: jest.Mocked<CourseRepository>;
  let mockStudentGroupRepository: jest.Mocked<StudentGroupRepository>;
  let mockClashDetector: jest.Mocked<ClashDetector>;

  const mockSchedule: Schedule = {
    id: 'schedule-1',
    name: 'Test Schedule',
    academicPeriod: 'Fall 2024',
    startDate: new Date('2024-01-15T00:00:00Z'),
    endDate: new Date('2024-05-15T00:00:00Z'),
    version: 1,
    timeSlots: [
      {
        id: 'session-1',
        courseId: 'course-1',
        lecturerId: 'lecturer-1',
        venueId: 'venue-1',
        studentGroups: ['group-1'],
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T10:30:00Z'),
        dayOfWeek: DayOfWeek.MONDAY
      },
      {
        id: 'session-2',
        courseId: 'course-2',
        lecturerId: 'lecturer-2',
        venueId: 'venue-2',
        studentGroups: ['group-2'],
        startTime: new Date('2024-01-16T14:00:00Z'),
        endTime: new Date('2024-01-16T15:30:00Z'),
        dayOfWeek: DayOfWeek.TUESDAY
      },
      {
        id: 'session-3',
        courseId: 'course-3',
        lecturerId: 'lecturer-1', // Same lecturer as session-1
        venueId: 'venue-3',
        studentGroups: ['group-1'],
        startTime: new Date('2024-01-17T11:00:00Z'),
        endTime: new Date('2024-01-17T12:30:00Z'),
        dayOfWeek: DayOfWeek.WEDNESDAY
      }
    ],
    status: ScheduleStatus.PUBLISHED,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  };

  beforeEach(() => {
    mockScheduleRepository = {} as jest.Mocked<ScheduleRepository>;
    mockVenueRepository = {} as jest.Mocked<VenueRepository>;
    mockLecturerRepository = {} as jest.Mocked<LecturerRepository>;
    mockCourseRepository = {} as jest.Mocked<CourseRepository>;
    mockStudentGroupRepository = {} as jest.Mocked<StudentGroupRepository>;
    mockClashDetector = {} as jest.Mocked<ClashDetector>;

    viewService = new ViewService(
      mockScheduleRepository,
      mockVenueRepository,
      mockLecturerRepository,
      mockCourseRepository,
      mockStudentGroupRepository,
      mockClashDetector
    );

    // Setup mock implementations
    mockScheduleRepository.findById = jest.fn().mockResolvedValue(mockSchedule);
    
    mockCourseRepository.findById = jest.fn().mockImplementation(async (id) => ({
      id,
      name: `Course ${id}`,
      code: `CS${id.slice(-1)}`,
      duration: 90,
      frequency: 'weekly',
      requiredEquipment: [],
      studentGroups: [],
      lecturerId: 'lecturer-1',
      constraints: [],
      department: 'Computer Science',
      credits: 3,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    mockLecturerRepository.findById = jest.fn().mockImplementation(async (id) => ({
      id,
      name: `Lecturer ${id.slice(-1)}`,
      email: `lecturer${id.slice(-1)}@university.edu`,
      department: 'Computer Science',
      subjects: ['Programming'],
      availability: {},
      preferences: {},
      maxHoursPerDay: 8,
      maxHoursPerWeek: 40,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    mockVenueRepository.findById = jest.fn().mockImplementation(async (id) => ({
      id,
      name: `Room ${id.slice(-1)}`,
      capacity: 50,
      equipment: [],
      availability: [],
      location: 'Building A',
      accessibility: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    mockStudentGroupRepository.findById = jest.fn().mockImplementation(async (id) => ({
      id,
      name: `Group ${id.slice(-1)}`,
      size: 25,
      courses: [],
      yearLevel: 1,
      department: 'Computer Science',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    mockClashDetector.detectSessionClashes = jest.fn().mockResolvedValue([]);
  });

  describe('generatePersonalizedTimetable', () => {
    it('should generate lecturer view with only their sessions', async () => {
      const request: PersonalizedTimetableRequest = {
        userRole: UserRole.LECTURER,
        userId: 'lecturer-1'
      };

      const result = await viewService.generatePersonalizedTimetable('schedule-1', request);

      expect(result).toBeDefined();
      expect(result.metadata.userRole).toBe(UserRole.LECTURER);
      expect(result.metadata.userId).toBe('lecturer-1');
      expect(result.sessions).toHaveLength(2); // lecturer-1 has 2 sessions
      expect(result.sessions.every(s => s.lecturerName === 'Lecturer 1')).toBe(true);
    });

    it('should generate student view with only their group sessions', async () => {
      const request: PersonalizedTimetableRequest = {
        userRole: UserRole.STUDENT,
        userId: 'group-1' // Using group ID as student ID for simplicity
      };

      const result = await viewService.generatePersonalizedTimetable('schedule-1', request);

      expect(result).toBeDefined();
      expect(result.metadata.userRole).toBe(UserRole.STUDENT);
      expect(result.metadata.userId).toBe('group-1');
      expect(result.sessions).toHaveLength(2); // group-1 has 2 sessions
      expect(result.sessions.every(s => s.studentGroups.includes('Group 1'))).toBe(true);
    });

    it('should generate admin view with all sessions', async () => {
      const request: PersonalizedTimetableRequest = {
        userRole: UserRole.ADMIN,
        userId: 'admin-1'
      };

      const result = await viewService.generatePersonalizedTimetable('schedule-1', request);

      expect(result).toBeDefined();
      expect(result.metadata.userRole).toBe(UserRole.ADMIN);
      expect(result.sessions).toHaveLength(3); // All sessions
    });

    it('should apply date range filter', async () => {
      const request: PersonalizedTimetableRequest = {
        userRole: UserRole.ADMIN,
        userId: 'admin-1',
        filters: {
          dateRange: {
            startDate: new Date('2024-01-15T00:00:00Z'),
            endDate: new Date('2024-01-15T23:59:59Z')
          }
        }
      };

      const result = await viewService.generatePersonalizedTimetable('schedule-1', request);

      expect(result.sessions).toHaveLength(1); // Only Monday session
      expect(result.sessions[0]?.dayOfWeek).toBe('Monday');
    });

    it('should apply entity filter', async () => {
      const request: PersonalizedTimetableRequest = {
        userRole: UserRole.ADMIN,
        userId: 'admin-1',
        filters: {
          entityIds: ['venue-1']
        }
      };

      const result = await viewService.generatePersonalizedTimetable('schedule-1', request);

      expect(result.sessions).toHaveLength(1); // Only sessions in venue-1
      expect(result.sessions[0]?.venueName).toBe('Room 1');
    });

    it('should apply day of week filter', async () => {
      const request: PersonalizedTimetableRequest = {
        userRole: UserRole.ADMIN,
        userId: 'admin-1',
        filters: {
          dayOfWeek: ['Monday', 'Wednesday']
        }
      };

      const result = await viewService.generatePersonalizedTimetable('schedule-1', request);

      expect(result.sessions).toHaveLength(2); // Monday and Wednesday sessions
      expect(result.sessions.map(s => s.dayOfWeek)).toEqual(expect.arrayContaining(['Monday', 'Wednesday']));
    });

    it('should apply time range filter', async () => {
      const request: PersonalizedTimetableRequest = {
        userRole: UserRole.ADMIN,
        userId: 'admin-1',
        filters: {
          timeRange: {
            startTime: '08:00',
            endTime: '12:00'
          }
        }
      };

      const result = await viewService.generatePersonalizedTimetable('schedule-1', request);

      expect(result.sessions).toHaveLength(2); // Morning sessions only
      expect(result.sessions.every(s => {
        const startHour = s.startTime.getUTCHours();
        return startHour >= 8 && startHour < 12;
      })).toBe(true);
    });

    it('should include conflict information when requested', async () => {
      mockClashDetector.detectSessionClashes = jest.fn().mockResolvedValue([
        { type: 'venue_conflict', sessions: ['session-1'] }
      ]);

      const request: PersonalizedTimetableRequest = {
        userRole: UserRole.ADMIN,
        userId: 'admin-1',
        displayOptions: {
          showConflicts: true
        }
      };

      const result = await viewService.generatePersonalizedTimetable('schedule-1', request);

      expect(result.sessions[0]?.hasConflict).toBe(true);
      expect(result.sessions[0]?.conflictType).toBe('venue_conflict');
    });

    it('should throw error for non-existent schedule', async () => {
      mockScheduleRepository.findById = jest.fn().mockResolvedValue(null);

      const request: PersonalizedTimetableRequest = {
        userRole: UserRole.ADMIN,
        userId: 'admin-1'
      };

      await expect(viewService.generatePersonalizedTimetable('non-existent', request))
        .rejects.toThrow('Schedule with ID non-existent not found');
    });
  });

  describe('generateLecturerView', () => {
    it('should generate lecturer-specific view with appropriate settings', async () => {
      const result = await viewService.generateLecturerView('schedule-1', 'lecturer-1');

      expect(result.metadata.userRole).toBe(UserRole.LECTURER);
      expect(result.displayOptions.showDetails).toBe(true);
      expect(result.displayOptions.showConflicts).toBe(true);
      expect(result.displayOptions.timeFormat).toBe('24h');
      expect(result.sessions).toHaveLength(2); // lecturer-1 sessions
    });
  });

  describe('generateStudentView', () => {
    it('should generate student-specific view with appropriate settings', async () => {
      const result = await viewService.generateStudentView('schedule-1', 'group-1');

      expect(result.metadata.userRole).toBe(UserRole.STUDENT);
      expect(result.displayOptions.showDetails).toBe(false);
      expect(result.displayOptions.showConflicts).toBe(false);
      expect(result.displayOptions.timeFormat).toBe('12h');
      expect(result.displayOptions.compactView).toBe(true);
      expect(result.sessions).toHaveLength(2); // group-1 sessions
    });
  });

  describe('generateVenueView', () => {
    it('should generate venue-specific view', async () => {
      const result = await viewService.generateVenueView('schedule-1', 'venue-1');

      expect(result.name).toBe('Room 1 Schedule');
      expect(result.displayOptions.showConflicts).toBe(true);
      expect(result.sessions).toHaveLength(1); // Only venue-1 sessions
      expect(result.sessions[0]?.venueName).toBe('Room 1');
    });

    it('should apply filters to venue view', async () => {
      const filters: ViewFilter = {
        dateRange: {
          startDate: new Date('2024-01-15T00:00:00Z'),
          endDate: new Date('2024-01-15T23:59:59Z')
        }
      };

      const result = await viewService.generateVenueView('schedule-1', 'venue-1', filters);

      expect(result.sessions).toHaveLength(1);
      expect(result.metadata.appliedFilters).toEqual(filters);
    });
  });

  describe('view configuration management', () => {
    it('should save view configuration', async () => {
      const config = {
        name: 'My Custom View',
        userRole: UserRole.LECTURER,
        userId: 'lecturer-1',
        filters: { dayOfWeek: ['Monday', 'Wednesday'] },
        displayOptions: {
          showDetails: true,
          showConflicts: false,
          groupBy: 'day' as const,
          timeFormat: '12h' as const,
          showWeekends: false,
          compactView: false
        },
        isDefault: false
      };

      const result = await viewService.saveViewConfiguration(config);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^config-\d+$/);
      expect(result.name).toBe('My Custom View');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should get view configuration', async () => {
      const result = await viewService.getViewConfiguration('config-123');
      expect(result).toBeNull(); // Mock implementation returns null
    });

    it('should get user view configurations', async () => {
      const result = await viewService.getUserViewConfigurations('lecturer-1', UserRole.LECTURER);
      expect(result).toEqual([]); // Mock implementation returns empty array
    });

    it('should delete view configuration', async () => {
      const result = await viewService.deleteViewConfiguration('config-123');
      expect(result).toBe(true); // Mock implementation returns true
    });
  });
});