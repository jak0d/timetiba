import { 
  NotificationChannel, 
  NotificationPriority, 
  NotificationStatus,
  NotificationTemplate,
  NotificationPreference,
  NotificationRequest,
  NotificationDelivery
} from '../types/notification';

export class Notification {
  constructor(
    public id: string,
    public recipientId: string,
    public templateId: string,
    public channel: NotificationChannel,
    public priority: NotificationPriority,
    public subject: string,
    public body: string,
    public variables: Record<string, any> = {},
    public status: NotificationStatus = NotificationStatus.PENDING,
    public scheduledAt?: Date,
    public expiresAt?: Date,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  static fromRequest(request: NotificationRequest, template: NotificationTemplate): Notification {
    const processedSubject = this.processTemplate(template.subject, request.variables);
    const processedBody = this.processTemplate(template.body, request.variables);

    return new Notification(
      request.id,
      request.recipientId,
      request.templateId,
      request.channel,
      request.priority,
      processedSubject,
      processedBody,
      request.variables,
      NotificationStatus.PENDING,
      request.scheduledAt,
      request.expiresAt
    );
  }

  private static processTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  updateStatus(status: NotificationStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  shouldSendNow(): boolean {
    if (this.isExpired()) return false;
    if (!this.scheduledAt) return true;
    return new Date() >= this.scheduledAt;
  }
}

export { 
  NotificationTemplate,
  NotificationPreference,
  NotificationRequest,
  NotificationDelivery,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus
};