import { ScheduleConflictDetector } from '../../services/import/scheduleConflictDetector';
import { MappedImportData } from '../../types/import';
import { DayOfWeek } from '../../models/common';

describe('ScheduleConflictDetector', () => {
  let detector: ScheduleConflictDetector;
  let mockMappedData: MappedImportData;

  beforeEach(() => {
    detector = new ScheduleConflictDetector();
    
    mockMappedData = {
      venues: [],
      lecturers: [],
      courses: [],
      studentGroups: [],
      schedules: [],
      metadata: {
        sourceFile: 'test.csv',
        mappingConfig: 'test-config',
        importedAt: new Date(),
        importedBy: 'test-user'
      }
    };
  });

  describe('detectConflicts', () => {
    it('should return no conflicts for empty schedule data', async () => {
      const result = await detector.detectConflicts(mockMappedData);
      
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.conflictCount).toBe(0);
    });

    it('should return no conflicts for non-overlapping schedules', async () => {
      mockMappedData.schedules = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          courseId: '550e8400-e29b-41d4-a716-446655440002',
          lecturerId: '550e8400-e29b-41d4-a716-446655440003',
          venueId: '550e8400-e29b-41d4-a716-446655440004',
          studentGroups: ['550e8400-e29b-41d4-a716-446655440005'],
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T10:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          courseId: '550e8400-e29b-41d4-a716-446655440007',
          lecturerId: '550e8400-e29b-41d4-a716-446655440008',
          venueId: '550e8400-e29b-41d4-a716-446655440009',
          studentGroups: ['550e8400-e29b-41d4-a716-446655440010'],
          startTime: new Date('2024-01-15T11:00:00Z'),
          endTime: new Date('2024-01-15T12:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        }
      ];

      const result = await detector.detectConflicts(mockMappedData);
      
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.conflictCount).toBe(0);
    });
  });

  describe('venue conflict detection', () => {
    it('should detect venue double-booking conflicts', async () => {
      mockMappedData.schedules = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          courseId: '550e8400-e29b-41d4-a716-446655440002',
          lecturerId: '550e8400-e29b-41d4-a716-446655440003',
          venueId: '550e8400-e29b-41d4-a716-446655440004', // Same venue
          studentGroups: ['550e8400-e29b-41d4-a716-446655440005'],
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T10:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          courseId: '550e8400-e29b-41d4-a716-446655440007',
          lecturerId: '550e8400-e29b-41d4-a716-446655440008',
          venueId: '550e8400-e29b-41d4-a716-446655440004', // Same venue
          studentGroups: ['550e8400-e29b-41d4-a716-446655440009'],
          startTime: new Date('2024-01-15T09:30:00Z'), // Overlapping time
          endTime: new Date('2024-01-15T10:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        }
      ];

      const result = await detector.detectConflicts(mockMappedData);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.conflictCount).toBeGreaterThan(0);
      
      const venueError = result.errors.find(e => e.message.includes('Venue double-booking'));
      expect(venueError).toBeDefined();
      expect(venueError?.severity).toBe('error');
      expect(venueError?.suggestedFix).toContain('different venue');
    });

    it('should not detect conflicts for same venue at different times', async () => {
      mockMappedData.schedules = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          courseId: '550e8400-e29b-41d4-a716-446655440002',
          lecturerId: '550e8400-e29b-41d4-a716-446655440003',
          venueId: '550e8400-e29b-41d4-a716-446655440004', // Same venue
          studentGroups: ['550e8400-e29b-41d4-a716-446655440005'],
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T10:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          courseId: '550e8400-e29b-41d4-a716-446655440007',
          lecturerId: '550e8400-e29b-41d4-a716-446655440008',
          venueId: '550e8400-e29b-41d4-a716-446655440004', // Same venue
          studentGroups: ['550e8400-e29b-41d4-a716-446655440009'],
          startTime: new Date('2024-01-15T10:00:00Z'), // Non-overlapping time
          endTime: new Date('2024-01-15T11:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        }
      ];

      const result = await detector.detectConflicts(mockMappedData);
      
      expect(result.errors).toHaveLength(0);
      expect(result.conflictCount).toBe(0);
    });

    it('should not detect conflicts for same venue on different days', async () => {
      mockMappedData.schedules = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          courseId: '550e8400-e29b-41d4-a716-446655440002',
          lecturerId: '550e8400-e29b-41d4-a716-446655440003',
          venueId: '550e8400-e29b-41d4-a716-446655440004', // Same venue
          studentGroups: ['550e8400-e29b-41d4-a716-446655440005'],
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T10:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          courseId: '550e8400-e29b-41d4-a716-446655440007',
          lecturerId: '550e8400-e29b-41d4-a716-446655440008',
          venueId: '550e8400-e29b-41d4-a716-446655440004', // Same venue
          studentGroups: ['550e8400-e29b-41d4-a716-446655440009'],
          startTime: new Date('2024-01-16T09:00:00Z'), // Same time, different day
          endTime: new Date('2024-01-16T10:00:00Z'),
          dayOfWeek: DayOfWeek.TUESDAY,
          weekNumber: 1
        }
      ];

      const result = await detector.detectConflicts(mockMappedData);
      
      expect(result.errors).toHaveLength(0);
      expect(result.conflictCount).toBe(0);
    });
  });

  describe('lecturer conflict detection', () => {
    it('should detect lecturer conflicts', async () => {
      mockMappedData.schedules = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          courseId: '550e8400-e29b-41d4-a716-446655440002',
          lecturerId: '550e8400-e29b-41d4-a716-446655440003', // Same lecturer
          venueId: '550e8400-e29b-41d4-a716-446655440004',
          studentGroups: ['550e8400-e29b-41d4-a716-446655440005'],
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T10:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          courseId: '550e8400-e29b-41d4-a716-446655440007',
          lecturerId: '550e8400-e29b-41d4-a716-446655440003', // Same lecturer
          venueId: '550e8400-e29b-41d4-a716-446655440008',
          studentGroups: ['550e8400-e29b-41d4-a716-446655440009'],
          startTime: new Date('2024-01-15T09:30:00Z'), // Overlapping time
          endTime: new Date('2024-01-15T10:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        }
      ];

      const result = await detector.detectConflicts(mockMappedData);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.conflictCount).toBeGreaterThan(0);
      
      const lecturerError = result.errors.find(e => e.message.includes('Lecturer conflict'));
      expect(lecturerError).toBeDefined();
      expect(lecturerError?.severity).toBe('error');
      expect(lecturerError?.suggestedFix).toContain('different lecturer');
    });

    it('should not detect conflicts for same lecturer at different times', async () => {
      mockMappedData.schedules = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          courseId: '550e8400-e29b-41d4-a716-446655440002',
          lecturerId: '550e8400-e29b-41d4-a716-446655440003', // Same lecturer
          venueId: '550e8400-e29b-41d4-a716-446655440004',
          studentGroups: ['550e8400-e29b-41d4-a716-446655440005'],
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T10:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          courseId: '550e8400-e29b-41d4-a716-446655440007',
          lecturerId: '550e8400-e29b-41d4-a716-446655440003', // Same lecturer
          venueId: '550e8400-e29b-41d4-a716-446655440008',
          studentGroups: ['550e8400-e29b-41d4-a716-446655440009'],
          startTime: new Date('2024-01-15T10:00:00Z'), // Non-overlapping time
          endTime: new Date('2024-01-15T11:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        }
      ];

      const result = await detector.detectConflicts(mockMappedData);
      
      expect(result.errors).toHaveLength(0);
      expect(result.conflictCount).toBe(0);
    });
  });

  describe('student group conflict detection', () => {
    it('should detect student group overlaps', async () => {
      mockMappedData.schedules = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          courseId: '550e8400-e29b-41d4-a716-446655440002',
          lecturerId: '550e8400-e29b-41d4-a716-446655440003',
          venueId: '550e8400-e29b-41d4-a716-446655440004',
          studentGroups: ['550e8400-e29b-41d4-a716-446655440005'], // Same group
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T10:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          courseId: '550e8400-e29b-41d4-a716-446655440007',
          lecturerId: '550e8400-e29b-41d4-a716-446655440008',
          venueId: '550e8400-e29b-41d4-a716-446655440009',
          studentGroups: ['550e8400-e29b-41d4-a716-446655440005'], // Same group
          startTime: new Date('2024-01-15T09:30:00Z'), // Overlapping time
          endTime: new Date('2024-01-15T10:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        }
      ];

      const result = await detector.detectConflicts(mockMappedData);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.conflictCount).toBeGreaterThan(0);
      
      const groupError = result.errors.find(e => e.message.includes('Student group overlap'));
      expect(groupError).toBeDefined();
      expect(groupError?.severity).toBe('error');
      expect(groupError?.suggestedFix).toContain('Reschedule');
    });

    it('should detect conflicts when student groups overlap in multiple sessions', async () => {
      mockMappedData.schedules = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          courseId: '550e8400-e29b-41d4-a716-446655440002',
          lecturerId: '550e8400-e29b-41d4-a716-446655440003',
          venueId: '550e8400-e29b-41d4-a716-446655440004',
          studentGroups: ['550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440006'],
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T10:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440007',
          courseId: '550e8400-e29b-41d4-a716-446655440008',
          lecturerId: '550e8400-e29b-41d4-a716-446655440009',
          venueId: '550e8400-e29b-41d4-a716-446655440010',
          studentGroups: ['550e8400-e29b-41d4-a716-446655440006'], // Overlapping group
          startTime: new Date('2024-01-15T09:30:00Z'), // Overlapping time
          endTime: new Date('2024-01-15T10:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        }
      ];

      const result = await detector.detectConflicts(mockMappedData);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.conflictCount).toBeGreaterThan(0);
      
      const groupError = result.errors.find(e => e.message.includes('Student group overlap'));
      expect(groupError).toBeDefined();
    });

    it('should not detect conflicts for same student group at different times', async () => {
      mockMappedData.schedules = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          courseId: '550e8400-e29b-41d4-a716-446655440002',
          lecturerId: '550e8400-e29b-41d4-a716-446655440003',
          venueId: '550e8400-e29b-41d4-a716-446655440004',
          studentGroups: ['550e8400-e29b-41d4-a716-446655440005'], // Same group
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T10:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          courseId: '550e8400-e29b-41d4-a716-446655440007',
          lecturerId: '550e8400-e29b-41d4-a716-446655440008',
          venueId: '550e8400-e29b-41d4-a716-446655440009',
          studentGroups: ['550e8400-e29b-41d4-a716-446655440005'], // Same group
          startTime: new Date('2024-01-15T10:00:00Z'), // Non-overlapping time
          endTime: new Date('2024-01-15T11:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        }
      ];

      const result = await detector.detectConflicts(mockMappedData);
      
      expect(result.errors).toHaveLength(0);
      expect(result.conflictCount).toBe(0);
    });
  });

  describe('multiple conflict types', () => {
    it('should detect multiple types of conflicts simultaneously', async () => {
      mockMappedData.schedules = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          courseId: '550e8400-e29b-41d4-a716-446655440002',
          lecturerId: '550e8400-e29b-41d4-a716-446655440003',
          venueId: '550e8400-e29b-41d4-a716-446655440004',
          studentGroups: ['550e8400-e29b-41d4-a716-446655440005'],
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T10:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          courseId: '550e8400-e29b-41d4-a716-446655440007',
          lecturerId: '550e8400-e29b-41d4-a716-446655440003', // Same lecturer
          venueId: '550e8400-e29b-41d4-a716-446655440004', // Same venue
          studentGroups: ['550e8400-e29b-41d4-a716-446655440005'], // Same group
          startTime: new Date('2024-01-15T09:30:00Z'), // Overlapping time
          endTime: new Date('2024-01-15T10:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        }
      ];

      const result = await detector.detectConflicts(mockMappedData);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.conflictCount).toBeGreaterThan(0);
      
      // Should detect venue, lecturer, and student group conflicts
      const venueError = result.errors.find(e => e.message.includes('Venue double-booking'));
      const lecturerError = result.errors.find(e => e.message.includes('Lecturer conflict'));
      const groupError = result.errors.find(e => e.message.includes('Student group overlap'));
      
      expect(venueError).toBeDefined();
      expect(lecturerError).toBeDefined();
      expect(groupError).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle incomplete schedule data gracefully', async () => {
      mockMappedData.schedules = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          courseId: '550e8400-e29b-41d4-a716-446655440002',
          // Missing lecturerId, venueId, times
          studentGroups: ['550e8400-e29b-41d4-a716-446655440005'],
          dayOfWeek: DayOfWeek.MONDAY
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          courseId: '550e8400-e29b-41d4-a716-446655440007',
          lecturerId: '550e8400-e29b-41d4-a716-446655440008',
          venueId: '550e8400-e29b-41d4-a716-446655440009',
          studentGroups: ['550e8400-e29b-41d4-a716-446655440010'],
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T10:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      const result = await detector.detectConflicts(mockMappedData);
      
      // Should not throw errors, should handle gracefully
      expect(result).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.conflictCount).toBeDefined();
    });

    it('should handle exact time boundaries correctly', async () => {
      mockMappedData.schedules = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          courseId: '550e8400-e29b-41d4-a716-446655440002',
          lecturerId: '550e8400-e29b-41d4-a716-446655440003',
          venueId: '550e8400-e29b-41d4-a716-446655440004',
          studentGroups: ['550e8400-e29b-41d4-a716-446655440005'],
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T10:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          courseId: '550e8400-e29b-41d4-a716-446655440007',
          lecturerId: '550e8400-e29b-41d4-a716-446655440008',
          venueId: '550e8400-e29b-41d4-a716-446655440004', // Same venue
          studentGroups: ['550e8400-e29b-41d4-a716-446655440009'],
          startTime: new Date('2024-01-15T10:00:00Z'), // Starts exactly when first ends
          endTime: new Date('2024-01-15T11:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 1
        }
      ];

      const result = await detector.detectConflicts(mockMappedData);
      
      // Should not detect conflicts for exact time boundaries
      expect(result.errors).toHaveLength(0);
      expect(result.conflictCount).toBe(0);
    });
  });

  describe('utility methods', () => {
    it('should group conflicts by type correctly', () => {
      const conflicts = [
        {
          type: 'venue_double_booking' as const,
          affectedSessions: [0, 1],
          description: 'Venue conflict',
          severity: 'error' as const
        },
        {
          type: 'lecturer_conflict' as const,
          affectedSessions: [2, 3],
          description: 'Lecturer conflict',
          severity: 'error' as const
        },
        {
          type: 'venue_double_booking' as const,
          affectedSessions: [4, 5],
          description: 'Another venue conflict',
          severity: 'error' as const
        }
      ];

      const grouped = detector.groupConflictsByType(conflicts);
      
      expect(grouped['venue_double_booking']).toHaveLength(2);
      expect(grouped['lecturer_conflict']).toHaveLength(1);
      expect(grouped['student_group_overlap']).toBeUndefined();
    });

    it('should calculate conflict statistics correctly', () => {
      const conflicts = [
        {
          type: 'venue_double_booking' as const,
          affectedSessions: [0, 1],
          description: 'Venue conflict',
          severity: 'error' as const
        },
        {
          type: 'lecturer_conflict' as const,
          affectedSessions: [1, 2], // Session 1 is affected by both conflicts
          description: 'Lecturer conflict',
          severity: 'error' as const
        },
        {
          type: 'student_group_overlap' as const,
          affectedSessions: [3, 4],
          description: 'Group conflict',
          severity: 'error' as const
        }
      ];

      const stats = detector.calculateConflictStats(conflicts);
      
      expect(stats.totalConflicts).toBe(3);
      expect(stats.venueConflicts).toBe(1);
      expect(stats.lecturerConflicts).toBe(1);
      expect(stats.studentGroupConflicts).toBe(1);
      expect(stats.affectedSessions).toBe(5); // Sessions 0, 1, 2, 3, 4 (all unique sessions)
    });
  });
});