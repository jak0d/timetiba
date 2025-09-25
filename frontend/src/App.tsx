import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { AppLayout } from './components/layout/AppLayout';
import { AppRoutes } from './routes/AppRoutes';
import { NotificationSnackbar } from './components/notifications/NotificationSnackbar';
import { useNotificationStore } from './store/notificationStore';
import { useAuthStore } from './store/authStore';
import webSocketService from './services/websocketService';
import { theme } from './theme/theme';

function App() {
  const { initialize: initializeNotifications, cleanup: cleanupNotifications } = useNotificationStore();
  const { token, isAuthenticated } = useAuthStore();

  // Initialize real-time services
  useEffect(() => {
    initializeNotifications();

    return () => {
      cleanupNotifications();
    };
  }, [initializeNotifications, cleanupNotifications]);

  // Update WebSocket auth token when authentication changes
  useEffect(() => {
    if (isAuthenticated && token) {
      webSocketService.updateAuthToken(token);
    } else {
      webSocketService.disconnect();
    }
  }, [isAuthenticated, token]);

  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <AppLayout>
          <AppRoutes />
        </AppLayout>
        <NotificationSnackbar />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
