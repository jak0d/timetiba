import apiClient from './apiClient';
import { ApiResponse, PaginatedResponse, PaginationParams } from '../types/api';

// Schedule types (these should match the backend types)
export interface Schedule {
  id: string;
  name: string;
  academicPeriod: string;
  status: 'draft' | 'published' | 'archived';
  timeSlots: ScheduledSession[];
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
  dayOfWeek: number;
}

export interface CreateScheduleRequest {
  name: string;
  academicPeriod: string;
}

export interface UpdateScheduleRequest {
  name?: string;
  academicPeriod?: string;
  status?: 'draft' | 'published' | 'archived';
}

export interface GenerateTimetableRequest {
  scheduleId: string;
  constraints?: any;
  preferences?: any;
}

export interface Clash {
  id: string;
  type: 'venue_conflict' | 'lecturer_conflict' | 'student_group_conflict';
  severity: 'high' | 'medium' | 'low';
  affectedEntities: string[];
  description: string;
  suggestedResolutions?: any[];
}

export class ScheduleApi {
  private readonly basePath = '/schedules';

  async getSchedules(params?: Partial<PaginationParams>): Promise<PaginatedResponse<Schedule>> {
    return apiClient.getPaginated<Schedule>(this.basePath, params);
  }

  async getSchedule(id: string): Promise<ApiResponse<Schedule>> {
    return apiClient.get<Schedule>(`${this.basePath}/${id}`);
  }

  async createSchedule(schedule: CreateScheduleRequest): Promise<ApiResponse<Schedule>> {
    return apiClient.post<Schedule>(this.basePath, schedule);
  }

  async updateSchedule(id: string, schedule: UpdateScheduleRequest): Promise<ApiResponse<Schedule>> {
    return apiClient.put<Schedule>(`${this.basePath}/${id}`, schedule);
  }

  async deleteSchedule(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${id}`);
  }

  async generateTimetable(request: GenerateTimetableRequest): Promise<ApiResponse<Schedule>> {
    return apiClient.post<Schedule>(`${this.basePath}/generate`, request);
  }

  async detectClashes(scheduleId: string): Promise<ApiResponse<Clash[]>> {
    return apiClient.get<Clash[]>(`${this.basePath}/${scheduleId}/clashes`);
  }

  async publishSchedule(id: string): Promise<ApiResponse<Schedule>> {
    return apiClient.post<Schedule>(`${this.basePath}/${id}/publish`, {});
  }

  async archiveSchedule(id: string): Promise<ApiResponse<Schedule>> {
    return apiClient.post<Schedule>(`${this.basePath}/${id}/archive`, {});
  }

  async exportSchedule(id: string, format: 'pdf' | 'excel' | 'csv' | 'ical'): Promise<ApiResponse<Blob>> {
    return apiClient.get<Blob>(`${this.basePath}/${id}/export/${format}`);
  }

  async getScheduleViews(id: string, viewType: 'student' | 'lecturer' | 'venue'): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`${this.basePath}/${id}/views/${viewType}`);
  }
}

export const scheduleApi = new ScheduleApi();