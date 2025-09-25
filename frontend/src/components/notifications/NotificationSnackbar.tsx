import React from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Button,
  Box,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useNotificationStore } from '../../store/notificationStore';

export const NotificationSnackbar: React.FC = () => {
  const { showSnackbar, currentSnackbar, hideSnackbar } = useNotificationStore();

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    hideSnackbar();
  };

  const handleActionClick = (action: () => void) => {
    action();
    hideSnackbar();
  };

  if (!currentSnackbar) {
    return null;
  }

  return (
    <Snackbar
      open={showSnackbar}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        severity={currentSnackbar.severity}
        variant="filled"
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {currentSnackbar.actions?.map((action, index) => (
              <Button
                key={index}
                color="inherit"
                size="small"
                variant={action.variant || 'text'}
                onClick={() => handleActionClick(action.action)}
              >
                {action.label}
              </Button>
            ))}
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      >
        <AlertTitle>{currentSnackbar.title}</AlertTitle>
        {currentSnackbar.message}
      </Alert>
    </Snackbar>
  );
};