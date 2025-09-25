import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { RealTimeNotificationService } from './realTimeNotificationService';
import { v4 as uuidv4 } from 'uuid';

export interface WebSocketServerConfig {
  port?: number;
  path?: string;
  heartbeatInterval?: number;
  maxConnections?: number;
}

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  connectionId?: string;
  isAuthenticated?: boolean;
  lastActivity?: Date;
}

export class NotificationWebSocketServer {
  private wss: WebSocketServer;
  private realTimeService: RealTimeNotificationService;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: WebSocketServerConfig;

  constructor(
    server: HTTPServer,
    realTimeService: RealTimeNotificationService,
    config: WebSocketServerConfig = {}
  ) {
    this.config = {
      path: '/notifications',
      heartbeatInterval: 30000, // 30 seconds
      maxConnections: 1000,
      ...config
    };

    this.realTimeService = realTimeService;
    
    this.wss = new WebSocketServer({
      server,
      path: this.config.path,
      maxPayload: 16 * 1024 // 16KB max payload
    });

    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, request) => {
      this.handleConnection(ws, request);
    });

    this.wss.on('error', (error) => {
      console.error('[WebSocket] Server error:', error);
    });

    console.log(`[WebSocket] Server started on path ${this.config.path}`);
  }

  private handleConnection(ws: AuthenticatedWebSocket, request: any): void {
    const connectionId = uuidv4();
    ws.connectionId = connectionId;
    ws.isAuthenticated = false;
    ws.lastActivity = new Date();

    console.log(`[WebSocket] New connection: ${connectionId}`);

    // Check connection limits
    if (this.wss.clients.size > (this.config.maxConnections || 1000)) {
      console.log('[WebSocket] Connection limit reached, closing connection');
      ws.close(1013, 'Server overloaded');
      return;
    }

    // Setup connection handlers
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    ws.on('close', (code: number, reason: Buffer) => {
      this.handleDisconnection(ws, code, reason.toString());
    });

    ws.on('error', (error: Error) => {
      console.error(`[WebSocket] Connection error for ${connectionId}:`, error);
      this.handleDisconnection(ws, 1011, 'Internal error');
    });

    ws.on('pong', () => {
      ws.lastActivity = new Date();
    });

    // Send welcome message
    this.sendToSocket(ws, {
      type: 'welcome',
      connectionId,
      timestamp: new Date(),
      message: 'Connected to notification service'
    });
  }

  private handleMessage(ws: AuthenticatedWebSocket, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      ws.lastActivity = new Date();

      switch (message.type) {
        case 'authenticate':
          this.handleAuthentication(ws, message);
          break;
        case 'ping':
          this.sendToSocket(ws, { type: 'pong', timestamp: new Date() });
          break;
        default:
          if (ws.isAuthenticated) {
            // Forward authenticated messages to real-time service
            this.realTimeService.emit('socketMessage', {
              connectionId: ws.connectionId,
              userId: ws.userId,
              message
            });
          } else {
            this.sendToSocket(ws, {
              type: 'error',
              message: 'Authentication required'
            });
          }
      }
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error);
      this.sendToSocket(ws, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  private handleAuthentication(ws: AuthenticatedWebSocket, message: any): void {
    // In a real application, you would validate the token/credentials
    const { token, userId } = message;

    if (!token || !userId) {
      this.sendToSocket(ws, {
        type: 'auth_error',
        message: 'Token and userId required'
      });
      return;
    }

    // Mock authentication - in real app, validate JWT token
    if (this.validateAuthToken(token, userId)) {
      ws.userId = userId;
      ws.isAuthenticated = true;

      // Register with real-time service
      this.realTimeService.addConnection(ws.connectionId!, userId, ws);

      this.sendToSocket(ws, {
        type: 'authenticated',
        userId,
        connectionId: ws.connectionId,
        timestamp: new Date()
      });

      console.log(`[WebSocket] User ${userId} authenticated on connection ${ws.connectionId}`);
    } else {
      this.sendToSocket(ws, {
        type: 'auth_error',
        message: 'Invalid credentials'
      });
      
      // Close connection after failed authentication
      setTimeout(() => {
        ws.close(1008, 'Authentication failed');
      }, 1000);
    }
  }

  private validateAuthToken(token: string, userId: string): boolean {
    // Mock validation - in real app, verify JWT token
    // For testing, accept any token that starts with 'valid_'
    return token.startsWith('valid_') && userId.length > 0;
  }

  private handleDisconnection(ws: AuthenticatedWebSocket, code: number, reason: string): void {
    console.log(`[WebSocket] Connection ${ws.connectionId} closed: ${code} - ${reason}`);

    if (ws.isAuthenticated && ws.connectionId) {
      this.realTimeService.removeConnection(ws.connectionId);
    }
  }

  private sendToSocket(ws: AuthenticatedWebSocket, data: any): boolean {
    if (ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      ws.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('[WebSocket] Error sending message:', error);
      return false;
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, this.config.heartbeatInterval || 30000);
  }

  private performHeartbeat(): void {
    const now = new Date();
    const timeout = 60000; // 60 seconds timeout

    this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (!ws.lastActivity || (now.getTime() - ws.lastActivity.getTime()) > timeout) {
        console.log(`[WebSocket] Terminating inactive connection ${ws.connectionId}`);
        ws.terminate();
        return;
      }

      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });

    // Also ping real-time service connections
    this.realTimeService.pingConnections();
  }

  // Broadcast to all authenticated connections
  broadcast(data: any): void {
    this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.isAuthenticated && ws.readyState === WebSocket.OPEN) {
        this.sendToSocket(ws, data);
      }
    });
  }

  // Send to specific user (all their connections)
  sendToUser(userId: string, data: any): boolean {
    let sent = false;
    
    this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.userId === userId && ws.isAuthenticated && ws.readyState === WebSocket.OPEN) {
        if (this.sendToSocket(ws, data)) {
          sent = true;
        }
      }
    });

    return sent;
  }

  // Get server statistics
  getStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    uniqueUsers: number;
  } {
    let authenticated = 0;
    const uniqueUsers = new Set<string>();

    this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.isAuthenticated) {
        authenticated++;
        if (ws.userId) {
          uniqueUsers.add(ws.userId);
        }
      }
    });

    return {
      totalConnections: this.wss.clients.size,
      authenticatedConnections: authenticated,
      uniqueUsers: uniqueUsers.size
    };
  }

  // Shutdown the server
  shutdown(): Promise<void> {
    return new Promise((resolve) => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // Close all connections
      this.wss.clients.forEach((ws) => {
        ws.close(1001, 'Server shutting down');
      });

      // Close the server
      this.wss.close(() => {
        console.log('[WebSocket] Server shutdown complete');
        resolve();
      });
    });
  }
}