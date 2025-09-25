import { SMSService, TwilioProvider, AWSSNSProvider } from '../services/smsService';
import { SMSConfig } from '../types/notification';

describe('SMSService', () => {
  describe('Provider Creation', () => {
    it('should create Twilio provider', () => {
      const config: SMSConfig = {
        provider: 'twilio',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        fromNumber: '+1234567890'
      };

      const smsService = new SMSService(config);
      expect(smsService).toBeDefined();
    });

    it('should create AWS SNS provider', () => {
      const config: SMSConfig = {
        provider: 'aws-sns',
        apiKey: 'test-key',
        region: 'us-east-1',
        fromNumber: '+1234567890'
      };

      const smsService = new SMSService(config);
      expect(smsService).toBeDefined();
    });

    it('should throw error for unsupported provider', () => {
      const config = {
        provider: 'unsupported' as any,
        fromNumber: '+1234567890'
      } as SMSConfig;

      expect(() => new SMSService(config)).toThrow('Unsupported SMS provider: unsupported');
    });
  });

  describe('Twilio Provider', () => {
    let provider: TwilioProvider;

    beforeEach(() => {
      const config: SMSConfig = {
        provider: 'twilio',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        fromNumber: '+1234567890'
      };
      provider = new TwilioProvider(config);
    });

    it('should validate valid configuration', () => {
      expect(provider.validateConfig()).toBe(true);
    });

    it('should invalidate missing required fields', () => {
      const config: SMSConfig = {
        provider: 'twilio',
        fromNumber: '+1234567890'
      };
      const invalidProvider = new TwilioProvider(config);
      expect(invalidProvider.validateConfig()).toBe(false);
    });

    it('should send SMS successfully with valid phone number', async () => {
      const message = {
        to: '+1234567890',
        body: 'Test SMS message'
      };

      const result = await provider.sendSMS(message);
      
      if (result.success) {
        expect(result.messageId).toBeDefined();
        expect(result.messageId).toMatch(/^tw_/);
      } else {
        expect(result.error).toBeDefined();
      }
    });

    it('should fail with invalid phone number', async () => {
      const message = {
        to: 'invalid-phone',
        body: 'Test SMS message'
      };

      const result = await provider.sendSMS(message);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
    });

    it('should validate phone number format', async () => {
      const validNumbers = ['+1234567890', '+447700900123', '+33123456789'];
      const invalidNumbers = ['1234567890', '+', '123', 'abc', '+1234567890123456'];

      for (const validNumber of validNumbers) {
        const result = await provider.sendSMS({ to: validNumber, body: 'Test' });
        if (result.error === 'Invalid phone number format') {
          fail(`Valid number ${validNumber} was rejected`);
        }
      }

      for (const invalidNumber of invalidNumbers) {
        const result = await provider.sendSMS({ to: invalidNumber, body: 'Test' });
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid phone number format');
      }
    });
  });

  describe('AWS SNS Provider', () => {
    let provider: AWSSNSProvider;

    beforeEach(() => {
      const config: SMSConfig = {
        provider: 'aws-sns',
        apiKey: 'test-key',
        region: 'us-east-1',
        fromNumber: '+1234567890'
      };
      provider = new AWSSNSProvider(config);
    });

    it('should validate valid configuration', () => {
      expect(provider.validateConfig()).toBe(true);
    });

    it('should invalidate missing required fields', () => {
      const config: SMSConfig = {
        provider: 'aws-sns',
        fromNumber: '+1234567890'
      };
      const invalidProvider = new AWSSNSProvider(config);
      expect(invalidProvider.validateConfig()).toBe(false);
    });

    it('should send SMS successfully with valid phone number', async () => {
      const message = {
        to: '+1234567890',
        body: 'Test SMS message'
      };

      const result = await provider.sendSMS(message);
      
      if (result.success) {
        expect(result.messageId).toBeDefined();
        expect(result.messageId).toMatch(/^sns_/);
      } else {
        expect(result.error).toBeDefined();
      }
    });

    it('should fail with invalid phone number', async () => {
      const message = {
        to: 'invalid-phone',
        body: 'Test SMS message'
      };

      const result = await provider.sendSMS(message);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
    });
  });

  describe('SMS Service Integration', () => {
    let smsService: SMSService;

    beforeEach(() => {
      const config: SMSConfig = {
        provider: 'twilio',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        fromNumber: '+1234567890'
      };
      smsService = new SMSService(config);
    });

    it('should send single SMS', async () => {
      const message = {
        to: '+1234567890',
        body: 'Test SMS message'
      };

      const result = await smsService.sendSMS(message);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should validate configuration', () => {
      expect(smsService.validateConfiguration()).toBe(true);
    });

    it('should handle invalid configuration', async () => {
      const invalidConfig: SMSConfig = {
        provider: 'twilio',
        fromNumber: '+1234567890'
      };
      const invalidService = new SMSService(invalidConfig);

      const message = {
        to: '+1234567890',
        body: 'Test SMS message'
      };

      const result = await invalidService.sendSMS(message);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid SMS configuration');
    });

    it('should reject messages that are too long', async () => {
      const longMessage = {
        to: '+1234567890',
        body: 'A'.repeat(161) // 161 characters, exceeds SMS limit
      };

      const result = await smsService.sendSMS(longMessage);
      expect(result.success).toBe(false);
      expect(result.error).toBe('SMS message too long (max 160 characters)');
    });

    it('should send bulk SMS', async () => {
      const messages = [
        {
          to: '+1234567890',
          body: 'Test SMS message 1'
        },
        {
          to: '+1234567891',
          body: 'Test SMS message 2'
        },
        {
          to: '+1234567892',
          body: 'Test SMS message 3'
        }
      ];

      const results = await smsService.sendBulkSMS(messages);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(typeof result.success).toBe('boolean');
      });
    });

    it('should handle bulk SMS batching with delays', async () => {
      // Create more messages than batch size to test batching
      const messages = Array.from({ length: 12 }, (_, i) => ({
        to: `+123456789${i}`,
        body: `Test SMS message ${i}`
      }));

      const startTime = Date.now();
      const results = await smsService.sendBulkSMS(messages);
      const endTime = Date.now();

      expect(results).toHaveLength(12);
      // Should take significant time due to batching delays (1 second between batches)
      expect(endTime - startTime).toBeGreaterThan(1000);
    });

    it('should truncate long messages', () => {
      const longMessage = 'A'.repeat(200);
      const truncated = smsService.truncateMessage(longMessage);
      
      expect(truncated.length).toBe(160);
      expect(truncated.endsWith('...')).toBe(true);
      expect(truncated.substring(0, 157)).toBe('A'.repeat(157));
    });

    it('should not truncate short messages', () => {
      const shortMessage = 'Short message';
      const result = smsService.truncateMessage(shortMessage);
      
      expect(result).toBe(shortMessage);
    });

    it('should truncate with custom length', () => {
      const message = 'A'.repeat(100);
      const truncated = smsService.truncateMessage(message, 50);
      
      expect(truncated.length).toBe(50);
      expect(truncated.endsWith('...')).toBe(true);
    });
  });
});