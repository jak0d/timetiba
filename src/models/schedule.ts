import { BaseEntity, DayOfWeek } from './common';

export enum ScheduleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  UNDER_REVIEW = 'under_review'
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
  weekNumber?: number | undefined;
  notes?: string | undefined;
}

export interface Schedule extends BaseEntity {
  name: string;
  academicPeriod: string;
  timeSlots: ScheduledSession[];
  status: ScheduleStatus;
  startDate: Date;
  endDate: Date;
  description?: string | undefined;
  version: number;
  publishedAt?: Date | undefined;
  publishedBy?: string | undefined;
}

export interface CreateScheduleRequest {
  name: string;
  academicPeriod: string;
  startDate: Date;
  endDate: Date;
  description?: string;
}

export interface UpdateScheduleRequest extends Partial<CreateScheduleRequest> {
  id: string;
}

export interface ScheduleFilter {
  academicPeriod?: string;
  status?: ScheduleStatus;
  startDate?: Date;
  endDate?: Date;
  lecturerId?: string;
  venueId?: string;
  studentGroupId?: string;
}

export interface ScheduleConflict {
  sessionId: string;
  conflictType: 'venue_double_booking' | 'lecturer_conflict' | 'student_group_overlap';
  description: string;
  affectedEntities: string[];
}