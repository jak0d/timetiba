import { logger } from '../utils/logger';
import { EmailService } from './emailService';
import { SMSService } from './smsService';

// Initialize services with default configurations
const emailService = new EmailService({
  provider: 'smtp',
  smtp: {
    host: process.env['SMTP_HOST'] || 'localhost',
    port: parseInt(process.env['SMTP_PORT'] || '587'),
    secure: process.env['SMTP_SECURE'] === 'true',
    auth: {
      user: process.env['SMTP_USER'] || '',
      pass: process.env['SMTP_PASS'] || ''
    }
  },
  from: process.env['EMAIL_FROM'] || 'noreply@timetabler.com'
});

const smsService = new SMSService({
  provider: 'twilio',
  config: {
    accountSid: process.env['TWILIO_ACCOUNT_SID'] || '',
    authToken: process.env['TWILIO_AUTH_TOKEN'] || '',
    fromNumber: process.env['TWILIO_FROM_NUMBER'] || ''
  }
});

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  source: string;
  metadata?: any;
  resolved?: boolean;
  resolvedAt?: Date;
}

export enum AlertType {
  SYSTEM_ERROR = 'system_error',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  SECURITY_INCIDENT = 'security_incident',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  HIGH_MEMORY_USAGE = 'high_memory_usage',
  SLOW_QUERY = 'slow_query',
  AI_SERVICE_ERROR = 'ai_service_error',
  AUTHENTICATION_FAILURE = 'authentication_failure',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AlertRule {
  type: AlertType;
  condition: (data: any) => boolean;
  severity: AlertSeverity;
  cooldownMinutes: number;
  channels: AlertChannel[];
}

export enum AlertChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WEBHOOK = 'webhook',
  LOG = 'log'
}

class AlertingService {
  private alerts: Map<string, Alert> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();
  private alertRules: AlertRule[] = [];
  private webhookUrl?: string;

  constructor() {
    this.setupDefaultRules();
    this.webhookUrl = process.env['ALERT_WEBHOOK_URL'] || undefined;
  }

  private setupDefaultRules() {
    this.alertRules = [
      {
        type: AlertType.SYSTEM_ERROR,
        condition: (data) => data.error && data.error.stack,
        severity: AlertSeverity.HIGH,
        cooldownMinutes: 5,
        channels: [AlertChannel.EMAIL, AlertChannel.LOG]
      },
      {
        type: AlertType.PERFORMANCE_DEGRADATION,
        condition: (data) => data.duration && data.duration > 5000,
        severity: AlertSeverity.MEDIUM,
        cooldownMinutes: 10,
        channels: [AlertChannel.EMAIL, AlertChannel.LOG]
      },
      {
        type: AlertType.HIGH_MEMORY_USAGE,
        condition: (data) => data.memoryUsagePercent && data.memoryUsagePercent > 85,
        severity: AlertSeverity.HIGH,
        cooldownMinutes: 15,
        channels: [AlertChannel.EMAIL, AlertChannel.SMS, AlertChannel.LOG]
      },
      {
        type: AlertType.SLOW_QUERY,
        condition: (data) => data.duration && data.duration > 2000,
        severity: AlertSeverity.MEDIUM,
        cooldownMinutes: 5,
        channels: [AlertChannel.LOG]
      },
      {
        type: AlertType.AI_SERVICE_ERROR,
        condition: (data) => data.type === 'ai_operation_error',
        severity: AlertSeverity.HIGH,
        cooldownMinutes: 5,
        channels: [AlertChannel.EMAIL, AlertChannel.LOG]
      },
      {
        type: AlertType.AUTHENTICATION_FAILURE,
        condition: (data) => data.type === 'auth_failure' && data.attempts > 5,
        severity: AlertSeverity.MEDIUM,
        cooldownMinutes: 10,
        channels: [AlertChannel.EMAIL, AlertChannel.LOG]
      },
      {
        type: AlertType.SERVICE_UNAVAILABLE,
        condition: (data) => data.status === 'unhealthy',
        severity: AlertSeverity.CRITICAL,
        cooldownMinutes: 2,
        channels: [AlertChannel.EMAIL, AlertChannel.SMS, AlertChannel.WEBHOOK, AlertChannel.LOG]
      }
    ];
  }

  async processEvent(eventData: any) {
    for (const rule of this.alertRules) {
      if (rule.condition(eventData)) {
        await this.triggerAlert(rule, eventData);
      }
    }
  }

  private async triggerAlert(rule: AlertRule, eventData: any) {
    const alertKey = `${rule.type}_${this.getAlertKey(eventData)}`;
    
    // Check cooldown
    const lastAlert = this.alertCooldowns.get(alertKey);
    if (lastAlert) {
      const cooldownEnd = new Date(lastAlert.getTime() + rule.cooldownMinutes * 60000);
      if (new Date() < cooldownEnd) {
        return; // Still in cooldown period
      }
    }

    const alert: Alert = {
      id: this.generateAlertId(),
      type: rule.type,
      severity: rule.severity,
      title: this.generateAlertTitle(rule.type, eventData),
      message: this.generateAlertMessage(rule.type, eventData),
      timestamp: new Date(),
      source: eventData.source || 'ai-timetabler',
      metadata: eventData,
      resolved: false
    };

    // Store alert
    this.alerts.set(alert.id, alert);
    this.alertCooldowns.set(alertKey, new Date());

    // Send alert through configured channels
    await this.sendAlert(alert, rule.channels);

    logger.warn('Alert triggered', {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      type_log: 'alert_triggered'
    });
  }

  private async sendAlert(alert: Alert, channels: AlertChannel[]) {
    const promises = channels.map(channel => this.sendToChannel(alert, channel));
    await Promise.allSettled(promises);
  }

  private async sendToChannel(alert: Alert, channel: AlertChannel) {
    try {
      switch (channel) {
        case AlertChannel.EMAIL:
          await this.sendEmailAlert(alert);
          break;
        case AlertChannel.SMS:
          await this.sendSMSAlert(alert);
          break;
        case AlertChannel.WEBHOOK:
          await this.sendWebhookAlert(alert);
          break;
        case AlertChannel.LOG:
          this.logAlert(alert);
          break;
      }
    } catch (error) {
      logger.error('Failed to send alert', {
        alertId: alert.id,
        channel,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'alert_send_error'
      });
    }
  }

  private async sendEmailAlert(alert: Alert) {
    const recipients = process.env['ALERT_EMAIL_RECIPIENTS']?.split(',') || [];
    if (recipients.length === 0) return;

    const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
    const html = this.generateEmailTemplate(alert);

    for (const recipient of recipients) {
      await emailService.sendEmail({
        to: recipient.trim(),
        subject,
        body: html
      });
    }
  }

  private async sendSMSAlert(alert: Alert) {
    const recipients = process.env['ALERT_SMS_RECIPIENTS']?.split(',') || [];
    if (recipients.length === 0) return;

    const message = `[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`;

    for (const recipient of recipients) {
      await smsService.sendSMS({
        to: recipient.trim(),
        body: message
      });
    }
  }

  private async sendWebhookAlert(alert: Alert) {
    if (!this.webhookUrl) return;

    const axios = require('axios');
    await axios.post(this.webhookUrl, {
      alert,
      timestamp: new Date().toISOString(),
      service: 'ai-timetabler'
    }, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private logAlert(alert: Alert) {
    logger.error('ALERT', {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      metadata: alert.metadata,
      type_log: 'alert'
    });
  }

  private generateAlertTitle(type: AlertType, eventData: any): string {
    switch (type) {
      case AlertType.SYSTEM_ERROR:
        return `System Error: ${eventData.error?.name || 'Unknown Error'}`;
      case AlertType.PERFORMANCE_DEGRADATION:
        return `Performance Degradation: ${eventData.operation || 'Unknown Operation'}`;
      case AlertType.HIGH_MEMORY_USAGE:
        return `High Memory Usage: ${eventData.memoryUsagePercent}%`;
      case AlertType.SLOW_QUERY:
        return `Slow Database Query: ${eventData.duration}ms`;
      case AlertType.AI_SERVICE_ERROR:
        return `AI Service Error: ${eventData.operation || 'Unknown Operation'}`;
      case AlertType.SERVICE_UNAVAILABLE:
        return `Service Unavailable: ${eventData.service || 'Unknown Service'}`;
      default:
        return `Alert: ${type}`;
    }
  }

  private generateAlertMessage(type: AlertType, eventData: any): string {
    switch (type) {
      case AlertType.SYSTEM_ERROR:
        return `A system error occurred: ${eventData.error?.message || 'No details available'}`;
      case AlertType.PERFORMANCE_DEGRADATION:
        return `Operation ${eventData.operation} took ${eventData.duration}ms to complete`;
      case AlertType.HIGH_MEMORY_USAGE:
        return `Memory usage is at ${eventData.memoryUsagePercent}% (${eventData.heapUsed}MB used)`;
      case AlertType.SLOW_QUERY:
        return `Database query took ${eventData.duration}ms to execute`;
      case AlertType.AI_SERVICE_ERROR:
        return `AI service operation failed: ${eventData.error?.message || 'No details available'}`;
      case AlertType.SERVICE_UNAVAILABLE:
        return `Service ${eventData.service} is not responding or unhealthy`;
      default:
        return `Alert of type ${type} was triggered`;
    }
  }

  private generateEmailTemplate(alert: Alert): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; margin: 20px;">
          <div style="border-left: 4px solid ${this.getSeverityColor(alert.severity)}; padding-left: 20px;">
            <h2 style="color: ${this.getSeverityColor(alert.severity)};">${alert.title}</h2>
            <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
            <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
            <p><strong>Source:</strong> ${alert.source}</p>
            <p><strong>Message:</strong> ${alert.message}</p>
            ${alert.metadata ? `<p><strong>Details:</strong> <pre>${JSON.stringify(alert.metadata, null, 2)}</pre></p>` : ''}
          </div>
          <hr>
          <p style="color: #666; font-size: 12px;">
            This alert was generated by the AI Timetabler monitoring system.
          </p>
        </body>
      </html>
    `;
  }

  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.LOW: return '#28a745';
      case AlertSeverity.MEDIUM: return '#ffc107';
      case AlertSeverity.HIGH: return '#fd7e14';
      case AlertSeverity.CRITICAL: return '#dc3545';
      default: return '#6c757d';
    }
  }

  private getAlertKey(eventData: any): string {
    // Generate a key to group similar alerts
    return eventData.operation || eventData.service || eventData.url || 'general';
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for alert management
  async resolveAlert(alertId: string) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      logger.info('Alert resolved', {
        alertId,
        type: alert.type,
        resolvedAt: alert.resolvedAt,
        type_log: 'alert_resolved'
      });
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  getAlertHistory(limit: number = 100): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  addCustomRule(rule: AlertRule) {
    this.alertRules.push(rule);
  }

  removeRule(type: AlertType) {
    this.alertRules = this.alertRules.filter(rule => rule.type !== type);
  }
}

export const alertingService = new AlertingService();