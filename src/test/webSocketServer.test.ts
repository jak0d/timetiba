import { Server as HTTPServer } from 'http';
import { NotificationWebSocketServer } from '../services/webSocketServer';
import { RealTimeNotificationService } from '../services/realTimeNotificationService';
import { EventEmitter } from 'events';

// Mock WebSocket Server
class MockWebSocketServer extends EventEmitter {
  public clients: Set<MockWebSocket> = new Set();
  public path: string;

  constructor(options: any) {
    super();
    this.path = options.path;
  }

  close(callback?: () => void): void {
    this.clients.clear();
    if (callback) callback();
  }
}

// Mock WebSocket
class MockWebSocket extends EventEmitter {
  public readyState: number = 1; // OPEN
  public messages: string[] = [];
  public connectionId?: string;
  public userId?: string;
  public isAuthenticated?: boolean;
  public lastActivity?: Date;
  public pingCount: number = 0;
  public terminated: boolean = false;

  send(data: string): void {
    if (this.readyState === 1) {
      this.messages.push(data);
    }
  }

  close(code?: number, reason?: string): void {
    this.readyState = 3; // CLOSED
    this.emit('close', code, reason);
  }

  ping(): void {
    this.pingCount++;
    // Simulate pong response
    setTimeout(() => this.emit('pong'), 1);
  }

  terminate(): void {
    this.terminated = true;
    this.readyState = 3;
    this.emit('close', 1006, 'Connection terminated');
  }
}

// Mock HTTP Server
class MockHTTPServer extends EventEmitter {}

describe('NotificationWebSocketServer', () => {
  let httpServer: MockHTTPServer;
  let realTimeService: RealTimeNotificationService;
  let wsServer: NotificationWebSocketServer;
  let mockWss: MockWebSocketServer;

  beforeEach(() => {
    httpServer = new MockHTTPServer();
    realTimeService = new RealTimeNotificationService();
    
    // Mock the WebSocketServer constructor
    jest.doMock('ws', () => ({
      WebSocketServer: jest.fn().mockImplementation((options) => {
        mockWss = new MockWebSocketServer(options);
        return mockWss;
      }),
      WebSocket: {
        OPEN: 1,
        CLOSED: 3
      }
    }));

    wsServer = new NotificationWebSocketServer(
      httpServer as any,
      realTimeService,
      { path: '/test-notifications', heartbeatInterval: 1000 }
    );
  });

  afterEach(async () => {
    if (wsServer) {
      await wsServer.shutdown();
    }
    realTimeService.shutdown();
    jest.clearAllMocks();
  });

  describe('Server Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(mockWss.path).toBe('/test-notifications');
    });
  });

  describe('Connection Handling', () => {
    it('should handle new connections', () => {
      const mockSocket = new MockWebSocket();
      mockWss.emit('connection', mockSocket, {});

      expect(mockSocket.messages).toHaveLength(1);
      const welcomeMessage = JSON.parse(mockSocket.messages[0]);
      expect(welcomeMessage.type).toBe('welcome');
      expect(welcomeMessage.connectionId).toBeDefined();
    });

    it('should handle authentication', () => {
      const mockSocket = new MockWebSocket();
      mockWss.emit('connection', mockSocket, {});

      // Send authentication message
      const authMessage = {
        type: 'authenticate',
        token: 'valid_test_token',
        userId: 'user-1'
      };

      mockSocket.emit('message', Buffer.from(JSON.stringify(authMessage)));

      // Should receive authentication success
      expect(mockSocket.messages.length).toBeGreaterThan(1);
      const authResponse = JSON.parse(mockSocket.messages[mockSocket.messages.length - 1]);
      expect(authResponse.type).toBe('authenticated');
      expect(authResponse.userId).toBe('user-1');
    });

    it('should reject invalid authentication', () => {
      const mockSocket = new MockWebSocket();
      mockWss.emit('connection', mockSocket, {});

      const authMessage = {
        type: 'authenticate',
        token: 'invalid_token',
        userId: 'user-1'
      };

      mockSocket.emit('message', Buffer.from(JSON.stringify(authMessage)));

      const authResponse = JSON.parse(mockSocket.messages[mockSocket.messages.length - 1]);
      expect(authResponse.type).toBe('auth_error');
    });

    it('should handle ping/pong messages', () => {
      const mockSocket = new MockWebSocket();
      mockWss.emit('connection', mockSocket, {});

      const pingMessage = { type: 'ping' };
      mockSocket.emit('message', Buffer.from(JSON.stringify(pingMessage)));

      const pongResponse = JSON.parse(mockSocket.messages[mockSocket.messages.length - 1]);
      expect(pongResponse.type).toBe('pong');
    });

    it('should require authentication for other messages', () => {
      const mockSocket = new MockWebSocket();
      mockWss.emit('connection', mockSocket, {});

      const message = { type: 'some_action', data: 'test' };
      mockSocket.emit('message', Buffer.from(JSON.stringify(message)));

      const errorResponse = JSON.parse(mockSocket.messages[mockSocket.messages.length - 1]);
      expect(errorResponse.type).toBe('error');
      expect(errorResponse.message).toBe('Authentication required');
    });
  });

  describe('Message Broadcasting', () => {
    let authenticatedSocket: MockWebSocket;

    beforeEach(() => {
      authenticatedSocket = new MockWebSocket();
      authenticatedSocket.isAuthenticated = true;
      authenticatedSocket.userId = 'user-1';
      mockWss.clients.add(authenticatedSocket);
    });

    it('should broadcast to all authenticated connections', () => {
      const unauthenticatedSocket = new MockWebSocket();
      mockWss.clients.add(unauthenticatedSocket);

      const broadcastData = { type: 'broadcast', message: 'Hello everyone' };
      wsServer.broadcast(broadcastData);

      // Only authenticated socket should receive the message
      expect(authenticatedSocket.messages).toHaveLength(1);
      expect(unauthenticatedSocket.messages).toHaveLength(0);

      const receivedMessage = JSON.parse(authenticatedSocket.messages[0]);
      expect(receivedMessage.type).toBe('broadcast');
    });

    it('should send to specific user', () => {
      const otherSocket = new MockWebSocket();
      otherSocket.isAuthenticated = true;
      otherSocket.userId = 'user-2';
      mockWss.clients.add(otherSocket);

      const userData = { type: 'user_message', message: 'Hello user-1' };
      const result = wsServer.sendToUser('user-1', userData);

      expect(result).toBe(true);
      expect(authenticatedSocket.messages).toHaveLength(1);
      expect(otherSocket.messages).toHaveLength(0);

      const receivedMessage = JSON.parse(authenticatedSocket.messages[0]);
      expect(receivedMessage.type).toBe('user_message');
    });

    it('should return false when sending to non-existent user', () => {
      const userData = { type: 'user_message', message: 'Hello nobody' };
      const result = wsServer.sendToUser('non-existent-user', userData);

      expect(result).toBe(false);
    });
  });

  describe('Connection Management', () => {
    it('should handle connection close', () => {
      const mockSocket = new MockWebSocket();
      mockSocket.connectionId = 'conn-1';
      mockSocket.isAuthenticated = true;

      // Mock the real-time service method
      const removeConnectionSpy = jest.spyOn(realTimeService, 'removeConnection');

      mockWss.emit('connection', mockSocket, {});
      mockSocket.emit('close', 1000, 'Normal closure');

      expect(removeConnectionSpy).toHaveBeenCalledWith('conn-1');
    });

    it('should handle connection errors', () => {
      const mockSocket = new MockWebSocket();
      mockSocket.connectionId = 'conn-1';
      mockSocket.isAuthenticated = true;

      const removeConnectionSpy = jest.spyOn(realTimeService, 'removeConnection');

      mockWss.emit('connection', mockSocket, {});
      mockSocket.emit('error', new Error('Connection error'));

      expect(removeConnectionSpy).toHaveBeenCalledWith('conn-1');
    });
  });

  describe('Heartbeat and Health Checks', () => {
    it('should ping active connections', (done) => {
      const mockSocket = new MockWebSocket();
      mockSocket.isAuthenticated = true;
      mockSocket.lastActivity = new Date();
      mockWss.clients.add(mockSocket);

      // Wait for heartbeat interval
      setTimeout(() => {
        expect(mockSocket.pingCount).toBeGreaterThan(0);
        done();
      }, 1100); // Slightly longer than heartbeat interval
    });

    it('should terminate inactive connections', (done) => {
      const mockSocket = new MockWebSocket();
      mockSocket.isAuthenticated = true;
      mockSocket.lastActivity = new Date(Date.now() - 70000); // 70 seconds ago
      mockWss.clients.add(mockSocket);

      setTimeout(() => {
        expect(mockSocket.terminated).toBe(true);
        done();
      }, 1100);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate connection statistics', () => {
      const authenticatedSocket = new MockWebSocket();
      authenticatedSocket.isAuthenticated = true;
      authenticatedSocket.userId = 'user-1';

      const unauthenticatedSocket = new MockWebSocket();
      unauthenticatedSocket.isAuthenticated = false;

      const anotherAuthSocket = new MockWebSocket();
      anotherAuthSocket.isAuthenticated = true;
      anotherAuthSocket.userId = 'user-1'; // Same user, different connection

      mockWss.clients.add(authenticatedSocket);
      mockWss.clients.add(unauthenticatedSocket);
      mockWss.clients.add(anotherAuthSocket);

      const stats = wsServer.getStats();
      expect(stats.totalConnections).toBe(3);
      expect(stats.authenticatedConnections).toBe(2);
      expect(stats.uniqueUsers).toBe(1); // Only one unique user
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON messages', () => {
      const mockSocket = new MockWebSocket();
      mockWss.emit('connection', mockSocket, {});

      mockSocket.emit('message', Buffer.from('invalid json'));

      const errorResponse = JSON.parse(mockSocket.messages[mockSocket.messages.length - 1]);
      expect(errorResponse.type).toBe('error');
      expect(errorResponse.message).toBe('Invalid message format');
    });

    it('should handle connection limit', () => {
      // Create server with low connection limit
      const limitedServer = new NotificationWebSocketServer(
        httpServer as any,
        realTimeService,
        { maxConnections: 1 }
      );

      const mockSocket1 = new MockWebSocket();
      const mockSocket2 = new MockWebSocket();

      // First connection should be accepted
      mockWss.clients.add(mockSocket1);
      mockWss.emit('connection', mockSocket1, {});

      // Second connection should be rejected
      mockWss.clients.add(mockSocket2);
      let closeCalled = false;
      mockSocket2.close = (code: number) => {
        closeCalled = true;
        expect(code).toBe(1013); // Server overloaded
      };

      mockWss.emit('connection', mockSocket2, {});
      expect(closeCalled).toBe(true);
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      const mockSocket = new MockWebSocket();
      mockWss.clients.add(mockSocket);

      let closeCalled = false;
      mockSocket.close = () => {
        closeCalled = true;
      };

      await wsServer.shutdown();
      expect(closeCalled).toBe(true);
    });
  });
});