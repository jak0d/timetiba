import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import webSocketService, { NotificationEvent } from '../services/websocketService';

export interface Notification {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  userId?: string;
  scheduleId?: string;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

interface NotificationStoreState {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  showSnackbar: boolean;
  currentSnackbar: Notification | null;
}

interface NotificationStoreActions {
  // Notification management
  addNotification: (notification: Omit<Notification, 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  
  // Snackbar management
  showNotificationSnackbar: (notification: Notification) => void;
  hideSnackbar: () => void;
  
  // WebSocket connection
  setConnectionStatus: (connected: boolean) => void;
  
  // Initialization
  initialize: () => void;
  cleanup: () => void;
}

type NotificationStore = NotificationStoreState & NotificationStoreActions;

export const useNotificationStore = create<NotificationStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      notifications: [],
      unreadCount: 0,
      isConnected: false,
      showSnackbar: false,
      currentSnackbar: null,

      // Notification management
      addNotification: (notificationData) => {
        const notification: Notification = {
          ...notificationData,
          timestamp: new Date(),
          read: false,
        };

        set((state) => {
          const newNotifications = [notification, ...state.notifications];
          return {
            notifications: newNotifications,
            unreadCount: state.unreadCount + 1,
          };
        });

        // Show snackbar for new notifications
        get().showNotificationSnackbar(notification);
      },

      removeNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          const newNotifications = state.notifications.filter(n => n.id !== id);
          const unreadCount = notification && !notification.read 
            ? state.unreadCount - 1 
            : state.unreadCount;

          return {
            notifications: newNotifications,
            unreadCount: Math.max(0, unreadCount),
          };
        });
      },

      markAsRead: (id) => {
        set((state) => {
          const newNotifications = state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          );
          const wasUnread = state.notifications.find(n => n.id === id && !n.read);
          const unreadCount = wasUnread ? state.unreadCount - 1 : state.unreadCount;

          return {
            notifications: newNotifications,
            unreadCount: Math.max(0, unreadCount),
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      clearAll: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });
      },

      // Snackbar management
      showNotificationSnackbar: (notification) => {
        set({
          showSnackbar: true,
          currentSnackbar: notification,
        });

        // Auto-hide after 6 seconds
        setTimeout(() => {
          get().hideSnackbar();
        }, 6000);
      },

      hideSnackbar: () => {
        set({
          showSnackbar: false,
          currentSnackbar: null,
        });
      },

      // WebSocket connection
      setConnectionStatus: (connected) => {
        set({ isConnected: connected });
      },

      // Initialization
      initialize: () => {
        // Set up WebSocket event listeners
        const cleanup = webSocketService.addEventListener('notification', (event: NotificationEvent) => {
          get().addNotification({
            id: event.data.id,
            title: event.data.title,
            message: event.data.message,
            severity: event.data.severity,
            userId: event.data.userId,
            scheduleId: event.data.scheduleId,
          });
        });

        // Monitor connection status
        const checkConnection = () => {
          get().setConnectionStatus(webSocketService.isConnected());
        };

        const connectionInterval = setInterval(checkConnection, 5000);
        checkConnection(); // Initial check

        // Store cleanup function
        (get() as any)._cleanup = () => {
          cleanup();
          clearInterval(connectionInterval);
        };
      },

      cleanup: () => {
        const cleanupFn = (get() as any)._cleanup;
        if (cleanupFn) {
          cleanupFn();
        }
      },
    }),
    {
      name: 'notification-store',
    }
  )
);