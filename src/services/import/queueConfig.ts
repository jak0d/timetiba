import Queue from 'bull';
import { redisManager } from '../../utils/redisConfig';
import { logger } from '../../utils/logger';
import { ImportJob } from '../../types/import';

export interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions: {
    removeOnComplete: number;
    removeOnFail: number;
    attempts: number;
    backoff: {
      type: string;
      delay: number;
    };
  };
}

export class ImportQueueManager {
  private static instance: ImportQueueManager;
  private importQueue: Queue.Queue<ImportJob> | null = null;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): ImportQueueManager {
    if (!ImportQueueManager.instance) {
      ImportQueueManager.instance = new ImportQueueManager();
    }
    return ImportQueueManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure Redis connection is established
      await redisManager.connect();
      
      const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';
      
      // Create import processing queue
      this.importQueue = new Queue<ImportJob>('timetable-import', redisUrl, {
        defaultJobOptions: {
          removeOnComplete: 10, // Keep last 10 completed jobs
          removeOnFail: 50,     // Keep last 50 failed jobs for debugging
          attempts: 3,          // Retry failed jobs up to 3 times
          backoff: {
            type: 'exponential',
            delay: 2000,        // Start with 2 second delay
          },
        },
        settings: {
          stalledInterval: 30 * 1000,    // Check for stalled jobs every 30 seconds
          maxStalledCount: 1,            // Max number of times a job can be stalled
        }
      });

      // Set up queue event listeners
      this.setupQueueEventListeners();
      
      this.isInitialized = true;
      logger.info('Import queue manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize import queue manager:', error);
      throw error;
    }
  }

  private setupQueueEventListeners(): void {
    if (!this.importQueue) return;

    this.importQueue.on('ready', () => {
      logger.info('Import queue is ready');
    });

    this.importQueue.on('error', (error) => {
      logger.error('Import queue error:', error);
    });

    this.importQueue.on('waiting', (jobId) => {
      logger.debug(`Import job ${jobId} is waiting`);
    });

    this.importQueue.on('active', (job) => {
      logger.info(`Import job ${job.id} started processing`);
    });

    this.importQueue.on('completed', (job, _result) => {
      logger.info(`Import job ${job.id} completed successfully`);
    });

    this.importQueue.on('failed', (job, error) => {
      logger.error(`Import job ${job.id} failed:`, error);
    });

    this.importQueue.on('stalled', (job) => {
      logger.warn(`Import job ${job.id} stalled`);
    });
  }

  public getImportQueue(): Queue.Queue<ImportJob> {
    if (!this.importQueue || !this.isInitialized) {
      throw new Error('Import queue not initialized. Call initialize() first.');
    }
    return this.importQueue;
  }

  public async addImportJob(jobData: ImportJob, options?: Queue.JobOptions): Promise<Queue.Job<ImportJob>> {
    const queue = this.getImportQueue();
    
    const jobOptions: Queue.JobOptions = {
      priority: 1,
      delay: 0,
      ...options,
    };

    return queue.add(jobData, jobOptions);
  }

  public async getJobStatus(jobId: string): Promise<string | null> {
    const queue = this.getImportQueue();
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return null;
    }

    const state = await job.getState();
    return state;
  }

  public async getJobProgress(jobId: string): Promise<any> {
    const queue = this.getImportQueue();
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return null;
    }

    return job.progress();
  }

  public async cancelJob(jobId: string): Promise<boolean> {
    const queue = this.getImportQueue();
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return false;
    }

    try {
      await job.remove();
      return true;
    } catch (error) {
      logger.error(`Failed to cancel job ${jobId}:`, error);
      return false;
    }
  }

  public async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.getImportQueue();
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  public async shutdown(): Promise<void> {
    if (this.importQueue) {
      await this.importQueue.close();
      this.importQueue = null;
    }
    this.isInitialized = false;
    logger.info('Import queue manager shut down');
  }
}

// Export singleton instance
export const importQueueManager = ImportQueueManager.getInstance();