import { redisManager } from '../../utils/redisConfig';
import { logger } from '../../utils/logger';
import { 
  ImportProgress, 
  ImportStage, 
  ImportStatus 
} from '../../types/import';

export interface ProgressUpdate {
  jobId: string;
  stage: ImportStage;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  totalRows: number;
  message?: string;
  estimatedTimeRemaining?: number;
}

export interface ProgressSnapshot {
  jobId: string;
  progress: ImportProgress;
  status: ImportStatus;
  timestamp: Date;
  processingSpeed?: number; // rows per second
}

export class ProgressTrackingService {
  private static instance: ProgressTrackingService;
  private progressUpdateCallbacks: Map<string, (update: ProgressSnapshot) => void> = new Map();
  private stageStartTimes: Map<string, Date> = new Map();
  private processingSpeedHistory: Map<string, number[]> = new Map();

  private constructor() {}

  public static getInstance(): ProgressTrackingService {
    if (!ProgressTrackingService.instance) {
      ProgressTrackingService.instance = new ProgressTrackingService();
    }
    return ProgressTrackingService.instance;
  }

  /**
   * Initialize progress tracking for a new import job
   */
  public async initializeProgress(
    jobId: string, 
    totalRows: number, 
    initialStage: ImportStage = ImportStage.PARSING
  ): Promise<void> {
    const initialProgress: ImportProgress = {
      totalRows,
      processedRows: 0,
      successfulRows: 0,
      failedRows: 0,
      currentStage: initialStage
    };

    try {
      await this.storeProgress(jobId, initialProgress);
      await this.updateJobStatus(jobId, ImportStatus.PROCESSING);
      
      // Track stage start time
      this.stageStartTimes.set(`${jobId}:${initialStage}`, new Date());
      
      // Initialize processing speed history
      this.processingSpeedHistory.set(jobId, []);

      logger.info(`Initialized progress tracking for job ${jobId} with ${totalRows} total rows`);

    } catch (error) {
      logger.error(`Failed to initialize progress for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Update progress for an import job
   */
  public async updateProgress(update: ProgressUpdate): Promise<void> {
    try {
      const currentProgress = await this.getProgress(update.jobId);
      if (!currentProgress) {
        throw new Error(`No progress found for job ${update.jobId}`);
      }

      // Calculate processing speed if stage changed
      let processingSpeed: number | undefined;
      if (currentProgress.currentStage !== update.stage) {
        processingSpeed = await this.calculateStageProcessingSpeed(
          update.jobId, 
          currentProgress.currentStage,
          currentProgress.processedRows
        );
        
        // Track new stage start time
        this.stageStartTimes.set(`${update.jobId}:${update.stage}`, new Date());
      }

      // Calculate estimated time remaining
      const estimatedTimeRemaining = this.calculateEstimatedTimeRemaining(
        update.jobId,
        update.processedRows,
        update.totalRows,
        processingSpeed
      );

      const updatedProgress: ImportProgress = {
        totalRows: update.totalRows,
        processedRows: update.processedRows,
        successfulRows: update.successfulRows,
        failedRows: update.failedRows,
        currentStage: update.stage,
        ...(estimatedTimeRemaining !== undefined && { estimatedTimeRemaining })
      };

      // Store updated progress
      await this.storeProgress(update.jobId, updatedProgress);

      // Create progress snapshot
      const snapshot: ProgressSnapshot = {
        jobId: update.jobId,
        progress: updatedProgress,
        status: ImportStatus.PROCESSING,
        timestamp: new Date(),
        ...(processingSpeed !== undefined && { processingSpeed })
      };

      // Trigger callbacks for real-time updates
      await this.notifyProgressUpdate(snapshot);

      // Log significant progress milestones
      const progressPercentage = Math.round((update.processedRows / update.totalRows) * 100);
      if (progressPercentage % 10 === 0 && update.processedRows > 0) {
        logger.info(`Job ${update.jobId} progress: ${progressPercentage}% (${update.processedRows}/${update.totalRows} rows)`);
      }

    } catch (error) {
      logger.error(`Failed to update progress for job ${update.jobId}:`, error);
      throw error;
    }
  }

  /**
   * Mark job as completed
   */
  public async completeJob(
    jobId: string, 
    finalCounts: { successful: number; failed: number }
  ): Promise<void> {
    try {
      const currentProgress = await this.getProgress(jobId);
      if (!currentProgress) {
        throw new Error(`No progress found for job ${jobId}`);
      }

      const completedProgress: ImportProgress = {
        ...currentProgress,
        processedRows: currentProgress.totalRows,
        successfulRows: finalCounts.successful,
        failedRows: finalCounts.failed,
        currentStage: ImportStage.FINALIZATION,
        estimatedTimeRemaining: 0
      };

      await this.storeProgress(jobId, completedProgress);
      await this.updateJobStatus(jobId, ImportStatus.COMPLETED);

      // Create final snapshot
      const snapshot: ProgressSnapshot = {
        jobId,
        progress: completedProgress,
        status: ImportStatus.COMPLETED,
        timestamp: new Date()
      };

      await this.notifyProgressUpdate(snapshot);

      // Cleanup tracking data
      this.cleanupJobTracking(jobId);

      logger.info(`Completed job ${jobId}: ${finalCounts.successful} successful, ${finalCounts.failed} failed`);

    } catch (error) {
      logger.error(`Failed to complete job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Mark job as failed
   */
  public async failJob(jobId: string, error: string): Promise<void> {
    try {
      const currentProgress = await this.getProgress(jobId);
      if (currentProgress) {
        await this.storeProgress(jobId, {
          ...currentProgress,
          estimatedTimeRemaining: 0
        });
      }

      await this.updateJobStatus(jobId, ImportStatus.FAILED);
      await this.storeJobError(jobId, error);

      // Create failure snapshot
      const snapshot: ProgressSnapshot = {
        jobId,
        progress: currentProgress || {
          totalRows: 0,
          processedRows: 0,
          successfulRows: 0,
          failedRows: 0,
          currentStage: ImportStage.PARSING,
          estimatedTimeRemaining: 0
        },
        status: ImportStatus.FAILED,
        timestamp: new Date()
      };

      await this.notifyProgressUpdate(snapshot);

      // Cleanup tracking data
      this.cleanupJobTracking(jobId);

      logger.error(`Failed job ${jobId}: ${error}`);

    } catch (err) {
      logger.error(`Failed to mark job ${jobId} as failed:`, err);
      throw err;
    }
  }

  /**
   * Get current progress for a job
   */
  public async getProgress(jobId: string): Promise<ImportProgress | null> {
    try {
      const progressKey = `import:progress:${jobId}`;
      const progressData = await redisManager.getClient().get(progressKey);
      
      if (!progressData) {
        return null;
      }

      return JSON.parse(progressData);

    } catch (error) {
      logger.error(`Failed to get progress for job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Get job status
   */
  public async getJobStatus(jobId: string): Promise<ImportStatus | null> {
    try {
      const statusKey = `import:status:${jobId}`;
      const statusData = await redisManager.getClient().get(statusKey);
      
      if (!statusData) {
        return null;
      }

      const { status } = JSON.parse(statusData);
      return status;

    } catch (error) {
      logger.error(`Failed to get status for job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Subscribe to progress updates for a job
   */
  public subscribeToProgress(
    jobId: string, 
    callback: (update: ProgressSnapshot) => void
  ): void {
    this.progressUpdateCallbacks.set(jobId, callback);
  }

  /**
   * Unsubscribe from progress updates
   */
  public unsubscribeFromProgress(jobId: string): void {
    this.progressUpdateCallbacks.delete(jobId);
  }

  /**
   * Get processing speed statistics for a job
   */
  public getProcessingSpeedStats(jobId: string): {
    current: number;
    average: number;
    peak: number;
  } | null {
    const speedHistory = this.processingSpeedHistory.get(jobId);
    if (!speedHistory || speedHistory.length === 0) {
      return null;
    }

    const current = speedHistory[speedHistory.length - 1] || 0;
    const average = speedHistory.reduce((sum, speed) => sum + speed, 0) / speedHistory.length;
    const peak = Math.max(...speedHistory);

    return { current, average, peak };
  }

  private async storeProgress(jobId: string, progress: ImportProgress): Promise<void> {
    const progressKey = `import:progress:${jobId}`;
    await redisManager.getClient().setex(
      progressKey,
      3600, // 1 hour TTL
      JSON.stringify(progress)
    );
  }

  private async updateJobStatus(jobId: string, status: ImportStatus): Promise<void> {
    const statusKey = `import:status:${jobId}`;
    await redisManager.getClient().setex(
      statusKey,
      3600, // 1 hour TTL
      JSON.stringify({
        status,
        updatedAt: new Date().toISOString()
      })
    );
  }

  private async storeJobError(jobId: string, error: string): Promise<void> {
    const errorKey = `import:error:${jobId}`;
    await redisManager.getClient().setex(
      errorKey,
      86400, // 24 hours TTL
      JSON.stringify({
        error,
        timestamp: new Date().toISOString()
      })
    );
  }

  private async calculateStageProcessingSpeed(
    jobId: string, 
    completedStage: ImportStage,
    processedRows: number
  ): Promise<number> {
    const stageKey = `${jobId}:${completedStage}`;
    const stageStartTime = this.stageStartTimes.get(stageKey);
    
    if (!stageStartTime || processedRows === 0) {
      return 0;
    }

    const stageEndTime = new Date();
    const stageDurationMs = stageEndTime.getTime() - stageStartTime.getTime();
    const stageDurationSeconds = stageDurationMs / 1000;

    if (stageDurationSeconds === 0) {
      return 0;
    }

    const processingSpeed = processedRows / stageDurationSeconds;

    // Store speed in history
    const speedHistory = this.processingSpeedHistory.get(jobId) || [];
    speedHistory.push(processingSpeed);
    
    // Keep only last 10 measurements
    if (speedHistory.length > 10) {
      speedHistory.shift();
    }
    
    this.processingSpeedHistory.set(jobId, speedHistory);

    return processingSpeed;
  }

  private calculateEstimatedTimeRemaining(
    jobId: string,
    processedRows: number,
    totalRows: number,
    currentSpeed?: number
  ): number | undefined {
    const remainingRows = totalRows - processedRows;
    
    if (remainingRows <= 0) {
      return 0;
    }

    // Use current speed if available, otherwise use average from history
    let speed = currentSpeed;
    if (!speed) {
      const speedHistory = this.processingSpeedHistory.get(jobId);
      if (speedHistory && speedHistory.length > 0) {
        speed = speedHistory.reduce((sum, s) => sum + s, 0) / speedHistory.length;
      }
    }

    if (!speed || speed === 0) {
      return undefined;
    }

    // Return estimated seconds remaining
    return Math.ceil(remainingRows / speed);
  }

  private async notifyProgressUpdate(snapshot: ProgressSnapshot): Promise<void> {
    // Notify registered callback
    const callback = this.progressUpdateCallbacks.get(snapshot.jobId);
    if (callback) {
      try {
        callback(snapshot);
      } catch (error) {
        logger.error(`Error in progress callback for job ${snapshot.jobId}:`, error);
      }
    }

    // Store snapshot for real-time WebSocket notifications
    const snapshotKey = `import:snapshot:${snapshot.jobId}`;
    await redisManager.getClient().setex(
      snapshotKey,
      300, // 5 minutes TTL
      JSON.stringify(snapshot)
    );

    // Publish to Redis pub/sub for WebSocket notifications
    await redisManager.getClient().publish(
      'import:progress',
      JSON.stringify(snapshot)
    );
  }

  private cleanupJobTracking(jobId: string): void {
    // Remove from memory tracking
    this.progressUpdateCallbacks.delete(jobId);
    this.processingSpeedHistory.delete(jobId);

    // Remove stage start times
    const stageKeys = Array.from(this.stageStartTimes.keys()).filter(key => 
      key.startsWith(`${jobId}:`)
    );
    stageKeys.forEach(key => this.stageStartTimes.delete(key));
  }
}

// Export singleton instance
export const progressTrackingService = ProgressTrackingService.getInstance();