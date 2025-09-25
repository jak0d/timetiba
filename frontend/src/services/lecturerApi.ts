import apiClient from './apiClient';
import { ApiResponse, PaginatedResponse, PaginationParams } from '../types/api';
import { Lecturer, CreateLecturerRequest, UpdateLecturerRequest, LecturerAvailability } from '../types/entities';

export class LecturerApi {
  private readonly basePath = '/lecturers';

  async getLecturers(params?: Partial<PaginationParams>): Promise<PaginatedResponse<Lecturer>> {
    return apiClient.getPaginated<Lecturer>(this.basePath, params);
  }

  async getLecturer(id: string): Promise<ApiResponse<Lecturer>> {
    return apiClient.get<Lecturer>(`${this.basePath}/${id}`);
  }

  async createLecturer(lecturer: CreateLecturerRequest): Promise<ApiResponse<Lecturer>> {
    return apiClient.post<Lecturer>(this.basePath, lecturer);
  }

  async updateLecturer(id: string, lecturer: UpdateLecturerRequest): Promise<ApiResponse<Lecturer>> {
    return apiClient.put<Lecturer>(`${this.basePath}/${id}`, lecturer);
  }

  async deleteLecturer(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${id}`);
  }

  async getLecturerAvailability(id: string): Promise<ApiResponse<LecturerAvailability>> {
    return apiClient.get<LecturerAvailability>(`${this.basePath}/${id}/availability`);
  }

  async updateLecturerAvailability(id: string, availability: LecturerAvailability): Promise<ApiResponse<LecturerAvailability>> {
    return apiClient.put<LecturerAvailability>(`${this.basePath}/${id}/availability`, availability);
  }

  async getLecturerPreferences(id: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`${this.basePath}/${id}/preferences`);
  }

  async updateLecturerPreferences(id: string, preferences: any): Promise<ApiResponse<any>> {
    return apiClient.put<any>(`${this.basePath}/${id}/preferences`, preferences);
  }

  async searchLecturers(query: string): Promise<ApiResponse<Lecturer[]>> {
    return apiClient.get<Lecturer[]>(`${this.basePath}/search?q=${encodeURIComponent(query)}`);
  }
}

export const lecturerApi = new LecturerApi();