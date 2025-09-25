import { BaseEntity, Severity } from './common';

export enum ClashType {
  VENUE_DOUBLE_BOOKING = 'venue_double_booking',
  LECTURER_CONFLICT = 'lecturer_conflict',
  STUDENT_GROUP_OVERLAP = 'student_group_overlap',
  EQUIPMENT_CONFLICT = 'equipment_conflict',
  CAPACITY_EXCEEDED = 'capacity_exceeded',
  AVAILABILITY_VIOLATION = 'availability_violation',
  PREFERENCE_VIOLATION = 'preference_violation'
}

export interface Resolution {
  id: string;
  description: string;
  type: 'reschedule' | 'reassign_venue' | 'reassign_lecturer' | 'split_group' | 'modify_duration';
  parameters: Record<string, unknown>;
  impact: string;
  score: number; // Optimization score
  estimatedEffort: 'low' | 'medium' | 'high';
}

export interface Clash extends BaseEntity {
  type: ClashType;
  severity: Severity;
  affectedEntities: string[];
  description: string;
  suggestedResolutions: Resolution[];
  scheduleId: string;
  sessionIds: string[];
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  appliedResolution?: string; // Resolution ID
}

export interface CreateClashRequest {
  type: ClashType;
  severity: Severity;
  affectedEntities: string[];
  description: string;
  scheduleId: string;
  sessionIds: string[];
}

export interface UpdateClashRequest extends Partial<CreateClashRequest> {
  id: string;
  isResolved?: boolean;
  appliedResolution?: string;
}

export interface ClashFilter {
  type?: ClashType;
  severity?: Severity;
  scheduleId?: string;
  isResolved?: boolean;
  entityId?: string;
}