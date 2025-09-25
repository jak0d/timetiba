// Application constants for validation and business logic

export const VALIDATION_CONSTANTS = {
  // Time constraints
  MIN_SESSION_DURATION: 15, // minutes
  MAX_SESSION_DURATION: 480, // 8 hours
  MIN_BREAK_DURATION: 5, // minutes
  MAX_BREAK_DURATION: 120, // 2 hours
  
  // Capacity constraints
  MIN_VENUE_CAPACITY: 1,
  MAX_VENUE_CAPACITY: 10000,
  MIN_GROUP_SIZE: 1,
  MAX_GROUP_SIZE: 1000,
  
  // Academic constraints
  MIN_YEAR_LEVEL: 1,
  MAX_YEAR_LEVEL: 10,
  MIN_CREDITS: 0,
  MAX_CREDITS: 20,
  MIN_HOURS_PER_DAY: 1,
  MAX_HOURS_PER_DAY: 24,
  MIN_HOURS_PER_WEEK: 1,
  MAX_HOURS_PER_WEEK: 168,
  
  // String length constraints
  MAX_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_CODE_LENGTH: 50,
  MAX_LOCATION_LENGTH: 500,
  MAX_PHONE_LENGTH: 20,
  
  // Building constraints
  MIN_FLOOR: -10,
  MAX_FLOOR: 100,
  
  // Optimization constraints
  MIN_WEIGHT: 0,
  MAX_WEIGHT: 1,
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  
  // Week constraints
  MIN_WEEK_NUMBER: 1,
  MAX_WEEK_NUMBER: 53
} as const;

export const TIME_PATTERNS = {
  TIME_24H: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  ACADEMIC_YEAR: /^\d{4}-\d{4}$/,
  PHONE_INTERNATIONAL: /^[\+]?[1-9][\d]{0,15}$/
} as const;

export const DEFAULT_VALUES = {
  // Default availability (empty for all days)
  EMPTY_WEEKLY_AVAILABILITY: {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  },
  
  // Default preferences
  DEFAULT_MAX_HOURS_PER_DAY: 8,
  DEFAULT_MAX_HOURS_PER_WEEK: 40,
  DEFAULT_MIN_BREAK: 15,
  
  // Default pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Default optimization weights
  DEFAULT_CONSTRAINT_WEIGHT: 0.5,
  HIGH_PRIORITY_WEIGHT: 0.9,
  MEDIUM_PRIORITY_WEIGHT: 0.6,
  LOW_PRIORITY_WEIGHT: 0.3
} as const;

export const ERROR_MESSAGES = {
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please provide a valid email address',
    INVALID_UUID: 'Please provide a valid UUID',
    INVALID_TIME_FORMAT: 'Time must be in HH:MM format',
    INVALID_PHONE: 'Please provide a valid phone number',
    INVALID_ACADEMIC_YEAR: 'Academic year must be in YYYY-YYYY format',
    MIN_LENGTH: 'This field is too short',
    MAX_LENGTH: 'This field is too long',
    MIN_VALUE: 'Value is too small',
    MAX_VALUE: 'Value is too large',
    INVALID_RANGE: 'End time must be after start time',
    EMPTY_ARRAY: 'At least one item is required'
  },
  BUSINESS_LOGIC: {
    VENUE_DOUBLE_BOOKING: 'Venue is already booked for this time slot',
    LECTURER_CONFLICT: 'Lecturer has a conflicting appointment',
    STUDENT_GROUP_OVERLAP: 'Student group has overlapping classes',
    CAPACITY_EXCEEDED: 'Venue capacity exceeded',
    EQUIPMENT_UNAVAILABLE: 'Required equipment is not available',
    AVAILABILITY_VIOLATION: 'Scheduled outside of available hours',
    PREFERENCE_VIOLATION: 'Violates user preferences'
  }
} as const;