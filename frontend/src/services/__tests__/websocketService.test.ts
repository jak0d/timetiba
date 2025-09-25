import webSocketService, { SocketEvent } from '../websocketService';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
    connected: true,
    auth: {},
  })),
}));

describe('WebSocketService', () => {
  let mockSocket: any;

  beforeEach(() => {
    const { io } = require('socket.io-client');
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connect: jest.fn(),
      connected: true,
      auth: {},
    };
    io.mockReturnValue(mockSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
    webSocketService.disconnect();
  });

  describe('initialization', () => {
    it('should connect to WebSocket server', () => {
      const { io } = require('socket.io-client');
      
      // Service is initialized in constructor
      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          transports: ['websocket', 'polling'],
          auth: expect.any(Object),
        })
      );
    });

    it('should set up event handlers', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('auth_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('notification', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('timetable_update', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('conflict_resolution', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('optimization_progress', expect.any(Function));
    });
  });

  describe('event listeners', () => {
    it('should add and remove event listeners', () => {
      const mockListener = jest.fn();
      
      const cleanup = webSocketService.addEventListener('notification', mockListener);
      
      // Simulate receiving a notification event
      const notificationHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'notification'
      )[1];
      
      const mockNotificationData = {
        id: '1',
        title: 'Test Notification',
        message: 'Test message',
        severity: 'info' as const,
      };
      
      notificationHandler(mockNotificationData);
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'notification',
        data: mockNotificationData,
        timestamp: expect.any(Date),
      });
      
      // Test cleanup
      cleanup();
      notificationHandler(mockNotificationData);
      
      // Should not be called again after cleanup
      expect(mockListener).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple listeners for the same event', () => {
      const mockListener1 = jest.fn();
      const mockListener2 = jest.fn();
      
      webSocketService.addEventListener('notification', mockListener1);
      webSocketService.addEventListener('notification', mockListener2);
      
      // Simulate receiving a notification event
      const notificationHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'notification'
      )[1];
      
      const mockNotificationData = {
        id: '1',
        title: 'Test Notification',
        message: 'Test message',
        severity: 'info' as const,
      };
      
      notificationHandler(mockNotificationData);
      
      expect(mockListener1).toHaveBeenCalled();
      expect(mockListener2).toHaveBeenCalled();
    });
  });

  describe('room management', () => {
    it('should join and leave rooms', () => {
      webSocketService.joinRoom('test-room');
      expect(mockSocket.emit).toHaveBeenCalledWith('join_room', { room: 'test-room' });
      
      webSocketService.leaveRoom('test-room');
      expect(mockSocket.emit).toHaveBeenCalledWith('leave_room', { room: 'test-room' });
    });

    it('should subscribe to schedule updates', () => {
      webSocketService.subscribeToSchedule('schedule-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('join_room', { room: 'schedule_schedule-123' });
      
      webSocketService.unsubscribeFromSchedule('schedule-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('leave_room', { room: 'schedule_schedule-123' });
    });

    it('should subscribe to optimization updates', () => {
      webSocketService.subscribeToOptimization('job-456');
      expect(mockSocket.emit).toHaveBeenCalledWith('join_room', { room: 'optimization_job-456' });
      
      webSocketService.unsubscribeFromOptimization('job-456');
      expect(mockSocket.emit).toHaveBeenCalledWith('leave_room', { room: 'optimization_job-456' });
    });
  });

  describe('connection management', () => {
    it('should report connection status', () => {
      mockSocket.connected = true;
      expect(webSocketService.isConnected()).toBe(true);
      
      mockSocket.connected = false;
      expect(webSocketService.isConnected()).toBe(false);
    });

    it('should update auth token', () => {
      const newToken = 'new-auth-token';
      webSocketService.updateAuthToken(newToken);
      
      expect(mockSocket.auth).toEqual({ token: newToken });
    });

    it('should disconnect properly', () => {
      webSocketService.disconnect();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle listener errors gracefully', () => {
      const mockListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      webSocketService.addEventListener('notification', mockListener);
      
      // Simulate receiving a notification event
      const notificationHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'notification'
      )[1];
      
      const mockNotificationData = {
        id: '1',
        title: 'Test Notification',
        message: 'Test message',
        severity: 'info' as const,
      };
      
      // Should not throw, but should log error
      expect(() => notificationHandler(mockNotificationData)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Error in WebSocket event listener:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should warn when emitting while disconnected', () => {
      mockSocket.connected = false;
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      webSocketService.emit('test-event', { data: 'test' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'WebSocket not connected, cannot emit event:',
        'test-event'
      );
      
      consoleSpy.mockRestore();
    });
  });
});