import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import { OptimizationRequest, OptimizationResult, ConflictResolution } from '../types/ai';

export class AiApi {
  private readonly basePath = '/ai';

  async optimizeSchedule(request: OptimizationRequest): Promise<ApiResponse<OptimizationResult>> {
    return apiClient.post<OptimizationResult>(`${this.basePath}/optimize`, request);
  }

  async getOptimizationStatus(jobId: string): Promise<ApiResponse<{ status: string; progress: number; result?: OptimizationResult }>> {
    return apiClient.get<{ status: string; progress: number; result?: OptimizationResult }>(`${this.basePath}/optimize/${jobId}/status`);
  }

  async cancelOptimization(jobId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/optimize/${jobId}`);
  }

  async getConflictResolutions(scheduleId: string, clashIds: string[]): Promise<ApiResponse<ConflictResolution[]>> {
    return apiClient.post<ConflictResolution[]>(`${this.basePath}/resolve-conflicts`, {
      scheduleId,
      clashIds,
    });
  }

  async applyResolution(scheduleId: string, resolutionId: string): Promise<ApiResponse<any>> {
    return apiClient.post<any>(`${this.basePath}/apply-resolution`, {
      scheduleId,
      resolutionId,
    });
  }

  async getOptimizationParameters(): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`${this.basePath}/parameters`);
  }

  async updateOptimizationParameters(parameters: any): Promise<ApiResponse<any>> {
    return apiClient.put<any>(`${this.basePath}/parameters`, parameters);
  }
}

export const aiApi = new AiApi();