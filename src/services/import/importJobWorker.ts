import Queue from 'bull';
import { logger } from '../../utils/logger';
import { importQueueManager } from './queueConfig';
import { importJobProcessor } from './importJobProcessor';
import { ImportJob } from '../../types/import';

export class ImportJobWorker {
  private static instance: ImportJobWorker;
  private isProcessing: boolean = false;
  private concurrency: number = 2; // Process up to 2 jobs concurrently

  private constructor() {}

  public static getInstance(): ImportJobWorker {
    if (!ImportJobWorker.instance) {
      ImportJobWorker.instance = new ImportJobWorker();
    }
    return ImportJobWorker.instance;
  }

  public async start(): Promise<void> {
    if (this.isProcessing) {
      logger.warn('Import job worker is already running');
      return;
    }

    try {
      // Ensure queue manager is initialized
      await importQueueManager.initialize();
      
      const queue = importQueueManager.getImportQueue();
      
      // Set up job processing
      queue.process(this.concurrency, async (job: Queue.Job<ImportJob>) => {
        logger.info(`Processing import job ${job.id} with data:`, {
          jobId: job.data.id,
          userId: job.data.userId,
          fileId: job.data.fileId
        });

        try {
          await importJobProcessor.processImportJob(job);
          logger.info(`Successfully completed import job ${job.id}`);
          return { success: true, jobId: job.data.id };
        } catch (error) {
          logger.error(`Failed to process import job ${job.id}:`, error);
          throw error;
        }
      });

      // Set up additional event handlers for monitoring
      this.setupJobEventHandlers(queue);

      this.isProcessing = true;
      logger.info(`Import job worker started with concurrency: ${this.concurrency}`);

    } catch (error) {
      logger.error('Failed to start import job worker:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isProcessing) {
      logger.warn('Import job worker is not running');
      return;
    }

    try {
      const queue = importQueueManager.getImportQueue();
      
      // Gracefully close the queue (wait for active jobs to complete)
      await queue.close();
      
      this.isProcessing = false;
      logger.info('Import job worker stopped');

    } catch (error) {
      logger.error('Failed to stop import job worker:', error);
      throw error;
    }
  }

  public isRunning(): boolean {
    return this.isProcessing;
  }

  public setConcurrency(concurrency: number): void {
    if (concurrency < 1 || concurrency > 10) {
      throw new Error('Concurrency must be between 1 and 10');
    }
    this.concurrency = concurrency;
    logger.info(`Import job worker concurrency set to: ${concurrency}`);
  }

  private setupJobEventHandlers(queue: Queue.Queue<ImportJob>): void {
    // Job lifecycle events
    queue.on('waiting', (jobId) => {
      logger.debug(`Import job ${jobId} is waiting in queue`);
    });

    queue.on('active', (job) => {
      logger.info(`Import job ${job.id} started processing`, {
        jobId: job.data.id,
        userId: job.data.userId,
        attempt: job.attemptsMade + 1
      });
    });

    queue.on('progress', (job, progress) => {
      logger.debug(`Import job ${job.id} progress:`, progress);
    });

    queue.on('completed', (job, result) => {
      logger.info(`Import job ${job.id} completed`, {
        jobId: job.data.id,
        result,
        duration: Date.now() - job.processedOn!
      });
    });

    queue.on('failed', (job, error) => {
      logger.error(`Import job ${job.id} failed`, {
        jobId: job.data.id,
        error: error.message,
        attempt: job.attemptsMade,
        maxAttempts: job.opts.attempts
      });
    });

    queue.on('stalled', (job) => {
      logger.warn(`Import job ${job.id} stalled`, {
        jobId: job.data.id,
        stalledCount: job.opts.attempts
      });
    });

    // Queue-level events
    queue.on('error', (error) => {
      logger.error('Import queue error:', error);
    });

    queue.on('paused', () => {
      logger.info('Import queue paused');
    });

    queue.on('resumed', () => {
      logger.info('Import queue resumed');
    });

    queue.on('cleaned', (jobs, type) => {
      logger.info(`Cleaned ${jobs.length} ${type} jobs from import queue`);
    });
  }

  public async getWorkerStats(): Promise<{
    isRunning: boolean;
    concurrency: number;
    queueStats: any;
  }> {
    const queueStats = await importQueueManager.getQueueStats();
    
    return {
      isRunning: this.isProcessing,
      concurrency: this.concurrency,
      queueStats
    };
  }

  public async pauseQueue(): Promise<void> {
    const queue = importQueueManager.getImportQueue();
    await queue.pause();
    logger.info('Import queue paused');
  }

  public async resumeQueue(): Promise<void> {
    const queue = importQueueManager.getImportQueue();
    await queue.resume();
    logger.info('Import queue resumed');
  }

  public async cleanQueue(grace: number = 0): Promise<void> {
    const queue = importQueueManager.getImportQueue();
    
    // Clean completed jobs older than grace period
    await queue.clean(grace, 'completed');
    
    // Clean failed jobs older than grace period
    await queue.clean(grace, 'failed');
    
    logger.info(`Cleaned import queue with grace period: ${grace}ms`);
  }
}

// Export singleton instance
export const importJobWorker = ImportJobWorker.getInstance();