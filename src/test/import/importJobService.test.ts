import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { importJobService } from '../../services/import/importJobService';
import { importQueueManager } from '../../services/import/queueConfig';
import { redisManager } from '../../utils/redisConfig';
import { logger } from '../../utils/logger';
import { 
  ImportStatus, 
  ImportStage,
  TransformationType,
  CreateImportJobRequest,
  MappingConfiguration,
  ValidationResult
} from '../../types/import';

// Mock dependencies
jest.mock('../../services/import/queueConfig');
jest.mock('../../utils/redisConfig');
jest.mock('../../utils/logger');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-job-id-123')
}));

const mockRedisClient = {
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn()
};

const mockQueueManager = {
  addImportJob: jest.fn(),
  cancelJob: jest.fn()
};

(redisManager.getClient as jest.Mock).mockReturnValue(mockRedisClient);
(importQueueManager as any) = mockQueueManager;

describe('ImportJobService', () => {
  let mockRequest: CreateImportJobRequest;
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

    mockRequest = {
      userId: 'user-456',
      fileId: 'file-789',
      mappingConfig: mockMappingConfig,
      validationResult: mockValidationResult
    };

    // Default mock implementations
    mockRedisClient.setex.mockResolvedValue('OK');
    mockRedisClient.sadd.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);
    mockQueueManager.addImportJob.mockResolvedValue({ id: 'bull-job-123' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createImportJob', () => {
    it('should create import job successfully', async () => {
      const jobId = await importJobService.createImportJob(mockRequest);

      expect(jobId).toBe('test-job-id-123');

      // Verify job metadata was stored
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'import:job:test-job-id-123',
        86400,
        expect.stringContaining('"id":"test-job-id-123"')
      );

      // Verify job was added to user's job set
      expect(mockRedisClient.sadd).toHaveBeenCalledWith(
        'user:jobs:user-456',
        'test-job-id-123'
      );

      // Verify job was added to queue
      expect(mockQueueManager.addImportJob).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-job-id-123',
          userId: 'user-456',
          fileId: 'file-789',
          status: ImportStatus.PENDING
        }),
        expect.objectContaining({
          priority: expect.any(Number),
          delay: 0
        })
      );
    });

    it('should calculate correct total rows', async () => {
      await importJobService.createImportJob(mockRequest);

      const jobData = JSON.parse(mockRedisClient.setex.mock.calls[0][2]);
      // Total: 5+2+3+1+4+0+2+1+10 = 28
      expect(jobData.progress.totalRows).toBe(28);
    });

    it('should assign higher priority to smaller jobs', async () => {
      // Small job
      const smallValidationResult = {
        ...mockValidationResult,
        entityCounts: {
          venues: { new: 1, existing: 0 },
          lecturers: { new: 1, existing: 0 },
          courses: { new: 1, existing: 0 },
          studentGroups: { new: 1, existing: 0 },
          schedules: { new: 1, conflicts: 0 }
        }
      };

      await importJobService.createImportJob({
        ...mockRequest,
        validationResult: smallValidationResult
      });

      expect(mockQueueManager.addImportJob).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ priority: 10 }) // High priority
      );
    });

    it('should handle job creation errors', async () => {
      mockRedisClient.setex.mockRejectedValue(new Error('Redis failed'));

      await expect(importJobService.createImportJob(mockRequest))
        .rejects.toThrow('Failed to create import job: Redis failed');
    });
  });

  describe('getJobStatus', () => {
    const mockJobData = {
      id: 'test-job-id-123',
      userId: 'user-456',
      fileId: 'file-789',
      status: ImportStatus.PENDING,
      progress: {
        totalRows: 28,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        currentStage: ImportStage.PARSING
      },
      createdAt: '2023-01-01T00:00:00.000Z'
    };

    it('should return job status successfully', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockJobData)) // job metadata
        .mockResolvedValueOnce(JSON.stringify({
          ...mockJobData.progress,
          processedRows: 10
        })) // progress
        .mockResolvedValueOnce(JSON.stringify({
          status: ImportStatus.PROCESSING
        })); // status

      const result = await importJobService.getJobStatus('test-job-id-123');

      expect(result).toEqual({
        id: 'test-job-id-123',
        userId: 'user-456',
        fileId: 'file-789',
        status: ImportStatus.PROCESSING,
        progress: expect.objectContaining({
          processedRows: 10
        }),
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        completedAt: undefined
      });
    });

    it('should return null for non-existent job', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await importJobService.getJobStatus('non-existent');

      expect(result).toBeNull();
    });

    it('should handle Redis errors', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis failed'));

      await expect(importJobService.getJobStatus('test-job-id-123'))
        .rejects.toThrow('Failed to get job status: Redis failed');
    });
  });

  describe('cancelJob', () => {
    const mockJobData = {
      id: 'test-job-id-123',
      userId: 'user-456',
      fileId: 'file-789',
      status: ImportStatus.PROCESSING
    };

    it('should cancel job successfully', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockJobData)) // job metadata
        .mockResolvedValueOnce(JSON.stringify({ status: ImportStatus.PROCESSING })); // current status

      mockQueueManager.cancelJob.mockResolvedValue(true);

      const result = await importJobService.cancelJob('test-job-id-123', 'user-456');

      expect(result).toBe(true);
      expect(mockQueueManager.cancelJob).toHaveBeenCalledWith('test-job-id-123');
      
      // Verify status was updated to cancelled
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'import:status:test-job-id-123',
        3600,
        expect.stringContaining('"status":"cancelled"')
      );
    });

    it('should reject unauthorized cancellation', async () => {
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(mockJobData));

      await expect(importJobService.cancelJob('test-job-id-123', 'other-user'))
        .rejects.toThrow('Unauthorized to cancel this job');
    });

    it('should reject cancellation of completed job', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockJobData))
        .mockResolvedValueOnce(JSON.stringify({ status: ImportStatus.COMPLETED }));

      await expect(importJobService.cancelJob('test-job-id-123', 'user-456'))
        .rejects.toThrow('Cannot cancel completed or failed job');
    });

    it('should handle non-existent job', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await expect(importJobService.cancelJob('non-existent', 'user-456'))
        .rejects.toThrow('Job not found');
    });
  });

  describe('getJobsByUser', () => {
    it('should return user jobs successfully', async () => {
      const jobIds = ['job-1', 'job-2', 'job-3'];
      mockRedisClient.smembers.mockResolvedValue(jobIds);

      // Mock job data for each job
      const mockJobs = jobIds.map((id, index) => ({
        id,
        userId: 'user-456',
        fileId: `file-${index}`,
        status: ImportStatus.COMPLETED,
        progress: { totalRows: 10, processedRows: 10 },
        createdAt: new Date(2023, 0, index + 1).toISOString()
      }));

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockJobs[0]))
        .mockResolvedValueOnce(null) // progress
        .mockResolvedValueOnce(null) // status
        .mockResolvedValueOnce(JSON.stringify(mockJobs[1]))
        .mockResolvedValueOnce(null) // progress
        .mockResolvedValueOnce(null) // status
        .mockResolvedValueOnce(JSON.stringify(mockJobs[2]))
        .mockResolvedValueOnce(null) // progress
        .mockResolvedValueOnce(null); // status

      const result = await importJobService.getJobsByUser('user-456', 10);

      expect(result).toHaveLength(3);
      expect(result[0].createdAt.getTime()).toBeGreaterThan(result[1].createdAt.getTime());
    });

    it('should limit results correctly', async () => {
      const jobIds = ['job-1', 'job-2', 'job-3', 'job-4', 'job-5'];
      mockRedisClient.smembers.mockResolvedValue(jobIds);

      // Mock only first 2 jobs
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify({ id: 'job-1', userId: 'user-456' }))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify({ id: 'job-2', userId: 'user-456' }))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await importJobService.getJobsByUser('user-456', 2);

      expect(result).toHaveLength(2);
    });
  });

  describe('getJobReport', () => {
    const mockJobData = {
      id: 'test-job-id-123',
      userId: 'user-456'
    };

    const mockReport = {
      jobId: 'test-job-id-123',
      completedAt: new Date(),
      entityResults: { venues: { created: 5 } },
      scheduleResults: { created: 10 }
    };

    it('should return job report successfully', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockJobData)) // job metadata
        .mockResolvedValueOnce(JSON.stringify(mockReport)); // report

      const result = await importJobService.getJobReport('test-job-id-123', 'user-456');

      expect(result).toEqual(mockReport);
    });

    it('should reject unauthorized access', async () => {
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(mockJobData));

      await expect(importJobService.getJobReport('test-job-id-123', 'other-user'))
        .rejects.toThrow('Unauthorized to access this job report');
    });

    it('should handle missing report', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockJobData))
        .mockResolvedValueOnce(null); // no report

      await expect(importJobService.getJobReport('test-job-id-123', 'user-456'))
        .rejects.toThrow('Job report not found');
    });
  });

  describe('cleanupExpiredJobs', () => {
    it('should cleanup expired jobs', async () => {
      const now = Date.now();
      const expiredJob = {
        id: 'expired-job',
        userId: 'user-456',
        status: ImportStatus.COMPLETED,
        createdAt: new Date(now - 25 * 60 * 60 * 1000) // 25 hours ago
      };

      const recentJob = {
        id: 'recent-job',
        userId: 'user-456',
        status: ImportStatus.COMPLETED,
        createdAt: new Date(now - 1 * 60 * 60 * 1000) // 1 hour ago
      };

      mockRedisClient.keys.mockResolvedValue([
        'import:job:expired-job',
        'import:job:recent-job'
      ]);

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(expiredJob))
        .mockResolvedValueOnce(JSON.stringify(recentJob));

      mockRedisClient.del.mockResolvedValue(1);
      mockRedisClient.srem.mockResolvedValue(1);

      await importJobService.cleanupExpiredJobs();

      // Should delete expired job
      expect(mockRedisClient.del).toHaveBeenCalledWith('import:job:expired-job');
      expect(mockRedisClient.srem).toHaveBeenCalledWith('user:jobs:user-456', 'expired-job');

      // Should not delete recent job
      expect(mockRedisClient.del).not.toHaveBeenCalledWith('import:job:recent-job');

      expect(logger.info).toHaveBeenCalledWith('Cleaned up 1 expired import jobs');
    });

    it('should handle cleanup errors gracefully', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Redis failed'));

      await importJobService.cleanupExpiredJobs();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to cleanup expired jobs:',
        expect.any(Error)
      );
    });
  });
});