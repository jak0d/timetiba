import { ImportNotificationService, ImportNotificationContext } from '../../services/import/importNotificationService';
import { ImportStatus, ImportJob } from '../../types/import';
import { redisManager } from '../../utils/redisConfig';
import { EmailService } from '../../services/emailService';
import { RealTimeNotificationService } from '../../services/realTimeNotificationService';

// Mock dependencies
jest.mock('../../utils/redisConfig', () => ({
  redisManager: {
    getClient: jest.fn(() => ({
      get: jest.fn(),
      setex: jest.fn(),
      lpush: jest.fn(),
      ltrim: jest.fn(),
      expire: jest.fn(),
      lrange: jest.fn()
    }))
  }
}));

jest.mock('../../services/emailService', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn()
  }))
}));

jest.mock('../../services/realTimeNotificationService', () => ({
  RealTimeNotificationService: jest.fn().mockImplementation(() => ({
    sendToUser: jest.fn()
  }))
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('ImportNotificationService', () => {
  let notificationService: ImportNotificationService;
  let mockRedisClient: any;
  let mockRealTimeService: any;
  let mockEmailService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRedisClient = {
      get: jest.fn(),
      setex: jest.fn().mockResolvedValue('OK'),
      lpush: jest.fn().mockResolvedValue(1),
      ltrim: jest.fn().mockResolvedValue('OK'),
      expire: jest.fn().mockResolvedValue(1),
      lrange: jest.fn().mockResolvedValue([])
    };
    
    mockRealTimeService = {
      sendRealTimeNotification: jest.fn().mockResolvedValue(true)
    };

    mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue({ success: true })
    };
    
    (redisManager.getClient as jest.Mock).mockReturnValue(mockRedisClient);
    (RealTimeNotificationService as unknown as jest.Mock).mockImplementation(() => mockRealTimeService);
    (EmailService as unknown as jest.Mock).mockImplementation(() => mockEmailService);
    
    // Create fresh instance
    (ImportNotificationService as any).instance = undefined;
    notificationService = ImportNotificationService.getInstance();
  });

  const mockContext: ImportNotificationContext = {
    jobId: 'test-job-1',
    userId: 'user-123',
    fileName: 'test-import.csv',
    totalRows: 1000,
    processedRows: 950,
    successfulRows: 900,
    failedRows: 50,
    duration: 300
  };

  describe('sendImportCompletionNotification', () => {
    beforeEach(() => {
      // Mock default preferences
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        userId: 'user-123',
        emailNotifications: { enabled: true, onCompletion: true },
        inAppNotifications: { enabled: true, onCompletion: true },
        pushNotifications: { enabled: true, onCompletion: true }
      }));
    });

    it('should send completion notifications when enabled', async () => {
      await notificationService.sendImportCompletionNotification(mockContext);

      // Should send email
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
        to: 'user-user-123@example.com',
        subject: 'Import Completed: test-import.csv',
        body: expect.stringContaining('Import Completed Successfully')
      });

      // Should send in-app notification
      expect(mockRealTimeService.sendRealTimeNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'import_notification',
        title: 'Import Completed',
        message: expect.stringContaining('test-import.csv imported successfully'),
        userId: 'user-123'
      }));

      // Should send push notification
      expect(mockRealTimeService.sendRealTimeNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'push_notification',
        title: 'Import Completed',
        message: 'test-import.csv has been imported successfully',
        userId: 'user-123'
      }));

      // Should store notification history
      expect(mockRedisClient.lpush).toHaveBeenCalled();
    });

    it('should respect user preferences', async () => {
      // Mock preferences with email disabled
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        userId: 'user-123',
        emailNotifications: { enabled: false, onCompletion: false },
        inAppNotifications: { enabled: true, onCompletion: true },
        pushNotifications: { enabled: false, onCompletion: false }
      }));

      await notificationService.sendImportCompletionNotification(mockContext);

      // Should not send email
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();

      // Should send in-app notification
      expect(mockRealTimeService.sendRealTimeNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'import_notification'
      }));

      // Should not send push notification (only called once for in-app)
      expect(mockRealTimeService.sendRealTimeNotification).toHaveBeenCalledTimes(1);
    });

    it('should handle notification errors gracefully', async () => {
      mockEmailService.sendEmail.mockRejectedValue(new Error('Email service error'));

      // Should not throw error
      await expect(notificationService.sendImportCompletionNotification(mockContext))
        .resolves.not.toThrow();
    });
  });

  describe('sendImportFailureNotification', () => {
    beforeEach(() => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        userId: 'user-123',
        emailNotifications: { enabled: true, onFailure: true },
        inAppNotifications: { enabled: true, onFailure: true },
        pushNotifications: { enabled: true, onFailure: true }
      }));
    });

    it('should send failure notifications', async () => {
      const failureContext = {
        ...mockContext,
        errorSummary: 'Database connection failed'
      };

      await notificationService.sendImportFailureNotification(failureContext);

      // Should send email with error details
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
        to: 'user-user-123@example.com',
        subject: 'Import Failed: test-import.csv',
        body: expect.stringContaining('Import Failed')
      });

      // Should send in-app notification
      expect(mockRealTimeService.sendRealTimeNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'import_notification',
        title: 'Import Failed',
        message: expect.stringContaining('import failed'),
        userId: 'user-123'
      }));
    });
  });

  describe('sendLargeImportProgressNotification', () => {
    beforeEach(() => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        userId: 'user-123',
        emailNotifications: { enabled: true, onLargeImports: true },
        inAppNotifications: { enabled: true, onProgress: true }
      }));
    });

    it('should send progress notifications for large imports at milestones', async () => {
      const largeImportContext = {
        ...mockContext,
        totalRows: 5000 // Large import
      };

      await notificationService.sendLargeImportProgressNotification(largeImportContext, 50);

      // Should send email for large import
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
        to: 'user-user-123@example.com',
        subject: expect.stringContaining('50% Complete'),
        body: expect.stringContaining('50% complete')
      });

      // Should send in-app notification
      expect(mockRealTimeService.sendRealTimeNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'import_notification',
        title: 'Import Progress',
        message: expect.stringContaining('50% complete'),
        userId: 'user-123'
      }));
    });

    it('should not send progress notifications for small imports', async () => {
      const smallImportContext = {
        ...mockContext,
        totalRows: 100 // Small import
      };

      await notificationService.sendLargeImportProgressNotification(smallImportContext, 50);

      // Should not send any notifications
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
      expect(mockRealTimeService.sendRealTimeNotification).not.toHaveBeenCalled();
    });

    it('should only send notifications at specific milestones', async () => {
      const largeImportContext = {
        ...mockContext,
        totalRows: 5000
      };

      await notificationService.sendLargeImportProgressNotification(largeImportContext, 30);

      // Should not send notifications for non-milestone percentages
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
      expect(mockRealTimeService.sendRealTimeNotification).not.toHaveBeenCalled();
    });
  });

  describe('getUserNotificationPreferences', () => {
    it('should return stored preferences', async () => {
      const storedPreferences = {
        userId: 'user-123',
        emailNotifications: { enabled: false, onCompletion: false },
        inAppNotifications: { enabled: true, onCompletion: true },
        pushNotifications: { enabled: false, onCompletion: false }
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(storedPreferences));

      const preferences = await notificationService.getUserNotificationPreferences('user-123');

      expect(preferences).toEqual(storedPreferences);
      expect(mockRedisClient.get).toHaveBeenCalledWith('user:notifications:user-123');
    });

    it('should return default preferences when none stored', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const preferences = await notificationService.getUserNotificationPreferences('user-123');

      expect(preferences.userId).toBe('user-123');
      expect(preferences.emailNotifications.enabled).toBe(true);
      expect(preferences.inAppNotifications.enabled).toBe(true);
      expect(preferences.pushNotifications.enabled).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const preferences = await notificationService.getUserNotificationPreferences('user-123');

      // Should return default preferences
      expect(preferences.userId).toBe('user-123');
    });
  });

  describe('updateUserNotificationPreferences', () => {
    it('should update user preferences', async () => {
      const currentPreferences = {
        userId: 'user-123',
        emailNotifications: { enabled: true, onCompletion: true },
        inAppNotifications: { enabled: true, onCompletion: true },
        pushNotifications: { enabled: false, onCompletion: false }
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(currentPreferences));

      const updates = {
        emailNotifications: { 
          enabled: false, 
          onCompletion: false,
          onFailure: true,
          onLargeImports: true
        }
      };

      await notificationService.updateUserNotificationPreferences('user-123', updates);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'user:notifications:user-123',
        86400 * 30,
        expect.stringContaining('"enabled":false')
      );
    });

    it('should handle update errors', async () => {
      mockRedisClient.setex.mockRejectedValue(new Error('Redis error'));

      await expect(notificationService.updateUserNotificationPreferences('user-123', {}))
        .rejects.toThrow('Redis error');
    });
  });

  describe('getNotificationHistory', () => {
    it('should return notification history', async () => {
      const historyData = [
        JSON.stringify({
          jobId: 'job-1',
          type: 'completion',
          timestamp: '2024-01-01T10:00:00Z',
          template: { subject: 'Test' }
        }),
        JSON.stringify({
          jobId: 'job-2',
          type: 'failure',
          timestamp: '2024-01-01T09:00:00Z',
          template: { subject: 'Test 2' }
        })
      ];

      mockRedisClient.lrange.mockResolvedValue(historyData);

      const history = await notificationService.getNotificationHistory('user-123', 10);

      expect(history).toHaveLength(2);
      expect(history[0]?.jobId).toBe('job-1');
      expect(history[0]?.timestamp).toBeInstanceOf(Date);
      expect(mockRedisClient.lrange).toHaveBeenCalledWith('user:notification:history:user-123', 0, 9);
    });

    it('should handle empty history', async () => {
      mockRedisClient.lrange.mockResolvedValue([]);

      const history = await notificationService.getNotificationHistory('user-123');

      expect(history).toEqual([]);
    });
  });

  describe('handleImportStatusChange', () => {
    const mockJob: ImportJob = {
      id: 'test-job-1',
      userId: 'user-123',
      fileId: 'file-456',
      mappingConfig: {} as any,
      validationResult: {} as any,
      status: ImportStatus.COMPLETED,
      progress: {
        totalRows: 1000,
        processedRows: 950,
        successfulRows: 900,
        failedRows: 50,
        currentStage: 'finalization' as any
      },
      createdAt: new Date('2024-01-01T10:00:00Z'),
      completedAt: new Date('2024-01-01T10:05:00Z')
    };

    beforeEach(() => {
      // Mock file name lookup
      mockRedisClient.get.mockImplementation((key: string) => {
        if (key.includes('file:')) {
          return Promise.resolve(JSON.stringify({ originalName: 'test-import.csv' }));
        }
        if (key.includes('notifications:')) {
          return Promise.resolve(JSON.stringify({
            userId: 'user-123',
            emailNotifications: { enabled: true, onCompletion: true, onFailure: true },
            inAppNotifications: { enabled: true, onCompletion: true, onFailure: true },
            pushNotifications: { enabled: false }
          }));
        }
        return Promise.resolve(null);
      });
    });

    it('should handle completion status change', async () => {
      await notificationService.handleImportStatusChange(mockJob, ImportStatus.PROCESSING, ImportStatus.COMPLETED);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Import Completed: test-import.csv'
      }));
    });

    it('should handle failure status change', async () => {
      const failedJob = { ...mockJob, status: ImportStatus.FAILED };

      await notificationService.handleImportStatusChange(failedJob, ImportStatus.PROCESSING, ImportStatus.FAILED);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Import Failed: test-import.csv'
      }));
    });

    it('should handle processing status for large imports', async () => {
      // Mock preferences for this test
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        userId: 'user-123',
        emailNotifications: { enabled: true, onLargeImports: true },
        inAppNotifications: { enabled: true, onProgress: true }
      }));

      const context = {
        jobId: 'test-job-1',
        userId: 'user-123',
        fileName: 'test-import.csv',
        totalRows: 4000, // Large import
        processedRows: 2000,
        successfulRows: 1900,
        failedRows: 100
      };

      await notificationService.sendLargeImportProgressNotification(context, 50);

      // Should send progress notification for large import at 50%
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        subject: expect.stringContaining('50% Complete')
      }));
    });
  });

  describe('sendTestNotification', () => {
    beforeEach(() => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        userId: 'user-123',
        emailNotifications: { enabled: true },
        inAppNotifications: { enabled: true },
        pushNotifications: { enabled: true }
      }));
    });

    it('should send test notifications and return results', async () => {
      const results = await notificationService.sendTestNotification('user-123');

      expect(results.email).toBe(true);
      expect(results.inApp).toBe(true);
      expect(results.push).toBe(true);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Test Notification - Import Service'
      }));

      expect(mockRealTimeService.sendRealTimeNotification).toHaveBeenCalledTimes(2); // in-app and push
    });

    it('should handle partial failures', async () => {
      mockEmailService.sendEmail.mockRejectedValue(new Error('Email failed'));

      const results = await notificationService.sendTestNotification('user-123');

      expect(results.email).toBe(false);
      expect(results.inApp).toBe(true);
      expect(results.push).toBe(true);
    });
  });
});