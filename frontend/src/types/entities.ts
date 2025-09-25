// Entity interfaces matching the backend models

export interface Venue {
  id: string;
  name: string;
  capacity: number;
  equipment: Equipment[];
  location: string;
  accessibility: AccessibilityFeature[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  description?: string;
}

export enum EquipmentType {
  PROJECTOR = 'projector',
  COMPUTER = 'computer',
  WHITEBOARD = 'whiteboard',
  AUDIO_SYSTEM = 'audio_system',
  VIDEO_CONFERENCING = 'video_conferencing',
  LABORATORY = 'laboratory',
  SPECIALIZED = 'specialized',
}

export enum AccessibilityFeature {
  WHEELCHAIR_ACCESSIBLE = 'wheelchair_accessible',
  HEARING_LOOP = 'hearing_loop',
  VISUAL_AIDS = 'visual_aids',
  ELEVATOR_ACCESS = 'elevator_access',
}

export interface Lecturer {
  id: string;
  name: string;
  email: string;
  department: string;
  subjects: string[];
  availability: WeeklyAvailability;
  preferences: LecturerPreferences;
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklyAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
}

export interface LecturerPreferences {
  preferredTimeSlots: TimeSlot[];
  avoidTimeSlots: TimeSlot[];
  maxConsecutiveHours: number;
  preferredBreakDuration: number;
  preferredVenues: string[];
}

export interface Course {
  id: string;
  name: string;
  code: string;
  duration: number; // minutes
  frequency: Frequency;
  requiredEquipment: Equipment[];
  studentGroups: string[];
  lecturerId: string;
  constraints: CourseConstraint[];
  createdAt: Date;
  updatedAt: Date;
}

export enum Frequency {
  ONCE = 'once',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}

export interface CourseConstraint {
  id: string;
  type: ConstraintType;
  description: string;
  priority: Priority;
}

export enum ConstraintType {
  HARD_AVAILABILITY = 'hard_availability',
  VENUE_CAPACITY = 'venue_capacity',
  EQUIPMENT_REQUIREMENT = 'equipment_requirement',
  LECTURER_PREFERENCE = 'lecturer_preference',
  STUDENT_BREAK = 'student_break',
  DEPARTMENT_POLICY = 'department_policy',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface StudentGroup {
  id: string;
  name: string;
  size: number;
  courses: string[];
  yearLevel: number;
  department: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Schedule {
  id: string;
  name: string;
  academicPeriod: string;
  timeSlots: ScheduledSession[];
  status: ScheduleStatus;
  createdAt: Date;
  lastModified: Date;
}

export interface ScheduledSession {
  id: string;
  courseId: string;
  lecturerId: string;
  venueId: string;
  studentGroups: string[];
  startTime: Date;
  endTime: Date;
  dayOfWeek: DayOfWeek;
}

export enum ScheduleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export interface Clash {
  id: string;
  type: ClashType;
  severity: Severity;
  affectedEntities: string[];
  description: string;
  suggestedResolutions: Resolution[];
}

export enum ClashType {
  VENUE_DOUBLE_BOOKING = 'venue_double_booking',
  LECTURER_CONFLICT = 'lecturer_conflict',
  STUDENT_GROUP_OVERLAP = 'student_group_overlap',
  EQUIPMENT_UNAVAILABLE = 'equipment_unavailable',
  CAPACITY_EXCEEDED = 'capacity_exceeded',
}

export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface Resolution {
  id: string;
  description: string;
  impact: string;
  confidence: number;
  changes: ScheduleChange[];
}

export interface ScheduleChange {
  entityType: string;
  entityId: string;
  changeType: 'move' | 'reschedule' | 'reassign';
  oldValue: any;
  newValue: any;
}