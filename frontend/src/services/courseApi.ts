import apiClient from './apiClient';
import { ApiResponse, PaginatedResponse, PaginationParams } from '../types/api';
import { Course, CreateCourseRequest, UpdateCourseRequest } from '../types/entities';

export class CourseApi {
  private readonly basePath = '/courses';

  async getCourses(params?: Partial<PaginationParams>): Promise<PaginatedResponse<Course>> {
    return apiClient.getPaginated<Course>(this.basePath, params);
  }

  async getCourse(id: string): Promise<ApiResponse<Course>> {
    return apiClient.get<Course>(`${this.basePath}/${id}`);
  }

  async createCourse(course: CreateCourseRequest): Promise<ApiResponse<Course>> {
    return apiClient.post<Course>(this.basePath, course);
  }

  async updateCourse(id: string, course: UpdateCourseRequest): Promise<ApiResponse<Course>> {
    return apiClient.put<Course>(`${this.basePath}/${id}`, course);
  }

  async deleteCourse(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${id}`);
  }

  async searchCourses(query: string): Promise<ApiResponse<Course[]>> {
    return apiClient.get<Course[]>(`${this.basePath}/search?q=${encodeURIComponent(query)}`);
  }

  async getCoursesByDepartment(department: string): Promise<ApiResponse<Course[]>> {
    return apiClient.get<Course[]>(`${this.basePath}/department/${department}`);
  }

  async getCoursesByLecturer(lecturerId: string): Promise<ApiResponse<Course[]>> {
    return apiClient.get<Course[]>(`${this.basePath}/lecturer/${lecturerId}`);
  }
}

export const courseApi = new CourseApi();