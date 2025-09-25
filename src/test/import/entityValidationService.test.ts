import { EntityValidationService } from '../../services/import/entityValidationService';
import { MappedImportData, EntityMatchResults, MatchResult } from '../../types/import';
import { DayOfWeek, Equipment, AccessibilityFeature, Frequency } from '../../models/common';

describe('EntityValidationService', () => {
  let service: EntityValidationService;
  let mockMappedData: MappedImportData;
  let mockMatchResults: EntityMatchResults;

  beforeEach(() => {
    service = new EntityValidationService();
    
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
    
    mockMatchResults = {
      venues: new Map<number, MatchResult>(),
      lecturers: new Map<number, MatchResult>(),
      courses: new Map<number, MatchResult>(),
      studentGroups: new Map<number, MatchResult>()
    };
  });

  describe('validateImportData', () => {
    it('should return valid result for empty data', async () => {
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.entityCounts).toEqual({
        venues: { new: 0, existing: 0 },
        lecturers: { new: 0, existing: 0 },
        courses: { new: 0, existing: 0 },
        studentGroups: { new: 0, existing: 0 },
        schedules: { new: 0, conflicts: 0 }
      });
    });

    it('should validate all entity types', async () => {
      mockMappedData.venues = [{ name: 'Test Venue', capacity: 50, location: 'Building A' }];
      mockMappedData.lecturers = [{ name: 'Dr. Smith', email: 'smith@test.com', department: 'CS' }];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.entityCounts.venues.new).toBe(1);
      expect(result.entityCounts.lecturers.new).toBe(1);
    });
  });

  describe('venue validation', () => {
    it('should validate valid venue data', async () => {
      const validVenue = {
        name: 'Lecture Hall A',
        capacity: 100,
        equipment: [Equipment.PROJECTOR, Equipment.WHITEBOARD],
        availability: [],
        location: 'Main Building, Floor 1',
        accessibility: [AccessibilityFeature.WHEELCHAIR_ACCESSIBLE],
        building: 'Main Building',
        floor: 1,
        roomNumber: 'A101'
      };
      
      mockMappedData.venues = [validVenue];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(true);
      expect(result.errors.filter(e => e.severity === 'error')).toHaveLength(0);
    });

    it('should detect venue validation errors', async () => {
      const invalidVenue = {
        name: '', // Empty name
        capacity: -5, // Invalid capacity
        location: '', // Empty location
        floor: -20 // Invalid floor
      };
      
      mockMappedData.venues = [invalidVenue];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.filter(e => e.severity === 'error').length).toBeGreaterThan(0);
      
      const nameError = result.errors.find(e => e.field === 'name');
      expect(nameError).toBeDefined();
      expect(nameError?.row).toBe(2);
    });

    it('should generate warnings for unusual venue data', async () => {
      const unusualVenue = {
        name: 'Stadium',
        capacity: 50000, // Very high capacity
        location: 'Sports Complex',
        equipment: [Equipment.PROJECTOR, Equipment.PROJECTOR] // Duplicate equipment
      };
      
      mockMappedData.venues = [unusualVenue];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      
      const capacityWarning = result.warnings.find(w => w.field === 'capacity');
      expect(capacityWarning).toBeDefined();
      expect(capacityWarning?.message).toContain('unusually high');
    });

    it('should validate business rules for venue capacity', async () => {
      const invalidCapacityVenue = {
        name: 'Small Room',
        capacity: 0, // Below minimum
        location: 'Building B'
      };
      
      mockMappedData.venues = [invalidCapacityVenue];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(false);
      
      const capacityError = result.errors.find(e => e.field === 'capacity');
      expect(capacityError).toBeDefined();
      expect(capacityError?.message).toContain('must be greater than or equal to');
    });
  });

  describe('lecturer validation', () => {
    it('should validate valid lecturer data', async () => {
      const validLecturer = {
        name: 'Dr. Jane Smith',
        email: 'jane.smith@university.edu',
        department: 'Computer Science',
        subjects: ['Programming', 'Data Structures'],
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
          preferredDays: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY],
          avoidBackToBackClasses: false
        },
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40
      };
      
      mockMappedData.lecturers = [validLecturer];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(true);
      expect(result.errors.filter(e => e.severity === 'error')).toHaveLength(0);
    });

    it('should detect lecturer validation errors', async () => {
      const invalidLecturer = {
        name: '',
        email: 'invalid-email',
        department: '',
        subjects: [], // Empty subjects array
        maxHoursPerDay: 25, // Invalid hours
        maxHoursPerWeek: 200 // Invalid hours
      };
      
      mockMappedData.lecturers = [invalidLecturer];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.filter(e => e.severity === 'error').length).toBeGreaterThan(0);
    });

    it('should validate business rules for lecturer hours', async () => {
      const invalidHoursLecturer = {
        name: 'Dr. Overworked',
        email: 'overworked@test.com',
        department: 'Mathematics',
        subjects: ['Calculus'],
        maxHoursPerDay: 5,
        maxHoursPerWeek: 50, // More than 5 * 7 = 35
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
          maxHoursPerDay: 5,
          maxHoursPerWeek: 50,
          minimumBreakBetweenClasses: 15,
          preferredDays: [],
          avoidBackToBackClasses: false
        }
      };
      
      mockMappedData.lecturers = [invalidHoursLecturer];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(false);
      
      const hoursError = result.errors.find(e => e.field === 'maxHoursPerWeek');
      expect(hoursError).toBeDefined();
      expect(hoursError?.message).toContain('cannot exceed daily hours');
    });

    it('should generate warnings for lecturer preferences', async () => {
      const lecturerWithWarnings = {
        name: 'Dr. Available',
        email: 'available@test.com',
        department: 'Physics',
        subjects: ['Physics', 'Physics'], // Duplicate subjects
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
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
          preferredDays: [], // No preferred days
          avoidBackToBackClasses: false
        }
      };
      
      mockMappedData.lecturers = [lecturerWithWarnings];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      
      const subjectsWarning = result.warnings.find(w => w.field === 'subjects');
      expect(subjectsWarning).toBeDefined();
      expect(subjectsWarning?.message).toContain('Duplicate subjects');
    });
  });

  describe('course validation', () => {
    it('should validate valid course data', async () => {
      const validCourse = {
        name: 'Introduction to Programming',
        code: 'CS101',
        duration: 90,
        frequency: Frequency.WEEKLY,
        requiredEquipment: [Equipment.COMPUTER, Equipment.PROJECTOR],
        studentGroups: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
        lecturerId: '550e8400-e29b-41d4-a716-446655440003',
        constraints: [],
        department: 'Computer Science',
        credits: 3,
        description: 'Basic programming concepts'
      };
      
      mockMappedData.courses = [validCourse];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(true);
      expect(result.errors.filter(e => e.severity === 'error')).toHaveLength(0);
    });

    it('should detect course validation errors', async () => {
      const invalidCourse = {
        name: '',
        code: '',
        duration: 5, // Too short
        lecturerId: 'invalid-uuid',
        department: '',
        credits: -1 // Negative credits
      };
      
      mockMappedData.courses = [invalidCourse];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.filter(e => e.severity === 'error').length).toBeGreaterThan(0);
    });

    it('should validate business rules for course duration', async () => {
      const shortDurationCourse = {
        name: 'Quick Course',
        code: 'QC001',
        duration: 10, // Below minimum
        frequency: Frequency.WEEKLY,
        lecturerId: '550e8400-e29b-41d4-a716-446655440021',
        department: 'Test',
        credits: 1
      };
      
      mockMappedData.courses = [shortDurationCourse];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(false);
      
      const durationError = result.errors.find(e => e.field === 'duration');
      expect(durationError).toBeDefined();
      expect(durationError?.message).toContain('must be greater than or equal to');
    });

    it('should generate warnings for unusual course data', async () => {
      const unusualCourse = {
        name: 'Marathon Course',
        code: 'MC001',
        duration: 600, // Very long duration
        frequency: Frequency.WEEKLY,
        lecturerId: '550e8400-e29b-41d4-a716-446655440022',
        department: 'Test',
        credits: 25, // High credits
        requiredEquipment: [Equipment.PROJECTOR, Equipment.PROJECTOR] // Duplicate equipment
      };
      
      mockMappedData.courses = [unusualCourse];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      
      const durationWarning = result.warnings.find(w => w.field === 'duration');
      expect(durationWarning).toBeDefined();
      expect(durationWarning?.message).toContain('unusually long');
    });
  });

  describe('student group validation', () => {
    it('should validate valid student group data', async () => {
      const validGroup = {
        name: 'CS Year 1 Group A',
        size: 30,
        courses: ['550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005'],
        yearLevel: 1,
        department: 'Computer Science',
        program: 'Bachelor of Computer Science',
        semester: 1,
        academicYear: '2024-2025'
      };
      
      mockMappedData.studentGroups = [validGroup];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(true);
      expect(result.errors.filter(e => e.severity === 'error')).toHaveLength(0);
    });

    it('should detect student group validation errors', async () => {
      const invalidGroup = {
        name: '',
        size: 0, // Invalid size
        yearLevel: 0, // Invalid year level
        department: '',
        academicYear: '2024-2026' // Invalid format
      };
      
      mockMappedData.studentGroups = [invalidGroup];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.filter(e => e.severity === 'error').length).toBeGreaterThan(0);
    });

    it('should validate business rules for group size', async () => {
      const largeGroup = {
        name: 'Huge Group',
        size: 2000, // Very large
        yearLevel: 1,
        department: 'Test'
      };
      
      mockMappedData.studentGroups = [largeGroup];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      
      const sizeWarning = result.warnings.find(w => w.field === 'size');
      expect(sizeWarning).toBeDefined();
      expect(sizeWarning?.message).toContain('unusually large');
    });

    it('should validate academic year format', async () => {
      const invalidYearGroup = {
        name: 'Test Group',
        size: 25,
        yearLevel: 1,
        department: 'Test',
        academicYear: '2024-2026' // Should be consecutive years
      };
      
      mockMappedData.studentGroups = [invalidYearGroup];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(false);
      
      const yearError = result.errors.find(e => e.field === 'academicYear');
      expect(yearError).toBeDefined();
      expect(yearError?.message).toContain('exactly one year after');
    });
  });

  describe('schedule validation', () => {
    it('should validate valid schedule data', async () => {
      const validSchedule = {
        id: '550e8400-e29b-41d4-a716-446655440006',
        courseId: '550e8400-e29b-41d4-a716-446655440007',
        lecturerId: '550e8400-e29b-41d4-a716-446655440008',
        venueId: '550e8400-e29b-41d4-a716-446655440009',
        studentGroups: ['550e8400-e29b-41d4-a716-446655440010'],
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T10:30:00Z'),
        dayOfWeek: DayOfWeek.MONDAY,
        weekNumber: 1
      };
      
      mockMappedData.schedules = [validSchedule];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(true);
      expect(result.errors.filter(e => e.severity === 'error')).toHaveLength(0);
    });

    it('should detect schedule validation errors', async () => {
      const invalidSchedule = {
        id: 'invalid-uuid',
        courseId: '',
        lecturerId: '',
        venueId: '',
        studentGroups: [], // Empty array
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T09:00:00Z'), // End before start
        dayOfWeek: 'INVALID_DAY',
        weekNumber: 100 // Invalid week number
      };
      
      mockMappedData.schedules = [invalidSchedule];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.filter(e => e.severity === 'error').length).toBeGreaterThan(0);
    });

    it('should validate business rules for session duration', async () => {
      const shortSession = {
        id: '550e8400-e29b-41d4-a716-446655440011',
        courseId: '550e8400-e29b-41d4-a716-446655440012',
        lecturerId: '550e8400-e29b-41d4-a716-446655440013',
        venueId: '550e8400-e29b-41d4-a716-446655440014',
        studentGroups: ['550e8400-e29b-41d4-a716-446655440015'],
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T09:05:00Z'), // Only 5 minutes
        dayOfWeek: DayOfWeek.MONDAY
      };
      
      mockMappedData.schedules = [shortSession];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(false);
      
      const durationError = result.errors.find(e => e.field === 'duration');
      expect(durationError).toBeDefined();
      expect(durationError?.message).toContain('must be at least');
    });

    it('should generate warnings for unusual scheduling times', async () => {
      const lateSession = {
        id: '550e8400-e29b-41d4-a716-446655440016',
        courseId: '550e8400-e29b-41d4-a716-446655440017',
        lecturerId: '550e8400-e29b-41d4-a716-446655440018',
        venueId: '550e8400-e29b-41d4-a716-446655440019',
        studentGroups: ['550e8400-e29b-41d4-a716-446655440020'],
        startTime: new Date('2024-01-15T23:00:00Z'), // Very late
        endTime: new Date('2024-01-16T00:30:00Z'),
        dayOfWeek: DayOfWeek.MONDAY
      };
      
      mockMappedData.schedules = [lateSession];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      
      const timeWarning = result.warnings.find(w => w.field === 'startTime');
      expect(timeWarning).toBeDefined();
      expect(timeWarning?.message).toContain('outside typical hours');
    });
  });

  describe('entity counts calculation', () => {
    it('should calculate correct entity counts with matches', async () => {
      mockMappedData.venues = [{ name: 'Venue 1' }, { name: 'Venue 2' }];
      mockMappedData.lecturers = [{ name: 'Lecturer 1' }];
      
      // Mock match results - first venue exists, second is new
      mockMatchResults.venues.set(0, { 
        entityId: 'existing-venue-1', 
        confidence: 0.9, 
        matchType: 'exact', 
        suggestedMatches: [] 
      });
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.entityCounts.venues.existing).toBe(1);
      expect(result.entityCounts.venues.new).toBe(1);
      expect(result.entityCounts.lecturers.new).toBe(1);
      expect(result.entityCounts.lecturers.existing).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle validation exceptions gracefully', async () => {
      // Create malformed data that might cause exceptions
      const malformedData = {
        venues: [null, undefined, { circular: {} }],
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
      
      // Add circular reference
      (malformedData.venues[2] as any).circular.self = malformedData.venues[2];
      
      const result = await service.validateImportData(malformedData as any, mockMatchResults);
      
      // Should not throw, but should have errors
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.isValid).toBe(false);
    });
  });

  describe('suggested fixes', () => {
    it('should provide helpful suggested fixes for common errors', async () => {
      const invalidVenue = {
        name: '',
        capacity: -1,
        location: ''
      };
      
      mockMappedData.venues = [invalidVenue];
      
      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      const nameError = result.errors.find(e => e.field === 'name');
      expect(nameError?.suggestedFix).toContain('Provide a descriptive venue name');
      
      const capacityError = result.errors.find(e => e.field === 'capacity');
      expect(capacityError?.suggestedFix).toContain('Set a valid capacity');
    });
  });

  describe('schedule conflict detection integration', () => {
    it('should detect venue conflicts in schedule data', async () => {
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

      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(false);
      expect(result.entityCounts.schedules.conflicts).toBeGreaterThan(0);
      
      const conflictError = result.errors.find(e => e.message.includes('Venue double-booking'));
      expect(conflictError).toBeDefined();
      expect(conflictError?.severity).toBe('error');
      expect(conflictError?.suggestedFix).toContain('different venue');
    });

    it('should detect lecturer conflicts in schedule data', async () => {
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

      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(false);
      expect(result.entityCounts.schedules.conflicts).toBeGreaterThan(0);
      
      const conflictError = result.errors.find(e => e.message.includes('Lecturer conflict'));
      expect(conflictError).toBeDefined();
      expect(conflictError?.severity).toBe('error');
      expect(conflictError?.suggestedFix).toContain('different lecturer');
    });

    it('should detect student group conflicts in schedule data', async () => {
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

      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      expect(result.isValid).toBe(false);
      expect(result.entityCounts.schedules.conflicts).toBeGreaterThan(0);
      
      const conflictError = result.errors.find(e => e.message.includes('Student group overlap'));
      expect(conflictError).toBeDefined();
      expect(conflictError?.severity).toBe('error');
      expect(conflictError?.suggestedFix).toContain('Reschedule');
    });
  });

  describe('validation reporting integration', () => {
    it('should integrate with validation reporting service', async () => {
      // Import the ValidationReportingService
      const { ValidationReportingService } = await import('../../services/import/validationReportingService');
      const reportingService = new ValidationReportingService();

      // Create test data with some errors and warnings
      mockMappedData.venues = [
        { name: '', capacity: -1, location: '' }, // Invalid venue
        { name: 'Large Hall', capacity: 5000, location: 'Building A' } // Valid but with warning
      ];

      const result = await service.validateImportData(mockMappedData, mockMatchResults);
      
      // Generate comprehensive report
      const report = reportingService.generateValidationReport(result, mockMappedData, mockMatchResults);
      
      expect(report).toBeDefined();
      expect(report.summary.totalErrors).toBeGreaterThan(0);
      expect(report.summary.overallStatus).toBe('invalid');
      expect(report.summary.readyForImport).toBe(false);
      
      // Check entity breakdown
      expect(report.entityBreakdown.venues.total).toBe(2);
      expect(report.entityBreakdown.venues.invalid).toBeGreaterThan(0);
      
      // Check recommendations
      const errorFixRecommendation = report.recommendations.find(r => r.type === 'error_fix');
      expect(errorFixRecommendation).toBeDefined();
      expect(errorFixRecommendation?.priority).toBe('critical');
      
      // Check detailed error grouping - use more flexible checks
      expect(Object.keys(report.detailedErrors.byEntityType).length).toBeGreaterThan(0);
      expect(Object.keys(report.detailedErrors.byErrorType).length).toBeGreaterThan(0);
    });
  });
});