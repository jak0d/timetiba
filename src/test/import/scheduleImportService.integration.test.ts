import { scheduleImportService, ConflictResolutionStrategy } from '../../services/import/scheduleImportService';
import { ClashDetectionContext } from '../../services/clashDetector';
import { ScheduledSession } from '../../models/schedule';
import { DayOfWeek } from '../../models/common';

describe('ScheduleImportService Integration', () => {
  const mockContext: ClashDetectionContext = {
    venues: [
      {
        id: 'venue1',
        name: 'Room A',
        capacity: 50,
        equipment: ['projector', 'whiteboard'],
        location: 'Building 1'
      }
    ],
    lecturers: [
      {
        id: 'lecturer1',
        name: 'Dr. Smith',
        email: 'smith@university.edu',
        department: 'Computer Science',
        subjects: ['Programming', 'Algorithms'],
        availability: {
          [DayOfWeek.MONDAY]: [{ startTime: '09:00', endTime: '17:00' }],
          [DayOfWeek.TUESDAY]: [{ startTime: '09:00', endTime: '17:00' }],
          [DayOfWeek.WEDNESDAY]: [{ startTime: '09:00', endTime: '17:00' }],
          [DayOfWeek.THURSDAY]: [{ startTime: '09:00', endTime: '17:00' }],
          [DayOfWeek.FRIDAY]: [{ startTime: '09:00', endTime: '17:00' }]
        }
      }
    ],
    courses: [
      {
        id: 'course1',
        name: 'Introduction to Programming',
        code: 'CS101',
        credits: 3,
        department: 'Computer Science',
        requiredEquipment: ['projector']
      }
    ],
    studentGroups: [
      {
        id: 'group1',
        name: 'CS Year 1',
        size: 30,
        department: 'Computer Science'
      }
    ]
  };

  const mockSessions: Partial<ScheduledSession>[] = [
    {
      courseId: 'course1',
      lecturerId: 'lecturer1',
      venueId: 'venue1',
      studentGroups: ['group1'],
      startTime: new Date('2024-01-15T09:00:00'),
      endTime: new Date('2024-01-15T10:00:00'),
      dayOfWeek: DayOfWeek.MONDAY,
      weekNumber: 1
    }
  ];

  it('should create an instance', () => {
    expect(scheduleImportService).toBeDefined();
  });

  it('should validate session data correctly', () => {
    const validSession = mockSessions[0];
    const result = (scheduleImportService as any).validateSessionData(validSession);
    expect(result.isValid).toBe(true);
  });

  it('should create complete session from partial data', () => {
    const partialSession = mockSessions[0];
    const completeSession = (scheduleImportService as any).createCompleteSession(partialSession, 'schedule1');
    
    expect(completeSession.id).toBeDefined();
    expect(completeSession.courseId).toBe(partialSession.courseId);
    expect(completeSession.lecturerId).toBe(partialSession.lecturerId);
    expect(completeSession.venueId).toBe(partialSession.venueId);
  });

  it('should handle conflict resolution strategies', async () => {
    const session: ScheduledSession = {
      id: 'test-session',
      courseId: 'course1',
      lecturerId: 'lecturer1',
      venueId: 'venue1',
      studentGroups: ['group1'],
      startTime: new Date('2024-01-15T09:00:00'),
      endTime: new Date('2024-01-15T10:00:00'),
      dayOfWeek: DayOfWeek.MONDAY,
      weekNumber: 1
    };

    const conflicts = []; // Empty conflicts for this test
    
    const result = await (scheduleImportService as any).handleConflicts(
      session,
      conflicts,
      ConflictResolutionStrategy.STRICT,
      mockContext
    );

    expect(result).toBeDefined();
    expect(result.shouldSkip).toBe(false); // No conflicts to skip
    expect(result.resolutions).toEqual([]);
  });
});