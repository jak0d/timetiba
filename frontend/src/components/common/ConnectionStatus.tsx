import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import { 
  Wifi as ConnectedIcon, 
  WifiOff as DisconnectedIcon,
  Sync as ReconnectingIcon 
} from '@mui/icons-material';
import { useNotificationStore } from '../../store/notificationStore';

export interface ConnectionStatusProps {
  variant?: 'chip' | 'icon';
  size?: 'small' | 'medium';
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  variant = 'chip', 
  size = 'small' 
}) => {
  const { isConnected } = useNotificationStore();

  const getStatusInfo = () => {
    if (isConnected) {
      return {
        label: 'Connected',
        color: 'success' as const,
        icon: <ConnectedIcon fontSize={size} />,
        tooltip: 'Real-time updates are active',
      };
    } else {
      return {
        label: 'Disconnected',
        color: 'error' as const,
        icon: <DisconnectedIcon fontSize={size} />,
        tooltip: 'Real-time updates are not available',
      };
    }
  };

  const status = getStatusInfo();

  if (variant === 'icon') {
    return (
      <Tooltip title={status.tooltip}>
        <Box sx={{ display: 'flex', alignItems: 'center', color: `${status.color}.main` }}>
          {status.icon}
        </Box>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={status.tooltip}>
      <Chip
        icon={status.icon}
        label={status.label}
        color={status.color}
        variant="outlined"
        size={size}
      />
    </Tooltip>
  );
};