import { ProgressTrackingService, ProgressUpdate } from '../../services/import/progressTrackingService';
import { ImportStage, ImportStatus } from '../../types/import';
import { redisManager } from '../../utils/redisConfig';

// Mock Redis
jest.mock('../../utils/redisConfig', () => ({
  redisManager: {
    getClient: jest.fn(() => ({
      setex: jest.fn(),
      get: jest.fn(),
      publish: jest.fn()
    }))
  }
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('ProgressTrackingService', () => {
  let progressService: ProgressTrackingService;
  let mockRedisClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRedisClient = {
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      publish: jest.fn().mockResolvedValue(1)
    };
    
    (redisManager.getClient as jest.Mock).mockReturnValue(mockRedisClient);
    
    progressService = ProgressTrackingService.getInstance();
  });

  describe('initializeProgress', () => {
    it('should initialize progress tracking for a new job', async () => {
      const jobId = 'test-job-1';
      const totalRows = 1000;

      await progressService.initializeProgress(jobId, totalRows);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `import:progress:${jobId}`,
        3600,
        JSON.stringify({
          totalRows: 1000,
          processedRows: 0,
          successfulRows: 0,
          failedRows: 0,
          currentStage: ImportStage.PARSING,
          estimatedTimeRemaining: undefined
        })
      );

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `import:status:${jobId}`,
        3600,
        expect.stringContaining('"status":"processing"')
      );
    });

    it('should initialize with custom stage', async () => {
      const jobId = 'test-job-2';
      const totalRows = 500;
      const initialStage = ImportStage.VALIDATION;

      await progressService.initializeProgress(jobId, totalRows, initialStage);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `import:progress:${jobId}`,
        3600,
        expect.stringContaining('"currentStage":"validation"')
      );
    });

    it('should handle initialization errors', async () => {
      const jobId = 'test-job-3';
      const totalRows = 100;

      mockRedisClient.setex.mockRejectedValueOnce(new Error('Redis error'));

      await expect(progressService.initializeProgress(jobId, totalRows))
        .rejects.toThrow('Redis error');
    });
  });

  describe('updateProgress', () => {
    beforeEach(async () => {
      // Initialize progress first
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        totalRows: 1000,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        currentStage: ImportStage.PARSING
      }));
    });

    it('should update progress successfully', async () => {
      const update: ProgressUpdate = {
        jobId: 'test-job-1',
        stage: ImportStage.ENTITY_CREATION,
        processedRows: 250,
        successfulRows: 240,
        failedRows: 10,
        totalRows: 1000
      };

      await progressService.updateProgress(update);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `import:progress:${update.jobId}`,
        3600,
        expect.stringContaining('"processedRows":250')
      );

      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'import:progress',
        expect.stringContaining(update.jobId)
      );
    });

    it('should calculate estimated time remaining', async () => {
      const update: ProgressUpdate = {
        jobId: 'test-job-1',
        stage: ImportStage.ENTITY_CREATION,
        processedRows: 500,
        successfulRows: 480,
        failedRows: 20,
        totalRows: 1000
      };

      // Mock processing speed calculation
      jest.spyOn(progressService as any, 'calculateStageProcessingSpeed')
        .mockResolvedValue(10); // 10 rows per second

      await progressService.updateProgress(update);

      const storedProgress = JSON.parse(mockRedisClient.setex.mock.calls
        .find((call: any) => call[0].includes('progress'))?.[2] || '{}');

      expect(storedProgress.estimatedTimeRemaining).toBeDefined();
      expect(typeof storedProgress.estimatedTimeRemaining).toBe('number');
    });

    it('should handle missing progress data', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const update: ProgressUpdate = {
        jobId: 'nonexistent-job',
        stage: ImportStage.PARSING,
        processedRows: 10,
        successfulRows: 10,
        failedRows: 0,
        totalRows: 100
      };

      await expect(progressService.updateProgress(update))
        .rejects.toThrow('No progress found for job nonexistent-job');
    });
  });

  describe('completeJob', () => {
    beforeEach(() => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        totalRows: 1000,
        processedRows: 900,
        successfulRows: 850,
        failedRows: 50,
        currentStage: ImportStage.SCHEDULE_IMPORT,
        estimatedTimeRemaining: 10
      }));
    });

    it('should mark job as completed', async () => {
      const jobId = 'test-job-1';
      const finalCounts = { successful: 950, failed: 50 };

      await progressService.completeJob(jobId, finalCounts);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `import:progress:${jobId}`,
        3600,
        expect.stringContaining('"processedRows":1000')
      );

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `import:status:${jobId}`,
        3600,
        expect.stringContaining('"status":"completed"')
      );

      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'import:progress',
        expect.stringContaining('"status":"completed"')
      );
    });

    it('should handle completion with missing progress', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const jobId = 'nonexistent-job';
      const finalCounts = { successful: 0, failed: 0 };

      await expect(progressService.completeJob(jobId, finalCounts))
        .rejects.toThrow('No progress found for job nonexistent-job');
    });
  });

  describe('failJob', () => {
    beforeEach(() => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        totalRows: 1000,
        processedRows: 300,
        successfulRows: 250,
        failedRows: 50,
        currentStage: ImportStage.VALIDATION,
        estimatedTimeRemaining: 100
      }));
    });

    it('should mark job as failed', async () => {
      const jobId = 'test-job-1';
      const error = 'Database connection failed';

      await progressService.failJob(jobId, error);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `import:status:${jobId}`,
        3600,
        expect.stringContaining('"status":"failed"')
      );

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `import:error:${jobId}`,
        86400,
        expect.stringContaining(error)
      );

      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'import:progress',
        expect.stringContaining('"status":"failed"')
      );
    });

    it('should handle failure with missing progress', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const jobId = 'nonexistent-job';
      const error = 'Test error';

      // Should not throw error, but should still update status
      await progressService.failJob(jobId, error);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `import:status:${jobId}`,
        3600,
        expect.stringContaining('"status":"failed"')
      );
    });
  });

  describe('getProgress', () => {
    it('should return progress data', async () => {
      const expectedProgress = {
        totalRows: 1000,
        processedRows: 500,
        successfulRows: 480,
        failedRows: 20,
        currentStage: ImportStage.ENTITY_CREATION,
        estimatedTimeRemaining: 50
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(expectedProgress));

      const result = await progressService.getProgress('test-job-1');

      expect(result).toEqual(expectedProgress);
      expect(mockRedisClient.get).toHaveBeenCalledWith('import:progress:test-job-1');
    });

    it('should return null for non-existent job', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await progressService.getProgress('nonexistent-job');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await progressService.getProgress('test-job-1');

      expect(result).toBeNull();
    });
  });

  describe('getJobStatus', () => {
    it('should return job status', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        status: ImportStatus.PROCESSING,
        updatedAt: new Date().toISOString()
      }));

      const result = await progressService.getJobStatus('test-job-1');

      expect(result).toBe(ImportStatus.PROCESSING);
      expect(mockRedisClient.get).toHaveBeenCalledWith('import:status:test-job-1');
    });

    it('should return null for non-existent status', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await progressService.getJobStatus('nonexistent-job');

      expect(result).toBeNull();
    });
  });

  describe('subscribeToProgress', () => {
    it('should register progress callback', () => {
      const jobId = 'test-job-1';
      const callback = jest.fn();

      progressService.subscribeToProgress(jobId, callback);

      // Verify callback is registered (internal state)
      expect((progressService as any).progressUpdateCallbacks.has(jobId)).toBe(true);
    });

    it('should call callback on progress update', async () => {
      const jobId = 'test-job-1';
      const callback = jest.fn();

      progressService.subscribeToProgress(jobId, callback);

      // Mock existing progress
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        totalRows: 1000,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        currentStage: ImportStage.PARSING
      }));

      const update: ProgressUpdate = {
        jobId,
        stage: ImportStage.PARSING,
        processedRows: 100,
        successfulRows: 100,
        failedRows: 0,
        totalRows: 1000
      };

      await progressService.updateProgress(update);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('unsubscribeFromProgress', () => {
    it('should remove progress callback', () => {
      const jobId = 'test-job-1';
      const callback = jest.fn();

      progressService.subscribeToProgress(jobId, callback);
      progressService.unsubscribeFromProgress(jobId);

      expect((progressService as any).progressUpdateCallbacks.has(jobId)).toBe(false);
    });
  });

  describe('getProcessingSpeedStats', () => {
    it('should return null for job with no speed history', () => {
      const result = progressService.getProcessingSpeedStats('nonexistent-job');
      expect(result).toBeNull();
    });

    it('should calculate speed statistics', () => {
      const jobId = 'test-job-1';
      
      // Manually set speed history
      (progressService as any).processingSpeedHistory.set(jobId, [5, 10, 15, 8, 12]);

      const result = progressService.getProcessingSpeedStats(jobId);

      expect(result).toEqual({
        current: 12,
        average: 10,
        peak: 15
      });
    });
  });
});