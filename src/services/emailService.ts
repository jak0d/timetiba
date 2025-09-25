import { EmailConfig } from '../types/notification';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  html?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export abstract class EmailProvider {
  protected config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  abstract sendEmail(message: EmailMessage): Promise<EmailResult>;
  abstract validateConfig(): boolean;
}

export class SendGridProvider extends EmailProvider {
  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    try {
      // Mock implementation - in real app would use @sendgrid/mail
      console.log(`[SendGrid] Sending email to ${message.to}`);
      console.log(`[SendGrid] Subject: ${message.subject}`);
      console.log(`[SendGrid] Body: ${message.body.substring(0, 100)}...`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate success/failure
      if (Math.random() > 0.95) {
        throw new Error('SendGrid API error');
      }
      
      return {
        success: true,
        messageId: `sg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.fromEmail);
  }
}

export class AWSESProvider extends EmailProvider {
  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    try {
      // Mock implementation - in real app would use AWS SDK
      console.log(`[AWS SES] Sending email to ${message.to}`);
      console.log(`[AWS SES] Subject: ${message.subject}`);
      console.log(`[AWS SES] Body: ${message.body.substring(0, 100)}...`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Simulate success/failure
      if (Math.random() > 0.97) {
        throw new Error('AWS SES error');
      }
      
      return {
        success: true,
        messageId: `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.region && this.config.fromEmail);
  }
}

export class SMTPProvider extends EmailProvider {
  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    try {
      // Mock implementation - in real app would use nodemailer
      console.log(`[SMTP] Sending email to ${message.to}`);
      console.log(`[SMTP] Subject: ${message.subject}`);
      console.log(`[SMTP] Body: ${message.body.substring(0, 100)}...`);
      
      // Simulate SMTP connection and send
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Simulate success/failure
      if (Math.random() > 0.98) {
        throw new Error('SMTP connection error');
      }
      
      return {
        success: true,
        messageId: `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  validateConfig(): boolean {
    return !!(
      this.config.smtpHost && 
      this.config.smtpPort && 
      this.config.smtpUser && 
      this.config.smtpPassword && 
      this.config.fromEmail
    );
  }
}

export class EmailService {
  private provider: EmailProvider;

  constructor(config: EmailConfig) {
    this.provider = this.createProvider(config);
  }

  private createProvider(config: EmailConfig): EmailProvider {
    switch (config.provider) {
      case 'sendgrid':
        return new SendGridProvider(config);
      case 'aws-ses':
        return new AWSESProvider(config);
      case 'smtp':
        return new SMTPProvider(config);
      default:
        throw new Error(`Unsupported email provider: ${config.provider}`);
    }
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    if (!this.provider.validateConfig()) {
      return {
        success: false,
        error: 'Invalid email configuration'
      };
    }

    return await this.provider.sendEmail(message);
  }

  validateConfiguration(): boolean {
    return this.provider.validateConfig();
  }

  async sendBulkEmails(messages: EmailMessage[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    
    // Send emails in batches to avoid overwhelming the provider
    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchPromises = batch.map(message => this.sendEmail(message));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }
}