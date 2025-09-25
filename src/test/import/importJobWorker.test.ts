import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import Queue from 'bull';
import { importJobWorker } from '../../services/import/importJobWorker';
import { importQueueManager } from '../../services/import/queueConfig';
import { importJobProcessor } from '../../services/import/importJobProcessor';
import { logger } from '../../utils/logger';
import { ImportJob, ImportStatus } from '../../types/import';

// Mock dependencies
jest.mock('../../services/import/queueConfig');
jest.mock('../../services/import/importJobProcessor');
jest.mock('../../utils/logger');

const mockQueue = {
  process: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  clean: jest.fn()
};

const mockQueueManager = {
  initialize: jest.fn(),
  getImportQueue: jest.fn().mockReturnValue(mockQueue),
  getQueueStats: jest.fn()
};

(importQueueManager as any) = mockQueueManager;

describe('ImportJobWorker', () => {
  let mockJob: Queue.Job<ImportJob>;
  let mockJobData: ImportJob;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJobData = {
      id: 'job-123',
      userId: 'user-456',
      fileId: 'file-789',
      mappingConfig: {} as any,
      validationResult: {} as any,
      status: ImportStatus.PENDING,
      progress: {
        totalRows: 100,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        currentStage: 'parsing' as any
      },
      createdAt: new Date()
    };

    mockJob = {
      id: 'bull-job-123',
      data: mockJobData,
      opts: { attempts: 3 },
      attemptsMade: 0,
      processedOn: Date.now()
    } as any;

    mockQueueManager.initialize.mockResolvedValue(undefined);
    mockQueueManager.getQueueStats.mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0
    });

    (importJobProcessor.processImportJob as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('start', () => {
    it('should start the worker successfully', async () => {
      await importJobWorker.start();

      expect(mockQueueManager.initialize).toHaveBeenCalled();
      expect(mockQueue.process).toHaveBeenCalledWith(2, expect.any(Function));
      expect(importJobWorker.isRunning()).toBe(true);
    });

    it('should not start if already running', async () => {
      await importJobWorker.start();
      
      // Try to start again
      await importJobWorker.start();

      expect(logger.warn).toHaveBeenCalledWith('Import job worker is already running');
      expect(mockQueueManager.initialize).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      mockQueueManager.initialize.mockRejectedValue(new Error('Init failed'));

      await expect(importJobWorker.start()).rejects.toThrow('Init failed');
      expect(importJobWorker.isRunning()).toBe(false);
    });

    it('should set up event handlers', async () => {
      await importJobWorker.start();

      // Verify event handlers were set up
      expect(mockQueue.on).toHaveBeenCalledWith('waiting', expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith('active', expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith('progress', expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith('stalled', expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('stop', () => {
    it('should stop the worker successfully', async () => {
      await importJobWorker.start();
      await importJobWorker.stop();

      expect(mockQueue.close).toHaveBeenCalled();
      expect(importJobWorker.isRunning()).toBe(false);
    });

    it('should not stop if not running', async () => {
      await importJobWorker.stop();

      expect(logger.warn).toHaveBeenCalledWith('Import job worker is not running');
      expect(mockQueue.close).not.toHaveBeenCalled();
    });

    it('should handle stop errors', async () => {
      await importJobWorker.start();
      mockQueue.close.mockRejectedValue(new Error('Close failed'));

      await expect(importJobWorker.stop()).rejects.toThrow('Close failed');
    });
  });

  describe('job processing', () => {
    it('should process jobs successfully', async () => {
      await importJobWorker.start();

      // Get the process function that was registered
      const processFunction = mockQueue.process.mock.calls[0][1];
      
      // Execute the process function
      const result = await processFunction(mockJob);

      expect(importJobProcessor.processImportJob).toHaveBeenCalledWith(mockJob);
      expect(result).toEqual({ success: true, jobId: mockJobData.id });
    });

    it('should handle job processing errors', async () => {
      (importJobProcessor.processImportJob as jest.Mock).mockRejectedValue(
        new Error('Processing failed')
      );

      await importJobWorker.start();

      const processFunction = mockQueue.process.mock.calls[0][1];
      
      await expect(processFunction(mockJob)).rejects.toThrow('Processing failed');
    });

    it('should log job processing events', async () => {
      await importJobWorker.start();

      const processFunction = mockQueue.process.mock.calls[0][1];
      await processFunction(mockJob);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Processing import job'),
        expect.objectContaining({
          jobId: mockJobData.id,
          userId: mockJobData.userId,
          fileId: mockJobData.fileId
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully completed import job')
      );
    });
  });

  describe('concurrency management', () => {
    it('should set concurrency correctly', () => {
      importJobWorker.setConcurrency(5);
      
      expect(logger.info).toHaveBeenCalledWith(
        'Import job worker concurrency set to: 5'
      );
    });

    it('should validate concurrency limits', () => {
      expect(() => importJobWorker.setConcurrency(0)).toThrow(
        'Concurrency must be between 1 and 10'
      );

      expect(() => importJobWorker.setConcurrency(11)).toThrow(
        'Concurrency must be between 1 and 10'
      );
    });

    it('should use correct concurrency when starting', async () => {
      importJobWorker.setConcurrency(3);
      await importJobWorker.start();

      expect(mockQueue.process).toHaveBeenCalledWith(3, expect.any(Function));
    });
  });

  describe('queue management', () => {
    beforeEach(async () => {
      await importJobWorker.start();
    });

    it('should pause queue', async () => {
      await importJobWorker.pauseQueue();

      expect(mockQueue.pause).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Import queue paused');
    });

    it('should resume queue', async () => {
      await importJobWorker.resumeQueue();

      expect(mockQueue.resume).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Import queue resumed');
    });

    it('should clean queue', async () => {
      await importJobWorker.cleanQueue(5000);

      expect(mockQueue.clean).toHaveBeenCalledWith(5000, 'completed');
      expect(mockQueue.clean).toHaveBeenCalledWith(5000, 'failed');
      expect(logger.info).toHaveBeenCalledWith(
        'Cleaned import queue with grace period: 5000ms'
      );
    });

    it('should clean queue with default grace period', async () => {
      await importJobWorker.cleanQueue();

      expect(mockQueue.clean).toHaveBeenCalledWith(0, 'completed');
      expect(mockQueue.clean).toHaveBeenCalledWith(0, 'failed');
    });
  });

  describe('worker stats', () => {
    it('should return correct worker stats when running', async () => {
      await importJobWorker.start();
      importJobWorker.setConcurrency(4);

      const stats = await importJobWorker.getWorkerStats();

      expect(stats).toEqual({
        isRunning: true,
        concurrency: 4,
        queueStats: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0
        }
      });
    });

    it('should return correct worker stats when not running', async () => {
      const stats = await importJobWorker.getWorkerStats();

      expect(stats.isRunning).toBe(false);
      expect(stats.concurrency).toBe(2); // Default concurrency
    });
  });

  describe('event handling', () => {
    it('should handle queue events properly', async () => {
      await importJobWorker.start();

      // Verify event handlers were registered
      const eventHandlers = mockQueue.on.mock.calls.reduce((acc, call) => {
        acc[call[0]] = call[1];
        return acc;
      }, {} as Record<string, Function>);

      // Test waiting event
      eventHandlers.waiting('job-123');
      expect(logger.debug).toHaveBeenCalledWith(
        'Import job job-123 is waiting in queue'
      );

      // Test active event
      eventHandlers.active(mockJob);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Import job bull-job-123 started processing'),
        expect.objectContaining({
          jobId: mockJobData.id,
          userId: mockJobData.userId,
          attempt: 1
        })
      );

      // Test completed event
      eventHandlers.completed(mockJob, { success: true });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Import job bull-job-123 completed'),
        expect.objectContaining({
          jobId: mockJobData.id,
          result: { success: true }
        })
      );

      // Test failed event
      eventHandlers.failed(mockJob, new Error('Test error'));
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Import job bull-job-123 failed'),
        expect.objectContaining({
          jobId: mockJobData.id,
          error: 'Test error'
        })
      );

      // Test stalled event
      eventHandlers.stalled(mockJob);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Import job bull-job-123 stalled'),
        expect.objectContaining({
          jobId: mockJobData.id
        })
      );

      // Test error event
      eventHandlers.error(new Error('Queue error'));
      expect(logger.error).toHaveBeenCalledWith(
        'Import queue error:',
        expect.any(Error)
      );
    });
  });
});