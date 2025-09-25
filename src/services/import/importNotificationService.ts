import { logger } from '../../utils/logger';
import { redisManager } from '../../utils/redisConfig';
import { EmailService } from '../emailService';
import { RealTimeNotificationService } from '../realTimeNotificationService';
import { NotificationPriority } from '../../types/notification';
import { ImportStatus, ImportJob } from '../../types/import';
// Import types only when needed

export interface ImportNotificationPreferences {
  userId: string;
  emailNotifications: {
    enabled: boolean;
    onCompletion: boolean;
    onFailure: boolean;
    onLargeImports: boolean; // For imports > 1000 rows
  };
  inAppNotifications: {
    enabled: boolean;
    onProgress: boolean;
    onCompletion: boolean;
    onFailure: boolean;
  };
  pushNotifications: {
    enabled: boolean;
    onCompletion: boolean;
    onFailure: boolean;
  };
}

export interface ImportNotificationContext {
  jobId: string;
  userId: string;
  fileName: string;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  duration?: number;
  errorSummary?: string;
}

export interface NotificationTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
  inAppTitle: string;
  inAppMessage: string;
  pushTitle: string;
  pushBody: string;
}

export class ImportNotificationService {
  private static instance: ImportNotificationService;
  private realTimeService: RealTimeNotificationService;
  private emailService: EmailService;

  private constructor() {
    this.realTimeService = new RealTimeNotificationService();
    // Initialize with default email config - in real app this would come from config
    this.emailService = new EmailService({
      provider: 'smtp',
      smtpHost: 'localhost',
      smtpPort: 587,
      smtpUser: 'test@example.com',
      smtpPassword: 'password',
      fromEmail: 'noreply@example.com',
      fromName: 'Timetable Import Service'
    });
  }

  public static getInstance(): ImportNotificationService {
    if (!ImportNotificationService.instance) {
      ImportNotificationService.instance = new ImportNotificationService();
    }
    return ImportNotificationService.instance;
  }

  /**
   * Send import completion notification
   */
  public async sendImportCompletionNotification(
    context: ImportNotificationContext
  ): Promise<void> {
    try {
      const preferences = await this.getUserNotificationPreferences(context.userId);
      const template = this.generateCompletionTemplate(context);

      // Send email notification
      if (preferences.emailNotifications.enabled && preferences.emailNotifications.onCompletion) {
        await this.sendEmailNotification(context.userId, template);
      }

      // Send in-app notification
      if (preferences.inAppNotifications.enabled && preferences.inAppNotifications.onCompletion) {
        await this.sendInAppNotification(context.userId, template, 'success');
      }

      // Send push notification
      if (preferences.pushNotifications.enabled && preferences.pushNotifications.onCompletion) {
        await this.sendPushNotification(context.userId, template);
      }

      // Store notification history
      await this.storeNotificationHistory(context.userId, context.jobId, 'completion', template);

      logger.info(`Sent import completion notifications for job ${context.jobId}`);

    } catch (error) {
      logger.error(`Failed to send import completion notification for job ${context.jobId}:`, error);
    }
  }

  /**
   * Send import failure notification
   */
  public async sendImportFailureNotification(
    context: ImportNotificationContext
  ): Promise<void> {
    try {
      const preferences = await this.getUserNotificationPreferences(context.userId);
      const template = this.generateFailureTemplate(context);

      // Send email notification
      if (preferences.emailNotifications.enabled && preferences.emailNotifications.onFailure) {
        await this.sendEmailNotification(context.userId, template);
      }

      // Send in-app notification
      if (preferences.inAppNotifications.enabled && preferences.inAppNotifications.onFailure) {
        await this.sendInAppNotification(context.userId, template, 'error');
      }

      // Send push notification
      if (preferences.pushNotifications.enabled && preferences.pushNotifications.onFailure) {
        await this.sendPushNotification(context.userId, template);
      }

      // Store notification history
      await this.storeNotificationHistory(context.userId, context.jobId, 'failure', template);

      logger.info(`Sent import failure notifications for job ${context.jobId}`);

    } catch (error) {
      logger.error(`Failed to send import failure notification for job ${context.jobId}:`, error);
    }
  }

  /**
   * Send large import progress notification
   */
  public async sendLargeImportProgressNotification(
    context: ImportNotificationContext,
    progressPercentage: number
  ): Promise<void> {
    try {
      const preferences = await this.getUserNotificationPreferences(context.userId);
      
      // Only send for large imports
      if (context.totalRows < 1000) {
        return;
      }

      // Only send at specific milestones (25%, 50%, 75%)
      if (![25, 50, 75].includes(progressPercentage)) {
        return;
      }

      const template = this.generateProgressTemplate(context, progressPercentage);

      // Send email notification for large imports
      if (preferences.emailNotifications.enabled && preferences.emailNotifications.onLargeImports) {
        await this.sendEmailNotification(context.userId, template);
      }

      // Send in-app notification
      if (preferences.inAppNotifications.enabled && preferences.inAppNotifications.onProgress) {
        await this.sendInAppNotification(context.userId, template, 'info');
      }

      logger.info(`Sent large import progress notification for job ${context.jobId} at ${progressPercentage}%`);

    } catch (error) {
      logger.error(`Failed to send large import progress notification for job ${context.jobId}:`, error);
    }
  }

  /**
   * Get user notification preferences
   */
  public async getUserNotificationPreferences(userId: string): Promise<ImportNotificationPreferences> {
    try {
      const preferencesKey = `user:notifications:${userId}`;
      const preferencesData = await redisManager.getClient().get(preferencesKey);
      
      if (!preferencesData) {
        // Return default preferences
        return this.getDefaultNotificationPreferences(userId);
      }

      return JSON.parse(preferencesData);

    } catch (error) {
      logger.error(`Failed to get notification preferences for user ${userId}:`, error);
      return this.getDefaultNotificationPreferences(userId);
    }
  }

  /**
   * Update user notification preferences
   */
  public async updateUserNotificationPreferences(
    userId: string,
    preferences: Partial<ImportNotificationPreferences>
  ): Promise<void> {
    try {
      const currentPreferences = await this.getUserNotificationPreferences(userId);
      const updatedPreferences = { ...currentPreferences, ...preferences };

      const preferencesKey = `user:notifications:${userId}`;
      await redisManager.getClient().setex(
        preferencesKey,
        86400 * 30, // 30 days TTL
        JSON.stringify(updatedPreferences)
      );

      logger.info(`Updated notification preferences for user ${userId}`);

    } catch (error) {
      logger.error(`Failed to update notification preferences for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get notification history for a user
   */
  public async getNotificationHistory(
    userId: string,
    limit: number = 20
  ): Promise<Array<{
    jobId: string;
    type: string;
    timestamp: Date;
    template: NotificationTemplate;
  }>> {
    try {
      const historyKey = `user:notification:history:${userId}`;
      const historyData = await redisManager.getClient().lrange(historyKey, 0, limit - 1);
      
      return historyData.map((data: string) => {
        const parsed = JSON.parse(data);
        return {
          ...parsed,
          timestamp: new Date(parsed.timestamp)
        };
      });

    } catch (error) {
      logger.error(`Failed to get notification history for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Send notification based on import job status change
   */
  public async handleImportStatusChange(
    job: ImportJob,
    _previousStatus: ImportStatus,
    newStatus: ImportStatus
  ): Promise<void> {
    try {
      const context: ImportNotificationContext = {
        jobId: job.id,
        userId: job.userId,
        fileName: await this.getJobFileName(job.fileId),
        totalRows: job.progress.totalRows,
        processedRows: job.progress.processedRows,
        successfulRows: job.progress.successfulRows,
        failedRows: job.progress.failedRows,
        ...(job.completedAt && {
          duration: Math.round((job.completedAt.getTime() - job.createdAt.getTime()) / 1000)
        })
      };

      switch (newStatus) {
        case ImportStatus.COMPLETED:
          await this.sendImportCompletionNotification(context);
          break;
        
        case ImportStatus.FAILED:
          const errorSummary = await this.getJobErrorSummary(job.id);
          const failureContext = { ...context, ...(errorSummary && { errorSummary }) };
          await this.sendImportFailureNotification(failureContext);
          break;
        
        case ImportStatus.PROCESSING:
          // Send progress notification for large imports
          const progressPercentage = Math.round((job.progress.processedRows / job.progress.totalRows) * 100);
          await this.sendLargeImportProgressNotification(context, progressPercentage);
          break;
      }

    } catch (error) {
      logger.error(`Failed to handle import status change for job ${job.id}:`, error);
    }
  }

  /**
   * Test notification delivery for a user
   */
  public async sendTestNotification(userId: string): Promise<{
    email: boolean;
    inApp: boolean;
    push: boolean;
  }> {
    const results = { email: false, inApp: false, push: false };

    try {
      const preferences = await this.getUserNotificationPreferences(userId);
      const testTemplate: NotificationTemplate = {
        subject: 'Test Notification - Import Service',
        htmlBody: '<p>This is a test notification from the import service.</p>',
        textBody: 'This is a test notification from the import service.',
        inAppTitle: 'Test Notification',
        inAppMessage: 'This is a test notification from the import service.',
        pushTitle: 'Test Notification',
        pushBody: 'Import service test notification'
      };

      // Test email
      if (preferences.emailNotifications.enabled) {
        try {
          await this.sendEmailNotification(userId, testTemplate);
          results.email = true;
        } catch (error) {
          logger.warn(`Test email notification failed for user ${userId}:`, error);
        }
      }

      // Test in-app
      if (preferences.inAppNotifications.enabled) {
        try {
          await this.sendInAppNotification(userId, testTemplate, 'info');
          results.inApp = true;
        } catch (error) {
          logger.warn(`Test in-app notification failed for user ${userId}:`, error);
        }
      }

      // Test push
      if (preferences.pushNotifications.enabled) {
        try {
          await this.sendPushNotification(userId, testTemplate);
          results.push = true;
        } catch (error) {
          logger.warn(`Test push notification failed for user ${userId}:`, error);
        }
      }

      logger.info(`Sent test notifications for user ${userId}:`, results);
      return results;

    } catch (error) {
      logger.error(`Failed to send test notification for user ${userId}:`, error);
      return results;
    }
  }

  private async sendEmailNotification(userId: string, template: NotificationTemplate): Promise<void> {
    // Get user email from user service or database
    const userEmail = await this.getUserEmail(userId);
    if (!userEmail) {
      throw new Error(`No email found for user ${userId}`);
    }

    await this.emailService.sendEmail({
      to: userEmail,
      subject: template.subject,
      body: template.htmlBody
    });
  }

  private async sendInAppNotification(
    userId: string, 
    template: NotificationTemplate, 
    type: 'success' | 'error' | 'info'
  ): Promise<void> {
    await this.realTimeService.sendRealTimeNotification({
      id: `import-${Date.now()}`,
      userId,
      type: 'import_notification',
      title: template.inAppTitle,
      message: template.inAppMessage,
      data: { notificationType: type, persistent: true },
      priority: (type === 'error' ? NotificationPriority.HIGH : NotificationPriority.NORMAL),
      timestamp: new Date(),
      acknowledged: false
    });
  }

  private async sendPushNotification(userId: string, template: NotificationTemplate): Promise<void> {
    await this.realTimeService.sendRealTimeNotification({
      id: `push-${Date.now()}`,
      userId,
      type: 'push_notification',
      title: template.pushTitle,
      message: template.pushBody,
      data: {
        category: 'import',
        action: 'view_imports'
      },
      priority: NotificationPriority.NORMAL,
      timestamp: new Date(),
      acknowledged: false
    });
  }

  private generateCompletionTemplate(context: ImportNotificationContext): NotificationTemplate {
    const successRate = Math.round((context.successfulRows / context.totalRows) * 100);
    const durationText = context.duration 
      ? `in ${Math.round(context.duration / 60)} minutes`
      : '';

    return {
      subject: `Import Completed: ${context.fileName}`,
      htmlBody: `
        <h2>Import Completed Successfully</h2>
        <p>Your timetable import has been completed ${durationText}.</p>
        <h3>Import Summary:</h3>
        <ul>
          <li><strong>File:</strong> ${context.fileName}</li>
          <li><strong>Total Rows:</strong> ${context.totalRows}</li>
          <li><strong>Successful:</strong> ${context.successfulRows} (${successRate}%)</li>
          <li><strong>Failed:</strong> ${context.failedRows}</li>
        </ul>
        <p>You can view the detailed import report in your dashboard.</p>
      `,
      textBody: `
Import Completed Successfully

Your timetable import has been completed ${durationText}.

Import Summary:
- File: ${context.fileName}
- Total Rows: ${context.totalRows}
- Successful: ${context.successfulRows} (${successRate}%)
- Failed: ${context.failedRows}

You can view the detailed import report in your dashboard.
      `,
      inAppTitle: 'Import Completed',
      inAppMessage: `${context.fileName} imported successfully. ${context.successfulRows}/${context.totalRows} rows processed.`,
      pushTitle: 'Import Completed',
      pushBody: `${context.fileName} has been imported successfully`
    };
  }

  private generateFailureTemplate(context: ImportNotificationContext): NotificationTemplate {
    return {
      subject: `Import Failed: ${context.fileName}`,
      htmlBody: `
        <h2>Import Failed</h2>
        <p>Unfortunately, your timetable import has failed.</p>
        <h3>Import Details:</h3>
        <ul>
          <li><strong>File:</strong> ${context.fileName}</li>
          <li><strong>Total Rows:</strong> ${context.totalRows}</li>
          <li><strong>Processed:</strong> ${context.processedRows}</li>
          ${context.errorSummary ? `<li><strong>Error:</strong> ${context.errorSummary}</li>` : ''}
        </ul>
        <p>Please check the error report in your dashboard and try importing again.</p>
      `,
      textBody: `
Import Failed

Unfortunately, your timetable import has failed.

Import Details:
- File: ${context.fileName}
- Total Rows: ${context.totalRows}
- Processed: ${context.processedRows}
${context.errorSummary ? `- Error: ${context.errorSummary}` : ''}

Please check the error report in your dashboard and try importing again.
      `,
      inAppTitle: 'Import Failed',
      inAppMessage: `${context.fileName} import failed. Check the error report for details.`,
      pushTitle: 'Import Failed',
      pushBody: `${context.fileName} import has failed`
    };
  }

  private generateProgressTemplate(context: ImportNotificationContext, percentage: number): NotificationTemplate {
    return {
      subject: `Import Progress: ${context.fileName} - ${percentage}% Complete`,
      htmlBody: `
        <h2>Import Progress Update</h2>
        <p>Your large timetable import is ${percentage}% complete.</p>
        <h3>Progress Details:</h3>
        <ul>
          <li><strong>File:</strong> ${context.fileName}</li>
          <li><strong>Progress:</strong> ${context.processedRows}/${context.totalRows} rows (${percentage}%)</li>
          <li><strong>Successful:</strong> ${context.successfulRows}</li>
          <li><strong>Failed:</strong> ${context.failedRows}</li>
        </ul>
        <p>We'll notify you when the import is complete.</p>
      `,
      textBody: `
Import Progress Update

Your large timetable import is ${percentage}% complete.

Progress Details:
- File: ${context.fileName}
- Progress: ${context.processedRows}/${context.totalRows} rows (${percentage}%)
- Successful: ${context.successfulRows}
- Failed: ${context.failedRows}

We'll notify you when the import is complete.
      `,
      inAppTitle: 'Import Progress',
      inAppMessage: `${context.fileName} is ${percentage}% complete (${context.processedRows}/${context.totalRows} rows)`,
      pushTitle: 'Import Progress',
      pushBody: `${context.fileName} is ${percentage}% complete`
    };
  }

  private getDefaultNotificationPreferences(userId: string): ImportNotificationPreferences {
    return {
      userId,
      emailNotifications: {
        enabled: true,
        onCompletion: true,
        onFailure: true,
        onLargeImports: true
      },
      inAppNotifications: {
        enabled: true,
        onProgress: true,
        onCompletion: true,
        onFailure: true
      },
      pushNotifications: {
        enabled: false, // Disabled by default
        onCompletion: false,
        onFailure: false
      }
    };
  }

  private async storeNotificationHistory(
    userId: string,
    jobId: string,
    type: string,
    template: NotificationTemplate
  ): Promise<void> {
    try {
      const historyKey = `user:notification:history:${userId}`;
      const historyEntry = {
        jobId,
        type,
        timestamp: new Date().toISOString(),
        template
      };

      // Add to beginning of list
      await redisManager.getClient().lpush(historyKey, JSON.stringify(historyEntry));
      
      // Keep only last 50 notifications
      await redisManager.getClient().ltrim(historyKey, 0, 49);
      
      // Set expiration
      await redisManager.getClient().expire(historyKey, 86400 * 30); // 30 days

    } catch (error) {
      logger.error(`Failed to store notification history for user ${userId}:`, error);
    }
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      // This would typically query the user database
      // For now, return a mock email based on userId
      return `user-${userId}@example.com`;
    } catch (error) {
      logger.error(`Failed to get email for user ${userId}:`, error);
      return null;
    }
  }

  private async getJobFileName(fileId: string): Promise<string> {
    try {
      const fileKey = `import:file:${fileId}`;
      const fileData = await redisManager.getClient().get(fileKey);
      
      if (!fileData) {
        return 'Unknown file';
      }

      const file = JSON.parse(fileData);
      return file.originalName || 'Unknown file';

    } catch (error) {
      logger.error(`Failed to get file name for file ${fileId}:`, error);
      return 'Unknown file';
    }
  }

  private async getJobErrorSummary(jobId: string): Promise<string | undefined> {
    try {
      const errorKey = `import:error:${jobId}`;
      const errorData = await redisManager.getClient().get(errorKey);
      
      if (!errorData) {
        return undefined;
      }

      const error = JSON.parse(errorData);
      return error.error || 'Unknown error occurred';

    } catch (error) {
      logger.error(`Failed to get error summary for job ${jobId}:`, error);
      return undefined;
    }
  }
}

// Export singleton instance
export const importNotificationService = ImportNotificationService.getInstance();