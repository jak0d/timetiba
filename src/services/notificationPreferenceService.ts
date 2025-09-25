import { 
  NotificationChannel, 
  NotificationPriority,
  NotificationPreference
} from '../types/notification';

export interface ExtendedNotificationPreference extends NotificationPreference {
  id: string;
  notificationTypes: string[]; // e.g., ['schedule-change', 'clash-detected']
  realTimeEnabled: boolean;
  batchingEnabled: boolean;
  batchingInterval?: number; // minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTypeConfig {
  type: string;
  name: string;
  description: string;
  defaultChannel: NotificationChannel;
  defaultPriority: NotificationPriority;
  allowedChannels: NotificationChannel[];
  requiresRealTime: boolean;
}

export class NotificationPreferenceService {
  private preferences: Map<string, ExtendedNotificationPreference[]> = new Map();
  private notificationTypes: Map<string, NotificationTypeConfig> = new Map();

  constructor() {
    this.initializeDefaultNotificationTypes();
  }

  private initializeDefaultNotificationTypes(): void {
    const defaultTypes: NotificationTypeConfig[] = [
      {
        type: 'schedule-change',
        name: 'Schedule Changes',
        description: 'Notifications about changes to your schedule',
        defaultChannel: NotificationChannel.EMAIL,
        defaultPriority: NotificationPriority.HIGH,
        allowedChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP],
        requiresRealTime: true
      },
      {
        type: 'clash-detected',
        name: 'Scheduling Conflicts',
        description: 'Alerts about scheduling conflicts that need attention',
        defaultChannel: NotificationChannel.IN_APP,
        defaultPriority: NotificationPriority.CRITICAL,
        allowedChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP],
        requiresRealTime: true
      },
      {
        type: 'generation-complete',
        name: 'Timetable Generation',
        description: 'Notifications when timetable generation is complete',
        defaultChannel: NotificationChannel.IN_APP,
        defaultPriority: NotificationPriority.NORMAL,
        allowedChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        requiresRealTime: false
      },
      {
        type: 'system-maintenance',
        name: 'System Maintenance',
        description: 'Notifications about system maintenance and updates',
        defaultChannel: NotificationChannel.EMAIL,
        defaultPriority: NotificationPriority.LOW,
        allowedChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        requiresRealTime: false
      },
      {
        type: 'deadline-reminder',
        name: 'Deadline Reminders',
        description: 'Reminders about upcoming deadlines',
        defaultChannel: NotificationChannel.EMAIL,
        defaultPriority: NotificationPriority.NORMAL,
        allowedChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP],
        requiresRealTime: false
      }
    ];

    defaultTypes.forEach(type => {
      this.notificationTypes.set(type.type, type);
    });
  }

  // Create default preferences for a new user
  createDefaultPreferences(userId: string): ExtendedNotificationPreference[] {
    const defaultPreferences: ExtendedNotificationPreference[] = [];

    // Create preferences for each notification type and channel combination
    for (const [typeKey, typeConfig] of this.notificationTypes) {
      for (const channel of typeConfig.allowedChannels) {
        const preference: ExtendedNotificationPreference = {
          id: `${userId}_${typeKey}_${channel}`,
          userId,
          channel,
          enabled: channel === typeConfig.defaultChannel, // Enable default channel
          priority: typeConfig.defaultPriority,
          notificationTypes: [typeKey],
          realTimeEnabled: typeConfig.requiresRealTime,
          batchingEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...(channel === NotificationChannel.SMS && {
            quietHours: {
              start: '22:00',
              end: '08:00'
            }
          })
        };

        defaultPreferences.push(preference);
      }
    }

    this.preferences.set(userId, defaultPreferences);
    return defaultPreferences;
  }

  // Get user preferences
  getUserPreferences(userId: string): ExtendedNotificationPreference[] {
    let userPrefs = this.preferences.get(userId);
    
    if (!userPrefs) {
      userPrefs = this.createDefaultPreferences(userId);
    }

    return userPrefs;
  }

  // Update user preference
  updatePreference(userId: string, preferenceId: string, updates: Partial<ExtendedNotificationPreference>): boolean {
    const userPrefs = this.getUserPreferences(userId);
    const preferenceIndex = userPrefs.findIndex(p => p.id === preferenceId);

    if (preferenceIndex === -1) {
      return false;
    }

    const preference = userPrefs[preferenceIndex];
    if (!preference) {
      return false;
    }

    Object.assign(preference, updates, { updatedAt: new Date() });
    this.preferences.set(userId, userPrefs);

    return true;
  }

  // Add custom preference
  addPreference(userId: string, preference: Omit<ExtendedNotificationPreference, 'id' | 'createdAt' | 'updatedAt'>): string {
    const userPrefs = this.getUserPreferences(userId);
    const preferenceId = `${userId}_custom_${Date.now()}`;

    const newPreference: ExtendedNotificationPreference = {
      ...preference,
      id: preferenceId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    userPrefs.push(newPreference);
    this.preferences.set(userId, userPrefs);

    return preferenceId;
  }

  // Remove preference
  removePreference(userId: string, preferenceId: string): boolean {
    const userPrefs = this.getUserPreferences(userId);
    const initialLength = userPrefs.length;
    
    const filteredPrefs = userPrefs.filter(p => p.id !== preferenceId);
    
    if (filteredPrefs.length === initialLength) {
      return false; // Preference not found
    }

    this.preferences.set(userId, filteredPrefs);
    return true;
  }

  // Get preferences for specific notification type
  getPreferencesForType(userId: string, notificationType: string): ExtendedNotificationPreference[] {
    const userPrefs = this.getUserPreferences(userId);
    return userPrefs.filter(p => p.notificationTypes.includes(notificationType));
  }

  // Get preferences for specific channel
  getPreferencesForChannel(userId: string, channel: NotificationChannel): ExtendedNotificationPreference[] {
    const userPrefs = this.getUserPreferences(userId);
    return userPrefs.filter(p => p.channel === channel);
  }

  // Check if notification should be sent based on preferences
  shouldSendNotification(
    userId: string, 
    notificationType: string, 
    channel: NotificationChannel, 
    priority: NotificationPriority
  ): boolean {
    const preferences = this.getPreferencesForType(userId, notificationType)
      .filter(p => p.channel === channel);

    if (preferences.length === 0) {
      // No specific preference, use default behavior
      const typeConfig = this.notificationTypes.get(notificationType);
      return typeConfig ? typeConfig.allowedChannels.includes(channel) : false;
    }

    // Check if any matching preference allows the notification
    for (const pref of preferences) {
      if (!pref.enabled) continue;

      // Check priority level
      const priorityOrder = {
        [NotificationPriority.LOW]: 0,
        [NotificationPriority.NORMAL]: 1,
        [NotificationPriority.HIGH]: 2,
        [NotificationPriority.CRITICAL]: 3
      };

      if (priorityOrder[priority] < priorityOrder[pref.priority]) {
        continue;
      }

      // Check quiet hours
      if (pref.quietHours && this.isInQuietHours(pref.quietHours)) {
        // Only allow critical notifications during quiet hours
        if (priority !== NotificationPriority.CRITICAL) {
          continue;
        }
      }

      return true;
    }

    return false;
  }

  // Check if real-time notification is enabled
  isRealTimeEnabled(userId: string, notificationType: string): boolean {
    const preferences = this.getPreferencesForType(userId, notificationType);
    
    if (preferences.length === 0) {
      const typeConfig = this.notificationTypes.get(notificationType);
      return typeConfig ? typeConfig.requiresRealTime : false;
    }

    return preferences.some(p => p.enabled && p.realTimeEnabled);
  }

  // Check if batching is enabled for user
  isBatchingEnabled(userId: string, channel: NotificationChannel): boolean {
    const preferences = this.getPreferencesForChannel(userId, channel);
    return preferences.some(p => p.enabled && p.batchingEnabled);
  }

  // Get batching interval for user and channel
  getBatchingInterval(userId: string, channel: NotificationChannel): number {
    const preferences = this.getPreferencesForChannel(userId, channel)
      .filter(p => p.enabled && p.batchingEnabled);

    if (preferences.length === 0) {
      return 15; // Default 15 minutes
    }

    // Return the shortest interval
    return Math.min(...preferences.map(p => p.batchingInterval || 15));
  }

  private isInQuietHours(quietHours: { start: string; end: string }): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);
    
    const startTime = (startHour || 0) * 60 + (startMin || 0);
    const endTime = (endHour || 0) * 60 + (endMin || 0);
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // Get available notification types
  getNotificationTypes(): NotificationTypeConfig[] {
    return Array.from(this.notificationTypes.values());
  }

  // Add custom notification type
  addNotificationType(typeConfig: NotificationTypeConfig): void {
    this.notificationTypes.set(typeConfig.type, typeConfig);
  }

  // Export user preferences (for backup/migration)
  exportUserPreferences(userId: string): ExtendedNotificationPreference[] {
    return this.getUserPreferences(userId);
  }

  // Import user preferences (for backup/migration)
  importUserPreferences(userId: string, preferences: ExtendedNotificationPreference[]): void {
    // Validate preferences before importing
    const validPreferences = preferences.filter(p => this.validatePreference(p));
    this.preferences.set(userId, validPreferences);
  }

  private validatePreference(preference: ExtendedNotificationPreference): boolean {
    // Basic validation
    if (!preference.userId || !preference.channel || !preference.id) {
      return false;
    }

    // Check if notification types exist
    const validTypes = preference.notificationTypes.filter(type => 
      this.notificationTypes.has(type)
    );

    if (validTypes.length === 0) {
      return false;
    }

    // Update to only include valid types
    preference.notificationTypes = validTypes;
    return true;
  }

  // Get statistics
  getStats(): {
    totalUsers: number;
    totalPreferences: number;
    enabledPreferences: number;
    realTimeEnabledUsers: number;
    batchingEnabledUsers: number;
  } {
    let totalPreferences = 0;
    let enabledPreferences = 0;
    const realTimeUsers = new Set<string>();
    const batchingUsers = new Set<string>();

    for (const [userId, preferences] of this.preferences) {
      totalPreferences += preferences.length;
      
      for (const pref of preferences) {
        if (pref.enabled) {
          enabledPreferences++;
        }
        
        if (pref.realTimeEnabled) {
          realTimeUsers.add(userId);
        }
        
        if (pref.batchingEnabled) {
          batchingUsers.add(userId);
        }
      }
    }

    return {
      totalUsers: this.preferences.size,
      totalPreferences,
      enabledPreferences,
      realTimeEnabledUsers: realTimeUsers.size,
      batchingEnabledUsers: batchingUsers.size
    };
  }
}