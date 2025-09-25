import { ClashDetector, ClashDetectionContext } from '../services/clashDetector';
import { ScheduledSession } from '../models/schedule';
import { ClashType } from '../models/clash';
import { DayOfWeek, Equipment, Severity, Frequency } from '../models/common';

describe('ClashDetector', () => {
  let clashDetector: ClashDetector;
  let mockContext: ClashDetectionContext;

  beforeEach(() => {
    clashDetector = new ClashDetector();
    
    // Setup mock context
    mockContext = {
      venues: [
        {
          id: 'venue1',
          name: 'Room A101',
          capacity: 30,
          equipment: [Equipment.PROJECTOR, Equipment.WHITEBOARD],
          availability: [],
          location: 'Building A',
          accessibility: [],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'venue2',
          name: 'Room B201',
          capacity: 50,
          equipment: [Equipment.COMPUTER, Equipment.SMARTBOARD],
          availability: [],
          location: 'Building B',
          accessibility: [],
          createdAt: new Date(),
          updatedAt: new Date()
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
            [DayOfWeek.MONDAY]: [{ startTime: '09:00', endTime: '17:00', dayOfWeek: DayOfWeek.MONDAY }],
            [DayOfWeek.TUESDAY]: [{ startTime: '09:00', endTime: '17:00', dayOfWeek: DayOfWeek.TUESDAY }],
            [DayOfWeek.WEDNESDAY]: [{ startTime: '09:00', endTime: '17:00', dayOfWeek: DayOfWeek.WEDNESDAY }],
            [DayOfWeek.THURSDAY]: [{ startTime: '09:00', endTime: '17:00', dayOfWeek: DayOfWeek.THURSDAY }],
            [DayOfWeek.FRIDAY]: [{ startTime: '09:00', endTime: '17:00', dayOfWeek: DayOfWeek.FRIDAY }],
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
        },
        {
          id: 'lecturer2',
          name: 'Prof. Johnson',
          email: 'johnson@university.edu',
          department: 'Mathematics',
          subjects: ['Calculus', 'Statistics'],
          availability: {
            [DayOfWeek.MONDAY]: [{ startTime: '10:00', endTime: '16:00', dayOfWeek: DayOfWeek.MONDAY }],
            [DayOfWeek.TUESDAY]: [{ startTime: '10:00', endTime: '16:00', dayOfWeek: DayOfWeek.TUESDAY }],
            [DayOfWeek.WEDNESDAY]: [{ startTime: '10:00', endTime: '16:00', dayOfWeek: DayOfWeek.WEDNESDAY }],
            [DayOfWeek.THURSDAY]: [{ startTime: '10:00', endTime: '16:00', dayOfWeek: DayOfWeek.THURSDAY }],
            [DayOfWeek.FRIDAY]: [{ startTime: '10:00', endTime: '16:00', dayOfWeek: DayOfWeek.FRIDAY }],
            [DayOfWeek.SATURDAY]: [],
            [DayOfWeek.SUNDAY]: []
          },
          preferences: {
            preferredTimeSlots: [],
            maxHoursPerDay: 6,
            maxHoursPerWeek: 30,
            minimumBreakBetweenClasses: 30,
            preferredDays: [],
            avoidBackToBackClasses: true
          },
          maxHoursPerDay: 6,
          maxHoursPerWeek: 30,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      studentGroups: [
        {
          id: 'group1',
          name: 'CS-2024-A',
          size: 25,
          courses: ['course1'],
          yearLevel: 2,
          department: 'Computer Science',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'group2',
          name: 'MATH-2024-B',
          size: 35,
          courses: ['course2'],
          yearLevel: 1,
          department: 'Mathematics',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      courses: [
        {
          id: 'course1',
          name: 'Introduction to Programming',
          code: 'CS101',
          duration: 90,
          frequency: Frequency.WEEKLY,
          requiredEquipment: [Equipment.COMPUTER, Equipment.PROJECTOR],
          studentGroups: ['group1'],
          lecturerId: 'lecturer1',
          constraints: [],
          department: 'Computer Science',
          credits: 3,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'course2',
          name: 'Calculus I',
          code: 'MATH101',
          duration: 60,
          frequency: Frequency.WEEKLY,
          requiredEquipment: [Equipment.WHITEBOARD],
          studentGroups: ['group2'],
          lecturerId: 'lecturer2',
          constraints: [],
          department: 'Mathematics',
          credits: 4,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    };
  });

  describe('detectVenueDoubleBookings', () => {
    it('should detect venue double-booking when two sessions overlap in the same venue', () => {
      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        },
        {
          id: 'session2',
          courseId: 'course2',
          lecturerId: 'lecturer2',
          venueId: 'venue1',
          studentGroups: ['group2'],
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:00:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      const clashes = clashDetector.detectVenueDoubleBookings(sessions, 'schedule1');

      expect(clashes).toHaveLength(1);
      expect(clashes[0]?.type).toBe(ClashType.VENUE_DOUBLE_BOOKING);
      expect(clashes[0]?.severity).toBe(Severity.ERROR);
      expect(clashes[0]?.affectedEntities).toContain('venue1');
      expect(clashes[0]?.sessionIds).toEqual(['session1', 'session2']);
    });

    it('should not detect clash when sessions are in different venues', () => {
      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        },
        {
          id: 'session2',
          courseId: 'course2',
          lecturerId: 'lecturer2',
          venueId: 'venue2',
          studentGroups: ['group2'],
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:00:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      const clashes = clashDetector.detectVenueDoubleBookings(sessions, 'schedule1');

      expect(clashes).toHaveLength(0);
    });

    it('should not detect clash when sessions are on different days', () => {
      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        },
        {
          id: 'session2',
          courseId: 'course2',
          lecturerId: 'lecturer2',
          venueId: 'venue1',
          studentGroups: ['group2'],
          startTime: new Date('2024-01-16T10:00:00'),
          endTime: new Date('2024-01-16T11:00:00'),
          dayOfWeek: DayOfWeek.TUESDAY
        }
      ];

      const clashes = clashDetector.detectVenueDoubleBookings(sessions, 'schedule1');

      expect(clashes).toHaveLength(0);
    });
  });

  describe('detectLecturerConflicts', () => {
    it('should detect lecturer conflict when same lecturer has overlapping sessions', () => {
      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        },
        {
          id: 'session2',
          courseId: 'course2',
          lecturerId: 'lecturer1',
          venueId: 'venue2',
          studentGroups: ['group2'],
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:00:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      const clashes = clashDetector.detectLecturerConflicts(sessions, mockContext.lecturers, 'schedule1');

      expect(clashes).toHaveLength(1);
      expect(clashes[0]?.type).toBe(ClashType.LECTURER_CONFLICT);
      expect(clashes[0]?.severity).toBe(Severity.ERROR);
      expect(clashes[0]?.affectedEntities).toContain('lecturer1');
    });

    it('should detect availability violation when lecturer is scheduled outside available hours', () => {
      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T08:00:00'), // Before 09:00 availability
          endTime: new Date('2024-01-15T09:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      const clashes = clashDetector.detectLecturerConflicts(sessions, mockContext.lecturers, 'schedule1');

      expect(clashes).toHaveLength(1);
      expect(clashes[0]?.type).toBe(ClashType.AVAILABILITY_VIOLATION);
      expect(clashes[0]?.severity).toBe(Severity.ERROR);
    });
  });

  describe('detectStudentGroupOverlaps', () => {
    it('should detect student group overlap when same group has overlapping sessions', () => {
      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        },
        {
          id: 'session2',
          courseId: 'course2',
          lecturerId: 'lecturer2',
          venueId: 'venue2',
          studentGroups: ['group1'], // Same group
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:00:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      const clashes = clashDetector.detectStudentGroupOverlaps(sessions, 'schedule1');

      expect(clashes).toHaveLength(1);
      expect(clashes[0]?.type).toBe(ClashType.STUDENT_GROUP_OVERLAP);
      expect(clashes[0]?.severity).toBe(Severity.ERROR);
      expect(clashes[0]?.affectedEntities).toContain('group1');
    });

    it('should not detect overlap when different groups have overlapping sessions', () => {
      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        },
        {
          id: 'session2',
          courseId: 'course2',
          lecturerId: 'lecturer2',
          venueId: 'venue2',
          studentGroups: ['group2'], // Different group
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:00:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      const clashes = clashDetector.detectStudentGroupOverlaps(sessions, 'schedule1');

      expect(clashes).toHaveLength(0);
    });
  });

  describe('detectEquipmentConflicts', () => {
    it('should detect equipment conflict when venue lacks required equipment', () => {
      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1', // Requires COMPUTER and PROJECTOR
          lecturerId: 'lecturer1',
          venueId: 'venue1', // Only has PROJECTOR and WHITEBOARD
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      const clashes = clashDetector.detectEquipmentConflicts(
        sessions,
        mockContext.venues,
        mockContext.courses,
        'schedule1'
      );

      expect(clashes).toHaveLength(1);
      expect(clashes[0]?.type).toBe(ClashType.EQUIPMENT_CONFLICT);
      expect(clashes[0]?.severity).toBe(Severity.WARNING);
      expect(clashes[0]?.description).toContain('computer');
    });

    it('should not detect conflict when venue has all required equipment', () => {
      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course2', // Requires only WHITEBOARD
          lecturerId: 'lecturer2',
          venueId: 'venue1', // Has PROJECTOR and WHITEBOARD
          studentGroups: ['group2'],
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      const clashes = clashDetector.detectEquipmentConflicts(
        sessions,
        mockContext.venues,
        mockContext.courses,
        'schedule1'
      );

      expect(clashes).toHaveLength(0);
    });
  });

  describe('detectCapacityViolations', () => {
    it('should detect capacity violation when student count exceeds venue capacity', () => {
      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1', // Capacity: 30
          studentGroups: ['group1', 'group2'], // Total: 25 + 35 = 60 students
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      const clashes = clashDetector.detectCapacityViolations(
        sessions,
        mockContext.venues,
        mockContext.studentGroups,
        'schedule1'
      );

      expect(clashes).toHaveLength(1);
      expect(clashes[0]?.type).toBe(ClashType.CAPACITY_EXCEEDED);
      expect(clashes[0]?.severity).toBe(Severity.ERROR);
      expect(clashes[0]?.description).toContain('exceeded by 30 students');
    });

    it('should not detect violation when student count is within capacity', () => {
      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1', // Capacity: 30
          studentGroups: ['group1'], // Size: 25 students
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      const clashes = clashDetector.detectCapacityViolations(
        sessions,
        mockContext.venues,
        mockContext.studentGroups,
        'schedule1'
      );

      expect(clashes).toHaveLength(0);
    });
  });

  describe('detectClashes', () => {
    it('should detect multiple types of clashes in a complex schedule', () => {
      const sessions: ScheduledSession[] = [
        // Venue double-booking
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        },
        {
          id: 'session2',
          courseId: 'course2',
          lecturerId: 'lecturer2',
          venueId: 'venue1', // Same venue
          studentGroups: ['group2'],
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:00:00'),
          dayOfWeek: DayOfWeek.MONDAY
        },
        // Capacity violation
        {
          id: 'session3',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1', // Capacity: 30
          studentGroups: ['group1', 'group2'], // Total: 60 students
          startTime: new Date('2024-01-16T09:00:00'),
          endTime: new Date('2024-01-16T10:30:00'),
          dayOfWeek: DayOfWeek.TUESDAY
        }
      ];

      const result = clashDetector.detectClashes(sessions, mockContext, 'schedule1');

      expect(result.clashes.length).toBeGreaterThan(1);
      expect(result.isValid).toBe(false);
      expect(result.summary.totalClashes).toBeGreaterThan(1);
      expect(result.summary.criticalClashes).toBeGreaterThan(0);
      
      const clashTypes = result.clashes.map(c => c.type);
      expect(clashTypes).toContain(ClashType.VENUE_DOUBLE_BOOKING);
      expect(clashTypes).toContain(ClashType.CAPACITY_EXCEEDED);
    });

    it('should return valid result when no clashes are detected', () => {
      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course2', // MATH course with WHITEBOARD requirement
          lecturerId: 'lecturer2',
          venueId: 'venue1', // Has WHITEBOARD
          studentGroups: ['group1'], // 25 students, within capacity
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:00:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      const result = clashDetector.detectClashes(sessions, mockContext, 'schedule1');

      expect(result.clashes).toHaveLength(0);
      expect(result.isValid).toBe(true);
      expect(result.summary.totalClashes).toBe(0);
      expect(result.summary.criticalClashes).toBe(0);
    });
  });

  describe('resolution suggestions', () => {
    it('should provide resolution suggestions for venue conflicts', () => {
      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        },
        {
          id: 'session2',
          courseId: 'course2',
          lecturerId: 'lecturer2',
          venueId: 'venue1',
          studentGroups: ['group2'],
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:00:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      const clashes = clashDetector.detectVenueDoubleBookings(sessions, 'schedule1');

      expect(clashes[0]?.suggestedResolutions).toHaveLength(2);
      expect(clashes[0]?.suggestedResolutions[0]?.type).toBe('reschedule');
      expect(clashes[0]?.suggestedResolutions[1]?.type).toBe('reassign_venue');
      expect(clashes[0]?.suggestedResolutions[0]?.score).toBeGreaterThan(0);
    });
  });
});