import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Chip,
  Paper,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Circle as UnreadIcon,
  CheckCircleOutline as ReadIcon,
} from '@mui/icons-material';
import { useNotificationStore, Notification } from '../../store/notificationStore';
import { formatDistanceToNow } from 'date-fns';

const getSeverityIcon = (severity: Notification['severity']) => {
  switch (severity) {
    case 'info':
      return <InfoIcon color="info" />;
    case 'warning':
      return <WarningIcon color="warning" />;
    case 'error':
      return <ErrorIcon color="error" />;
    case 'success':
      return <SuccessIcon color="success" />;
    default:
      return <InfoIcon />;
  }
};

const getSeverityColor = (severity: Notification['severity']) => {
  switch (severity) {
    case 'info':
      return 'info';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    case 'success':
      return 'success';
    default:
      return 'default';
  }
};

export const NotificationPanel: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotificationStore();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    markAsRead(id);
  };

  const handleRemove = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeNotification(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleClearAll = () => {
    clearAll();
    handleClose();
  };

  const recentNotifications = notifications.slice(0, 10);

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-label={`${unreadCount} unread notifications`}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 600,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">Notifications</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                size="small"
                label={isConnected ? 'Connected' : 'Disconnected'}
                color={isConnected ? 'success' : 'error'}
                variant="outlined"
              />
            </Box>
          </Box>
          
          {notifications.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
              >
                Mark All Read
              </Button>
              <Button
                size="small"
                color="error"
                onClick={handleClearAll}
              >
                Clear All
              </Button>
            </Box>
          )}
        </Box>

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0, maxHeight: 400, overflow: 'auto' }}>
            {recentNotifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    backgroundColor: notification.read ? 'transparent' : 'action.hover',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                >
                  <ListItemIcon>
                    {getSeverityIcon(notification.severity)}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                          {notification.title}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            title={notification.read ? 'Mark as unread' : 'Mark as read'}
                          >
                            {notification.read ? <ReadIcon fontSize="small" /> : <UnreadIcon fontSize="small" />}
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => handleRemove(notification.id, e)}
                            title="Remove notification"
                          >
                            <ErrorIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < recentNotifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        {notifications.length > 10 && (
          <Box sx={{ p: 1, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Showing {recentNotifications.length} of {notifications.length} notifications
            </Typography>
          </Box>
        )}
      </Menu>
    </>
  );
};