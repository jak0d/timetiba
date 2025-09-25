import { redisManager } from '../../utils/redisConfig';
import { logger } from '../../utils/logger';
import { RealTimeNotificationService } from '../realTimeNotificationService';
import { ProgressSnapshot } from './progressTrackingService';

export interface ImportProgressNotification {
  type: 'import_progress';
  jobId: string;
  userId: string;
  progress: {
    percentage: number;
    stage: string;
    processedRows: number;
    totalRows: number;
    successfulRows: number;
    failedRows: number;
    estimatedTimeRemaining?: number;
    processingSpeed?: number;
  };
  status: string;
  timestamp: Date;
}

export interface ImportStatusNotification {
  type: 'import_status';
  jobId: string;
  userId: string;
  status: 'completed' | 'failed' | 'cancelled';
  message?: string;
  timestamp: Date;
}

export class ImportProgressNotificationService {
  private static instance: ImportProgressNotificationService;
  private realTimeService: RealTimeNotificationService;
  private redisSubscriber: any;
  private isSubscribed: boolean = false;

  private constructor() {
    this.realTimeService = RealTimeNotificationService.getInstance();
    this.setupRedisSubscription();
  }

  public static getInstance(): ImportProgressNotificationService {
    if (!ImportProgressNotificationService.instance) {
      ImportProgressNotificationService.instance = new ImportProgressNotificationService();
    }
    return ImportProgressNotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  public async initialize(): Promise<void> {
    try {
      if (!this.isSubscribed) {
        await this.subscribeToProgressUpdates();
        this.isSubscribed = true;
        logger.info('Import progress notification service initialized');
      }
    } catch (error) {
      logger.error('Failed to initialize import progress notification service:', error);
      throw error;
    }
  }

  /**
   * Send real-time progress update to user
   */
  public async sendProgressUpdate(
    userId: string, 
    snapshot: ProgressSnapshot
  ): Promise<void> {
    try {
      const notification: ImportProgressNotification = {
        type: 'import_progress',
        jobId: snapshot.jobId,
        userId,
        progress: {
          percentage: Math.round((snapshot.progress.processedRows / snapshot.progress.totalRows) * 100),
          stage: this.formatStageName(snapshot.progress.currentStage),
          processedRows: snapshot.progress.processedRows,
          totalRows: snapshot.progress.totalRows,
          successfulRows: snapshot.progress.successfulRows,
          failedRows: snapshot.progress.failedRows,
          estimatedTimeRemaining: snapshot.progress.estimatedTimeRemaining,
          processingSpeed: snapshot.processingSpeed
        },
        status: snapshot.status.toLowerCase(),
        timestamp: snapshot.timestamp
      };

      // Send via WebSocket
      await this.realTimeService.sendToUser(userId, notification);

      // Store latest progress for reconnecting clients
      await this.storeLatestProgress(userId, snapshot.jobId, notification);

    } catch (error) {
      logger.error(`Failed to send progress update for job ${snapshot.jobId}:`, error);
    }
  }

  /**
   * Send import completion/failure notification
   */
  public async sendStatusUpdate(
    userId: string,
    jobId: string,
    status: 'completed' | 'failed' | 'cancelled',
    message?: string
  ): Promise<void> {
    try {
      const notification: ImportStatusNotification = {
        type: 'import_status',
        jobId,
        userId,
        status,
        message,
        timestamp: new Date()
      };

      // Send via WebSocket
      await this.realTimeService.sendToUser(userId, notification);

      // Send push notification for completed/failed imports
      if (status === 'completed' || status === 'failed') {
        await this.sendPushNotification(userId, jobId, status, message);
      }

      // Clean up stored progress
      await this.cleanupStoredProgress(userId, jobId);

    } catch (error) {
      logger.error(`Failed to send status update for job ${jobId}:`, error);
    }
  }

  /**
   * Get latest progress for a user's import jobs (for reconnecting clients)
   */
  public async getLatestProgressForUser(userId: string): Promise<ImportProgressNotification[]> {
    try {
      const progressKey = `user:import:progress:${userId}`;
      const progressData = await redisManager.getClient().hgetall(progressKey);
      
      const notifications: ImportProgressNotification[] = [];
      
      for (const [jobId, data] of Object.entries(progressData)) {
        try {
          const notification = JSON.parse(data);
          notifications.push(notification);
        } catch (error) {
          logger.warn(`Failed to parse stored progress for job ${jobId}:`, error);
        }
      }

      return notifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    } catch (error) {
      logger.error(`Failed to get latest progress for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Subscribe to user's import progress updates
   */
  public async subscribeUserToImportUpdates(userId: string): Promise<void> {
    try {
      // Send any existing progress updates
      const latestProgress = await this.getLatestProgressForUser(userId);
      
      for (const progress of latestProgress) {
        await this.realTimeService.sendToUser(userId, progress);
      }

      logger.info(`Subscribed user ${userId} to import progress updates`);

    } catch (error) {
      logger.error(`Failed to subscribe user ${userId} to import updates:`, error);
    }
  }

  /**
   * Unsubscribe user from import progress updates
   */
  public async unsubscribeUserFromImportUpdates(userId: string): Promise<void> {
    try {
      // Clean up any stored progress
      const progressKey = `user:import:progress:${userId}`;
      await redisManager.getClient().del(progressKey);

      logger.info(`Unsubscribed user ${userId} from import progress updates`);

    } catch (error) {
      logger.error(`Failed to unsubscribe user ${userId} from import updates:`, error);
    }
  }

  /**
   * Get import progress statistics
   */
  public async getProgressStatistics(): Promise<{
    activeJobs: number;
    completedToday: number;
    failedToday: number;
    averageProcessingTime: number;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get active jobs count
      const activeJobsPattern = 'import:progress:*';
      const activeJobKeys = await redisManager.getClient().keys(activeJobsPattern);
      
      // Get completed/failed jobs count for today
      const statsKey = `import:stats:${today}`;
      const stats = await redisManager.getClient().hgetall(statsKey);
      
      const completedToday = parseInt(stats.completed || '0');
      const failedToday = parseInt(stats.failed || '0');
      const totalProcessingTime = parseFloat(stats.totalProcessingTime || '0');
      const totalCompleted = parseInt(stats.totalCompleted || '0');
      
      const averageProcessingTime = totalCompleted > 0 
        ? totalProcessingTime / totalCompleted 
        : 0;

      return {
        activeJobs: activeJobKeys.length,
        completedToday,
        failedToday,
        averageProcessingTime
      };

    } catch (error) {
      logger.error('Failed to get progress statistics:', error);
      return {
        activeJobs: 0,
        completedToday: 0,
        failedToday: 0,
        averageProcessingTime: 0
      };
    }
  }

  private async setupRedisSubscription(): Promise<void> {
    try {
      // Create separate Redis client for pub/sub
      this.redisSubscriber = redisManager.createClient();
      await this.redisSubscriber.connect();

    } catch (error) {
      logger.error('Failed to setup Redis subscription:', error);
      throw error;
    }
  }

  private async subscribeToProgressUpdates(): Promise<void> {
    try {
      await this.redisSubscriber.subscribe('import:progress', (message: string) => {
        this.handleProgressUpdate(message);
      });

      logger.info('Subscribed to import progress updates');

    } catch (error) {
      logger.error('Failed to subscribe to progress updates:', error);
      throw error;
    }
  }

  private async handleProgressUpdate(message: string): Promise<void> {
    try {
      const snapshot: ProgressSnapshot = JSON.parse(message);
      
      // Get user ID for this job
      const userId = await this.getUserIdForJob(snapshot.jobId);
      if (!userId) {
        logger.warn(`No user ID found for job ${snapshot.jobId}`);
        return;
      }

      // Send progress update
      await this.sendProgressUpdate(userId, snapshot);

      // Update daily statistics
      await this.updateDailyStatistics(snapshot);

    } catch (error) {
      logger.error('Failed to handle progress update:', error);
    }
  }

  private async getUserIdForJob(jobId: string): Promise<string | null> {
    try {
      const jobKey = `import:job:${jobId}`;
      const jobData = await redisManager.getClient().get(jobKey);
      
      if (!jobData) {
        return null;
      }

      const job = JSON.parse(jobData);
      return job.userId;

    } catch (error) {
      logger.error(`Failed to get user ID for job ${jobId}:`, error);
      return null;
    }
  }

  private async storeLatestProgress(
    userId: string, 
    jobId: string, 
    notification: ImportProgressNotification
  ): Promise<void> {
    try {
      const progressKey = `user:import:progress:${userId}`;
      await redisManager.getClient().hset(
        progressKey,
        jobId,
        JSON.stringify(notification)
      );
      
      // Set expiration for cleanup
      await redisManager.getClient().expire(progressKey, 3600); // 1 hour

    } catch (error) {
      logger.error(`Failed to store latest progress for user ${userId}:`, error);
    }
  }

  private async cleanupStoredProgress(userId: string, jobId: string): Promise<void> {
    try {
      const progressKey = `user:import:progress:${userId}`;
      await redisManager.getClient().hdel(progressKey, jobId);

    } catch (error) {
      logger.error(`Failed to cleanup stored progress for job ${jobId}:`, error);
    }
  }

  private async sendPushNotification(
    userId: string,
    jobId: string,
    status: 'completed' | 'failed',
    message?: string
  ): Promise<void> {
    try {
      const title = status === 'completed' 
        ? 'Import Completed' 
        : 'Import Failed';
      
      const body = message || 
        (status === 'completed' 
          ? 'Your timetable import has completed successfully'
          : 'Your timetable import has failed');

      // Use existing notification service for push notifications
      await this.realTimeService.sendToUser(userId, {
        type: 'push_notification',
        title,
        body,
        data: {
          jobId,
          status,
          action: 'view_import_results'
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error(`Failed to send push notification for job ${jobId}:`, error);
    }
  }

  private async updateDailyStatistics(snapshot: ProgressSnapshot): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const statsKey = `import:stats:${today}`;

      if (snapshot.status === 'completed') {
        await redisManager.getClient().hincrby(statsKey, 'completed', 1);
        
        // Calculate processing time if available
        const jobStartTime = await this.getJobStartTime(snapshot.jobId);
        if (jobStartTime) {
          const processingTime = (snapshot.timestamp.getTime() - jobStartTime.getTime()) / 1000;
          await redisManager.getClient().hincrbyfloat(statsKey, 'totalProcessingTime', processingTime);
          await redisManager.getClient().hincrby(statsKey, 'totalCompleted', 1);
        }
      } else if (snapshot.status === 'failed') {
        await redisManager.getClient().hincrby(statsKey, 'failed', 1);
      }

      // Set expiration for cleanup (keep for 30 days)
      await redisManager.getClient().expire(statsKey, 30 * 24 * 3600);

    } catch (error) {
      logger.error('Failed to update daily statistics:', error);
    }
  }

  private async getJobStartTime(jobId: string): Promise<Date | null> {
    try {
      const jobKey = `import:job:${jobId}`;
      const jobData = await redisManager.getClient().get(jobKey);
      
      if (!jobData) {
        return null;
      }

      const job = JSON.parse(jobData);
      return new Date(job.createdAt);

    } catch (error) {
      logger.error(`Failed to get job start time for ${jobId}:`, error);
      return null;
    }
  }

  private formatStageName(stage: string): string {
    const stageNames: Record<string, string> = {
      'parsing': 'Parsing File',
      'mapping': 'Mapping Data',
      'validation': 'Validating Data',
      'entity_creation': 'Creating Entities',
      'schedule_import': 'Importing Schedule',
      'finalization': 'Finalizing Import'
    };

    return stageNames[stage] || stage;
  }

  /**
   * Shutdown the service
   */
  public async shutdown(): Promise<void> {
    try {
      if (this.redisSubscriber) {
        await this.redisSubscriber.unsubscribe();
        await this.redisSubscriber.disconnect();
      }
      
      this.isSubscribed = false;
      logger.info('Import progress notification service shutdown');

    } catch (error) {
      logger.error('Failed to shutdown import progress notification service:', error);
    }
  }
}

// Export singleton instance
export const importProgressNotificationService = ImportProgressNotificationService.getInstance();