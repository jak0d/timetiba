import { ConstraintValidator, ValidationContext } from '../services/constraintValidator';
import { Constraint, ConstraintType } from '../models/constraint';
import { ScheduledSession } from '../models/schedule';
import { DayOfWeek, Priority, Equipment, Frequency } from '../models/common';

describe('ConstraintValidator', () => {
  let constraintValidator: ConstraintValidator;
  let mockContext: ValidationContext;

  beforeEach(() => {
    constraintValidator = new ConstraintValidator();
    
    // Setup mock context
    mockContext = {
      venues: [
        {
          id: 'venue1',
          name: 'Room A101',
          capacity: 30,
          equipment: [Equipment.PROJECTOR, Equipment.WHITEBOARD],
          availability: [
            { startTime: '09:00', endTime: '17:00', dayOfWeek: DayOfWeek.MONDAY },
            { startTime: '09:00', endTime: '17:00', dayOfWeek: DayOfWeek.TUESDAY }
          ],
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
            [DayOfWeek.TUESDAY]: [{ startTime: '10:00', endTime: '16:00', dayOfWeek: DayOfWeek.TUESDAY }],
            [DayOfWeek.WEDNESDAY]: [],
            [DayOfWeek.THURSDAY]: [{ startTime: '09:00', endTime: '17:00', dayOfWeek: DayOfWeek.THURSDAY }],
            [DayOfWeek.FRIDAY]: [{ startTime: '09:00', endTime: '17:00', dayOfWeek: DayOfWeek.FRIDAY }],
            [DayOfWeek.SATURDAY]: [],
            [DayOfWeek.SUNDAY]: []
          },
          preferences: {
            preferredTimeSlots: [
              { startTime: '10:00', endTime: '15:00', dayOfWeek: DayOfWeek.MONDAY }
            ],
            maxHoursPerDay: 6,
            maxHoursPerWeek: 30,
            minimumBreakBetweenClasses: 15,
            preferredDays: ['monday', 'tuesday'],
            avoidBackToBackClasses: true
          },
          maxHoursPerDay: 8,
          maxHoursPerWeek: 40,
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
          name: 'CS-2024-B',
          size: 35,
          courses: ['course1'],
          yearLevel: 2,
          department: 'Computer Science',
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
        }
      ],
      constraints: []
    };
  });

  describe('validateAvailabilityConstraint', () => {
    it('should detect lecturer availability violation', () => {
      const constraint: Constraint = {
        id: 'constraint1',
        type: ConstraintType.HARD_AVAILABILITY,
        priority: Priority.CRITICAL,
        entities: ['lecturer1'],
        rule: { field: 'availability', operator: 'equals', value: true },
        description: 'Lecturer must be available',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-17T08:00:00'), // Wednesday, lecturer not available
          endTime: new Date('2024-01-17T09:30:00'),
          dayOfWeek: DayOfWeek.WEDNESDAY
        }
      ];

      mockContext.constraints = [constraint];
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]?.constraintType).toBe(ConstraintType.HARD_AVAILABILITY);
      expect(result.violations[0]?.severity).toBe('hard');
      expect(result.isValid).toBe(false);
    });

    it('should detect venue availability violation', () => {
      const constraint: Constraint = {
        id: 'constraint1',
        type: ConstraintType.HARD_AVAILABILITY,
        priority: Priority.CRITICAL,
        entities: ['venue1'],
        rule: { field: 'availability', operator: 'equals', value: true },
        description: 'Venue must be available',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-17T18:00:00'), // After venue availability
          endTime: new Date('2024-01-17T19:30:00'),
          dayOfWeek: DayOfWeek.WEDNESDAY
        }
      ];

      mockContext.constraints = [constraint];
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]?.constraintType).toBe(ConstraintType.HARD_AVAILABILITY);
      expect(result.violations[0]?.severity).toBe('hard');
    });

    it('should pass when lecturer is available', () => {
      const constraint: Constraint = {
        id: 'constraint1',
        type: ConstraintType.HARD_AVAILABILITY,
        priority: Priority.CRITICAL,
        entities: ['lecturer1'],
        rule: { field: 'availability', operator: 'equals', value: true },
        description: 'Lecturer must be available',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T10:00:00'), // Monday, within availability
          endTime: new Date('2024-01-15T11:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      mockContext.constraints = [constraint];
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      expect(result.violations).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateCapacityConstraint', () => {
    it('should detect capacity violation', () => {
      const constraint: Constraint = {
        id: 'constraint1',
        type: ConstraintType.VENUE_CAPACITY,
        priority: Priority.HIGH,
        entities: ['venue1'],
        rule: { field: 'capacity', operator: 'less_than', value: 100 },
        description: 'Venue capacity must not be exceeded',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1', // Capacity: 30
          studentGroups: ['group1', 'group2'], // Total: 25 + 35 = 60 students
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      mockContext.constraints = [constraint];
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]?.constraintType).toBe(ConstraintType.VENUE_CAPACITY);
      expect(result.violations[0]?.severity).toBe('hard');
      expect(result.violations[0]?.violationScore).toBeGreaterThan(0);
    });

    it('should pass when capacity is sufficient', () => {
      const constraint: Constraint = {
        id: 'constraint1',
        type: ConstraintType.VENUE_CAPACITY,
        priority: Priority.HIGH,
        entities: ['venue1'],
        rule: { field: 'capacity', operator: 'less_than', value: 100 },
        description: 'Venue capacity must not be exceeded',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1', // Capacity: 30
          studentGroups: ['group1'], // Size: 25 students
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      mockContext.constraints = [constraint];
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      expect(result.violations).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateEquipmentConstraint', () => {
    it('should detect missing equipment', () => {
      const constraint: Constraint = {
        id: 'constraint1',
        type: ConstraintType.EQUIPMENT_REQUIREMENT,
        priority: Priority.HIGH,
        entities: ['course1'],
        rule: { field: 'equipment', operator: 'in', value: ['computer', 'projector'] },
        description: 'Required equipment must be available',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1', // Requires COMPUTER and PROJECTOR
          lecturerId: 'lecturer1',
          venueId: 'venue1', // Only has PROJECTOR and WHITEBOARD
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      mockContext.constraints = [constraint];
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]?.constraintType).toBe(ConstraintType.EQUIPMENT_REQUIREMENT);
      expect(result.violations[0]?.description).toContain('computer');
    });

    it('should pass when all equipment is available', () => {
      const constraint: Constraint = {
        id: 'constraint1',
        type: ConstraintType.EQUIPMENT_REQUIREMENT,
        priority: Priority.HIGH,
        entities: ['course1'],
        rule: { field: 'equipment', operator: 'in', value: ['computer', 'projector'] },
        description: 'Required equipment must be available',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue2', // Has COMPUTER and SMARTBOARD
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      // Update course to only require COMPUTER
      mockContext.courses[0]!.requiredEquipment = [Equipment.COMPUTER];
      mockContext.constraints = [constraint];
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      expect(result.violations).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateLecturerPreferenceConstraint', () => {
    it('should detect preference violation for non-preferred time', () => {
      const constraint: Constraint = {
        id: 'constraint1',
        type: ConstraintType.LECTURER_PREFERENCE,
        priority: Priority.MEDIUM,
        entities: ['lecturer1'],
        rule: { field: 'preferredTime', operator: 'equals', value: true },
        description: 'Lecturer preference should be respected',
        isActive: true,
        weight: 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T16:00:00'), // Outside preferred time (10:00-15:00)
          endTime: new Date('2024-01-15T17:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      mockContext.constraints = [constraint];
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]?.constraintType).toBe(ConstraintType.LECTURER_PREFERENCE);
      expect(result.violations[0]?.severity).toBe('soft');
      expect(result.violations[0]?.weight).toBe(0.8);
    });

    it('should detect back-to-back classes violation', () => {
      const constraint: Constraint = {
        id: 'constraint1',
        type: ConstraintType.LECTURER_PREFERENCE,
        priority: Priority.MEDIUM,
        entities: ['lecturer1'],
        rule: { field: 'avoidBackToBack', operator: 'equals', value: true },
        description: 'Avoid back-to-back classes',
        isActive: true,
        weight: 0.7,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        },
        {
          id: 'session2',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T11:30:00'), // Immediately after session1
          endTime: new Date('2024-01-15T13:00:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      mockContext.constraints = [constraint];
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      expect(result.violations.length).toBeGreaterThan(0);
      const backToBackViolations = result.violations.filter(v => 
        v.description.includes('back-to-back')
      );
      expect(backToBackViolations.length).toBeGreaterThan(0);
    });

    it('should pass when preferences are respected', () => {
      const constraint: Constraint = {
        id: 'constraint1',
        type: ConstraintType.LECTURER_PREFERENCE,
        priority: Priority.MEDIUM,
        entities: ['lecturer1'],
        rule: { field: 'preferredTime', operator: 'equals', value: true },
        description: 'Lecturer preference should be respected',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T11:00:00'), // Within preferred time (10:00-15:00)
          endTime: new Date('2024-01-15T12:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      mockContext.constraints = [constraint];
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      const preferenceViolations = result.violations.filter(v => 
        v.description.includes('preferred time')
      );
      expect(preferenceViolations).toHaveLength(0);
    });
  });

  describe('validateStudentBreakConstraint', () => {
    it('should detect insufficient break time', () => {
      const constraint: Constraint = {
        id: 'constraint1',
        type: ConstraintType.STUDENT_BREAK,
        priority: Priority.HIGH,
        entities: ['group1'],
        rule: { field: 'minBreakMinutes', operator: 'greater_than', value: { minBreakMinutes: 30 } },
        description: 'Students need adequate break time',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        },
        {
          id: 'session2',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T11:45:00'), // Only 15 minutes break
          endTime: new Date('2024-01-15T13:15:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      mockContext.constraints = [constraint];
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]?.constraintType).toBe(ConstraintType.STUDENT_BREAK);
      expect(result.violations[0]?.description).toContain('break time');
    });

    it('should pass when break time is sufficient', () => {
      const constraint: Constraint = {
        id: 'constraint1',
        type: ConstraintType.STUDENT_BREAK,
        priority: Priority.HIGH,
        entities: ['group1'],
        rule: { field: 'minBreakMinutes', operator: 'greater_than', value: { minBreakMinutes: 15 } },
        description: 'Students need adequate break time',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        },
        {
          id: 'session2',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T12:00:00'), // 30 minutes break
          endTime: new Date('2024-01-15T13:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      mockContext.constraints = [constraint];
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      expect(result.violations).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateTimeWindowConstraint', () => {
    it('should detect time window violation', () => {
      const constraint: Constraint = {
        id: 'constraint1',
        type: ConstraintType.TIME_WINDOW,
        priority: Priority.HIGH,
        entities: ['course1'],
        rule: { 
          field: 'timeWindow', 
          operator: 'between', 
          value: { startTime: '09:00', endTime: '17:00' } 
        },
        description: 'Classes must be within business hours',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T18:00:00'), // After 17:00
          endTime: new Date('2024-01-15T19:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      mockContext.constraints = [constraint];
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]?.constraintType).toBe(ConstraintType.TIME_WINDOW);
      expect(result.violations[0]?.description).toContain('time window');
    });

    it('should pass when within time window', () => {
      const constraint: Constraint = {
        id: 'constraint1',
        type: ConstraintType.TIME_WINDOW,
        priority: Priority.HIGH,
        entities: ['course1'],
        rule: { 
          field: 'timeWindow', 
          operator: 'between', 
          value: { startTime: '08:00', endTime: '18:00' } 
        },
        description: 'Classes must be within business hours',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T10:00:00'), // Within 08:00-18:00
          endTime: new Date('2024-01-15T11:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      mockContext.constraints = [constraint];
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      expect(result.violations).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateConstraints', () => {
    it('should validate multiple constraints and provide comprehensive result', () => {
      const constraints: Constraint[] = [
        {
          id: 'constraint1',
          type: ConstraintType.HARD_AVAILABILITY,
          priority: Priority.CRITICAL,
          entities: ['lecturer1'],
          rule: { field: 'availability', operator: 'equals', value: true },
          description: 'Lecturer must be available',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'constraint2',
          type: ConstraintType.VENUE_CAPACITY,
          priority: Priority.HIGH,
          entities: ['venue1'],
          rule: { field: 'capacity', operator: 'less_than', value: 100 },
          description: 'Venue capacity must not be exceeded',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'constraint3',
          type: ConstraintType.LECTURER_PREFERENCE,
          priority: Priority.MEDIUM,
          entities: ['lecturer1'],
          rule: { field: 'preferredTime', operator: 'equals', value: true },
          description: 'Lecturer preference should be respected',
          isActive: true,
          weight: 0.5,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1', 'group2'], // Exceeds capacity
          startTime: new Date('2024-01-15T16:00:00'), // Outside preferred time
          endTime: new Date('2024-01-15T17:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      mockContext.constraints = constraints;
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.summary.totalConstraints).toBe(3);
      expect(result.summary.violatedConstraints).toBeGreaterThan(0);
      expect(result.totalScore).toBeLessThan(1.0);
      
      // Should have both hard and soft violations
      expect(result.hardViolations.length).toBeGreaterThan(0);
      expect(result.softViolations.length).toBeGreaterThan(0);
    });

    it('should return perfect score when all constraints are satisfied', () => {
      const constraints: Constraint[] = [
        {
          id: 'constraint1',
          type: ConstraintType.HARD_AVAILABILITY,
          priority: Priority.CRITICAL,
          entities: ['lecturer1'],
          rule: { field: 'availability', operator: 'equals', value: true },
          description: 'Lecturer must be available',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-15T11:00:00'), // Within availability and preferences
          endTime: new Date('2024-01-15T12:30:00'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ];

      mockContext.constraints = constraints;
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      expect(result.violations).toHaveLength(0);
      expect(result.isValid).toBe(true);
      expect(result.totalScore).toBe(1.0);
      expect(result.summary.violatedConstraints).toBe(0);
    });

    it('should ignore inactive constraints', () => {
      const constraints: Constraint[] = [
        {
          id: 'constraint1',
          type: ConstraintType.HARD_AVAILABILITY,
          priority: Priority.CRITICAL,
          entities: ['lecturer1'],
          rule: { field: 'availability', operator: 'equals', value: true },
          description: 'Lecturer must be available',
          isActive: false, // Inactive constraint
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const sessions: ScheduledSession[] = [
        {
          id: 'session1',
          courseId: 'course1',
          lecturerId: 'lecturer1',
          venueId: 'venue1',
          studentGroups: ['group1'],
          startTime: new Date('2024-01-17T08:00:00'), // Would violate if active
          endTime: new Date('2024-01-17T09:30:00'),
          dayOfWeek: DayOfWeek.WEDNESDAY
        }
      ];

      mockContext.constraints = constraints;
      const result = constraintValidator.validateConstraints(sessions, mockContext);

      expect(result.violations).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });
  });
});