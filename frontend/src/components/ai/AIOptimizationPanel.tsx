import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Psychology as AIIcon,
  Settings as SettingsIcon,
  PlayArrow as StartIcon,
} from '@mui/icons-material';
import { OptimizationParametersDialog } from './OptimizationParametersDialog';
import { AIProcessingIndicator } from './AIProcessingIndicator';
import { ConflictResolutionSuggestions } from './ConflictResolutionSuggestions';
import {
  OptimizationParameters,
  OptimizationResult,
  OptimizationStatus,
  AIProcessingState,
  ConflictResolutionSuggestion,
} from '../../types/ai';
import { Clash } from '../../types/entities';

interface AIOptimizationPanelProps {
  clashes: Clash[];
  onStartOptimization: (parameters: OptimizationParameters) => Promise<void>;
  onApplySuggestion: (suggestionId: string) => Promise<void>;
  onRejectSuggestion: (suggestionId: string) => Promise<void>;
  onCancelOptimization?: () => Promise<void>;
  optimizationResult?: OptimizationResult;
  loading?: boolean;
}

export const AIOptimizationPanel: React.FC<AIOptimizationPanelProps> = ({
  clashes,
  onStartOptimization,
  onApplySuggestion,
  onRejectSuggestion,
  onCancelOptimization,
  optimizationResult,
  loading = false,
}) => {
  const [parametersDialogOpen, setParametersDialogOpen] = useState(false);
  const [processingState, setProcessingState] = useState<AIProcessingState>({
    isProcessing: false,
    currentTask: '',
    progress: 0,
    logs: [],
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Simulate processing state updates when optimization is running
  useEffect(() => {
    if (optimizationResult?.status === OptimizationStatus.RUNNING) {
      const interval = setInterval(() => {
        setProcessingState(prev => {
          const newProgress = Math.min(prev.progress + Math.random() * 5, 95);
          const tasks = [
            'Analyzing constraints...',
            'Detecting conflicts...',
            'Generating solutions...',
            'Optimizing schedule...',
            'Validating results...',
          ];
          const currentTaskIndex = Math.floor(newProgress / 20);
          const currentTask = tasks[Math.min(currentTaskIndex, tasks.length - 1)];

          return {
            ...prev,
            isProcessing: true,
            progress: newProgress,
            currentTask,
            estimatedTimeRemaining: Math.max(0, Math.floor((100 - newProgress) * 2)),
            logs: [
              ...prev.logs,
              {
                timestamp: new Date(),
                level: 'info' as const,
                message: `${currentTask} (${Math.round(newProgress)}% complete)`,
              },
            ].slice(-20), // Keep only last 20 logs
          };
        });
      }, 1000);

      return () => clearInterval(interval);
    } else if (optimizationResult?.status === OptimizationStatus.COMPLETED) {
      setProcessingState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        currentTask: 'Optimization completed',
        estimatedTimeRemaining: 0,
      }));
    } else if (optimizationResult?.status === OptimizationStatus.FAILED) {
      setProcessingState(prev => ({
        ...prev,
        isProcessing: false,
        logs: [
          ...prev.logs,
          {
            timestamp: new Date(),
            level: 'error' as const,
            message: 'Optimization failed - please check parameters and try again',
          },
        ],
      }));
    }
  }, [optimizationResult?.status]);

  const handleStartOptimization = async (parameters: OptimizationParameters) => {
    try {
      setProcessingState({
        isProcessing: true,
        currentTask: 'Initializing optimization...',
        progress: 0,
        logs: [
          {
            timestamp: new Date(),
            level: 'info',
            message: 'Starting AI optimization process',
          },
        ],
      });

      await onStartOptimization(parameters);
      setSnackbarMessage('Optimization started successfully');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Failed to start optimization');
      setSnackbarOpen(true);
      setProcessingState(prev => ({
        ...prev,
        isProcessing: false,
        logs: [
          ...prev.logs,
          {
            timestamp: new Date(),
            level: 'error',
            message: `Failed to start optimization: ${error}`,
          },
        ],
      }));
    }
  };

  const handleApplySuggestion = async (suggestionId: string) => {
    try {
      await onApplySuggestion(suggestionId);
      setSnackbarMessage('Suggestion applied successfully');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Failed to apply suggestion');
      setSnackbarOpen(true);
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    try {
      await onRejectSuggestion(suggestionId);
      setSnackbarMessage('Suggestion rejected');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Failed to reject suggestion');
      setSnackbarOpen(true);
    }
  };

  const handleCancelOptimization = async () => {
    if (onCancelOptimization) {
      try {
        await onCancelOptimization();
        setProcessingState(prev => ({
          ...prev,
          isProcessing: false,
          logs: [
            ...prev.logs,
            {
              timestamp: new Date(),
              level: 'warning',
              message: 'Optimization cancelled by user',
            },
          ],
        }));
        setSnackbarMessage('Optimization cancelled');
        setSnackbarOpen(true);
      } catch (error) {
        setSnackbarMessage('Failed to cancel optimization');
        setSnackbarOpen(true);
      }
    }
  };

  const isOptimizationRunning = optimizationResult?.status === OptimizationStatus.RUNNING || 
                                optimizationResult?.status === OptimizationStatus.PENDING;

  return (
    <Box>
      {/* AI Processing Indicator */}
      {optimizationResult && (
        <AIProcessingIndicator
          processingState={processingState}
          status={optimizationResult.status}
          onCancel={onCancelOptimization ? handleCancelOptimization : undefined}
          showLogs={true}
        />
      )}

      {/* Optimization Controls */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AIIcon sx={{ mr: 1 }} />
          <Typography variant="h6">AI Optimization</Typography>
        </Box>

        {clashes.length > 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {clashes.length} scheduling conflicts detected. Use AI optimization to resolve them automatically.
          </Alert>
        ) : (
          <Alert severity="success" sx={{ mb: 2 }}>
            No conflicts detected in the current timetable.
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setParametersDialogOpen(true)}
            disabled={isOptimizationRunning}
          >
            Configure Parameters
          </Button>
          <Button
            variant="contained"
            startIcon={<StartIcon />}
            onClick={() => setParametersDialogOpen(true)}
            disabled={isOptimizationRunning || loading}
          >
            Start AI Optimization
          </Button>
        </Box>

        {optimizationResult?.metrics && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Optimization Results:
            </Typography>
            <Typography variant="body2">
              • Clashes resolved: {optimizationResult.metrics.resolvedClashes} / {optimizationResult.metrics.totalClashes}
            </Typography>
            <Typography variant="body2">
              • Improvement score: {Math.round(optimizationResult.metrics.improvementScore * 100)}%
            </Typography>
            <Typography variant="body2">
              • Execution time: {optimizationResult.metrics.executionTime}s
            </Typography>
            <Typography variant="body2">
              • Constraints satisfied: {optimizationResult.metrics.constraintsSatisfied} / {optimizationResult.metrics.constraintsTotal}
            </Typography>
          </Box>
        )}
      </Paper>

      <Divider sx={{ my: 2 }} />

      {/* Conflict Resolution Suggestions */}
      {optimizationResult?.suggestions && optimizationResult.suggestions.length > 0 && (
        <ConflictResolutionSuggestions
          suggestions={optimizationResult.suggestions}
          onApplySuggestion={handleApplySuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          loading={loading}
        />
      )}

      {/* Optimization Parameters Dialog */}
      <OptimizationParametersDialog
        open={parametersDialogOpen}
        onClose={() => setParametersDialogOpen(false)}
        onConfirm={handleStartOptimization}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};