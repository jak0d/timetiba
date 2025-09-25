import { EventEmitter } from 'events';
import { 
  NotificationPriority
} from '../types/notification';

export interface WebSocketConnection {
  id: string;
  userId: string;
  socket: any; // WebSocket instance
  isActive: boolean;
  connectedAt: Date;
  lastActivity: Date;
}

export interface RealTimeNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority: NotificationPriority;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

export interface NotificationAcknowledgment {
  notificationId: string;
  userId: string;
  acknowledgedAt: Date;
  action?: string; // 'read', 'dismissed', 'clicked', etc.
}

export class RealTimeNotificationService extends EventEmitter {
  private connections: Map<string, WebSocketConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> connectionIds
  private pendingNotifications: Map<string, RealTimeNotification[]> = new Map(); // userId -> notifications
  private acknowledgments: Map<string, NotificationAcknowledgment> = new Map(); // notificationId -> ack
  private redisClient: any; // Redis client for pub/sub
  private redisSubscriber: any; // Redis subscriber
  private isRedisConnected: boolean = false;

  constructor(redisClient?: any) {
    super();
    this.redisClient = redisClient;
    this.setupRedisSubscriber();
  }

  private setupRedisSubscriber(): void {
    if (!this.redisClient) {
      console.log('[RealTime] Redis client not provided, using in-memory mode');
      return;
    }

    try {
      // Create subscriber client
      this.redisSubscriber = this.redisClient.duplicate();
      
      this.redisSubscriber.on('connect', () => {
        console.log('[RealTime] Redis subscriber connected');
        this.isRedisConnected = true;
      });

      this.redisSubscriber.on('error', (error: Error) => {
        console.error('[RealTime] Redis subscriber error:', error);
        this.isRedisConnected = false;
      });

      this.redisSubscriber.on('message', (channel: string, message: string) => {
        this.handleRedisMessage(channel, message);
      });

      // Subscribe to notification channels
      this.redisSubscriber.subscribe('notifications:broadcast');
      this.redisSubscriber.subscribe('notifications:user:*');
      
    } catch (error) {
      console.error('[RealTime] Failed to setup Redis subscriber:', error);
      this.isRedisConnected = false;
    }
  }

  private handleRedisMessage(channel: string, message: string): void {
    try {
      const data = JSON.parse(message);
      
      if (channel === 'notifications:broadcast') {
        this.broadcastToAllUsers(data);
      } else if (channel.startsWith('notifications:user:')) {
        const userId = channel.split(':')[2];
        if (userId) {
          this.sendToUser(userId, data);
        }
      }
    } catch (error) {
      console.error('[RealTime] Error handling Redis message:', error);
    }
  }

  addConnection(connectionId: string, userId: string, socket: any): void {
    const connection: WebSocketConnection = {
      id: connectionId,
      userId,
      socket,
      isActive: true,
      connectedAt: new Date(),
      lastActivity: new Date()
    };

    this.connections.set(connectionId, connection);

    // Track user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);

    // Send pending notifications to the newly connected user
    this.sendPendingNotifications(userId);

    // Setup socket event handlers
    this.setupSocketHandlers(connection);

    console.log(`[RealTime] User ${userId} connected with connection ${connectionId}`);
    this.emit('userConnected', { userId, connectionId });
  }

  private setupSocketHandlers(connection: WebSocketConnection): void {
    const { socket, id: connectionId } = connection;

    socket.on('message', (data: string) => {
      try {
        const message = JSON.parse(data);
        this.handleSocketMessage(connectionId, message);
      } catch (error) {
        console.error('[RealTime] Error parsing socket message:', error);
      }
    });

    socket.on('close', () => {
      this.removeConnection(connectionId);
    });

    socket.on('error', (error: Error) => {
      console.error(`[RealTime] Socket error for connection ${connectionId}:`, error);
      this.removeConnection(connectionId);
    });

    socket.on('pong', () => {
      // Update last activity on pong response
      const conn = this.connections.get(connectionId);
      if (conn) {
        conn.lastActivity = new Date();
      }
    });
  }

  private handleSocketMessage(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.lastActivity = new Date();

    switch (message.type) {
      case 'acknowledge':
        this.acknowledgeNotification(message.notificationId, connection.userId, message.action);
        break;
      case 'ping':
        this.sendToConnection(connectionId, { type: 'pong', timestamp: new Date() });
        break;
      case 'subscribe':
        // Handle subscription to specific notification types
        this.handleSubscription(connectionId, message.channels);
        break;
      default:
        console.log(`[RealTime] Unknown message type: ${message.type}`);
    }
  }

  private handleSubscription(connectionId: string, channels: string[]): void {
    // In a real implementation, you might track which channels each connection is subscribed to
    console.log(`[RealTime] Connection ${connectionId} subscribed to channels:`, channels);
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { userId } = connection;

    // Remove from connections
    this.connections.delete(connectionId);

    // Remove from user connections
    const userConnections = this.userConnections.get(userId);
    if (userConnections) {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    console.log(`[RealTime] Connection ${connectionId} removed for user ${userId}`);
    this.emit('userDisconnected', { userId, connectionId });
  }

  async sendRealTimeNotification(notification: RealTimeNotification): Promise<boolean> {
    const { userId } = notification;

    // Store notification for acknowledgment tracking
    if (!this.pendingNotifications.has(userId)) {
      this.pendingNotifications.set(userId, []);
    }
    this.pendingNotifications.get(userId)!.push(notification);

    // Try to send via Redis pub/sub first
    if (this.isRedisConnected) {
      try {
        await this.redisClient.publish(`notifications:user:${userId}`, JSON.stringify(notification));
        return true;
      } catch (error) {
        console.error('[RealTime] Failed to publish to Redis:', error);
      }
    }

    // Fallback to direct WebSocket delivery
    return this.sendToUser(userId, notification);
  }

  private sendToUser(userId: string, data: any): boolean {
    const userConnections = this.userConnections.get(userId);
    if (!userConnections || userConnections.size === 0) {
      console.log(`[RealTime] No active connections for user ${userId}`);
      return false;
    }

    let sent = false;
    for (const connectionId of userConnections) {
      if (this.sendToConnection(connectionId, data)) {
        sent = true;
      }
    }

    return sent;
  }

  private sendToConnection(connectionId: string, data: any): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) {
      return false;
    }

    try {
      const message = JSON.stringify(data);
      connection.socket.send(message);
      connection.lastActivity = new Date();
      return true;
    } catch (error) {
      console.error(`[RealTime] Failed to send to connection ${connectionId}:`, error);
      this.removeConnection(connectionId);
      return false;
    }
  }

  private broadcastToAllUsers(data: any): void {
    for (const [connectionId] of this.connections) {
      this.sendToConnection(connectionId, data);
    }
  }

  private sendPendingNotifications(userId: string): void {
    const pending = this.pendingNotifications.get(userId);
    if (!pending || pending.length === 0) return;

    // Send unacknowledged notifications
    const unacknowledged = pending.filter(n => !n.acknowledged);
    for (const notification of unacknowledged) {
      this.sendToUser(userId, notification);
    }
  }

  acknowledgeNotification(notificationId: string, userId: string, action?: string): void {
    const acknowledgment: NotificationAcknowledgment = {
      notificationId,
      userId,
      acknowledgedAt: new Date(),
      ...(action && { action })
    };

    this.acknowledgments.set(notificationId, acknowledgment);

    // Mark notification as acknowledged
    const userNotifications = this.pendingNotifications.get(userId);
    if (userNotifications) {
      const notification = userNotifications.find(n => n.id === notificationId);
      if (notification) {
        notification.acknowledged = true;
        notification.acknowledgedAt = new Date();
      }
    }

    console.log(`[RealTime] Notification ${notificationId} acknowledged by user ${userId}`);
    this.emit('notificationAcknowledged', acknowledgment);
  }

  async broadcastSystemNotification(notification: Omit<RealTimeNotification, 'userId'>): Promise<void> {
    const systemNotification = {
      ...notification,
      userId: 'system'
    };

    if (this.isRedisConnected) {
      try {
        await this.redisClient.publish('notifications:broadcast', JSON.stringify(systemNotification));
        return;
      } catch (error) {
        console.error('[RealTime] Failed to broadcast via Redis:', error);
      }
    }

    // Fallback to direct broadcast
    this.broadcastToAllUsers(systemNotification);
  }

  getActiveConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.isActive);
  }

  getUserConnections(userId: string): WebSocketConnection[] {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) return [];

    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter((conn): conn is WebSocketConnection => conn !== undefined && conn.isActive);
  }

  getPendingNotifications(userId: string): RealTimeNotification[] {
    return this.pendingNotifications.get(userId) || [];
  }

  getUnacknowledgedNotifications(userId: string): RealTimeNotification[] {
    const pending = this.pendingNotifications.get(userId) || [];
    return pending.filter(n => !n.acknowledged);
  }

  getNotificationAcknowledgment(notificationId: string): NotificationAcknowledgment | undefined {
    return this.acknowledgments.get(notificationId);
  }

  // Cleanup old notifications and acknowledgments
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void { // Default 24 hours
    const cutoff = new Date(Date.now() - maxAge);

    // Clean up old notifications
    for (const [userId, notifications] of this.pendingNotifications) {
      const filtered = notifications.filter(n => n.timestamp > cutoff);
      if (filtered.length === 0) {
        this.pendingNotifications.delete(userId);
      } else {
        this.pendingNotifications.set(userId, filtered);
      }
    }

    // Clean up old acknowledgments
    for (const [notificationId, ack] of this.acknowledgments) {
      if (ack.acknowledgedAt < cutoff) {
        this.acknowledgments.delete(notificationId);
      }
    }
  }

  // Health check for connections
  pingConnections(): void {
    for (const [connectionId, connection] of this.connections) {
      if (!connection.isActive) continue;

      try {
        connection.socket.ping();
      } catch (error) {
        console.error(`[RealTime] Failed to ping connection ${connectionId}:`, error);
        this.removeConnection(connectionId);
      }
    }
  }

  // Get statistics
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    connectedUsers: number;
    pendingNotifications: number;
    totalAcknowledgments: number;
  } {
    const activeConnections = this.getActiveConnections();
    const totalPending = Array.from(this.pendingNotifications.values())
      .reduce((sum, notifications) => sum + notifications.length, 0);

    return {
      totalConnections: this.connections.size,
      activeConnections: activeConnections.length,
      connectedUsers: this.userConnections.size,
      pendingNotifications: totalPending,
      totalAcknowledgments: this.acknowledgments.size
    };
  }

  // Shutdown cleanup
  shutdown(): void {
    // Close all connections
    for (const [connectionId, connection] of this.connections) {
      try {
        connection.socket.close();
      } catch (error) {
        console.error(`[RealTime] Error closing connection ${connectionId}:`, error);
      }
    }

    // Close Redis connections
    if (this.redisSubscriber) {
      this.redisSubscriber.quit();
    }

    // Clear all data
    this.connections.clear();
    this.userConnections.clear();
    this.pendingNotifications.clear();
    this.acknowledgments.clear();

    console.log('[RealTime] Service shutdown complete');
  }
}