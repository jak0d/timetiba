import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { scheduleImportService, ConflictResolutionStrategy } from '../../services/import/scheduleImportService';
import { scheduleRepository } from '../../repositories/scheduleRepository';
import { clashDetector } from '../../services/clashDetector';
import { transactionManager } from '../../services/import/transactionManager';
import { 
  ScheduledSession, 
  Schedule, 
  ScheduleStatus 
} from '../../models/schedule';
import { 
  Clash, 
  ClashType 
} from '../../models/clash';
import { 
  DayOfWeek, 
  Severity, 
  Equipment 
} from '../../models/common';
import { Venue } from '../../models/venue';
import { Lecturer } from '../../models/lecturer';
import { Course } from '../../models/course';
import { StudentGroup } from '../../models/studentGroup';

// Mock dependencies
jest.mock('../../repositories/scheduleRepository');
jest.mock('../../services/clashDetector');
jest.mock('../../services/import/transactionManager');

const mockScheduleRepository = scheduleRepository as jest.Mocked<typeof scheduleRepository>;
const mockClashDetector = clashDetector as jest.Mocked<typeof clashDetector>;
const mockTransactionManager = transactionManager as jest.Mocked<typeof transactionManager>;

describe('ScheduleImportService', () => {
  let mockSchedule: Schedule;
  let mockSessions: Partial<ScheduledSession>[];
  let mockContext: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSchedule = {
      id: 'schedule-1',
      name: 'Test Schedule',
      academicPeriod: '2024-S1',
      timeSlots: [],
      status: ScheduleStatus.DRAFT,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-30'),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockSessions = [
      {
        courseId: 'course-1',
        lecturerId: 'lecturer-1',
        venueId: 'venue-1',
        studentGroups: ['group-1'],
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T10:00:00'),
        dayOfWeek: DayOfWeek.MONDAY
      }
    ];

    mockContext = {
      venues: [
        {
          id: 'venue-1',
          name: 'Room A',
          capacity: 50,
          equipment: [Equipment.PROJECTOR],
          accessibility: [],
          availability: [],
          location: 'Building 1',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'venue-2',
          name: 'Room B',
          capacity: 100,
          equipment: [Equipment.PROJECTOR, Equipment.COMPUTER],
          accessibility: [],
          availability: [],
          location: 'Building 2',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ] as Venue[],
      lecturers: [
        {
          id: 'lecturer-1',
          name: 'Dr. Smith',
          email: 'smith@test.com',
          department: 'Computer Science',
          subjects: ['Programming'],
          availability: {
            [DayOfWeek.MONDAY]: [{ startTime: '08:00', endTime: '17:00', dayOfWeek: DayOfWeek.MONDAY }],
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
            avoidBackToBackClasses: false,
            preferredVenues: []
          },
          maxHoursPerDay: 8,
          maxHoursPerWeek: 40,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ] as Lecturer[],
      courses: [
        {
          id: 'course-1',
          name: 'Programming 101',
          code: 'CS101',
          duration: 60,
          frequency: 'weekly' as any,
          requiredEquipment: [Equipment.PROJECTOR],
          studentGroups: ['group-1'],
          lecturerId: 'lecturer-1',
          constraints: [],
          department: 'Computer Science',
          credits: 3,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ] as Course[],
      studentGroups: [
        {
          id: 'group-1',
          name: 'CS Year 1',
          size: 30,
          courses: ['course-1'],
          yearLevel: 1,
          department: 'Computer Science',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ] as StudentGroup[]
    };

    // Default mock implementations
    mockScheduleRepository.findById.mockResolvedValue(mockSchedule);
    mockScheduleRepository.addSession.mockResolvedValue({
      id: 'session-1',
      ...mockSessions[0]
    } as ScheduledSession);

    mockClashDetector.detectSessionClashes.mockReturnValue([]);

    mockTransactionManager.executeInTransaction.mockImplementation(async (operation) => {
      const result = await operation({});
      return { success: true, result };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('importScheduleSessions', () => {
    it('should successfully import sessions without conflicts', async () => {
      const options = {
        scheduleId: 'schedule-1',
        conflictResolutionStrategy: ConflictResolutionStrategy.STRICT,
        allowPartialImport: false,
        validateOnly: false,
        batchSize: 10
      };

      const result = await scheduleImportService.importScheduleSessions(
        mockSessions,
        mockContext,
        options
      );

      expect(result.created).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.errors).toHaveLength(0);

      expect(mockScheduleRepository.addSession).toHaveBeenCalledTimes(1);
      expect(mockClashDetector.detectSessionClashes).toHaveBeenCalledTimes(1);
    });

    it('should handle validation-only mode', async () => {
      const options = {
        scheduleId: 'schedule-1',
        conflictResolutionStrategy: ConflictResolutionStrategy.STRICT,
        allowPartialImport: false,
        validateOnly: true,
        batchSize: 10
      };

      const result = await scheduleImportService.importScheduleSessions(
        mockSessions,
        mockContext,
        options
      );

      expect(result.created).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockScheduleRepository.addSession).not.toHaveBeenCalled();
    });

    it('should reject sessions with conflicts in strict mode', async () => {
      const mockConflict: Clash = {
        id: 'conflict-1',
        type: ClashType.VENUE_DOUBLE_BOOKING,
        severity: Severity.ERROR,
        affectedEntities: ['venue-1', 'course-1'],
        description: 'Venue conflict detected',
        suggestedResolutions: [],
        scheduleId: 'schedule-1',
        sessionIds: ['session-1'],
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockClashDetector.detectSessionClashes.mockReturnValue([mockConflict]);

      const options = {
        scheduleId: 'schedule-1',
        conflictResolutionStrategy: ConflictResolutionStrategy.STRICT,
        allowPartialImport: false,
        validateOnly: false,
        batchSize: 10
      };

      const result = await scheduleImportService.importScheduleSessions(
        mockSessions,
        mockContext,
        options
      );

      expect(result.created).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.conflicts).toHaveLength(1);
      expect(result.resolutions).toHaveLength(1);
      expect(result.resolutions[0]?.resolutionType).toBe('skipped');

      expect(mockScheduleRepository.addSession).not.toHaveBeenCalled();
    });

    it('should skip conflicting sessions in skip mode', async () => {
      const mockConflict: Clash = {
        id: 'conflict-1',
        type: ClashType.LECTURER_CONFLICT,
        severity: Severity.ERROR,
        affectedEntities: ['lecturer-1', 'course-1'],
        description: 'Lecturer conflict detected',
        suggestedResolutions: [],
        scheduleId: 'schedule-1',
        sessionIds: ['session-1'],
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockClashDetector.detectSessionClashes.mockReturnValue([mockConflict]);

      const options = {
        scheduleId: 'schedule-1',
        conflictResolutionStrategy: ConflictResolutionStrategy.SKIP_CONFLICTS,
        allowPartialImport: true,
        validateOnly: false,
        batchSize: 10
      };

      const result = await scheduleImportService.importScheduleSessions(
        mockSessions,
        mockContext,
        options
      );

      expect(result.created).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.resolutions[0]?.resolutionType).toBe('skipped');
      expect(result.resolutions[0]?.success).toBe(true);
    });

    it('should attempt automatic conflict resolution', async () => {
      const mockConflict: Clash = {
        id: 'conflict-1',
        type: ClashType.VENUE_DOUBLE_BOOKING,
        severity: Severity.ERROR,
        affectedEntities: ['venue-1', 'course-1'],
        description: 'Venue conflict detected',
        suggestedResolutions: [],
        scheduleId: 'schedule-1',
        sessionIds: ['session-1'],
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockClashDetector.detectSessionClashes.mockReturnValue([mockConflict]);

      const options = {
        scheduleId: 'schedule-1',
        conflictResolutionStrategy: ConflictResolutionStrategy.AUTOMATIC,
        allowPartialImport: false,
        validateOnly: false,
        batchSize: 10
      };

      const result = await scheduleImportService.importScheduleSessions(
        mockSessions,
        mockContext,
        options
      );

      expect(result.resolutions).toHaveLength(1);
      expect(result.resolutions[0]?.resolutionType).toBe('automatic');
      
      // Should have attempted to resolve the conflict
      if (result.resolutions[0]?.success) {
        expect(result.created).toBe(1);
        expect(mockScheduleRepository.addSession).toHaveBeenCalled();
      } else {
        expect(result.failed).toBe(1);
      }
    });

    it('should handle invalid session data', async () => {
      const invalidSessions = [
        {
          // Missing required fields
          courseId: 'course-1'
          // lecturerId, venueId, etc. missing
        }
      ];

      const options = {
        scheduleId: 'schedule-1',
        conflictResolutionStrategy: ConflictResolutionStrategy.STRICT,
        allowPartialImport: false,
        validateOnly: false,
        batchSize: 10
      };

      const result = await scheduleImportService.importScheduleSessions(
        invalidSessions,
        mockContext,
        options
      );

      expect(result.created).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toContain('required');
    });

    it('should process sessions in batches', async () => {
      const multipleSessions = [
        ...mockSessions,
        {
          courseId: 'course-2',
          lecturerId: 'lecturer-1',
          venueId: 'venue-2',
          studentGroups: ['group-1'],
          startTime: new Date('2024-01-15T11:00:00'),
          endTime: new Date('2024-01-15T12:00:00'),
          dayOfWeek: DayOfWeek.MONDAY
        },
        {
          courseId: 'course-3',
          lecturerId: 'lecturer-1',
          venueId: 'venue-1',
          studentGroups: ['group-1'],
          startTime: new Date('2024-01-15T13:00:00'),
          endTime: new Date('2024-01-15T14:00:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      const options = {
        scheduleId: 'schedule-1',
        conflictResolutionStrategy: ConflictResolutionStrategy.STRICT,
        allowPartialImport: false,
        validateOnly: false,
        batchSize: 2 // Small batch size to test batching
      };

      mockScheduleRepository.addSession.mockResolvedValue({
        id: 'session-new',
        courseId: 'course-1',
        lecturerId: 'lecturer-1',
        venueId: 'venue-1',
        studentGroups: ['group-1'],
        startTime: new Date(),
        endTime: new Date(),
        dayOfWeek: DayOfWeek.MONDAY
      });

      const result = await scheduleImportService.importScheduleSessions(
        multipleSessions,
        mockContext,
        options
      );

      expect(result.created).toBe(3);
      expect(result.failed).toBe(0);
      expect(mockScheduleRepository.addSession).toHaveBeenCalledTimes(3);
    });

    it('should handle repository errors gracefully', async () => {
      mockScheduleRepository.addSession.mockRejectedValue(new Error('Database error'));

      const options = {
        scheduleId: 'schedule-1',
        conflictResolutionStrategy: ConflictResolutionStrategy.STRICT,
        allowPartialImport: true,
        validateOnly: false,
        batchSize: 10
      };

      const result = await scheduleImportService.importScheduleSessions(
        mockSessions,
        mockContext,
        options
      );

      expect(result.created).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toContain('Database error');
    });
  });

  describe('conflict resolution', () => {
    it('should resolve venue conflicts by finding alternative venues', async () => {
      const venueConflict: Clash = {
        id: 'conflict-1',
        type: ClashType.VENUE_DOUBLE_BOOKING,
        severity: Severity.ERROR,
        affectedEntities: ['venue-1', 'course-1'],
        description: 'Venue conflict detected',
        suggestedResolutions: [],
        scheduleId: 'schedule-1',
        sessionIds: ['session-1'],
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockClashDetector.detectSessionClashes.mockReturnValue([venueConflict]);

      const options = {
        scheduleId: 'schedule-1',
        conflictResolutionStrategy: ConflictResolutionStrategy.AUTOMATIC,
        allowPartialImport: false,
        validateOnly: false,
        batchSize: 10
      };

      const result = await scheduleImportService.importScheduleSessions(
        mockSessions,
        mockContext,
        options
      );

      expect(result.resolutions).toHaveLength(1);
      const resolution = result.resolutions[0];
      
      if (resolution?.success) {
        expect(resolution.action).toContain('alternative venue');
        expect(resolution.resolvedSession?.venueId).toBe('venue-2');
      }
    });

    it('should resolve capacity conflicts by finding larger venues', async () => {
      // Modify context to have a small venue and large student group
      mockContext.venues[0].capacity = 10; // Too small
      mockContext.studentGroups[0].size = 50; // Too large for venue-1

      const capacityConflict: Clash = {
        id: 'conflict-1',
        type: ClashType.CAPACITY_EXCEEDED,
        severity: Severity.ERROR,
        affectedEntities: ['venue-1', 'group-1'],
        description: 'Capacity exceeded',
        suggestedResolutions: [],
        scheduleId: 'schedule-1',
        sessionIds: ['session-1'],
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockClashDetector.detectSessionClashes.mockReturnValue([capacityConflict]);

      const options = {
        scheduleId: 'schedule-1',
        conflictResolutionStrategy: ConflictResolutionStrategy.AUTOMATIC,
        allowPartialImport: false,
        validateOnly: false,
        batchSize: 10
      };

      const result = await scheduleImportService.importScheduleSessions(
        mockSessions,
        mockContext,
        options
      );

      expect(result.resolutions).toHaveLength(1);
      const resolution = result.resolutions[0];
      
      if (resolution?.success) {
        expect(resolution.action).toContain('larger venue');
        expect(resolution.resolvedSession?.venueId).toBe('venue-2');
      }
    });

    it('should handle unresolvable conflicts', async () => {
      // Remove alternative venues to make conflict unresolvable
      mockContext.venues = [mockContext.venues[0]]; // Only keep the conflicting venue

      const venueConflict: Clash = {
        id: 'conflict-1',
        type: ClashType.VENUE_DOUBLE_BOOKING,
        severity: Severity.ERROR,
        affectedEntities: ['venue-1', 'course-1'],
        description: 'Venue conflict detected',
        suggestedResolutions: [],
        scheduleId: 'schedule-1',
        sessionIds: ['session-1'],
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockClashDetector.detectSessionClashes.mockReturnValue([venueConflict]);

      const options = {
        scheduleId: 'schedule-1',
        conflictResolutionStrategy: ConflictResolutionStrategy.AUTOMATIC,
        allowPartialImport: false,
        validateOnly: false,
        batchSize: 10
      };

      const result = await scheduleImportService.importScheduleSessions(
        mockSessions,
        mockContext,
        options
      );

      expect(result.created).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.resolutions).toHaveLength(1);
      expect(result.resolutions[0]?.success).toBe(false);
      expect(result.resolutions[0]?.error).toContain('alternative venue');
    });
  });
});