import Joi from 'joi';
import { 
  DayOfWeek, 
  Priority, 
  Severity, 
  Equipment, 
  AccessibilityFeature, 
  Frequency 
} from '../models/common';
import { ConstraintType } from '../models/constraint';
import { ClashType } from '../models/clash';
import { VALIDATION_CONSTANTS, TIME_PATTERNS, ERROR_MESSAGES } from './constants';


// Common validation schemas
export const timeSlotSchema = Joi.object({
  startTime: Joi.string().pattern(TIME_PATTERNS.TIME_24H).required()
    .messages({ 'string.pattern.base': ERROR_MESSAGES.VALIDATION.INVALID_TIME_FORMAT }),
  endTime: Joi.string().pattern(TIME_PATTERNS.TIME_24H).required()
    .messages({ 'string.pattern.base': ERROR_MESSAGES.VALIDATION.INVALID_TIME_FORMAT }),
  dayOfWeek: Joi.string().valid(...Object.values(DayOfWeek)).required()
});

export const weeklyAvailabilitySchema = Joi.object({
  [DayOfWeek.MONDAY]: Joi.array().items(timeSlotSchema).default([]),
  [DayOfWeek.TUESDAY]: Joi.array().items(timeSlotSchema).default([]),
  [DayOfWeek.WEDNESDAY]: Joi.array().items(timeSlotSchema).default([]),
  [DayOfWeek.THURSDAY]: Joi.array().items(timeSlotSchema).default([]),
  [DayOfWeek.FRIDAY]: Joi.array().items(timeSlotSchema).default([]),
  [DayOfWeek.SATURDAY]: Joi.array().items(timeSlotSchema).default([]),
  [DayOfWeek.SUNDAY]: Joi.array().items(timeSlotSchema).default([])
});

// Venue validation schemas
export const createVenueSchema = Joi.object({
  name: Joi.string().min(1).max(VALIDATION_CONSTANTS.MAX_NAME_LENGTH).required(),
  capacity: Joi.number().integer().min(VALIDATION_CONSTANTS.MIN_VENUE_CAPACITY).max(VALIDATION_CONSTANTS.MAX_VENUE_CAPACITY).required(),
  equipment: Joi.array().items(Joi.string().valid(...Object.values(Equipment))).default([]),
  availability: Joi.array().items(timeSlotSchema).default([]),
  location: Joi.string().min(1).max(VALIDATION_CONSTANTS.MAX_LOCATION_LENGTH).required(),
  accessibility: Joi.array().items(Joi.string().valid(...Object.values(AccessibilityFeature))).default([]),
  building: Joi.string().max(100).optional(),
  floor: Joi.number().integer().min(VALIDATION_CONSTANTS.MIN_FLOOR).max(VALIDATION_CONSTANTS.MAX_FLOOR).optional(),
  roomNumber: Joi.string().max(VALIDATION_CONSTANTS.MAX_CODE_LENGTH).optional(),
  description: Joi.string().max(VALIDATION_CONSTANTS.MAX_DESCRIPTION_LENGTH).optional()
});

export const updateVenueSchema = Joi.object({
  id: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(255).optional(),
  capacity: Joi.number().integer().min(1).max(10000).optional(),
  equipment: Joi.array().items(Joi.string().valid(...Object.values(Equipment))).optional(),
  availability: Joi.array().items(timeSlotSchema).optional(),
  location: Joi.string().min(1).max(500).optional(),
  accessibility: Joi.array().items(Joi.string().valid(...Object.values(AccessibilityFeature))).optional(),
  building: Joi.string().max(100).optional(),
  floor: Joi.number().integer().min(-10).max(100).optional(),
  roomNumber: Joi.string().max(50).optional(),
  description: Joi.string().max(1000).optional()
});

// Lecturer validation schemas
export const lecturerPreferencesSchema = Joi.object({
  preferredTimeSlots: Joi.array().items(timeSlotSchema).default([]),
  maxHoursPerDay: Joi.number().min(1).max(24).required(),
  maxHoursPerWeek: Joi.number().min(1).max(168).required(),
  minimumBreakBetweenClasses: Joi.number().integer().min(0).max(480).required(),
  preferredDays: Joi.array().items(Joi.string().valid(...Object.values(DayOfWeek))).default([]),
  avoidBackToBackClasses: Joi.boolean().default(false),
  preferredVenues: Joi.array().items(Joi.string().uuid()).optional()
});

export const createLecturerSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  email: Joi.string().email().required(),
  department: Joi.string().min(1).max(255).required(),
  subjects: Joi.array().items(Joi.string().min(1).max(255)).min(1).required(),
  availability: weeklyAvailabilitySchema.required(),
  preferences: lecturerPreferencesSchema.required(),
  maxHoursPerDay: Joi.number().min(1).max(24).required(),
  maxHoursPerWeek: Joi.number().min(1).max(168).required(),
  employeeId: Joi.string().max(50).optional(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  title: Joi.string().max(100).optional()
});

export const updateLecturerSchema = Joi.object({
  id: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(255).optional(),
  email: Joi.string().email().optional(),
  department: Joi.string().min(1).max(255).optional(),
  subjects: Joi.array().items(Joi.string().min(1).max(255)).min(1).optional(),
  availability: weeklyAvailabilitySchema.optional(),
  preferences: lecturerPreferencesSchema.optional(),
  maxHoursPerDay: Joi.number().min(1).max(24).optional(),
  maxHoursPerWeek: Joi.number().min(1).max(168).optional(),
  employeeId: Joi.string().max(50).optional(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  title: Joi.string().max(100).optional()
});

// Course validation schemas
export const courseConstraintSchema = Joi.object({
  type: Joi.string().min(1).max(100).required(),
  description: Joi.string().min(1).max(500).required(),
  priority: Joi.string().valid('high', 'medium', 'low').required(),
  parameters: Joi.object().default({})
});

export const createCourseSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  code: Joi.string().min(1).max(50).required(),
  duration: Joi.number().integer().min(15).max(480).required(), // 15 minutes to 8 hours
  frequency: Joi.string().valid(...Object.values(Frequency)).required(),
  requiredEquipment: Joi.array().items(Joi.string().valid(...Object.values(Equipment))).default([]),
  studentGroups: Joi.array().items(Joi.string().uuid()).default([]),
  lecturerId: Joi.string().uuid().required(),
  constraints: Joi.array().items(courseConstraintSchema).default([]),
  department: Joi.string().min(1).max(255).required(),
  credits: Joi.number().min(0).max(20).required(),
  description: Joi.string().max(1000).optional(),
  prerequisites: Joi.array().items(Joi.string().uuid()).optional()
});

export const updateCourseSchema = Joi.object({
  id: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(255).optional(),
  code: Joi.string().min(1).max(50).optional(),
  duration: Joi.number().integer().min(15).max(480).optional(),
  frequency: Joi.string().valid(...Object.values(Frequency)).optional(),
  requiredEquipment: Joi.array().items(Joi.string().valid(...Object.values(Equipment))).optional(),
  studentGroups: Joi.array().items(Joi.string().uuid()).optional(),
  lecturerId: Joi.string().uuid().optional(),
  constraints: Joi.array().items(courseConstraintSchema).optional(),
  department: Joi.string().min(1).max(255).optional(),
  credits: Joi.number().min(0).max(20).optional(),
  description: Joi.string().max(1000).optional(),
  prerequisites: Joi.array().items(Joi.string().uuid()).optional()
});

// Student Group validation schemas
export const createStudentGroupSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  size: Joi.number().integer().min(1).max(1000).required(),
  courses: Joi.array().items(Joi.string().uuid()).default([]),
  yearLevel: Joi.number().integer().min(1).max(10).required(),
  department: Joi.string().min(1).max(255).required(),
  program: Joi.string().max(255).optional(),
  semester: Joi.number().integer().min(1).max(8).optional(),
  academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/).optional()
    .messages({ 'string.pattern.base': 'Academic year must be in YYYY-YYYY format' })
});

export const updateStudentGroupSchema = Joi.object({
  id: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(255).optional(),
  size: Joi.number().integer().min(1).max(1000).optional(),
  courses: Joi.array().items(Joi.string().uuid()).optional(),
  yearLevel: Joi.number().integer().min(1).max(10).optional(),
  department: Joi.string().min(1).max(255).optional(),
  program: Joi.string().max(255).optional(),
  semester: Joi.number().integer().min(1).max(8).optional(),
  academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/).optional()
});

// Constraint validation schemas
export const constraintRuleSchema = Joi.object({
  field: Joi.string().min(1).max(100).required(),
  operator: Joi.string().valid('equals', 'not_equals', 'greater_than', 'less_than', 'in', 'not_in', 'between').required(),
  value: Joi.any().required(),
  message: Joi.string().max(500).optional()
});

export const createConstraintSchema = Joi.object({
  type: Joi.string().valid(...Object.values(ConstraintType)).required(),
  priority: Joi.string().valid(...Object.values(Priority)).required(),
  entities: Joi.array().items(Joi.string().uuid()).min(1).required(),
  rule: constraintRuleSchema.required(),
  description: Joi.string().min(1).max(500).required(),
  weight: Joi.number().min(0).max(1).optional()
});

export const updateConstraintSchema = Joi.object({
  id: Joi.string().uuid().required(),
  type: Joi.string().valid(...Object.values(ConstraintType)).optional(),
  priority: Joi.string().valid(...Object.values(Priority)).optional(),
  entities: Joi.array().items(Joi.string().uuid()).min(1).optional(),
  rule: constraintRuleSchema.optional(),
  description: Joi.string().min(1).max(500).optional(),
  weight: Joi.number().min(0).max(1).optional()
});

// Clash validation schemas
export const resolutionSchema = Joi.object({
  id: Joi.string().uuid().required(),
  description: Joi.string().min(1).max(500).required(),
  type: Joi.string().valid('reschedule', 'reassign_venue', 'reassign_lecturer', 'split_group', 'modify_duration').required(),
  parameters: Joi.object().default({}),
  impact: Joi.string().min(1).max(500).required(),
  score: Joi.number().min(0).max(100).required(),
  estimatedEffort: Joi.string().valid('low', 'medium', 'high').required()
});

export const createClashSchema = Joi.object({
  type: Joi.string().valid(...Object.values(ClashType)).required(),
  severity: Joi.string().valid(...Object.values(Severity)).required(),
  affectedEntities: Joi.array().items(Joi.string().uuid()).min(1).required(),
  description: Joi.string().min(1).max(500).required(),
  scheduleId: Joi.string().uuid().required(),
  sessionIds: Joi.array().items(Joi.string().uuid()).min(1).required()
});

export const updateClashSchema = Joi.object({
  id: Joi.string().uuid().required(),
  type: Joi.string().valid(...Object.values(ClashType)).optional(),
  severity: Joi.string().valid(...Object.values(Severity)).optional(),
  affectedEntities: Joi.array().items(Joi.string().uuid()).min(1).optional(),
  description: Joi.string().min(1).max(500).optional(),
  scheduleId: Joi.string().uuid().optional(),
  sessionIds: Joi.array().items(Joi.string().uuid()).min(1).optional(),
  isResolved: Joi.boolean().optional(),
  appliedResolution: Joi.string().uuid().optional()
});

// Schedule validation schemas
export const scheduledSessionSchema = Joi.object({
  id: Joi.string().uuid().required(),
  courseId: Joi.string().uuid().required(),
  lecturerId: Joi.string().uuid().required(),
  venueId: Joi.string().uuid().required(),
  studentGroups: Joi.array().items(Joi.string().uuid()).min(1).required(),
  startTime: Joi.date().required(),
  endTime: Joi.date().greater(Joi.ref('startTime')).required(),
  dayOfWeek: Joi.string().valid(...Object.values(DayOfWeek)).required(),
  weekNumber: Joi.number().integer().min(1).max(53).optional(),
  notes: Joi.string().max(500).optional()
});

export const createScheduleSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  academicPeriod: Joi.string().min(1).max(100).required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().greater(Joi.ref('startDate')).required(),
  description: Joi.string().max(1000).optional()
});

export const updateScheduleSchema = Joi.object({
  id: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(255).optional(),
  academicPeriod: Joi.string().min(1).max(100).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().when('startDate', {
    is: Joi.exist(),
    then: Joi.date().greater(Joi.ref('startDate')),
    otherwise: Joi.date()
  }).optional(),
  description: Joi.string().max(1000).optional()
});

// Validation helper functions
export const validateSchema = <T>(schema: Joi.ObjectSchema<T>, data: unknown) => {
  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

export const validateAndThrow = <T>(schema: Joi.ObjectSchema<T>, data: unknown): T => {
  const { error, value } = validateSchema(schema, data);
  if (error) {
    throw error;
  }
  return value as T;
};