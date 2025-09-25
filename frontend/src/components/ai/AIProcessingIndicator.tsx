import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Collapse,
  Alert,
} from '@mui/material';
import {
  Psychology as AIIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { AIProcessingState, ProcessingLog, OptimizationStatus } from '../../types/ai';

interface AIProcessingIndicatorProps {
  processingState: AIProcessingState;
  status: OptimizationStatus;
  onCancel?: () => void;
  showLogs?: boolean;
}

export const AIProcessingIndicator: React.FC<AIProcessingIndicatorProps> = ({
  processingState,
  status,
  onCancel,
  showLogs = true,
}) => {
  const [logsExpanded, setLogsExpanded] = React.useState(false);

  const getStatusColor = (status: OptimizationStatus) => {
    switch (status) {
      case OptimizationStatus.RUNNING:
        return 'primary';
      case OptimizationStatus.COMPLETED:
        return 'success';
      case OptimizationStatus.FAILED:
        return 'error';
      case OptimizationStatus.CANCELLED:
        return 'warning';
      default:
        return 'info';
    }
  };

  const getStatusText = (status: OptimizationStatus) => {
    switch (status) {
      case OptimizationStatus.PENDING:
        return 'Preparing optimization...';
      case OptimizationStatus.RUNNING:
        return 'AI is optimizing your timetable...';
      case OptimizationStatus.COMPLETED:
        return 'Optimization completed successfully!';
      case OptimizationStatus.FAILED:
        return 'Optimization failed';
      case OptimizationStatus.CANCELLED:
        return 'Optimization cancelled';
      default:
        return 'Unknown status';
    }
  };

  const getLogIcon = (level: ProcessingLog['level']) => {
    switch (level) {
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'warning':
        return <WarningIcon color="warning" fontSize="small" />;
      default:
        return <InfoIcon color="info" fontSize="small" />;
    }
  };

  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds) return 'Calculating...';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s remaining`;
    }
    return `${remainingSeconds}s remaining`;
  };

  if (!processingState.isProcessing && status === OptimizationStatus.COMPLETED) {
    return null; // Don't show indicator when completed and not processing
  }

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <AIIcon color={getStatusColor(status) as any} sx={{ mr: 1 }} />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          AI Optimization
        </Typography>
        <Chip
          label={status.toUpperCase()}
          color={getStatusColor(status) as any}
          size="small"
          sx={{ mr: 1 }}
        />
        {onCancel && (status === OptimizationStatus.RUNNING || status === OptimizationStatus.PENDING) && (
          <IconButton size="small" onClick={onCancel} color="error">
            <CancelIcon />
          </IconButton>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {getStatusText(status)}
      </Typography>

      {processingState.isProcessing && (
        <>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                {processingState.currentTask}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(processingState.progress)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={processingState.progress} 
              color={getStatusColor(status) as any}
            />
          </Box>

          {processingState.estimatedTimeRemaining && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {formatTimeRemaining(processingState.estimatedTimeRemaining)}
            </Typography>
          )}
        </>
      )}

      {status === OptimizationStatus.FAILED && (
        <Alert severity="error" sx={{ mb: 2 }}>
          The optimization process encountered an error. Please check the logs below for details.
        </Alert>
      )}

      {status === OptimizationStatus.CANCELLED && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The optimization process was cancelled by the user.
        </Alert>
      )}

      {showLogs && processingState.logs.length > 0 && (
        <Box>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              mb: 1,
            }}
            onClick={() => setLogsExpanded(!logsExpanded)}
          >
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              Processing Logs ({processingState.logs.length})
            </Typography>
            {logsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Box>

          <Collapse in={logsExpanded}>
            <Box sx={{ maxHeight: 200, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <List dense>
                {processingState.logs.slice(-10).map((log, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {getLogIcon(log.level)}
                    </ListItemIcon>
                    <ListItemText
                      primary={log.message}
                      secondary={log.timestamp.toLocaleTimeString()}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Collapse>
        </Box>
      )}
    </Paper>
  );
};