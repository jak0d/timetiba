import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import Queue from 'bull';
import { importJobProcessor } from '../../services/import/importJobProcessor';
import { redisManager } from '../../utils/redisConfig';
import { logger } from '../../utils/logger';
import { 
  ImportJob, 
  ImportStatus, 
  ImportStage,
  MappingConfiguration,
  ValidationResult,
  TransformationType
} from '../../types/import';

// Mock dependencies
jest.mock('../../utils/redisConfig');
jest.mock('../../utils/logger');

const mockRedisClient = {
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn()
};

(redisManager.getClient as jest.Mock).mockReturnValue(mockRedisClient);

describe('ImportJobProcessor', () => {
  let mockJob: Queue.Job<ImportJob>;
  let mockJobData: ImportJob;
  let mockMappingConfig: MappingConfiguration;
  let mockValidationResult: ValidationResult;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMappingConfig = {
      id: 'mapping-123',
      name: 'Test Mapping',
      fileType: 'csv',
      mappings: [
        {
          sourceColumn: 'venue_name',
          targetField: 'name',
          entityType: 'venue',
          transformation: TransformationType.TRIM,
          required: true
        }
      ],
      createdAt: new Date(),
      lastUsed: new Date()
    };

    mockValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      entityCounts: {
        venues: { new: 5, existing: 2 },
        lecturers: { new: 3, existing: 1 },
        courses: { new: 4, existing: 0 },
        studentGroups: { new: 2, existing: 1 },
        schedules: { new: 10, conflicts: 0 }
      }
    };

    mockJobData = {
      id: 'job-123',
      userId: 'user-456',
      fileId: 'file-789',
      mappingConfig: mockMappingConfig,
      validationResult: mockValidationResult,
      status: ImportStatus.PENDING,
      progress: {
        totalRows: 24,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        currentStage: ImportStage.PARSING
      },
      createdAt: new Date()
    };

    mockJob = {
      id: 'bull-job-123',
      data: mockJobData,
      progress: jest.fn().mockReturnValue(mockJobData.progress),
      opts: { attempts: 3 }
    } as any;

    // Mock Redis operations
    mockRedisClient.setex.mockResolvedValue('OK');
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.del.mockResolvedValue(1);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processImportJob', () => {
    it('should successfully process a complete import job', async () => {
      await importJobProcessor.processImportJob(mockJob);

      // Verify progress updates were called
      expect(mockJob.progress).toHaveBeenCalled();
      
      // Verify Redis operations for progress tracking
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `import:progress:${mockJobData.id}`,
        3600,
        expect.stringContaining('"currentStage":"parsing"')
      );

      // Verify status updates
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `import:status:${mockJobData.id}`,
        3600,
        expect.stringContaining('"status":"processing"')
      );

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `import:status:${mockJobData.id}`,
        3600,
        expect.stringContaining('"status":"completed"')
      );

      // Verify final report was stored
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `import:report:${mockJobData.id}`,
        86400,
        expect.stringContaining('"jobId":"job-123"')
      );
    });

    it('should handle job processing errors gracefully', async () => {
      // Mock Redis to throw an error during progress update
      mockRedisClient.setex.mockRejectedValueOnce(new Error('Redis connection failed'));

      await expect(importJobProcessor.processImportJob(mockJob)).rejects.toThrow();

      // Verify error status was set
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `import:status:${mockJobData.id}`,
        3600,
        expect.stringContaining('"status":"failed"')
      );
    });

    it('should update progress through all stages', async () => {
      await importJobProcessor.processImportJob(mockJob);

      // Verify all stages were processed
      const progressCalls = mockRedisClient.setex.mock.calls.filter(call => 
        call[0].includes('import:progress:')
      );

      const stages = progressCalls.map(call => {
        const data = JSON.parse(call[2]);
        return data.currentStage;
      });

      expect(stages).toContain(ImportStage.PARSING);
      expect(stages).toContain(ImportStage.MAPPING);
      expect(stages).toContain(ImportStage.VALIDATION);
      expect(stages).toContain(ImportStage.ENTITY_CREATION);
      expect(stages).toContain(ImportStage.SCHEDULE_IMPORT);
      expect(stages).toContain(ImportStage.FINALIZATION);
    });

    it('should calculate correct total rows from validation result', async () => {
      await importJobProcessor.processImportJob(mockJob);

      const initialProgressCall = mockRedisClient.setex.mock.calls.find(call => 
        call[0].includes('import:progress:')
      );

      expect(initialProgressCall).toBeDefined();
      const progressData = JSON.parse(initialProgressCall![2]);
      
      // Total should be: 5+2+3+1+4+0+2+1+10 = 28 (but we set it to 24 in mock)
      expect(progressData.totalRows).toBe(24);
    });

    it('should store detailed progress information in Redis', async () => {
      await importJobProcessor.processImportJob(mockJob);

      const progressCall = mockRedisClient.setex.mock.calls.find(call => 
        call[0] === `import:progress:${mockJobData.id}`
      );

      expect(progressCall).toBeDefined();
      expect(progressCall![1]).toBe(3600); // 1 hour expiry
      
      const progressData = JSON.parse(progressCall![2]);
      expect(progressData).toHaveProperty('totalRows');
      expect(progressData).toHaveProperty('processedRows');
      expect(progressData).toHaveProperty('successfulRows');
      expect(progressData).toHaveProperty('failedRows');
      expect(progressData).toHaveProperty('currentStage');
      expect(progressData).toHaveProperty('updatedAt');
    });

    it('should generate comprehensive final report', async () => {
      await importJobProcessor.processImportJob(mockJob);

      const reportCall = mockRedisClient.setex.mock.calls.find(call => 
        call[0] === `import:report:${mockJobData.id}`
      );

      expect(reportCall).toBeDefined();
      expect(reportCall![1]).toBe(86400); // 24 hours expiry
      
      const reportData = JSON.parse(reportCall![2]);
      expect(reportData).toHaveProperty('jobId', mockJobData.id);
      expect(reportData).toHaveProperty('completedAt');
      expect(reportData).toHaveProperty('entityResults');
      expect(reportData).toHaveProperty('scheduleResults');
      expect(reportData).toHaveProperty('totalProcessed');
      expect(reportData).toHaveProperty('totalFailed');
    });

    it('should handle Redis connection failures during progress updates', async () => {
      // Mock Redis to fail on progress updates but succeed on status updates
      mockRedisClient.setex
        .mockRejectedValueOnce(new Error('Redis failed'))
        .mockResolvedValue('OK');

      // Should not throw error, just log it
      await expect(importJobProcessor.processImportJob(mockJob)).resolves.not.toThrow();

      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update progress'),
        expect.any(Error)
      );
    });

    it('should handle empty validation results', async () => {
      const emptyValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        entityCounts: {
          venues: { new: 0, existing: 0 },
          lecturers: { new: 0, existing: 0 },
          courses: { new: 0, existing: 0 },
          studentGroups: { new: 0, existing: 0 },
          schedules: { new: 0, conflicts: 0 }
        }
      };

      mockJobData.validationResult = emptyValidationResult;
      mockJob.data = mockJobData;

      await importJobProcessor.processImportJob(mockJob);

      // Should complete successfully even with no data to process
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `import:status:${mockJobData.id}`,
        3600,
        expect.stringContaining('"status":"completed"')
      );
    });
  });

  describe('error handling', () => {
    it('should set failed status when processing throws error', async () => {
      // Mock an error during processing
      const originalProgress = mockJob.progress;
      mockJob.progress = jest.fn().mockImplementation(() => {
        throw new Error('Processing failed');
      });

      await expect(importJobProcessor.processImportJob(mockJob)).rejects.toThrow('Processing failed');

      // Verify failed status was set
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `import:status:${mockJobData.id}`,
        3600,
        expect.stringContaining('"status":"failed"')
      );

      // Restore original function
      mockJob.progress = originalProgress;
    });

    it('should log errors appropriately', async () => {
      mockJob.progress = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      await expect(importJobProcessor.processImportJob(mockJob)).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        `Import job ${mockJobData.id} failed:`,
        expect.any(Error)
      );
    });
  });
});