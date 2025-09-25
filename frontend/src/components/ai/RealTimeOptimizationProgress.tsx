import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Psychology as AIIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';
import { useAiStore } from '../../store/aiStore';

export interface RealTimeOptimizationProgressProps {
  jobId: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

interface LogEntry {
  id: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
}

export const RealTimeOptimizationProgress: React.FC<RealTimeOptimizationProgressProps> = ({
  jobId,
  onComplete,
  onError,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);

  const { isConnected } = useRealTimeUpdates({
    optimizationJobId: jobId,
    enableOptimizationProgress: true,
  });

  const { optimizationJobs } = useAiStore();
  const job = optimizationJobs.get(jobId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'running':
        return 'RUNNING';
      case 'completed':
        return 'COMPLETED';
      case 'failed':
        return 'FAILED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return 'UNKNOWN';
    }
  };

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
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

  // Simulate log entries based on progress
  useEffect(() => {
    if (!job) return;

    const progress = job.progress || 0;
    const status = job.status;

    // Add log entries based on progress milestones
    const newLogs: LogEntry[] = [];

    if (progress >= 10 && !logs.some(log => log.message.includes('Starting optimization'))) {
      newLogs.push({
        id: 'start',
        level: 'info',
        message: 'Starting optimization process',
        timestamp: new Date(),
      });
    }

    if (progress >= 30 && !logs.some(log => log.message.includes('Analyzing constraints'))) {
      newLogs.push({
        id: 'constraints',
        level: 'info',
        message: 'Analyzing constraints and requirements',
        timestamp: new Date(),
      });
    }

    if (progress >= 50 && !logs.some(log => log.message.includes('Generating solutions'))) {
      newLogs.push({
        id: 'solutions',
        level: 'info',
        message: 'Generating optimal solutions',
        timestamp: new Date(),
      });
    }

    if (progress >= 80 && !logs.some(log => log.message.includes('Validating results'))) {
      newLogs.push({
        id: 'validation',
        level: 'info',
        message: 'Validating results and checking conflicts',
        timestamp: new Date(),
      });
    }

    if (status === 'completed' && !logs.some(log => log.message.includes('Optimization completed'))) {
      newLogs.push({
        id: 'completed',
        level: 'success',
        message: 'Optimization completed successfully',
        timestamp: new Date(),
      });
    }

    if (status === 'failed' && !logs.some(log => log.message.includes('Optimization failed'))) {
      newLogs.push({
        id: 'failed',
        level: 'error',
        message: 'Optimization failed - please check constraints',
        timestamp: new Date(),
      });
    }

    if (newLogs.length > 0) {
      setLogs(prev => [...prev, ...newLogs]);
    }

    // Estimate time remaining
    if (status === 'running' && progress > 0) {
      const estimatedTotal = 120; // 2 minutes estimated total
      const remaining = Math.max(0, estimatedTotal * (100 - progress) / 100);
      setEstimatedTimeRemaining(remaining);
    } else {
      setEstimatedTimeRemaining(null);
    }
  }, [job, logs]);

  // Handle completion and errors
  useEffect(() => {
    if (!job) return;

    if (job.status === 'completed' && job.result && onComplete) {
      onComplete(job.result);
    } else if (job.status === 'failed' && onError) {
      onError('Optimization failed');
    }
  }, [job, onComplete, onError]);

  if (!job) {
    return (
      <Alert severity="warning">
        Optimization job not found
      </Alert>
    );
  }

  const progress = job.progress || 0;
  const status = job.status || 'running';

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <AIIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          AI Optimization
        </Typography>
        <Chip
          label={getStatusLabel(status)}
          color={getStatusColor(status)}
          size="small"
        />
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {status === 'running' ? 'AI is optimizing your timetable...' : 
         status === 'completed' ? 'Optimization completed successfully!' :
         status === 'failed' ? 'Optimization failed. Please try again.' :
         'Optimization was cancelled.'}
      </Typography>

      {status === 'running' && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {progress < 30 ? 'Analyzing constraints...' :
               progress < 60 ? 'Generating solutions...' :
               progress < 90 ? 'Optimizing schedule...' :
               'Finalizing results...'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {progress}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} />
          
          {estimatedTimeRemaining !== null && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Estimated time remaining: {Math.ceil(estimatedTimeRemaining)}s
            </Typography>
          )}
        </Box>
      )}

      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Real-time updates unavailable. Progress may not be current.
        </Alert>
      )}

      <Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            mb: 1,
          }}
          onClick={() => setShowLogs(!showLogs)}
        >
          <Typography variant="body2" color="text.secondary">
            Processing Logs ({logs.length})
          </Typography>
          <IconButton size="small">
            {showLogs ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={showLogs}>
          <Box sx={{ maxHeight: 200, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <List dense>
              {logs.map((log) => (
                <ListItem key={log.id}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {getLogIcon(log.level)}
                  </ListItemIcon>
                  <ListItemText
                    primary={log.message}
                    secondary={log.timestamp.toLocaleTimeString()}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Collapse>
      </Box>
    </Paper>
  );
};