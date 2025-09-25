import { SMSConfig } from '../types/notification';

export interface SMSMessage {
  to: string;
  body: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export abstract class SMSProvider {
  protected config: SMSConfig;

  constructor(config: SMSConfig) {
    this.config = config;
  }

  abstract sendSMS(message: SMSMessage): Promise<SMSResult>;
  abstract validateConfig(): boolean;
}

export class TwilioProvider extends SMSProvider {
  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    try {
      // Mock implementation - in real app would use Twilio SDK
      console.log(`[Twilio] Sending SMS to ${message.to}`);
      console.log(`[Twilio] Body: ${message.body}`);
      
      // Validate phone number format (basic validation)
      if (!this.isValidPhoneNumber(message.to)) {
        throw new Error('Invalid phone number format');
      }
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Simulate success/failure
      if (Math.random() > 0.95) {
        throw new Error('Twilio API error');
      }
      
      return {
        success: true,
        messageId: `tw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.apiSecret && this.config.fromNumber);
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation - starts with + and contains only digits
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }
}

export class AWSSNSProvider extends SMSProvider {
  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    try {
      // Mock implementation - in real app would use AWS SDK
      console.log(`[AWS SNS] Sending SMS to ${message.to}`);
      console.log(`[AWS SNS] Body: ${message.body}`);
      
      // Validate phone number format
      if (!this.isValidPhoneNumber(message.to)) {
        throw new Error('Invalid phone number format');
      }
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Simulate success/failure
      if (Math.random() > 0.97) {
        throw new Error('AWS SNS error');
      }
      
      return {
        success: true,
        messageId: `sns_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.region);
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation for AWS SNS
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }
}

export class SMSService {
  private provider: SMSProvider;

  constructor(config: SMSConfig) {
    this.provider = this.createProvider(config);
  }

  private createProvider(config: SMSConfig): SMSProvider {
    switch (config.provider) {
      case 'twilio':
        return new TwilioProvider(config);
      case 'aws-sns':
        return new AWSSNSProvider(config);
      default:
        throw new Error(`Unsupported SMS provider: ${config.provider}`);
    }
  }

  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    if (!this.provider.validateConfig()) {
      return {
        success: false,
        error: 'Invalid SMS configuration'
      };
    }

    // Validate message length (SMS has character limits)
    if (message.body.length > 160) {
      return {
        success: false,
        error: 'SMS message too long (max 160 characters)'
      };
    }

    return await this.provider.sendSMS(message);
  }

  validateConfiguration(): boolean {
    return this.provider.validateConfig();
  }

  async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResult[]> {
    const results: SMSResult[] = [];
    
    // Send SMS in smaller batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchPromises = batch.map(message => this.sendSMS(message));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Longer delay between SMS batches due to rate limits
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  truncateMessage(message: string, maxLength: number = 160): string {
    if (message.length <= maxLength) {
      return message;
    }
    
    // Truncate and add ellipsis
    return message.substring(0, maxLength - 3) + '...';
  }
}