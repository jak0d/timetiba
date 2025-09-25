import { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning, 
  MappedImportData, 
  EntityMatchResults 
} from '../../types/import';
import { 
  createVenueSchema, 
  createLecturerSchema, 
  createCourseSchema, 
  createStudentGroupSchema,
  scheduledSessionSchema
} from '../../utils/validation';
import { VALIDATION_CONSTANTS } from '../../utils/constants';
import { ScheduleConflictDetector } from './scheduleConflictDetector';

export class EntityValidationService {
  private conflictDetector: ScheduleConflictDetector;

  constructor() {
    this.conflictDetector = new ScheduleConflictDetector();
  }

  /**
   * Validates all imported entities against business rules and schemas
   */
  async validateImportData(
    mappedData: MappedImportData,
    matchResults: EntityMatchResults
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Validate venues
    const venueValidation = await this.validateVenues(mappedData.venues);
    errors.push(...venueValidation.errors);
    warnings.push(...venueValidation.warnings);
    
    // Validate lecturers
    const lecturerValidation = await this.validateLecturers(mappedData.lecturers);
    errors.push(...lecturerValidation.errors);
    warnings.push(...lecturerValidation.warnings);
    
    // Validate courses
    const courseValidation = await this.validateCourses(mappedData.courses);
    errors.push(...courseValidation.errors);
    warnings.push(...courseValidation.warnings);
    
    // Validate student groups
    const studentGroupValidation = await this.validateStudentGroups(mappedData.studentGroups);
    errors.push(...studentGroupValidation.errors);
    warnings.push(...studentGroupValidation.warnings);
    
    // Validate schedules
    const scheduleValidation = await this.validateSchedules(mappedData.schedules);
    errors.push(...scheduleValidation.errors);
    warnings.push(...scheduleValidation.warnings);
    
    // Detect schedule conflicts
    const conflictResult = await this.conflictDetector.detectConflicts(mappedData);
    errors.push(...conflictResult.errors);
    warnings.push(...conflictResult.warnings);
    
    // Calculate entity counts
    const entityCounts = this.calculateEntityCounts(mappedData, matchResults);
    entityCounts.schedules.conflicts = conflictResult.conflictCount;
    
    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      entityCounts
    };
  }

  /**
   * Validates venue entities with business rules
   */
  private async validateVenues(venues: Partial<any>[]): Promise<{ errors: ValidationError[], warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    for (let i = 0; i < venues.length; i++) {
      const venue = venues[i];
      const rowNumber = i + 2; // Account for header row
      
      try {
        // Schema validation
        const { error } = createVenueSchema.validate(venue, { abortEarly: false });
        if (error) {
          error.details.forEach(detail => {
            errors.push({
              row: rowNumber,
              field: detail.path.join('.'),
              message: detail.message,
              severity: 'error',
              suggestedFix: this.getSuggestedFix('venue', detail.path.join('.'))
            });
          });
        }
        
        // Business rule validation
        await this.validateVenueBusinessRules(venue, rowNumber, errors, warnings);
        
      } catch (err) {
        errors.push({
          row: rowNumber,
          field: 'general',
          message: `Venue validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          severity: 'error'
        });
      }
    }
    
    return { errors, warnings };
  }

  /**
   * Validates lecturer entities with business rules
   */
  private async validateLecturers(lecturers: Partial<any>[]): Promise<{ errors: ValidationError[], warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    for (let i = 0; i < lecturers.length; i++) {
      const lecturer = lecturers[i];
      const rowNumber = i + 2;
      
      try {
        // Schema validation
        const { error } = createLecturerSchema.validate(lecturer, { abortEarly: false });
        if (error) {
          error.details.forEach(detail => {
            errors.push({
              row: rowNumber,
              field: detail.path.join('.'),
              message: detail.message,
              severity: 'error',
              suggestedFix: this.getSuggestedFix('lecturer', detail.path.join('.'))
            });
          });
        }
        
        // Business rule validation
        await this.validateLecturerBusinessRules(lecturer, rowNumber, errors, warnings);
        
      } catch (err) {
        errors.push({
          row: rowNumber,
          field: 'general',
          message: `Lecturer validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          severity: 'error'
        });
      }
    }
    
    return { errors, warnings };
  }

  /**
   * Validates course entities with business rules
   */
  private async validateCourses(courses: Partial<any>[]): Promise<{ errors: ValidationError[], warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      const rowNumber = i + 2;
      
      try {
        // Schema validation
        const { error } = createCourseSchema.validate(course, { abortEarly: false });
        if (error) {
          error.details.forEach(detail => {
            errors.push({
              row: rowNumber,
              field: detail.path.join('.'),
              message: detail.message,
              severity: 'error',
              suggestedFix: this.getSuggestedFix('course', detail.path.join('.'))
            });
          });
        }
        
        // Business rule validation
        await this.validateCourseBusinessRules(course, rowNumber, errors, warnings);
        
      } catch (err) {
        errors.push({
          row: rowNumber,
          field: 'general',
          message: `Course validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          severity: 'error'
        });
      }
    }
    
    return { errors, warnings };
  }

  /**
   * Validates student group entities with business rules
   */
  private async validateStudentGroups(studentGroups: Partial<any>[]): Promise<{ errors: ValidationError[], warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    for (let i = 0; i < studentGroups.length; i++) {
      const group = studentGroups[i];
      const rowNumber = i + 2;
      
      try {
        // Schema validation
        const { error } = createStudentGroupSchema.validate(group, { abortEarly: false });
        if (error) {
          error.details.forEach(detail => {
            errors.push({
              row: rowNumber,
              field: detail.path.join('.'),
              message: detail.message,
              severity: 'error',
              suggestedFix: this.getSuggestedFix('studentGroup', detail.path.join('.'))
            });
          });
        }
        
        // Business rule validation
        await this.validateStudentGroupBusinessRules(group, rowNumber, errors, warnings);
        
      } catch (err) {
        errors.push({
          row: rowNumber,
          field: 'general',
          message: `Student group validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          severity: 'error'
        });
      }
    }
    
    return { errors, warnings };
  }

  /**
   * Validates schedule entities with business rules
   */
  private async validateSchedules(schedules: Partial<any>[]): Promise<{ errors: ValidationError[], warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      const rowNumber = i + 2;
      
      try {
        // Schema validation
        const { error } = scheduledSessionSchema.validate(schedule, { abortEarly: false });
        if (error) {
          error.details.forEach(detail => {
            errors.push({
              row: rowNumber,
              field: detail.path.join('.'),
              message: detail.message,
              severity: 'error',
              suggestedFix: this.getSuggestedFix('schedule', detail.path.join('.'))
            });
          });
        }
        
        // Business rule validation
        await this.validateScheduleBusinessRules(schedule, rowNumber, errors, warnings);
        
      } catch (err) {
        errors.push({
          row: rowNumber,
          field: 'general',
          message: `Schedule validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          severity: 'error'
        });
      }
    }
    
    return { errors, warnings };
  }

  /**
   * Validates venue-specific business rules
   */
  private async validateVenueBusinessRules(
    venue: any, 
    rowNumber: number, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Capacity validation
    if (venue.capacity && venue.capacity < VALIDATION_CONSTANTS.MIN_VENUE_CAPACITY) {
      errors.push({
        row: rowNumber,
        field: 'capacity',
        message: `Venue capacity must be at least ${VALIDATION_CONSTANTS.MIN_VENUE_CAPACITY}`,
        severity: 'error',
        suggestedFix: `Set capacity to at least ${VALIDATION_CONSTANTS.MIN_VENUE_CAPACITY}`
      });
    }
    
    if (venue.capacity && venue.capacity > VALIDATION_CONSTANTS.MAX_VENUE_CAPACITY) {
      warnings.push({
        row: rowNumber,
        field: 'capacity',
        message: `Venue capacity of ${venue.capacity} is unusually high`,
        suggestedFix: 'Verify the capacity is correct'
      });
    }
    
    // Floor validation
    if (venue.floor !== undefined && venue.floor < VALIDATION_CONSTANTS.MIN_FLOOR) {
      errors.push({
        row: rowNumber,
        field: 'floor',
        message: `Floor number cannot be below ${VALIDATION_CONSTANTS.MIN_FLOOR}`,
        severity: 'error',
        suggestedFix: `Set floor to at least ${VALIDATION_CONSTANTS.MIN_FLOOR}`
      });
    }
    
    // Equipment validation
    if (venue.equipment && Array.isArray(venue.equipment)) {
      const duplicateEquipment = venue.equipment.filter((item: any, index: number) => 
        venue.equipment.indexOf(item) !== index
      );
      if (duplicateEquipment.length > 0) {
        warnings.push({
          row: rowNumber,
          field: 'equipment',
          message: `Duplicate equipment found: ${duplicateEquipment.join(', ')}`,
          suggestedFix: 'Remove duplicate equipment entries'
        });
      }
    }
  }

  /**
   * Validates lecturer-specific business rules
   */
  private async validateLecturerBusinessRules(
    lecturer: any, 
    rowNumber: number, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Hours validation
    if (lecturer.maxHoursPerDay && lecturer.maxHoursPerWeek) {
      const maxPossibleWeeklyHours = lecturer.maxHoursPerDay * 7;
      if (lecturer.maxHoursPerWeek > maxPossibleWeeklyHours) {
        errors.push({
          row: rowNumber,
          field: 'maxHoursPerWeek',
          message: `Weekly hours (${lecturer.maxHoursPerWeek}) cannot exceed daily hours (${lecturer.maxHoursPerDay}) × 7`,
          severity: 'error',
          suggestedFix: `Set weekly hours to maximum ${maxPossibleWeeklyHours}`
        });
      }
    }
    
    // Preferences validation
    if (lecturer.preferences) {
      const prefs = lecturer.preferences;
      
      // Validate minimum break duration
      if (prefs.minimumBreakBetweenClasses !== undefined && prefs.minimumBreakBetweenClasses < 0) {
        errors.push({
          row: rowNumber,
          field: 'preferences.minimumBreakBetweenClasses',
          message: 'Minimum break between classes cannot be negative',
          severity: 'error',
          suggestedFix: 'Set minimum break to 0 or positive value'
        });
      }
      
      // Validate preferred days
      if (prefs.preferredDays && prefs.preferredDays.length === 0) {
        warnings.push({
          row: rowNumber,
          field: 'preferences.preferredDays',
          message: 'No preferred days specified - lecturer will be available all days',
          suggestedFix: 'Specify preferred working days'
        });
      }
    }
    
    // Subject validation
    if (lecturer.subjects && Array.isArray(lecturer.subjects)) {
      const duplicateSubjects = lecturer.subjects.filter((subject: any, index: number) => 
        lecturer.subjects.indexOf(subject) !== index
      );
      if (duplicateSubjects.length > 0) {
        warnings.push({
          row: rowNumber,
          field: 'subjects',
          message: `Duplicate subjects found: ${duplicateSubjects.join(', ')}`,
          suggestedFix: 'Remove duplicate subject entries'
        });
      }
    }
  }

  /**
   * Validates course-specific business rules
   */
  private async validateCourseBusinessRules(
    course: any, 
    rowNumber: number, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Duration validation
    if (course.duration) {
      if (course.duration < VALIDATION_CONSTANTS.MIN_SESSION_DURATION) {
        errors.push({
          row: rowNumber,
          field: 'duration',
          message: `Course duration must be at least ${VALIDATION_CONSTANTS.MIN_SESSION_DURATION} minutes`,
          severity: 'error',
          suggestedFix: `Set duration to at least ${VALIDATION_CONSTANTS.MIN_SESSION_DURATION} minutes`
        });
      }
      
      if (course.duration > VALIDATION_CONSTANTS.MAX_SESSION_DURATION) {
        warnings.push({
          row: rowNumber,
          field: 'duration',
          message: `Course duration of ${course.duration} minutes is unusually long`,
          suggestedFix: 'Verify the duration is correct or consider splitting into multiple sessions'
        });
      }
      
      // Check if duration is not a multiple of 15 minutes
      if (course.duration % 15 !== 0) {
        warnings.push({
          row: rowNumber,
          field: 'duration',
          message: 'Course duration should typically be a multiple of 15 minutes',
          suggestedFix: 'Consider adjusting duration to nearest 15-minute interval'
        });
      }
    }
    
    // Credits validation
    if (course.credits !== undefined) {
      if (course.credits < 0) {
        errors.push({
          row: rowNumber,
          field: 'credits',
          message: 'Course credits cannot be negative',
          severity: 'error',
          suggestedFix: 'Set credits to 0 or positive value'
        });
      }
      
      if (course.credits > VALIDATION_CONSTANTS.MAX_CREDITS) {
        warnings.push({
          row: rowNumber,
          field: 'credits',
          message: `Course credits of ${course.credits} is unusually high`,
          suggestedFix: 'Verify the credit value is correct'
        });
      }
    }
    
    // Equipment validation
    if (course.requiredEquipment && Array.isArray(course.requiredEquipment)) {
      const duplicateEquipment = course.requiredEquipment.filter((item: any, index: number) => 
        course.requiredEquipment.indexOf(item) !== index
      );
      if (duplicateEquipment.length > 0) {
        warnings.push({
          row: rowNumber,
          field: 'requiredEquipment',
          message: `Duplicate equipment found: ${duplicateEquipment.join(', ')}`,
          suggestedFix: 'Remove duplicate equipment entries'
        });
      }
    }
  }

  /**
   * Validates student group-specific business rules
   */
  private async validateStudentGroupBusinessRules(
    group: any, 
    rowNumber: number, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Size validation
    if (group.size) {
      if (group.size < VALIDATION_CONSTANTS.MIN_GROUP_SIZE) {
        errors.push({
          row: rowNumber,
          field: 'size',
          message: `Student group size must be at least ${VALIDATION_CONSTANTS.MIN_GROUP_SIZE}`,
          severity: 'error',
          suggestedFix: `Set size to at least ${VALIDATION_CONSTANTS.MIN_GROUP_SIZE}`
        });
      }
      
      if (group.size > VALIDATION_CONSTANTS.MAX_GROUP_SIZE) {
        warnings.push({
          row: rowNumber,
          field: 'size',
          message: `Student group size of ${group.size} is unusually large`,
          suggestedFix: 'Verify the group size is correct or consider splitting into smaller groups'
        });
      }
    }
    
    // Year level validation
    if (group.yearLevel) {
      if (group.yearLevel < VALIDATION_CONSTANTS.MIN_YEAR_LEVEL) {
        errors.push({
          row: rowNumber,
          field: 'yearLevel',
          message: `Year level must be at least ${VALIDATION_CONSTANTS.MIN_YEAR_LEVEL}`,
          severity: 'error',
          suggestedFix: `Set year level to at least ${VALIDATION_CONSTANTS.MIN_YEAR_LEVEL}`
        });
      }
      
      if (group.yearLevel > VALIDATION_CONSTANTS.MAX_YEAR_LEVEL) {
        warnings.push({
          row: rowNumber,
          field: 'yearLevel',
          message: `Year level of ${group.yearLevel} is unusually high`,
          suggestedFix: 'Verify the year level is correct'
        });
      }
    }
    
    // Academic year format validation
    if (group.academicYear && typeof group.academicYear === 'string') {
      const currentYear = new Date().getFullYear();
      const yearMatch = group.academicYear.match(/^(\d{4})-(\d{4})$/);
      
      if (yearMatch) {
        const startYear = parseInt(yearMatch[1]);
        const endYear = parseInt(yearMatch[2]);
        
        if (endYear !== startYear + 1) {
          errors.push({
            row: rowNumber,
            field: 'academicYear',
            message: 'Academic year end must be exactly one year after start',
            severity: 'error',
            suggestedFix: `Use format like ${startYear}-${startYear + 1}`
          });
        }
        
        if (startYear < currentYear - 10 || startYear > currentYear + 5) {
          warnings.push({
            row: rowNumber,
            field: 'academicYear',
            message: `Academic year ${group.academicYear} seems unusual`,
            suggestedFix: 'Verify the academic year is correct'
          });
        }
      }
    }
  }

  /**
   * Validates schedule-specific business rules
   */
  private async validateScheduleBusinessRules(
    schedule: any, 
    rowNumber: number, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Time validation
    if (schedule.startTime && schedule.endTime) {
      const start = new Date(schedule.startTime);
      const end = new Date(schedule.endTime);
      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      
      if (durationMinutes < VALIDATION_CONSTANTS.MIN_SESSION_DURATION) {
        errors.push({
          row: rowNumber,
          field: 'duration',
          message: `Session duration must be at least ${VALIDATION_CONSTANTS.MIN_SESSION_DURATION} minutes`,
          severity: 'error',
          suggestedFix: `Extend session to at least ${VALIDATION_CONSTANTS.MIN_SESSION_DURATION} minutes`
        });
      }
      
      if (durationMinutes > VALIDATION_CONSTANTS.MAX_SESSION_DURATION) {
        warnings.push({
          row: rowNumber,
          field: 'duration',
          message: `Session duration of ${durationMinutes} minutes is unusually long`,
          suggestedFix: 'Consider splitting into multiple sessions'
        });
      }
      
      // Check for reasonable scheduling hours (7 AM to 10 PM)
      const startHour = start.getHours();
      const endHour = end.getHours();
      
      if (startHour < 7 || startHour > 22) {
        warnings.push({
          row: rowNumber,
          field: 'startTime',
          message: `Session starts at ${startHour}:00 which is outside typical hours (7 AM - 10 PM)`,
          suggestedFix: 'Verify the start time is correct'
        });
      }
      
      if (endHour < 7 || endHour > 22) {
        warnings.push({
          row: rowNumber,
          field: 'endTime',
          message: `Session ends at ${endHour}:00 which is outside typical hours (7 AM - 10 PM)`,
          suggestedFix: 'Verify the end time is correct'
        });
      }
    }
    
    // Week number validation
    if (schedule.weekNumber !== undefined) {
      if (schedule.weekNumber < VALIDATION_CONSTANTS.MIN_WEEK_NUMBER || 
          schedule.weekNumber > VALIDATION_CONSTANTS.MAX_WEEK_NUMBER) {
        errors.push({
          row: rowNumber,
          field: 'weekNumber',
          message: `Week number must be between ${VALIDATION_CONSTANTS.MIN_WEEK_NUMBER} and ${VALIDATION_CONSTANTS.MAX_WEEK_NUMBER}`,
          severity: 'error',
          suggestedFix: `Set week number between ${VALIDATION_CONSTANTS.MIN_WEEK_NUMBER} and ${VALIDATION_CONSTANTS.MAX_WEEK_NUMBER}`
        });
      }
    }
    
    // Student groups validation
    if (schedule.studentGroups && Array.isArray(schedule.studentGroups)) {
      if (schedule.studentGroups.length === 0) {
        errors.push({
          row: rowNumber,
          field: 'studentGroups',
          message: 'At least one student group must be assigned to the session',
          severity: 'error',
          suggestedFix: 'Assign at least one student group'
        });
      }
      
      const duplicateGroups = schedule.studentGroups.filter((group: any, index: number) => 
        schedule.studentGroups.indexOf(group) !== index
      );
      if (duplicateGroups.length > 0) {
        warnings.push({
          row: rowNumber,
          field: 'studentGroups',
          message: `Duplicate student groups found: ${duplicateGroups.join(', ')}`,
          suggestedFix: 'Remove duplicate student group assignments'
        });
      }
    }
  }

  /**
   * Calculates entity counts for new vs existing entities
   */
  private calculateEntityCounts(
    mappedData: MappedImportData, 
    matchResults: EntityMatchResults
  ): ValidationResult['entityCounts'] {
    const calculateCounts = (entities: any[], matches: Map<number, any>) => {
      let newCount = 0;
      let existingCount = 0;
      
      entities.forEach((_, index) => {
        const match = matches.get(index);
        if (match && match.entityId) {
          existingCount++;
        } else {
          newCount++;
        }
      });
      
      return { new: newCount, existing: existingCount };
    };
    
    return {
      venues: calculateCounts(mappedData.venues, matchResults.venues),
      lecturers: calculateCounts(mappedData.lecturers, matchResults.lecturers),
      courses: calculateCounts(mappedData.courses, matchResults.courses),
      studentGroups: calculateCounts(mappedData.studentGroups, matchResults.studentGroups),
      schedules: { 
        new: mappedData.schedules.length, 
        conflicts: 0 // Will be calculated by conflict detection service
      }
    };
  }

  /**
   * Provides suggested fixes for common validation errors
   */
  private getSuggestedFix(entityType: string, field: string): string {
    const fixes: Record<string, Record<string, string>> = {
      venue: {
        'name': 'Provide a descriptive venue name',
        'capacity': 'Set a valid capacity between 1 and 10,000',
        'location': 'Provide the venue location or address',
        'building': 'Specify the building name or identifier',
        'floor': 'Set floor number between -10 and 100'
      },
      lecturer: {
        'name': 'Provide the lecturer\'s full name',
        'email': 'Use a valid email address format',
        'department': 'Specify the lecturer\'s department',
        'subjects': 'List at least one subject the lecturer teaches',
        'maxHoursPerDay': 'Set daily hours between 1 and 24',
        'maxHoursPerWeek': 'Set weekly hours between 1 and 168'
      },
      course: {
        'name': 'Provide a descriptive course name',
        'code': 'Use a unique course code',
        'duration': 'Set duration between 15 and 480 minutes',
        'lecturerId': 'Assign a valid lecturer ID',
        'department': 'Specify the course department',
        'credits': 'Set credits between 0 and 20'
      },
      studentGroup: {
        'name': 'Provide a descriptive group name',
        'size': 'Set group size between 1 and 1,000',
        'yearLevel': 'Set year level between 1 and 10',
        'department': 'Specify the group\'s department',
        'academicYear': 'Use YYYY-YYYY format (e.g., 2024-2025)'
      },
      schedule: {
        'courseId': 'Assign a valid course ID',
        'lecturerId': 'Assign a valid lecturer ID',
        'venueId': 'Assign a valid venue ID',
        'startTime': 'Use a valid date/time format',
        'endTime': 'Ensure end time is after start time',
        'studentGroups': 'Assign at least one student group'
      }
    };
    
    return fixes[entityType]?.[field] || 'Please check the field value and format';
  }
}