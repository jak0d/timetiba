import { NotificationPreferenceService } from '../services/notificationPreferenceService';
import { NotificationChannel, NotificationPriority } from '../types/notification';

describe('NotificationPreferenceService', () => {
  let service: NotificationPreferenceService;

  beforeEach(() => {
    service = new NotificationPreferenceService();
  });

  describe('Default Preferences', () => {
    it('should create default preferences for new user', () => {
      const userId = 'user-1';
      const preferences = service.createDefaultPreferences(userId);

      expect(preferences.length).toBeGreaterThan(0);
      
      // Should have preferences for each notification type and channel combination
      const scheduleChangePrefs = preferences.filter(p => 
        p.notificationTypes.includes('schedule-change')
      );
      expect(scheduleChangePrefs.length).toBeGreaterThan(0);

      // Default channel should be enabled
      const defaultEnabledPrefs = preferences.filter(p => p.enabled);
      expect(defaultEnabledPrefs.length).toBeGreaterThan(0);
    });

    it('should return existing preferences for known user', () => {
      const userId = 'user-1';
      const initialPrefs = service.getUserPreferences(userId);
      const secondCall = service.getUserPreferences(userId);

      expect(initialPrefs).toEqual(secondCall);
    });

    it('should include all default notification types', () => {
      const notificationTypes = service.getNotificationTypes();
      
      expect(notificationTypes.length).toBeGreaterThan(0);
      
      const typeNames = notificationTypes.map(t => t.type);
      expect(typeNames).toContain('schedule-change');
      expect(typeNames).toContain('clash-detected');
      expect(typeNames).toContain('generation-complete');
      expect(typeNames).toContain('system-maintenance');
      expect(typeNames).toContain('deadline-reminder');
    });
  });

  describe('Preference Management', () => {
    let userId: string;
    let preferenceId: string;

    beforeEach(() => {
      userId = 'user-1';
      const preferences = service.getUserPreferences(userId);
      preferenceId = preferences[0]!.id;
    });

    it('should update existing preference', () => {
      const result = service.updatePreference(userId, preferenceId, {
        enabled: false,
        priority: NotificationPriority.LOW
      });

      expect(result).toBe(true);

      const updatedPrefs = service.getUserPreferences(userId);
      const updatedPref = updatedPrefs.find(p => p.id === preferenceId);
      
      expect(updatedPref!.enabled).toBe(false);
      expect(updatedPref!.priority).toBe(NotificationPriority.LOW);
      expect(updatedPref!.updatedAt).toBeInstanceOf(Date);
    });

    it('should return false when updating non-existent preference', () => {
      const result = service.updatePreference(userId, 'non-existent-id', {
        enabled: false
      });

      expect(result).toBe(false);
    });

    it('should add custom preference', () => {
      const customPref = {
        userId,
        channel: NotificationChannel.EMAIL,
        enabled: true,
        priority: NotificationPriority.HIGH,
        notificationTypes: ['custom-type'],
        realTimeEnabled: true,
        batchingEnabled: false
      };

      const newId = service.addPreference(userId, customPref);
      expect(newId).toBeDefined();

      const preferences = service.getUserPreferences(userId);
      const addedPref = preferences.find(p => p.id === newId);
      
      expect(addedPref).toBeDefined();
      expect(addedPref!.notificationTypes).toContain('custom-type');
    });

    it('should remove preference', () => {
      const initialCount = service.getUserPreferences(userId).length;
      
      const result = service.removePreference(userId, preferenceId);
      expect(result).toBe(true);

      const updatedPrefs = service.getUserPreferences(userId);
      expect(updatedPrefs.length).toBe(initialCount - 1);
      expect(updatedPrefs.find(p => p.id === preferenceId)).toBeUndefined();
    });

    it('should return false when removing non-existent preference', () => {
      const result = service.removePreference(userId, 'non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('Preference Filtering', () => {
    let userId: string;

    beforeEach(() => {
      userId = 'user-1';
      service.getUserPreferences(userId); // Initialize defaults
    });

    it('should get preferences for specific notification type', () => {
      const schedulePrefs = service.getPreferencesForType(userId, 'schedule-change');
      
      expect(schedulePrefs.length).toBeGreaterThan(0);
      schedulePrefs.forEach(pref => {
        expect(pref.notificationTypes).toContain('schedule-change');
      });
    });

    it('should get preferences for specific channel', () => {
      const emailPrefs = service.getPreferencesForChannel(userId, NotificationChannel.EMAIL);
      
      expect(emailPrefs.length).toBeGreaterThan(0);
      emailPrefs.forEach(pref => {
        expect(pref.channel).toBe(NotificationChannel.EMAIL);
      });
    });
  });

  describe('Notification Decision Logic', () => {
    let userId: string;

    beforeEach(() => {
      userId = 'user-1';
      service.getUserPreferences(userId); // Initialize defaults
    });

    it('should allow notifications when preference is enabled', () => {
      // Get email preferences for schedule changes
      const emailPrefs = service.getPreferencesForType(userId, 'schedule-change')
        .filter(p => p.channel === NotificationChannel.EMAIL);
      
      expect(emailPrefs.length).toBeGreaterThan(0);
      
      // Explicitly enable the preference
      const updateResult = service.updatePreference(userId, emailPrefs[0]!.id, { enabled: true });
      expect(updateResult).toBe(true);

      const shouldSend = service.shouldSendNotification(
        userId,
        'schedule-change',
        NotificationChannel.EMAIL,
        NotificationPriority.HIGH
      );

      expect(shouldSend).toBe(true);
    });

    it('should block notifications when preference is disabled', () => {
      // Disable email notifications for schedule changes
      const emailPrefs = service.getPreferencesForType(userId, 'schedule-change')
        .filter(p => p.channel === NotificationChannel.EMAIL);
      
      if (emailPrefs.length > 0) {
        service.updatePreference(userId, emailPrefs[0]!.id, { enabled: false });
      }

      const shouldSend = service.shouldSendNotification(
        userId,
        'schedule-change',
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL
      );

      expect(shouldSend).toBe(false);
    });

    it('should respect priority levels', () => {
      // Set minimum priority to HIGH
      const emailPrefs = service.getPreferencesForType(userId, 'schedule-change')
        .filter(p => p.channel === NotificationChannel.EMAIL);
      
      if (emailPrefs.length > 0) {
        service.updatePreference(userId, emailPrefs[0]!.id, { 
          enabled: true,
          priority: NotificationPriority.HIGH 
        });
      }

      // Normal priority should be blocked
      const shouldSendNormal = service.shouldSendNotification(
        userId,
        'schedule-change',
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL
      );
      expect(shouldSendNormal).toBe(false);

      // High priority should be allowed
      const shouldSendHigh = service.shouldSendNotification(
        userId,
        'schedule-change',
        NotificationChannel.EMAIL,
        NotificationPriority.HIGH
      );
      expect(shouldSendHigh).toBe(true);
    });

    it('should respect quiet hours', () => {
      // Set quiet hours from 22:00 to 08:00
      const smsPrefs = service.getPreferencesForType(userId, 'schedule-change')
        .filter(p => p.channel === NotificationChannel.SMS);
      
      if (smsPrefs.length > 0) {
        service.updatePreference(userId, smsPrefs[0]!.id, {
          enabled: true,
          quietHours: { start: '22:00', end: '08:00' }
        });
      }

      // Mock current time to be in quiet hours (e.g., 23:00)
      const originalDate = Date;
      const mockDate = new Date('2023-01-01T23:00:00Z');
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = jest.fn(() => mockDate.getTime());

      // Normal priority should be blocked during quiet hours
      const shouldSendNormal = service.shouldSendNotification(
        userId,
        'schedule-change',
        NotificationChannel.SMS,
        NotificationPriority.NORMAL
      );
      expect(shouldSendNormal).toBe(false);

      // Critical priority should be allowed during quiet hours
      const shouldSendCritical = service.shouldSendNotification(
        userId,
        'schedule-change',
        NotificationChannel.SMS,
        NotificationPriority.CRITICAL
      );
      expect(shouldSendCritical).toBe(true);

      // Restore original Date
      global.Date = originalDate;
    });

    it('should use default behavior for unknown notification types', () => {
      const shouldSend = service.shouldSendNotification(
        userId,
        'unknown-type',
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL
      );

      expect(shouldSend).toBe(false); // Unknown types should be blocked by default
    });
  });

  describe('Real-time and Batching Settings', () => {
    let userId: string;

    beforeEach(() => {
      userId = 'user-1';
      service.getUserPreferences(userId);
    });

    it('should check if real-time is enabled for notification type', () => {
      const isEnabled = service.isRealTimeEnabled(userId, 'schedule-change');
      expect(typeof isEnabled).toBe('boolean');
    });

    it('should check if batching is enabled for channel', () => {
      // Enable batching for email
      const emailPrefs = service.getPreferencesForChannel(userId, NotificationChannel.EMAIL);
      if (emailPrefs.length > 0) {
        service.updatePreference(userId, emailPrefs[0]!.id, { batchingEnabled: true });
      }

      const isEnabled = service.isBatchingEnabled(userId, NotificationChannel.EMAIL);
      expect(isEnabled).toBe(true);
    });

    it('should get batching interval', () => {
      // Set custom batching interval
      const emailPrefs = service.getPreferencesForChannel(userId, NotificationChannel.EMAIL);
      if (emailPrefs.length > 0) {
        service.updatePreference(userId, emailPrefs[0]!.id, { 
          batchingEnabled: true,
          batchingInterval: 30 
        });
      }

      const interval = service.getBatchingInterval(userId, NotificationChannel.EMAIL);
      expect(interval).toBe(30);
    });

    it('should return default batching interval when none set', () => {
      const interval = service.getBatchingInterval(userId, NotificationChannel.PUSH);
      expect(interval).toBe(15); // Default 15 minutes
    });
  });

  describe('Custom Notification Types', () => {
    it('should add custom notification type', () => {
      const customType = {
        type: 'custom-alert',
        name: 'Custom Alert',
        description: 'Custom alert notifications',
        defaultChannel: NotificationChannel.IN_APP,
        defaultPriority: NotificationPriority.NORMAL,
        allowedChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        requiresRealTime: true
      };

      service.addNotificationType(customType);

      const types = service.getNotificationTypes();
      const addedType = types.find(t => t.type === 'custom-alert');
      
      expect(addedType).toBeDefined();
      expect(addedType!.name).toBe('Custom Alert');
    });
  });

  describe('Import/Export', () => {
    let userId: string;

    beforeEach(() => {
      userId = 'user-1';
      service.getUserPreferences(userId);
    });

    it('should export user preferences', () => {
      const exported = service.exportUserPreferences(userId);
      expect(exported.length).toBeGreaterThan(0);
      expect(exported[0]).toHaveProperty('id');
      expect(exported[0]).toHaveProperty('userId');
    });

    it('should import user preferences', () => {
      const originalPrefs = service.exportUserPreferences(userId);
      
      // Modify preferences
      const modifiedPrefs = originalPrefs.map(p => ({
        ...p,
        enabled: !p.enabled
      }));

      service.importUserPreferences(userId, modifiedPrefs);

      const importedPrefs = service.getUserPreferences(userId);
      expect(importedPrefs.length).toBe(modifiedPrefs.length);
      
      // Check that modifications were applied
      const firstPref = importedPrefs[0]!;
      const originalFirstPref = originalPrefs[0]!;
      expect(firstPref.enabled).toBe(!originalFirstPref.enabled);
    });

    it('should validate preferences during import', () => {
      const invalidPrefs = [
        {
          id: 'invalid-1',
          userId: '',
          channel: NotificationChannel.EMAIL,
          enabled: true,
          priority: NotificationPriority.NORMAL,
          notificationTypes: ['non-existent-type'],
          realTimeEnabled: false,
          batchingEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      service.importUserPreferences(userId, invalidPrefs as any);

      const importedPrefs = service.getUserPreferences(userId);
      // Should not import invalid preferences
      expect(importedPrefs.find(p => p.id === 'invalid-1')).toBeUndefined();
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      // Initialize preferences for both users
      service.getUserPreferences(user1);
      service.getUserPreferences(user2);

      // Enable real-time for user1
      const user1Prefs = service.getUserPreferences(user1);
      if (user1Prefs.length > 0) {
        service.updatePreference(user1, user1Prefs[0]!.id, { realTimeEnabled: true });
      }

      // Enable batching for user2
      const user2Prefs = service.getUserPreferences(user2);
      if (user2Prefs.length > 0) {
        service.updatePreference(user2, user2Prefs[0]!.id, { batchingEnabled: true });
      }

      const stats = service.getStats();
      
      expect(stats.totalUsers).toBe(2);
      expect(stats.totalPreferences).toBeGreaterThan(0);
      expect(stats.enabledPreferences).toBeGreaterThan(0);
      expect(stats.realTimeEnabledUsers).toBeGreaterThanOrEqual(1);
      expect(stats.batchingEnabledUsers).toBeGreaterThanOrEqual(1);
    });
  });
});