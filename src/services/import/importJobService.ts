import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import { redisManager } from '../../utils/redisConfig';
import { importQueueManager } from './queueConfig';
import { 
  ImportJob, 
  ImportStatus, 
  ImportProgress,
  ImportStage,
  MappingConfiguration,
  ValidationResult
} from '../../types/import';

export interface CreateImportJobRequest {
  userId: string;
  fileId: string;
  mappingConfig: MappingConfiguration;
  validationResult: ValidationResult;
}

export interface ImportJobInfo {
  id: string;
  userId: string;
  fileId: string;
  status: ImportStatus;
  progress: ImportProgress;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export class ImportJobService {
  private static instance: ImportJobService;

  private constructor() {}

  public static getInstance(): ImportJobService {
    if (!ImportJobService.instance) {
      ImportJobService.instance = new ImportJobService();
    }
    return ImportJobService.instance;
  }

  public async createImportJob(request: CreateImportJobRequest): Promise<string> {
    const jobId = uuidv4();
    
    const importJob: ImportJob = {
      id: jobId,
      userId: request.userId,
      fileId: request.fileId,
      mappingConfig: request.mappingConfig,
      validationResult: request.validationResult,
      status: ImportStatus.PENDING,
      progress: {
        totalRows: this.calculateTotalRows(request.validationResult),
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        currentStage: ImportStage.PARSING
      },
      createdAt: new Date()
    };

    try {
      // Store job metadata in Redis
      await this.storeJobMetadata(importJob);

      // Add job to processing queue
      const queueJob = await importQueueManager.addImportJob(importJob, {
        priority: this.calculateJobPriority(request.validationResult),
        delay: 0, // Start immediately
        removeOnComplete: 10,
        removeOnFail: 50
      });

      logger.info(`Created import job ${jobId} and added to queue with Bull job ID: ${queueJob.id}`);
      
      return jobId;

    } catch (error) {
      logger.error(`Failed to create import job ${jobId}:`, error);
      throw new Error(`Failed to create import job: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async getJobStatus(jobId: string): Promise<ImportJobInfo | null> {
    try {
      // Get job metadata from Redis
      const jobMetadata = await this.getJobMetadata(jobId);
      if (!jobMetadata) {
        return null;
      }

      // Get current progress from Redis
      const progress = await this.getJobProgress(jobId);
      
      // Get current status from Redis
      const status = await this.getJobStatusFromRedis(jobId);

      return {
        id: jobMetadata.id,
        userId: jobMetadata.userId,
        fileId: jobMetadata.fileId,
        status: status || jobMetadata.status,
        progress: progress || jobMetadata.progress,
        createdAt: jobMetadata.createdAt,
        ...(jobMetadata.completedAt && { completedAt: jobMetadata.completedAt })
      };

    } catch (error) {
      logger.error(`Failed to get job status for ${jobId}:`, error);
      throw new Error(`Failed to get job status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async cancelJob(jobId: string, userId: string): Promise<boolean> {
    try {
      // Verify job ownership
      const jobMetadata = await this.getJobMetadata(jobId);
      if (!jobMetadata) {
        throw new Error('Job not found');
      }

      if (jobMetadata.userId !== userId) {
        throw new Error('Unauthorized to cancel this job');
      }

      // Check if job can be cancelled
      const currentStatus = await this.getJobStatusFromRedis(jobId);
      if (currentStatus === ImportStatus.COMPLETED || currentStatus === ImportStatus.FAILED) {
        throw new Error('Cannot cancel completed or failed job');
      }

      // Cancel job in queue
      const cancelled = await importQueueManager.cancelJob(jobId);
      
      if (cancelled) {
        // Update job status
        await this.updateJobStatus(jobId, ImportStatus.CANCELLED);
        logger.info(`Cancelled import job ${jobId}`);
        return true;
      }

      return false;

    } catch (error) {
      logger.error(`Failed to cancel job ${jobId}:`, error);
      throw error;
    }
  }

  public async getJobsByUser(userId: string, limit: number = 10): Promise<ImportJobInfo[]> {
    try {
      // Get user's job IDs from Redis set
      const jobIds = await redisManager.getClient().smembers(`user:jobs:${userId}`);
      
      // Get job info for each job ID
      const jobs: ImportJobInfo[] = [];
      for (const jobId of jobIds.slice(0, limit)) {
        const jobInfo = await this.getJobStatus(jobId);
        if (jobInfo) {
          jobs.push(jobInfo);
        }
      }

      // Sort by creation date (newest first)
      jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return jobs;

    } catch (error) {
      logger.error(`Failed to get jobs for user ${userId}:`, error);
      throw new Error(`Failed to get user jobs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async getJobReport(jobId: string, userId: string): Promise<any> {
    try {
      // Verify job ownership
      const jobMetadata = await this.getJobMetadata(jobId);
      if (!jobMetadata) {
        throw new Error('Job not found');
      }

      if (jobMetadata.userId !== userId) {
        throw new Error('Unauthorized to access this job report');
      }

      // Get job report from Redis
      const reportKey = `import:report:${jobId}`;
      const reportData = await redisManager.getClient().get(reportKey);
      
      if (!reportData) {
        throw new Error('Job report not found');
      }

      return JSON.parse(reportData);

    } catch (error) {
      logger.error(`Failed to get job report for ${jobId}:`, error);
      throw error;
    }
  }

  public async cleanupExpiredJobs(): Promise<void> {
    try {
      const pattern = 'import:job:*';
      const keys = await redisManager.getClient().keys(pattern);
      
      let cleanedCount = 0;
      const now = Date.now();
      const expirationTime = 24 * 60 * 60 * 1000; // 24 hours

      for (const key of keys) {
        const jobData = await redisManager.getClient().get(key);
        if (jobData) {
          const job = JSON.parse(jobData);
          const jobAge = now - new Date(job.createdAt).getTime();
          
          if (jobAge > expirationTime && 
              (job.status === ImportStatus.COMPLETED || job.status === ImportStatus.FAILED)) {
            await redisManager.getClient().del(key);
            
            // Remove from user's job set
            await redisManager.getClient().srem(`user:jobs:${job.userId}`, job.id);
            
            cleanedCount++;
          }
        }
      }

      logger.info(`Cleaned up ${cleanedCount} expired import jobs`);

    } catch (error) {
      logger.error('Failed to cleanup expired jobs:', error);
    }
  }

  private async storeJobMetadata(job: ImportJob): Promise<void> {
    const jobKey = `import:job:${job.id}`;
    const userJobsKey = `user:jobs:${job.userId}`;

    // Store job metadata
    await redisManager.getClient().setex(
      jobKey,
      86400, // 24 hours
      JSON.stringify(job)
    );

    // Add job ID to user's job set
    await redisManager.getClient().sadd(userJobsKey, job.id);
    await redisManager.getClient().expire(userJobsKey, 86400); // 24 hours
  }

  private async getJobMetadata(jobId: string): Promise<ImportJob | null> {
    const jobKey = `import:job:${jobId}`;
    const jobData = await redisManager.getClient().get(jobKey);
    
    if (!jobData) {
      return null;
    }

    const job = JSON.parse(jobData);
    // Convert date strings back to Date objects
    job.createdAt = new Date(job.createdAt);
    if (job.completedAt) {
      job.completedAt = new Date(job.completedAt);
    }

    return job;
  }

  private async getJobProgress(jobId: string): Promise<ImportProgress | null> {
    const progressKey = `import:progress:${jobId}`;
    const progressData = await redisManager.getClient().get(progressKey);
    
    if (!progressData) {
      return null;
    }

    return JSON.parse(progressData);
  }

  private async getJobStatusFromRedis(jobId: string): Promise<ImportStatus | null> {
    const statusKey = `import:status:${jobId}`;
    const statusData = await redisManager.getClient().get(statusKey);
    
    if (!statusData) {
      return null;
    }

    const { status } = JSON.parse(statusData);
    return status;
  }

  private async updateJobStatus(jobId: string, status: ImportStatus): Promise<void> {
    const statusKey = `import:status:${jobId}`;
    await redisManager.getClient().setex(
      statusKey,
      3600, // 1 hour
      JSON.stringify({
        status,
        updatedAt: new Date().toISOString()
      })
    );
  }

  private calculateTotalRows(validationResult: ValidationResult): number {
    const counts = validationResult.entityCounts;
    return counts.venues.new + counts.venues.existing +
           counts.lecturers.new + counts.lecturers.existing +
           counts.courses.new + counts.courses.existing +
           counts.studentGroups.new + counts.studentGroups.existing +
           counts.schedules.new;
  }

  private calculateJobPriority(validationResult: ValidationResult): number {
    // Higher priority for smaller jobs (they complete faster)
    const totalRows = this.calculateTotalRows(validationResult);
    
    if (totalRows < 100) return 10;      // High priority
    if (totalRows < 1000) return 5;     // Medium priority
    return 1;                           // Low priority
  }
}

// Export singleton instance
export const importJobService = ImportJobService.getInstance();