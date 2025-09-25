import apiClient from './apiClient';
import { ApiResponse, PaginatedResponse, PaginationParams } from '../types/api';
import { StudentGroup, CreateStudentGroupRequest, UpdateStudentGroupRequest } from '../types/entities';

export class StudentGroupApi {
  private readonly basePath = '/student-groups';

  async getStudentGroups(params?: Partial<PaginationParams>): Promise<PaginatedResponse<StudentGroup>> {
    return apiClient.getPaginated<StudentGroup>(this.basePath, params);
  }

  async getStudentGroup(id: string): Promise<ApiResponse<StudentGroup>> {
    return apiClient.get<StudentGroup>(`${this.basePath}/${id}`);
  }

  async createStudentGroup(group: CreateStudentGroupRequest): Promise<ApiResponse<StudentGroup>> {
    return apiClient.post<StudentGroup>(this.basePath, group);
  }

  async updateStudentGroup(id: string, group: UpdateStudentGroupRequest): Promise<ApiResponse<StudentGroup>> {
    return apiClient.put<StudentGroup>(`${this.basePath}/${id}`, group);
  }

  async deleteStudentGroup(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${id}`);
  }

  async searchStudentGroups(query: string): Promise<ApiResponse<StudentGroup[]>> {
    return apiClient.get<StudentGroup[]>(`${this.basePath}/search?q=${encodeURIComponent(query)}`);
  }

  async getStudentGroupsByDepartment(department: string): Promise<ApiResponse<StudentGroup[]>> {
    return apiClient.get<StudentGroup[]>(`${this.basePath}/department/${department}`);
  }

  async getStudentGroupsByCourse(courseId: string): Promise<ApiResponse<StudentGroup[]>> {
    return apiClient.get<StudentGroup[]>(`${this.basePath}/course/${courseId}`);
  }
}

export const studentGroupApi = new StudentGroupApi();