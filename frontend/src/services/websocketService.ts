import { io, Socket } from 'socket.io-client';

export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface NotificationEvent extends WebSocketEvent {
  type: 'notification';
  data: {
    id: string;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    userId?: string;
    scheduleId?: string;
  };
}

export interface TimetableUpdateEvent extends WebSocketEvent {
  type: 'timetable_update';
  data: {
    scheduleId: string;
    action: 'created' | 'updated' | 'deleted' | 'published' | 'archived';
    schedule?: any;
    changes?: any[];
  };
}

export interface ConflictResolutionEvent extends WebSocketEvent {
  type: 'conflict_resolution';
  data: {
    scheduleId: string;
    resolutions: any[];
    status: 'completed' | 'failed' | 'in_progress';
  };
}

export interface OptimizationProgressEvent extends WebSocketEvent {
  type: 'optimization_progress';
  data: {
    jobId: string;
    progress: number;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    message?: string;
    result?: any;
  };
}

export type SocketEvent = NotificationEvent | TimetableUpdateEvent | ConflictResolutionEvent | OptimizationProgressEvent;

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventListeners: Map<string, Set<(event: SocketEvent) => void>> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    const wsUrl = process.env.REACT_APP_WS_URL || 'http://localhost:3001';
    
    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        token: localStorage.getItem('authToken'),
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    });

    // Handle authentication errors
    this.socket.on('auth_error', (error) => {
      console.error('WebSocket authentication error:', error);
      // Refresh token and reconnect
      this.refreshAuthAndReconnect();
    });

    // Set up event listeners for different event types
    this.socket.on('notification', (data) => {
      this.handleEvent({
        type: 'notification',
        data,
        timestamp: new Date(),
      } as NotificationEvent);
    });

    this.socket.on('timetable_update', (data) => {
      this.handleEvent({
        type: 'timetable_update',
        data,
        timestamp: new Date(),
      } as TimetableUpdateEvent);
    });

    this.socket.on('conflict_resolution', (data) => {
      this.handleEvent({
        type: 'conflict_resolution',
        data,
        timestamp: new Date(),
      } as ConflictResolutionEvent);
    });

    this.socket.on('optimization_progress', (data) => {
      this.handleEvent({
        type: 'optimization_progress',
        data,
        timestamp: new Date(),
      } as OptimizationProgressEvent);
    });
  }

  private handleEvent(event: SocketEvent) {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in WebSocket event listener:', error);
        }
      });
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private async refreshAuthAndReconnect() {
    try {
      // This would typically call your auth refresh endpoint
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        // Call refresh token API
        // For now, just reconnect with existing token
        this.disconnect();
        this.connect();
      }
    } catch (error) {
      console.error('Failed to refresh auth token:', error);
    }
  }

  // Public methods
  public addEventListener(eventType: string, listener: (event: SocketEvent) => void) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);

    // Return cleanup function
    return () => {
      this.removeEventListener(eventType, listener);
    };
  }

  public removeEventListener(eventType: string, listener: (event: SocketEvent) => void) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType);
      }
    }
  }

  public emit(eventType: string, data: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(eventType, data);
    } else {
      console.warn('WebSocket not connected, cannot emit event:', eventType);
    }
  }

  public joinRoom(room: string) {
    this.emit('join_room', { room });
  }

  public leaveRoom(room: string) {
    this.emit('leave_room', { room });
  }

  public subscribeToSchedule(scheduleId: string) {
    this.joinRoom(`schedule_${scheduleId}`);
  }

  public unsubscribeFromSchedule(scheduleId: string) {
    this.leaveRoom(`schedule_${scheduleId}`);
  }

  public subscribeToOptimization(jobId: string) {
    this.joinRoom(`optimization_${jobId}`);
  }

  public unsubscribeFromOptimization(jobId: string) {
    this.leaveRoom(`optimization_${jobId}`);
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public updateAuthToken(token: string) {
    if (this.socket) {
      this.socket.auth = { token };
      if (this.socket.connected) {
        // Reconnect with new token
        this.socket.disconnect();
        this.socket.connect();
      }
    }
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;