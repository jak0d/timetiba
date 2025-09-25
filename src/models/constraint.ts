import { BaseEntity, Priority } from './common';

export enum ConstraintType {
  HARD_AVAILABILITY = 'hard_availability',
  VENUE_CAPACITY = 'venue_capacity',
  EQUIPMENT_REQUIREMENT = 'equipment_requirement',
  LECTURER_PREFERENCE = 'lecturer_preference',
  STUDENT_BREAK = 'student_break',
  DEPARTMENT_POLICY = 'department_policy',
  TIME_WINDOW = 'time_window',
  CONSECUTIVE_SESSIONS = 'consecutive_sessions'
}

export interface ConstraintRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'between';
  value: unknown;
  message?: string;
}

export interface Constraint extends BaseEntity {
  type: ConstraintType;
  priority: Priority;
  entities: string[]; // IDs of affected entities
  rule: ConstraintRule;
  description: string;
  isActive: boolean;
  weight?: number; // For soft constraints
}

export interface CreateConstraintRequest {
  type: ConstraintType;
  priority: Priority;
  entities: string[];
  rule: ConstraintRule;
  description: string;
  weight?: number;
}

export interface UpdateConstraintRequest extends Partial<CreateConstraintRequest> {
  id: string;
}

export interface ConstraintFilter {
  type?: ConstraintType;
  priority?: Priority;
  entityId?: string;
  isActive?: boolean;
}