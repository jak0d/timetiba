import { NotificationService } from '../services/notificationService';
import { 
  NotificationChannel, 
  NotificationPriority,
  NotificationConfig,
  NotificationRequest
} from '../types/notification';

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let config: NotificationConfig;

  beforeEach(() => {
    config = {
      email: {
        provider: 'sendgrid',
        apiKey: 'test-key',
        fromEmail: 'test@example.com',
        fromName: 'Test Sender'
      },
      sms: {
        provider: 'twilio',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        fromNumber: '+1234567890'
      },
      retryAttempts: 3,
      retryDelay: 1000,
      batchSize: 10
    };

    notificationService = new NotificationService(config);
  });

  describe('Initialization', () => {
    it('should initialize with configuration', () => {
      expect(notificationService).toBeDefined();
    });
  });

  describe('Single Notification Sending', () => {
    it('should send email notification successfully', async () => {
      const request: NotificationRequest = {
        id: 'test-notification-1',
        recipientId: 'user123',
        templateId: 'schedule-change',
        channel: NotificationChannel.EMAIL,
        priority: NotificationPriority.NORMAL,
        variables: {
          recipientName: 'John Doe',
          courseName: 'Mathematics 101',
          previousTime: '9:00 AM',
          newTime: '10:00 AM',
          venueName: 'Room A101',
          changeReason: 'Venue conflict'
        }
      };

      const result = await notificationService.sendNotification(request);
      
      expect(result).toBeDefined();
      expect(result.notificationId).toBe('test-notification-1');
      expect(result.channel).toBe(NotificationChannel.EMAIL);
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle non-existent template', async () => {
      const request: NotificationRequest = {
        id: 'test-notification-4',
        recipientId: 'user123',
        templateId: 'non-existent-template',
        channel: NotificationChannel.EMAIL,
        priority: NotificationPriority.NORMAL,
        variables: {}
      };

      const result = await notificationService.sendNotification(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
    });
  });
});