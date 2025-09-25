import { 
  NotificationChannel, 
  NotificationPriority, 
  NotificationStatus,
  NotificationConfig,
  NotificationRequest,
  NotificationDelivery,
  NotificationPreference
} from '../types/notification';
import { Notification } from '../models/notification';
import { TemplateEngine } from './templateEngine';
import { EmailService, EmailMessage } from './emailService';
import { SMSService, SMSMessage } from './smsService';

export interface DeliveryResult {
  notificationId: string;
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
  deliveredAt?: Date;
}

export class NotificationService {
  private templateEngine: TemplateEngine;
  private emailService: EmailService;
  private smsService: SMSService;
  private config: NotificationConfig;
  private deliveryQueue: NotificationRequest[] = [];
  private deliveryHistory: Map<string, NotificationDelivery[]> = new Map();
  private userPreferences: Map<string, NotificationPreference[]> = new Map();

  constructor(config: NotificationConfig) {
    this.config = config;
    this.templateEngine = new TemplateEngine();
    this.emailService = new EmailService(config.email);
    this.smsService = new SMSService(config.sms);
  }

  async sendNotification(request: NotificationRequest): Promise<DeliveryResult> {
    try {
      // Get template
      const template = this.templateEngine.getTemplate(request.templateId);
      if (!template) {
        return {
          notificationId: request.id,
          channel: request.channel,
          success: false,
          error: `Template not found: ${request.templateId}`
        };
      }

      // Check user preferences
      if (!this.shouldSendNotification(request)) {
        return {
          notificationId: request.id,
          channel: request.channel,
          success: false,
          error: 'Notification blocked by user preferences'
        };
      }

      // Create notification
      const notification = Notification.fromRequest(request, template);

      // Check if notification is expired or not ready to send
      if (notification.isExpired()) {
        return {
          notificationId: request.id,
          channel: request.channel,
          success: false,
          error: 'Notification has expired'
        };
      }

      if (!notification.shouldSendNow()) {
        // Add to queue for later delivery
        this.deliveryQueue.push(request);
        return {
          notificationId: request.id,
          channel: request.channel,
          success: true,
          messageId: 'queued'
        };
      }

      // Send notification based on channel
      const result = await this.deliverNotification(notification, request.recipientId);
      
      // Record delivery attempt
      this.recordDelivery(request.id, request.channel, result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.recordDelivery(request.id, request.channel, {
        notificationId: request.id,
        channel: request.channel,
        success: false,
        error: errorMessage
      });

      return {
        notificationId: request.id,
        channel: request.channel,
        success: false,
        error: errorMessage
      };
    }
  }

  private async deliverNotification(notification: Notification, recipientId: string): Promise<DeliveryResult> {
    const recipientInfo = await this.getRecipientInfo(recipientId);
    
    switch (notification.channel) {
      case NotificationChannel.EMAIL:
        return await this.sendEmailNotification(notification, recipientInfo.email);
      
      case NotificationChannel.SMS:
        return await this.sendSMSNotification(notification, recipientInfo.phone);
      
      case NotificationChannel.IN_APP:
        return await this.sendInAppNotification(notification, recipientId);
      
      default:
        return {
          notificationId: notification.id,
          channel: notification.channel,
          success: false,
          error: `Unsupported notification channel: ${notification.channel}`
        };
    }
  }

  private async sendEmailNotification(notification: Notification, recipientEmail: string): Promise<DeliveryResult> {
    const emailMessage: EmailMessage = {
      to: recipientEmail,
      subject: notification.subject,
      body: notification.body
    };

    const result = await this.emailService.sendEmail(emailMessage);
    
    return {
      notificationId: notification.id,
      channel: NotificationChannel.EMAIL,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      deliveredAt: result.success ? new Date() : undefined
    };
  }

  private async sendSMSNotification(notification: Notification, recipientPhone: string): Promise<DeliveryResult> {
    // For SMS, we typically send a shorter version of the message
    const smsBody = this.smsService.truncateMessage(notification.body, 160);
    
    const smsMessage: SMSMessage = {
      to: recipientPhone,
      body: smsBody
    };

    const result = await this.smsService.sendSMS(smsMessage);
    
    return {
      notificationId: notification.id,
      channel: NotificationChannel.SMS,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      deliveredAt: result.success ? new Date() : undefined
    };
  }

  private async sendInAppNotification(notification: Notification, recipientId: string): Promise<DeliveryResult> {
    // Mock in-app notification - in real app would use WebSocket or push to database
    console.log(`[In-App] Notification for user ${recipientId}: ${notification.subject}`);
    
    return {
      notificationId: notification.id,
      channel: NotificationChannel.IN_APP,
      success: true,
      messageId: `inapp_${Date.now()}`,
      deliveredAt: new Date()
    };
  }

  async sendBulkNotifications(requests: NotificationRequest[]): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];
    
    // Process notifications in batches
    for (let i = 0; i < requests.length; i += this.config.batchSize) {
      const batch = requests.slice(i, i + this.config.batchSize);
      const batchPromises = batch.map(request => this.sendNotification(request));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + this.config.batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  async retryFailedNotifications(): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];
    const failedDeliveries = this.getFailedDeliveries();
    
    for (const delivery of failedDeliveries) {
      if (delivery.retryCount < delivery.maxRetries) {
        // Find original request (in real app, would be stored in database)
        const originalRequest = this.findOriginalRequest(delivery.notificationId);
        if (originalRequest) {
          delivery.retryCount++;
          const result = await this.sendNotification(originalRequest);
          results.push(result);
          
          // Update delivery record
          if (result.success) {
            delivery.status = NotificationStatus.DELIVERED;
            delivery.deliveredAt = new Date();
          }
        }
      }
    }
    
    return results;
  }

  setUserPreferences(userId: string, preferences: NotificationPreference[]): void {
    this.userPreferences.set(userId, preferences);
  }

  getUserPreferences(userId: string): NotificationPreference[] {
    return this.userPreferences.get(userId) || [];
  }

  private shouldSendNotification(request: NotificationRequest): boolean {
    const preferences = this.getUserPreferences(request.recipientId);
    
    // If no preferences set, allow all notifications
    if (preferences.length === 0) {
      return true;
    }

    // Check if channel is enabled for this priority level
    const channelPreference = preferences.find(p => p.channel === request.channel);
    if (!channelPreference) {
      return true; // Default to allow if no specific preference
    }

    if (!channelPreference.enabled) {
      return false;
    }

    // Check priority level
    const priorityOrder = {
      [NotificationPriority.LOW]: 0,
      [NotificationPriority.NORMAL]: 1,
      [NotificationPriority.HIGH]: 2,
      [NotificationPriority.CRITICAL]: 3
    };

    if (priorityOrder[request.priority] < priorityOrder[channelPreference.priority]) {
      return false;
    }

    // Check quiet hours
    if (channelPreference.quietHours && this.isInQuietHours(channelPreference.quietHours)) {
      // Only allow critical notifications during quiet hours
      return request.priority === NotificationPriority.CRITICAL;
    }

    return true;
  }

  private isInQuietHours(quietHours: { start: string; end: string }): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private recordDelivery(notificationId: string, channel: NotificationChannel, result: DeliveryResult): void {
    const delivery: NotificationDelivery = {
      id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      notificationId,
      channel,
      status: result.success ? NotificationStatus.DELIVERED : NotificationStatus.FAILED,
      sentAt: new Date(),
      deliveredAt: result.deliveredAt,
      errorMessage: result.error,
      retryCount: 0,
      maxRetries: this.config.retryAttempts
    };

    const existingDeliveries = this.deliveryHistory.get(notificationId) || [];
    existingDeliveries.push(delivery);
    this.deliveryHistory.set(notificationId, existingDeliveries);
  }

  private getFailedDeliveries(): NotificationDelivery[] {
    const failed: NotificationDelivery[] = [];
    
    for (const deliveries of this.deliveryHistory.values()) {
      for (const delivery of deliveries) {
        if (delivery.status === NotificationStatus.FAILED && delivery.retryCount < delivery.maxRetries) {
          failed.push(delivery);
        }
      }
    }
    
    return failed;
  }

  private findOriginalRequest(notificationId: string): NotificationRequest | undefined {
    // In real implementation, this would query the database
    return this.deliveryQueue.find(req => req.id === notificationId);
  }

  private async getRecipientInfo(recipientId: string): Promise<{ email: string; phone: string }> {
    // Mock implementation - in real app would query user database
    return {
      email: `user${recipientId}@example.com`,
      phone: `+1555${recipientId.padStart(7, '0')}`
    };
  }

  getDeliveryHistory(notificationId: string): NotificationDelivery[] {
    return this.deliveryHistory.get(notificationId) || [];
  }

  getQueuedNotifications(): NotificationRequest[] {
    return [...this.deliveryQueue];
  }

  processScheduledNotifications(): Promise<DeliveryResult[]> {
    const readyNotifications = this.deliveryQueue.filter(request => {
      if (!request.scheduledAt) return true;
      return new Date() >= request.scheduledAt;
    });

    // Remove processed notifications from queue
    this.deliveryQueue = this.deliveryQueue.filter(request => !readyNotifications.includes(request));

    return this.sendBulkNotifications(readyNotifications);
  }
}