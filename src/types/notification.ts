export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
  PUSH = 'push'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  ACKNOWLEDGED = 'acknowledged'
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  channel: NotificationChannel;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  userId: string;
  channel: NotificationChannel;
  enabled: boolean;
  priority: NotificationPriority;
  quietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
}

export interface NotificationRequest {
  id: string;
  recipientId: string;
  templateId: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  variables: Record<string, any>;
  scheduledAt?: Date;
  expiresAt?: Date;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  acknowledgedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
}

export interface EmailConfig {
  provider: 'sendgrid' | 'aws-ses' | 'smtp';
  apiKey?: string;
  region?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  fromEmail: string;
  fromName: string;
}

export interface SMSConfig {
  provider: 'twilio' | 'aws-sns';
  apiKey?: string;
  apiSecret?: string;
  region?: string;
  fromNumber: string;
}

export interface NotificationConfig {
  email: EmailConfig;
  sms: SMSConfig;
  retryAttempts: number;
  retryDelay: number; // milliseconds
  batchSize: number;
}