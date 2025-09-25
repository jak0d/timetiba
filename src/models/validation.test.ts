import {
  createVenueSchema,
  updateVenueSchema,
  createLecturerSchema,
  createCourseSchema,
  createStudentGroupSchema,
  createConstraintSchema,
  createClashSchema,
  createScheduleSchema,
  validateSchema,
  validateAndThrow
} from '../utils/validation';
import { 
  DayOfWeek, 
  Equipment, 
  AccessibilityFeature, 
  Frequency, 
  Priority, 
  Severity 
} from './common';
import { ConstraintType } from './constraint';
import { ClashType } from './clash';

describe('Data Model Validation', () => {
  describe('Venue Validation', () => {
    const validVenueData = {
      name: 'Lecture Hall A',
      capacity: 100,
      equipment: [Equipment.PROJECTOR, Equipment.WHITEBOARD],
      availability: [
        {
          startTime: '09:00',
          endTime: '17:00',
          dayOfWeek: DayOfWeek.MONDAY
        }
      ],
      location: 'Building A, Floor 1',
      accessibility: [AccessibilityFeature.WHEELCHAIR_ACCESSIBLE],
      building: 'Building A',
      floor: 1,
      roomNumber: 'A101'
    };

    it('should validate correct venue data', () => {
      const { error, value } = validateSchema(createVenueSchema, validVenueData);
      expect(error).toBeUndefined();
      expect(value).toMatchObject(validVenueData);
    });

    it('should reject venue with invalid capacity', () => {
      const invalidData = { ...validVenueData, capacity: 0 };
      const { error } = validateSchema(createVenueSchema, invalidData);
      expect(error).toBeDefined();
      expect(error?.message).toContain('capacity');
    });

    it('should reject venue with invalid time format', () => {
      const invalidData = {
        ...validVenueData,
        availability: [
          {
            startTime: '25:00', // Invalid hour
            endTime: '17:00',
            dayOfWeek: DayOfWeek.MONDAY
          }
        ]
      };
      const { error } = validateSchema(createVenueSchema, invalidData);
      expect(error).toBeDefined();
    });

    it('should validate venue update with partial data', () => {
      const updateData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Updated Lecture Hall'
      };
      const { error } = validateSchema(updateVenueSchema, updateData);
      expect(error).toBeUndefined();
    });

    it('should reject update without valid UUID', () => {
      const invalidData = {
        id: 'invalid-uuid',
        name: 'Updated Hall'
      };
      const { error } = validateSchema(updateVenueSchema, invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Lecturer Validation', () => {
    const validLecturerData = {
      name: 'Dr. John Smith',
      email: 'john.smith@university.edu',
      department: 'Computer Science',
      subjects: ['Programming', 'Data Structures'],
      availability: {
        [DayOfWeek.MONDAY]: [
          { startTime: '09:00', endTime: '17:00', dayOfWeek: DayOfWeek.MONDAY }
        ],
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
        preferredDays: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY],
        avoidBackToBackClasses: true
      },
      maxHoursPerDay: 8,
      maxHoursPerWeek: 40,
      employeeId: 'EMP001',
      phone: '+1234567890'
    };

    it('should validate correct lecturer data', () => {
      const { error, value } = validateSchema(createLecturerSchema, validLecturerData);
      expect(error).toBeUndefined();
      expect(value).toMatchObject(validLecturerData);
    });

    it('should reject lecturer with invalid email', () => {
      const invalidData = { ...validLecturerData, email: 'invalid-email' };
      const { error } = validateSchema(createLecturerSchema, invalidData);
      expect(error).toBeDefined();
      expect(error?.message).toContain('email');
    });

    it('should reject lecturer with empty subjects array', () => {
      const invalidData = { ...validLecturerData, subjects: [] };
      const { error } = validateSchema(createLecturerSchema, invalidData);
      expect(error).toBeDefined();
    });

    it('should reject lecturer with invalid phone number', () => {
      const invalidData = { ...validLecturerData, phone: 'abc123' };
      const { error } = validateSchema(createLecturerSchema, invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Course Validation', () => {
    const validCourseData = {
      name: 'Introduction to Programming',
      code: 'CS101',
      duration: 90,
      frequency: Frequency.WEEKLY,
      requiredEquipment: [Equipment.COMPUTER, Equipment.PROJECTOR],
      studentGroups: ['123e4567-e89b-12d3-a456-426614174000'],
      lecturerId: '123e4567-e89b-12d3-a456-426614174001',
      constraints: [
        {
          type: 'time_preference',
          description: 'Prefer morning sessions',
          priority: 'medium',
          parameters: { preferredTime: 'morning' }
        }
      ],
      department: 'Computer Science',
      credits: 3,
      description: 'Basic programming concepts'
    };

    it('should validate correct course data', () => {
      const { error, value } = validateSchema(createCourseSchema, validCourseData);
      expect(error).toBeUndefined();
      expect(value).toMatchObject(validCourseData);
    });

    it('should reject course with invalid duration', () => {
      const invalidData = { ...validCourseData, duration: 10 }; // Too short
      const { error } = validateSchema(createCourseSchema, invalidData);
      expect(error).toBeDefined();
    });

    it('should reject course with invalid frequency', () => {
      const invalidData = { ...validCourseData, frequency: 'invalid' as Frequency };
      const { error } = validateSchema(createCourseSchema, invalidData);
      expect(error).toBeDefined();
    });

    it('should reject course with invalid lecturer ID', () => {
      const invalidData = { ...validCourseData, lecturerId: 'invalid-uuid' };
      const { error } = validateSchema(createCourseSchema, invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Student Group Validation', () => {
    const validStudentGroupData = {
      name: 'CS Year 1 Group A',
      size: 30,
      courses: ['123e4567-e89b-12d3-a456-426614174000'],
      yearLevel: 1,
      department: 'Computer Science',
      program: 'Bachelor of Computer Science',
      semester: 1,
      academicYear: '2024-2025'
    };

    it('should validate correct student group data', () => {
      const { error, value } = validateSchema(createStudentGroupSchema, validStudentGroupData);
      expect(error).toBeUndefined();
      expect(value).toMatchObject(validStudentGroupData);
    });

    it('should reject group with invalid size', () => {
      const invalidData = { ...validStudentGroupData, size: 0 };
      const { error } = validateSchema(createStudentGroupSchema, invalidData);
      expect(error).toBeDefined();
    });

    it('should reject group with invalid year level', () => {
      const invalidData = { ...validStudentGroupData, yearLevel: 0 };
      const { error } = validateSchema(createStudentGroupSchema, invalidData);
      expect(error).toBeDefined();
    });

    it('should reject group with invalid academic year format', () => {
      const invalidData = { ...validStudentGroupData, academicYear: '2024' };
      const { error } = validateSchema(createStudentGroupSchema, invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Constraint Validation', () => {
    const validConstraintData = {
      type: ConstraintType.LECTURER_PREFERENCE,
      priority: Priority.MEDIUM,
      entities: ['123e4567-e89b-12d3-a456-426614174000'],
      rule: {
        field: 'timeSlot',
        operator: 'in' as const,
        value: ['morning', 'afternoon'],
        message: 'Lecturer prefers morning or afternoon slots'
      },
      description: 'Lecturer time preference constraint',
      weight: 0.7
    };

    it('should validate correct constraint data', () => {
      const { error, value } = validateSchema(createConstraintSchema, validConstraintData);
      expect(error).toBeUndefined();
      expect(value).toMatchObject(validConstraintData);
    });

    it('should reject constraint with invalid type', () => {
      const invalidData = { ...validConstraintData, type: 'invalid' as ConstraintType };
      const { error } = validateSchema(createConstraintSchema, invalidData);
      expect(error).toBeDefined();
    });

    it('should reject constraint with empty entities array', () => {
      const invalidData = { ...validConstraintData, entities: [] };
      const { error } = validateSchema(createConstraintSchema, invalidData);
      expect(error).toBeDefined();
    });

    it('should reject constraint with invalid weight', () => {
      const invalidData = { ...validConstraintData, weight: 1.5 }; // > 1
      const { error } = validateSchema(createConstraintSchema, invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Clash Validation', () => {
    const validClashData = {
      type: ClashType.VENUE_DOUBLE_BOOKING,
      severity: Severity.ERROR,
      affectedEntities: [
        '123e4567-e89b-12d3-a456-426614174000',
        '123e4567-e89b-12d3-a456-426614174001'
      ],
      description: 'Two courses scheduled in the same venue at the same time',
      scheduleId: '123e4567-e89b-12d3-a456-426614174002',
      sessionIds: [
        '123e4567-e89b-12d3-a456-426614174003',
        '123e4567-e89b-12d3-a456-426614174004'
      ]
    };

    it('should validate correct clash data', () => {
      const { error, value } = validateSchema(createClashSchema, validClashData);
      expect(error).toBeUndefined();
      expect(value).toMatchObject(validClashData);
    });

    it('should reject clash with invalid type', () => {
      const invalidData = { ...validClashData, type: 'invalid' as ClashType };
      const { error } = validateSchema(createClashSchema, invalidData);
      expect(error).toBeDefined();
    });

    it('should reject clash with empty affected entities', () => {
      const invalidData = { ...validClashData, affectedEntities: [] };
      const { error } = validateSchema(createClashSchema, invalidData);
      expect(error).toBeDefined();
    });

    it('should reject clash with invalid schedule ID', () => {
      const invalidData = { ...validClashData, scheduleId: 'invalid-uuid' };
      const { error } = validateSchema(createClashSchema, invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Schedule Validation', () => {
    const validScheduleData = {
      name: 'Fall 2024 Schedule',
      academicPeriod: 'Fall 2024',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-15'),
      description: 'Complete schedule for Fall 2024 semester'
    };

    it('should validate correct schedule data', () => {
      const { error, value } = validateSchema(createScheduleSchema, validScheduleData);
      expect(error).toBeUndefined();
      expect(value).toMatchObject(validScheduleData);
    });

    it('should reject schedule with end date before start date', () => {
      const invalidData = {
        ...validScheduleData,
        startDate: new Date('2024-12-15'),
        endDate: new Date('2024-09-01')
      };
      const { error } = validateSchema(createScheduleSchema, invalidData);
      expect(error).toBeDefined();
    });

    it('should reject schedule with empty name', () => {
      const invalidData = { ...validScheduleData, name: '' };
      const { error } = validateSchema(createScheduleSchema, invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Validation Helper Functions', () => {
    it('should throw error when validateAndThrow encounters invalid data', () => {
      const invalidData = { name: '' }; // Empty name should fail
      expect(() => {
        validateAndThrow(createVenueSchema, invalidData);
      }).toThrow();
    });

    it('should return value when validateAndThrow encounters valid data', () => {
      const validData = {
        name: 'Test Venue',
        capacity: 50,
        location: 'Test Location'
      };
      const result = validateAndThrow(createVenueSchema, validData);
      expect(result).toMatchObject(validData);
    });

    it('should strip unknown properties', () => {
      const dataWithExtra = {
        name: 'Test Venue',
        capacity: 50,
        location: 'Test Location',
        unknownProperty: 'should be stripped'
      };
      const { value } = validateSchema(createVenueSchema, dataWithExtra);
      expect(value).not.toHaveProperty('unknownProperty');
    });
  });
});