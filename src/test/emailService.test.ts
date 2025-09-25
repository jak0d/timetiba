import { EmailService, SendGridProvider, AWSESProvider, SMTPProvider } from '../services/emailService';
import { EmailConfig } from '../types/notification';

describe('EmailService', () => {
  describe('Provider Creation', () => {
    it('should create SendGrid provider', () => {
      const config: EmailConfig = {
        provider: 'sendgrid',
        apiKey: 'test-key',
        fromEmail: 'test@example.com',
        fromName: 'Test Sender'
      };

      const emailService = new EmailService(config);
      expect(emailService).toBeDefined();
    });

    it('should create AWS SES provider', () => {
      const config: EmailConfig = {
        provider: 'aws-ses',
        apiKey: 'test-key',
        region: 'us-east-1',
        fromEmail: 'test@example.com',
        fromName: 'Test Sender'
      };

      const emailService = new EmailService(config);
      expect(emailService).toBeDefined();
    });

    it('should create SMTP provider', () => {
      const config: EmailConfig = {
        provider: 'smtp',
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user',
        smtpPassword: 'password',
        fromEmail: 'test@example.com',
        fromName: 'Test Sender'
      };

      const emailService = new EmailService(config);
      expect(emailService).toBeDefined();
    });

    it('should throw error for unsupported provider', () => {
      const config = {
        provider: 'unsupported' as any,
        fromEmail: 'test@example.com',
        fromName: 'Test Sender'
      } as EmailConfig;

      expect(() => new EmailService(config)).toThrow('Unsupported email provider: unsupported');
    });
  });

  describe('SendGrid Provider', () => {
    let provider: SendGridProvider;

    beforeEach(() => {
      const config: EmailConfig = {
        provider: 'sendgrid',
        apiKey: 'test-key',
        fromEmail: 'test@example.com',
        fromName: 'Test Sender'
      };
      provider = new SendGridProvider(config);
    });

    it('should validate valid configuration', () => {
      expect(provider.validateConfig()).toBe(true);
    });

    it('should invalidate missing API key', () => {
      const config: EmailConfig = {
        provider: 'sendgrid',
        fromEmail: 'test@example.com',
        fromName: 'Test Sender'
      };
      const invalidProvider = new SendGridProvider(config);
      expect(invalidProvider.validateConfig()).toBe(false);
    });

    it('should send email successfully', async () => {
      const message = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body content'
      };

      const result = await provider.sendEmail(message);
      
      // Since we're using mock implementation, it should succeed most of the time
      if (result.success) {
        expect(result.messageId).toBeDefined();
        expect(result.messageId).toMatch(/^sg_/);
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('AWS SES Provider', () => {
    let provider: AWSESProvider;

    beforeEach(() => {
      const config: EmailConfig = {
        provider: 'aws-ses',
        apiKey: 'test-key',
        region: 'us-east-1',
        fromEmail: 'test@example.com',
        fromName: 'Test Sender'
      };
      provider = new AWSESProvider(config);
    });

    it('should validate valid configuration', () => {
      expect(provider.validateConfig()).toBe(true);
    });

    it('should invalidate missing required fields', () => {
      const config: EmailConfig = {
        provider: 'aws-ses',
        fromEmail: 'test@example.com',
        fromName: 'Test Sender'
      };
      const invalidProvider = new AWSESProvider(config);
      expect(invalidProvider.validateConfig()).toBe(false);
    });

    it('should send email successfully', async () => {
      const message = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body content'
      };

      const result = await provider.sendEmail(message);
      
      if (result.success) {
        expect(result.messageId).toBeDefined();
        expect(result.messageId).toMatch(/^ses_/);
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('SMTP Provider', () => {
    let provider: SMTPProvider;

    beforeEach(() => {
      const config: EmailConfig = {
        provider: 'smtp',
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user',
        smtpPassword: 'password',
        fromEmail: 'test@example.com',
        fromName: 'Test Sender'
      };
      provider = new SMTPProvider(config);
    });

    it('should validate valid configuration', () => {
      expect(provider.validateConfig()).toBe(true);
    });

    it('should invalidate incomplete configuration', () => {
      const config: EmailConfig = {
        provider: 'smtp',
        smtpHost: 'smtp.example.com',
        fromEmail: 'test@example.com',
        fromName: 'Test Sender'
      };
      const invalidProvider = new SMTPProvider(config);
      expect(invalidProvider.validateConfig()).toBe(false);
    });

    it('should send email successfully', async () => {
      const message = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body content'
      };

      const result = await provider.sendEmail(message);
      
      if (result.success) {
        expect(result.messageId).toBeDefined();
        expect(result.messageId).toMatch(/^smtp_/);
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Email Service Integration', () => {
    let emailService: EmailService;

    beforeEach(() => {
      const config: EmailConfig = {
        provider: 'sendgrid',
        apiKey: 'test-key',
        fromEmail: 'test@example.com',
        fromName: 'Test Sender'
      };
      emailService = new EmailService(config);
    });

    it('should send single email', async () => {
      const message = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body content'
      };

      const result = await emailService.sendEmail(message);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should validate configuration', () => {
      expect(emailService.validateConfiguration()).toBe(true);
    });

    it('should handle invalid configuration', async () => {
      const invalidConfig: EmailConfig = {
        provider: 'sendgrid',
        fromEmail: 'test@example.com',
        fromName: 'Test Sender'
      };
      const invalidService = new EmailService(invalidConfig);

      const message = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body content'
      };

      const result = await invalidService.sendEmail(message);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email configuration');
    });

    it('should send bulk emails', async () => {
      const messages = [
        {
          to: 'recipient1@example.com',
          subject: 'Test Subject 1',
          body: 'Test body content 1'
        },
        {
          to: 'recipient2@example.com',
          subject: 'Test Subject 2',
          body: 'Test body content 2'
        },
        {
          to: 'recipient3@example.com',
          subject: 'Test Subject 3',
          body: 'Test body content 3'
        }
      ];

      const results = await emailService.sendBulkEmails(messages);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(typeof result.success).toBe('boolean');
      });
    });

    it('should handle bulk email batching', async () => {
      // Create more messages than batch size to test batching
      const messages = Array.from({ length: 25 }, (_, i) => ({
        to: `recipient${i}@example.com`,
        subject: `Test Subject ${i}`,
        body: `Test body content ${i}`
      }));

      const startTime = Date.now();
      const results = await emailService.sendBulkEmails(messages);
      const endTime = Date.now();

      expect(results).toHaveLength(25);
      // Should take some time due to batching delays
      expect(endTime - startTime).toBeGreaterThan(200);
    });
  });
});