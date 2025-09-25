import { BaseEntity, WeeklyAvailability, TimeSlot } from './common';

export interface LecturerPreferences {
  preferredTimeSlots: TimeSlot[];
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  minimumBreakBetweenClasses: number; // minutes
  preferredDays: string[];
  avoidBackToBackClasses: boolean;
  preferredVenues?: string[]; // venue IDs
}

export interface Lecturer extends BaseEntity {
  name: string;
  email: string;
  department: string;
  subjects: string[];
  availability: WeeklyAvailability;
  preferences: LecturerPreferences;
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  employeeId?: string;
  phone?: string;
  title?: string;
  isActive: boolean;
}

export interface CreateLecturerRequest {
  name: string;
  email: string;
  department: string;
  subjects: string[];
  availability: WeeklyAvailability;
  preferences: LecturerPreferences;
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  employeeId?: string;
  phone?: string;
  title?: string;
}

export interface UpdateLecturerRequest extends Partial<CreateLecturerRequest> {
  id: string;
}

export interface LecturerFilter {
  department?: string;
  subjects?: string[];
  isActive?: boolean;
  availableAt?: TimeSlot;
  maxHoursPerDay?: number;
}