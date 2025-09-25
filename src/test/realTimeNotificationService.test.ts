import { RealTimeNotificationService, RealTimeNotification } from '../services/realTimeNotificationService';
import { NotificationPriority } from '../types/notification';
import { EventEmitter } from 'events';

// Mock WebSocket
class MockWebSocket extends EventEmitter {
  public readyState: number = 1; // OPEN
  public messages: string[] = [];

  send(data: string): void {
    this.messages.push(data);
  }

  close(): void {
    this.readyState = 3; // CLOSED
    this.emit('close');
  }

  ping(): void {
    this.emit('pong');
  }
}

// Mock Redis client
class MockRedisClient {
  private subscribers: Map<string, Function[]> = new Map();
  public publishedMessages: Array<{ channel: string; message: string }> = [];

  async publish(channel: string, message: string): Promise<void> {
    this.publishedMessages.push({ channel, message });
    
    // Simulate message delivery to subscribers
    const channelSubscribers = this.subscribers.get(channel) || [];
    channelSubscribers.forEach(callback => callback(channel, message));
  }

  subscribe(_channel: string): void {
    // Mock subscription
  }

  on(event: string, callback: Function): void {
    if (event === 'connect') {
      setTimeout(() => callback(), 10);
    }
  }

  // Add method to manually trigger connection
  triggerConnect(): void {
    setTimeout(() => {
      this.emit('connect');
    }, 10);
  }

  emit(event: string, ...args: any[]): boolean {
    // Simple event emitter mock
    return true;
  }

  duplicate(): MockRedisClient {
    return new MockRedisClient();
  }

  quit(): void {
    // Mock quit
  }
}

describe('RealTimeNotificationService', () => {
  let service: RealTimeNotificationService;
  let mockRedis: MockRedisClient;

  beforeEach(async () => {
    mockRedis = new MockRedisClient();
    service = new RealTimeNotificationService(mockRedis);
    
    // Wait for Redis connection to be established
    await new Promise(resolve => setTimeout(resolve, 20));
  });

  afterEach(() => {
    service.shutdown();
  });

  describe('Connection Management', () => {
    it('should add and track connections', () => {
      const mockSocket = new MockWebSocket();
      const connectionId = 'conn-1';
      const userId = 'user-1';

      service.addConnection(connectionId, userId, mockSocket);

      const connections = service.getActiveConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0]?.id).toBe(connectionId);
      expect(connections[0]?.userId).toBe(userId);
    });

    it('should remove connections', () => {
      const mockSocket = new MockWebSocket();
      const connectionId = 'conn-1';
      const userId = 'user-1';

      service.addConnection(connectionId, userId, mockSocket);
      expect(service.getActiveConnections()).toHaveLength(1);

      service.removeConnection(connectionId);
      expect(service.getActiveConnections()).toHaveLength(0);
    });

    it('should track multiple connections per user', () => {
      const mockSocket1 = new MockWebSocket();
      const mockSocket2 = new MockWebSocket();
      const userId = 'user-1';

      service.addConnection('conn-1', userId, mockSocket1);
      service.addConnection('conn-2', userId, mockSocket2);

      const userConnections = service.getUserConnections(userId);
      expect(userConnections).toHaveLength(2);
    });

    it('should emit connection events', (done) => {
      const mockSocket = new MockWebSocket();
      const connectionId = 'conn-1';
      const userId = 'user-1';

      service.on('userConnected', (data) => {
        expect(data.userId).toBe(userId);
        expect(data.connectionId).toBe(connectionId);
        done();
      });

      service.addConnection(connectionId, userId, mockSocket);
    });
  });

  describe('Real-time Notifications', () => {
    it('should send real-time notification to user', async () => {
      const mockSocket = new MockWebSocket();
      const userId = 'user-1';
      const connectionId = 'conn-1';

      service.addConnection(connectionId, userId, mockSocket);

      const notification: RealTimeNotification = {
        id: 'notif-1',
        userId,
        type: 'schedule-change',
        title: 'Schedule Updated',
        message: 'Your schedule has been updated',
        priority: NotificationPriority.HIGH,
        timestamp: new Date(),
        acknowledged: false
      };

      const result = await service.sendRealTimeNotification(notification);
      expect(result).toBe(true);

      // Check if message was sent to socket
      expect(mockSocket.messages).toHaveLength(1);
      const sentMessage = JSON.parse(mockSocket.messages[0]!);
      expect(sentMessage.id).toBe('notif-1');
      expect(sentMessage.title).toBe('Schedule Updated');
    });

    it('should store pending notifications', async () => {
      const userId = 'user-1';
      const notification: RealTimeNotification = {
        id: 'notif-1',
        userId,
        type: 'schedule-change',
        title: 'Schedule Updated',
        message: 'Your schedule has been updated',
        priority: NotificationPriority.HIGH,
        timestamp: new Date(),
        acknowledged: false
      };

      await service.sendRealTimeNotification(notification);

      const pending = service.getPendingNotifications(userId);
      expect(pending).toHaveLength(1);
      expect(pending[0]?.id).toBe('notif-1');
    });

    it('should send pending notifications to newly connected users', () => {
      const userId = 'user-1';
      const notification: RealTimeNotification = {
        id: 'notif-1',
        userId,
        type: 'schedule-change',
        title: 'Schedule Updated',
        message: 'Your schedule has been updated',
        priority: NotificationPriority.HIGH,
        timestamp: new Date(),
        acknowledged: false
      };

      // Send notification before user connects
      service.sendRealTimeNotification(notification);

      // Connect user
      const mockSocket = new MockWebSocket();
      service.addConnection('conn-1', userId, mockSocket);

      // Should receive the pending notification
      expect(mockSocket.messages.length).toBeGreaterThan(0);
      const sentMessage = JSON.parse(mockSocket.messages[mockSocket.messages.length - 1]!);
      expect(sentMessage.id).toBe('notif-1');
    });

    it('should broadcast system notifications', async () => {
      const mockSocket1 = new MockWebSocket();
      const mockSocket2 = new MockWebSocket();

      service.addConnection('conn-1', 'user-1', mockSocket1);
      service.addConnection('conn-2', 'user-2', mockSocket2);

      await service.broadcastSystemNotification({
        id: 'system-1',
        type: 'maintenance',
        title: 'System Maintenance',
        message: 'System will be down for maintenance',
        priority: NotificationPriority.HIGH,
        timestamp: new Date(),
        acknowledged: false
      });

      // Both users should receive the broadcast
      expect(mockSocket1.messages.length).toBeGreaterThan(0);
      expect(mockSocket2.messages.length).toBeGreaterThan(0);
    });
  });

  describe('Notification Acknowledgment', () => {
    it('should acknowledge notifications', async () => {
      const userId = 'user-1';
      const notificationId = 'notif-1';

      const notification: RealTimeNotification = {
        id: notificationId,
        userId,
        type: 'schedule-change',
        title: 'Schedule Updated',
        message: 'Your schedule has been updated',
        priority: NotificationPriority.HIGH,
        timestamp: new Date(),
        acknowledged: false
      };

      await service.sendRealTimeNotification(notification);

      service.acknowledgeNotification(notificationId, userId, 'read');

      const ack = service.getNotificationAcknowledgment(notificationId);
      expect(ack).toBeDefined();
      expect(ack!.userId).toBe(userId);
      expect(ack!.action).toBe('read');

      // Notification should be marked as acknowledged
      const pending = service.getPendingNotifications(userId);
      const acknowledgedNotif = pending.find(n => n.id === notificationId);
      expect(acknowledgedNotif!.acknowledged).toBe(true);
    });

    it('should emit acknowledgment events', (done) => {
      const userId = 'user-1';
      const notificationId = 'notif-1';

      service.on('notificationAcknowledged', (ack) => {
        expect(ack.notificationId).toBe(notificationId);
        expect(ack.userId).toBe(userId);
        done();
      });

      service.acknowledgeNotification(notificationId, userId);
    });

    it('should filter unacknowledged notifications', async () => {
      const userId = 'user-1';

      const notification1: RealTimeNotification = {
        id: 'notif-1',
        userId,
        type: 'schedule-change',
        title: 'Schedule Updated 1',
        message: 'Your schedule has been updated',
        priority: NotificationPriority.HIGH,
        timestamp: new Date(),
        acknowledged: false
      };

      const notification2: RealTimeNotification = {
        id: 'notif-2',
        userId,
        type: 'schedule-change',
        title: 'Schedule Updated 2',
        message: 'Your schedule has been updated again',
        priority: NotificationPriority.HIGH,
        timestamp: new Date(),
        acknowledged: false
      };

      await service.sendRealTimeNotification(notification1);
      await service.sendRealTimeNotification(notification2);

      // Acknowledge first notification
      service.acknowledgeNotification('notif-1', userId);

      const unacknowledged = service.getUnacknowledgedNotifications(userId);
      expect(unacknowledged).toHaveLength(1);
      expect(unacknowledged[0]?.id).toBe('notif-2');
    });
  });

  describe('Redis Integration', () => {
    it('should publish notifications via Redis', async () => {
      const userId = 'user-1';
      const notification: RealTimeNotification = {
        id: 'notif-1',
        userId,
        type: 'schedule-change',
        title: 'Schedule Updated',
        message: 'Your schedule has been updated',
        priority: NotificationPriority.HIGH,
        timestamp: new Date(),
        acknowledged: false
      };

      await service.sendRealTimeNotification(notification);

      expect(mockRedis.publishedMessages).toHaveLength(1);
      expect(mockRedis.publishedMessages[0]?.channel).toBe(`notifications:user:${userId}`);
      
      const publishedData = JSON.parse(mockRedis.publishedMessages[0]!.message);
      expect(publishedData.id).toBe('notif-1');
    });

    it('should broadcast system notifications via Redis', async () => {
      await service.broadcastSystemNotification({
        id: 'system-1',
        type: 'maintenance',
        title: 'System Maintenance',
        message: 'System will be down for maintenance',
        priority: NotificationPriority.HIGH,
        timestamp: new Date(),
        acknowledged: false
      });

      expect(mockRedis.publishedMessages).toHaveLength(1);
      expect(mockRedis.publishedMessages[0]?.channel).toBe('notifications:broadcast');
    });
  });

  describe('Connection Health', () => {
    it('should ping connections', () => {
      const mockSocket = new MockWebSocket();
      const connectionId = 'conn-1';
      const userId = 'user-1';

      let pingCalled = false;
      mockSocket.ping = () => {
        pingCalled = true;
      };

      service.addConnection(connectionId, userId, mockSocket);
      service.pingConnections();

      expect(pingCalled).toBe(true);
    });

    it('should remove failed connections during ping', () => {
      const mockSocket = new MockWebSocket();
      const connectionId = 'conn-1';
      const userId = 'user-1';

      mockSocket.ping = () => {
        throw new Error('Connection failed');
      };

      service.addConnection(connectionId, userId, mockSocket);
      expect(service.getActiveConnections()).toHaveLength(1);

      service.pingConnections();
      expect(service.getActiveConnections()).toHaveLength(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old notifications', async () => {
      const userId = 'user-1';
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

      const oldNotification: RealTimeNotification = {
        id: 'old-notif',
        userId,
        type: 'schedule-change',
        title: 'Old Notification',
        message: 'This is old',
        priority: NotificationPriority.NORMAL,
        timestamp: oldDate,
        acknowledged: false
      };

      const newNotification: RealTimeNotification = {
        id: 'new-notif',
        userId,
        type: 'schedule-change',
        title: 'New Notification',
        message: 'This is new',
        priority: NotificationPriority.NORMAL,
        timestamp: new Date(),
        acknowledged: false
      };

      await service.sendRealTimeNotification(oldNotification);
      await service.sendRealTimeNotification(newNotification);

      expect(service.getPendingNotifications(userId)).toHaveLength(2);

      // Cleanup with 24 hour max age
      service.cleanup(24 * 60 * 60 * 1000);

      const remaining = service.getPendingNotifications(userId);
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.id).toBe('new-notif');
    });

    it('should cleanup old acknowledgments', () => {
      const userId = 'user-1';
      const notificationId = 'notif-1';

      service.acknowledgeNotification(notificationId, userId);

      // Manually set old acknowledgment date
      const ack = service.getNotificationAcknowledgment(notificationId);
      if (ack) {
        ack.acknowledgedAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      }

      service.cleanup(24 * 60 * 60 * 1000);

      expect(service.getNotificationAcknowledgment(notificationId)).toBeUndefined();
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', async () => {
      const mockSocket1 = new MockWebSocket();
      const mockSocket2 = new MockWebSocket();

      service.addConnection('conn-1', 'user-1', mockSocket1);
      service.addConnection('conn-2', 'user-2', mockSocket2);

      const notification: RealTimeNotification = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'schedule-change',
        title: 'Schedule Updated',
        message: 'Your schedule has been updated',
        priority: NotificationPriority.HIGH,
        timestamp: new Date(),
        acknowledged: false
      };

      await service.sendRealTimeNotification(notification);
      service.acknowledgeNotification('notif-1', 'user-1');

      const stats = service.getStats();
      expect(stats.totalConnections).toBe(2);
      expect(stats.activeConnections).toBe(2);
      expect(stats.connectedUsers).toBe(2);
      expect(stats.pendingNotifications).toBe(1);
      expect(stats.totalAcknowledgments).toBe(1);
    });
  });
});