// Common types and enums used across all models

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum Severity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  dayOfWeek: DayOfWeek;
}

export interface DateTimeSlot {
  startTime: Date;
  endTime: Date;
}

export interface WeeklyAvailability {
  [DayOfWeek.MONDAY]: TimeSlot[];
  [DayOfWeek.TUESDAY]: TimeSlot[];
  [DayOfWeek.WEDNESDAY]: TimeSlot[];
  [DayOfWeek.THURSDAY]: TimeSlot[];
  [DayOfWeek.FRIDAY]: TimeSlot[];
  [DayOfWeek.SATURDAY]: TimeSlot[];
  [DayOfWeek.SUNDAY]: TimeSlot[];
}

export enum Equipment {
  PROJECTOR = 'projector',
  COMPUTER = 'computer',
  WHITEBOARD = 'whiteboard',
  SMARTBOARD = 'smartboard',
  AUDIO_SYSTEM = 'audio_system',
  VIDEO_CONFERENCING = 'video_conferencing',
  LABORATORY_EQUIPMENT = 'laboratory_equipment',
  SPECIALIZED_SOFTWARE = 'specialized_software'
}

export enum AccessibilityFeature {
  WHEELCHAIR_ACCESSIBLE = 'wheelchair_accessible',
  HEARING_LOOP = 'hearing_loop',
  VISUAL_AIDS = 'visual_aids',
  ELEVATOR_ACCESS = 'elevator_access'
}

export enum Frequency {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly'
}