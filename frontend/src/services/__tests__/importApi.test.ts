import { importApi } from '../importApi';
import { apiClient } from '../apiClient';

// Mock the apiClient
jest.mock('../apiClient');
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('ImportApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('uploads file successfully', async () => {
      const mockFile = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const mockResponse = {
        data: {
          fileId: 'file-123',
          filename: 'test.csv',
          size: 1024,
          metadata: {
            rows: 100,
            columns: ['Name', 'Email'],
            preview: [{ Name: 'John', Email: 'john@example.com' }]
          }
        }
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await importApi.uploadFile(mockFile);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/import/upload',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('handles upload error', async () => {
      const mockFile = new File(['test content'], 'test.csv', { type: 'text/csv' });
      const error = new Error('Upload failed');

      mockApiClient.post.mockRejectedValue(error);

      await expect(importApi.uploadFile(mockFile)).rejects.toThrow('Upload failed');
    });
  });

  describe('getAutoMapping', () => {
    it('generates auto mapping successfully', async () => {
      const mockResponse = {
        data: {
          mappings: [
            {
              sourceColumn: 'Name',
              targetField: 'lecturerName',
              confidence: 85,
              required: true,
              dataType: 'string'
            }
          ]
        }
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await importApi.getAutoMapping('file-123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/import/files/file-123/auto-map');
      expect(result).toEqual(mockResponse.data.mappings);
    });
  });

  describe('validateData', () => {
    it('validates data successfully', async () => {
      const mappings = [
        {
          sourceColumn: 'Name',
          targetField: 'lecturerName',
          confidence: 85,
          required: true,
          dataType: 'string'
        }
      ];

      const mockResponse = {
        data: {
          isValid: true,
          errors: [],
          warnings: [],
          summary: {
            totalRows: 100,
            validRows: 98,
            errorRows: 1,
            warningRows: 1
          }
        }
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await importApi.validateData('file-123', mappings);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/import/files/file-123/validate', {
        mappings
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('startImport', () => {
    it('starts import job successfully', async () => {
      const mappings = [
        {
          sourceColumn: 'Name',
          targetField: 'lecturerName',
          confidence: 85,
          required: true,
          dataType: 'string'
        }
      ];

      const options = {
        skipValidation: false,
        conflictResolution: 'merge' as const,
        notifyOnCompletion: true
      };

      const mockResponse = {
        data: {
          id: 'job-123',
          status: 'pending',
          progress: 0,
          currentStage: 'initializing',
          stages: [],
          createdAt: '2023-01-01T10:00:00Z',
          updatedAt: '2023-01-01T10:00:00Z'
        }
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await importApi.startImport('file-123', mappings, options);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/import/jobs', {
        fileId: 'file-123',
        mappings,
        options
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getImportJob', () => {
    it('gets import job successfully', async () => {
      const mockResponse = {
        data: {
          id: 'job-123',
          status: 'running',
          progress: 50,
          currentStage: 'validation',
          stages: [
            {
              id: 'upload',
              name: 'File Upload',
              status: 'completed',
              progress: 100
            }
          ],
          createdAt: '2023-01-01T10:00:00Z',
          updatedAt: '2023-01-01T10:05:00Z'
        }
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await importApi.getImportJob('job-123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/import/jobs/job-123');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('cancelImportJob', () => {
    it('cancels import job successfully', async () => {
      mockApiClient.post.mockResolvedValue({});

      await importApi.cancelImportJob('job-123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/import/jobs/job-123/cancel');
    });
  });

  describe('downloadImportReport', () => {
    it('downloads import report successfully', async () => {
      const mockBlob = new Blob(['report content'], { type: 'application/pdf' });
      mockApiClient.get.mockResolvedValue({ data: mockBlob });

      const result = await importApi.downloadImportReport('job-123', 'pdf');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/import/jobs/job-123/report', {
        params: { format: 'pdf' },
        responseType: 'blob'
      });
      expect(result).toEqual(mockBlob);
    });
  });

  describe('subscribeToImportProgress', () => {
    it('sets up polling for import progress', async () => {
      const mockCallback = jest.fn();
      const mockJob = {
        id: 'job-123',
        status: 'running',
        progress: 50
      };

      mockApiClient.get.mockResolvedValue({ data: mockJob });

      // Mock timers
      jest.useFakeTimers();

      const unsubscribe = importApi.subscribeToImportProgress('job-123', mockCallback);

      // Fast-forward time to trigger polling
      jest.advanceTimersByTime(2000);

      await Promise.resolve(); // Allow promises to resolve

      expect(mockCallback).toHaveBeenCalledWith(mockJob);

      // Clean up
      unsubscribe();
      jest.useRealTimers();
    });

    it('stops polling when job is completed', async () => {
      const mockCallback = jest.fn();
      const mockCompletedJob = {
        id: 'job-123',
        status: 'completed',
        progress: 100
      };

      mockApiClient.get.mockResolvedValue({ data: mockCompletedJob });

      jest.useFakeTimers();

      const unsubscribe = importApi.subscribeToImportProgress('job-123', mockCallback);

      // Fast-forward time
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      expect(mockCallback).toHaveBeenCalledWith(mockCompletedJob);

      // Fast-forward more time - should not call again since job is completed
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      expect(mockCallback).toHaveBeenCalledTimes(1);

      unsubscribe();
      jest.useRealTimers();
    });
  });

  describe('getMappingConfigurations', () => {
    it('gets mapping configurations successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 'config-1',
            name: 'Standard Mapping',
            mappings: [],
            createdAt: '2023-01-01T10:00:00Z',
            updatedAt: '2023-01-01T10:00:00Z'
          }
        ]
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await importApi.getMappingConfigurations();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/import/mapping-configurations');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getImportTemplates', () => {
    it('gets import templates successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 'template-1',
            name: 'Venue Template',
            type: 'csv',
            description: 'Template for venue data',
            columns: ['Name', 'Capacity', 'Location'],
            sampleData: []
          }
        ]
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await importApi.getImportTemplates();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/import/templates');
      expect(result).toEqual(mockResponse.data);
    });
  });
});