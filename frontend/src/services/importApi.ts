import { apiClient } from './apiClient';

export interface FileUploadResponse {
  fileId: string;
  filename: string;
  size: number;
  metadata: {
    rows: number;
    columns: string[];
    preview: Record<string, any>[];
  };
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  required: boolean;
  dataType: string;
}

export interface MappingConfiguration {
  id: string;
  name: string;
  mappings: ColumnMapping[];
  createdAt: string;
  updatedAt: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    suggestion?: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
}

export interface EntityMatch {
  type: 'venue' | 'lecturer' | 'course' | 'studentGroup';
  sourceValue: string;
  matches: Array<{
    id: string;
    name: string;
    confidence: number;
    details: Record<string, any>;
  }>;
  selectedMatch?: string;
}

export interface ImportJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'cancelled';
  progress: number;
  currentStage: string;
  stages: Array<{
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    progress: number;
    startTime?: string;
    endTime?: string;
  }>;
  result?: {
    summary: {
      totalProcessed: number;
      successful: number;
      failed: number;
      warnings: number;
    };
    entities: {
      venues: { created: number; updated: number; errors: number };
      lecturers: { created: number; updated: number; errors: number };
      courses: { created: number; updated: number; errors: number };
      schedules: { created: number; updated: number; errors: number };
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface ImportTemplate {
  id: string;
  name: string;
  type: 'csv' | 'excel';
  description: string;
  columns: string[];
  sampleData: Record<string, any>[];
}

class ImportApiClient {
  // File Upload
  async uploadFile(file: File): Promise<FileUploadResponse> {
    console.log('API: Uploading file:', file.name, file.size);
    try {
      const response = await apiClient.uploadFile<FileUploadResponse>('/import/upload', file);
      console.log('API: Upload response:', response);
      
      // Check if response has the expected structure
      if (!response.data) {
        console.error('API: Invalid response structure:', response);
        throw new Error('Invalid response structure from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('API: Upload error details:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        response: (error as any)?.response,
        status: (error as any)?.status
      });
      throw error;
    }
  }

  async getFileMetadata(fileId: string): Promise<FileUploadResponse> {
    const response = await apiClient.get(`/api/import/files/${fileId}/metadata`);
    return response.data;
  }

  async deleteFile(fileId: string): Promise<void> {
    await apiClient.delete(`/api/import/files/${fileId}`);
  }

  // Column Mapping
  async getAutoMapping(fileId: string): Promise<ColumnMapping[]> {
    const response = await apiClient.post(`/api/import/files/${fileId}/auto-map`, {});
    return (response.data as any).mappings;
  }

  async validateMapping(fileId: string, mappings: ColumnMapping[]): Promise<ValidationResult> {
    const response = await apiClient.post(`/api/import/files/${fileId}/validate-mapping`, {
      mappings,
    });
    return response.data as ValidationResult;
  }

  // Mapping Configuration Management
  async getMappingConfigurations(): Promise<MappingConfiguration[]> {
    const response = await apiClient.get('/api/import/mapping-configurations');
    return response.data;
  }

  async createMappingConfiguration(
    name: string,
    mappings: ColumnMapping[]
  ): Promise<MappingConfiguration> {
    const response = await apiClient.post('/api/import/mapping-configurations', {
      name,
      mappings,
    });
    return response.data;
  }

  async updateMappingConfiguration(
    id: string,
    updates: Partial<MappingConfiguration>
  ): Promise<MappingConfiguration> {
    const response = await apiClient.put(`/api/import/mapping-configurations/${id}`, updates);
    return response.data;
  }

  async deleteMappingConfiguration(id: string): Promise<void> {
    await apiClient.delete(`/api/import/mapping-configurations/${id}`);
  }

  // Data Validation
  async validateData(fileId: string, mappings: ColumnMapping[]): Promise<ValidationResult> {
    const response = await apiClient.post(`/api/import/files/${fileId}/validate`, {
      mappings,
    });
    return response.data;
  }

  async getDataPreview(
    fileId: string,
    mappings: ColumnMapping[],
    page: number = 1,
    limit: number = 50
  ): Promise<{
    data: Array<{
      id: string;
      data: Record<string, any>;
      validationResults: Array<{
        field: string;
        type: 'error' | 'warning' | 'info';
        message: string;
        suggestion?: string;
      }>;
      entityMatches: EntityMatch[];
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const response = await apiClient.post(`/api/import/files/${fileId}/preview`, {
      mappings,
      page,
      limit,
    });
    return response.data;
  }

  // Entity Matching
  async getEntityMatches(fileId: string, mappings: ColumnMapping[]): Promise<EntityMatch[]> {
    const response = await apiClient.post(`/api/import/files/${fileId}/entity-matches`, {
      mappings,
    });
    return response.data;
  }

  async approveEntityMatch(
    fileId: string,
    rowId: string,
    matchType: string,
    matchId: string
  ): Promise<void> {
    await apiClient.post(`/api/import/files/${fileId}/approve-match`, {
      rowId,
      matchType,
      matchId,
    });
  }

  async rejectEntityMatch(fileId: string, rowId: string, matchType: string): Promise<void> {
    await apiClient.post(`/api/import/files/${fileId}/reject-match`, {
      rowId,
      matchType,
    });
  }

  async bulkApproveMatches(
    fileId: string,
    matchType: string,
    confidenceThreshold: number
  ): Promise<void> {
    await apiClient.post(`/api/import/files/${fileId}/bulk-approve-matches`, {
      matchType,
      confidenceThreshold,
    });
  }

  // Import Jobs
  async startImport(
    fileId: string,
    mappings: ColumnMapping[],
    options: {
      skipValidation?: boolean;
      conflictResolution?: 'skip' | 'overwrite' | 'merge';
      notifyOnCompletion?: boolean;
    } = {}
  ): Promise<ImportJob> {
    const response = await apiClient.post('/api/import/jobs', {
      fileId,
      mappings,
      options,
    });
    return response.data;
  }

  async getImportJob(jobId: string): Promise<ImportJob> {
    const response = await apiClient.get(`/api/import/jobs/${jobId}`);
    return response.data;
  }

  async getImportJobs(
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<{
    jobs: ImportJob[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) {
      params.append('status', status);
    }

    const response = await apiClient.get(`/api/import/jobs?${params}`);
    return response.data;
  }

  async cancelImportJob(jobId: string): Promise<void> {
    await apiClient.post(`/api/import/jobs/${jobId}/cancel`, {});
  }

  async retryImportJob(jobId: string): Promise<ImportJob> {
    const response = await apiClient.post(`/api/import/jobs/${jobId}/retry`, {});
    return response.data as ImportJob;
  }

  async downloadImportReport(jobId: string, format: 'pdf' | 'csv' | 'excel' = 'pdf'): Promise<Blob> {
    const response = await apiClient.get(`/api/import/jobs/${jobId}/report`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }

  // Templates
  async getImportTemplates(): Promise<ImportTemplate[]> {
    const response = await apiClient.get('/api/import/templates');
    return response.data;
  }

  async downloadTemplate(templateId: string, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const response = await apiClient.get(`/api/import/templates/${templateId}/download`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }

  // Documentation
  async getImportDocumentation(): Promise<{
    sections: Array<{
      id: string;
      title: string;
      content: string;
      examples?: Array<{
        title: string;
        description: string;
        code?: string;
        image?: string;
      }>;
    }>;
  }> {
    const response = await apiClient.get('/api/import/documentation');
    return response.data;
  }

  // LLM-Powered Import
  async processWithLLM(fileId: string, options: {
    preserveOriginalNames?: boolean;
    createMissingEntities?: boolean;
    confidenceThreshold?: number;
    maxRetries?: number;
    enableContextualMapping?: boolean;
  } = {}): Promise<{
    success: boolean;
    message: string;
    data: {
      analysis: {
        detectedEntities: {
          venues: Array<{
            originalName: string;
            normalizedName: string;
            attributes: Record<string, any>;
            confidence: number;
            sourceRows: number[];
            suggestedFields: Record<string, any>;
          }>;
          lecturers: Array<{
            originalName: string;
            normalizedName: string;
            attributes: Record<string, any>;
            confidence: number;
            sourceRows: number[];
            suggestedFields: Record<string, any>;
          }>;
          courses: Array<{
            originalName: string;
            normalizedName: string;
            attributes: Record<string, any>;
            confidence: number;
            sourceRows: number[];
            suggestedFields: Record<string, any>;
          }>;
          studentGroups: Array<{
            originalName: string;
            normalizedName: string;
            attributes: Record<string, any>;
            confidence: number;
            sourceRows: number[];
            suggestedFields: Record<string, any>;
          }>;
          schedules: Array<{
            course: string;
            lecturer: string;
            venue: string;
            studentGroups: string[];
            timeSlot: {
              day: string;
              startTime: string;
              endTime: string;
            };
            originalRow: number;
            confidence: number;
          }>;
        };
        suggestedMappings: ColumnMapping[];
        dataStructure: {
          format: 'timetable' | 'entity_list' | 'mixed';
          primaryEntityType: 'venue' | 'lecturer' | 'course' | 'studentGroup' | 'schedule';
          relationships: Array<{
            from: string;
            to: string;
            type: 'one_to_one' | 'one_to_many' | 'many_to_many';
            confidence: number;
          }>;
          timeFormat: string;
          dateFormat?: string;
          namingConventions: Array<{
            pattern: string;
            entityType: string;
            examples: string[];
            confidence: number;
          }>;
        };
        confidence: number;
        recommendations: string[];
      };
      processingInfo: {
        fileId: string;
        originalFileName: string;
        processedAt: string;
        confidence: number;
      };
    };
  }> {
    const response = await apiClient.post(`/api/import/files/${fileId}/llm-process`, { options });
    return response.data;
  }

  async createEntitiesFromLLM(analysisResult: any, options: {
    preserveOriginalNames?: boolean;
    createMissingEntities?: boolean;
  } = {}): Promise<{
    success: boolean;
    message: string;
    data: {
      mappedData: {
        venues: any[];
        lecturers: any[];
        courses: any[];
        studentGroups: any[];
        schedules: any[];
        metadata: {
          sourceFile: string;
          mappingConfig: string;
          importedAt: string;
          importedBy: string;
        };
      };
      summary: {
        totalEntitiesCreated: number;
        schedulesCreated: number;
        createdAt: string;
      };
    };
  }> {
    const response = await apiClient.post('/api/import/llm-analysis/create-entities', {
      analysisResult,
      options
    });
    return response.data;
  }

  async getLLMStatus(): Promise<{
    success: boolean;
    data: {
      available: boolean;
      model: string;
      capabilities: string[];
      supportedFormats: string[];
      maxFileSize: string;
      processingTime: string;
    };
  }> {
    const response = await apiClient.get('/api/import/llm/status');
    return response.data;
  }

  // Real-time Updates
  subscribeToImportProgress(jobId: string, callback: (job: ImportJob) => void): () => void {
    // This would typically use WebSocket or Server-Sent Events
    // For now, we'll use polling as a fallback
    const interval = setInterval(async () => {
      try {
        const job = await this.getImportJob(jobId);
        callback(job);
        
        // Stop polling if job is completed
        if (['completed', 'error', 'cancelled'].includes(job.status)) {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error polling import job:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }
}

export const importApi = new ImportApiClient();