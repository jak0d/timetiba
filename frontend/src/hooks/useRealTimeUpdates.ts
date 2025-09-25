import { useEffect, useCallback } from 'react';
import webSocketService, { 
  SocketEvent, 
  TimetableUpdateEvent, 
  ConflictResolutionEvent, 
  OptimizationProgressEvent 
} from '../services/websocketService';
import { useScheduleStore } from '../store/scheduleStore';
import { useAiStore } from '../store/aiStore';

export interface UseRealTimeUpdatesOptions {
  scheduleId?: string;
  optimizationJobId?: string;
  enableTimetableUpdates?: boolean;
  enableConflictResolution?: boolean;
  enableOptimizationProgress?: boolean;
}

export const useRealTimeUpdates = (options: UseRealTimeUpdatesOptions = {}) => {
  const {
    scheduleId,
    optimizationJobId,
    enableTimetableUpdates = true,
    enableConflictResolution = true,
    enableOptimizationProgress = true,
  } = options;

  const scheduleStore = useScheduleStore();
  const aiStore = useAiStore();

  // Handle timetable updates
  const handleTimetableUpdate = useCallback((event: TimetableUpdateEvent) => {
    const { scheduleId: eventScheduleId, action, schedule, changes } = event.data;

    switch (action) {
      case 'created':
        if (schedule) {
          scheduleStore.fetchSchedules(); // Refresh the list
        }
        break;

      case 'updated':
        if (schedule) {
          // Update the specific schedule in the store
          scheduleStore.fetchSchedule(eventScheduleId);
        }
        break;

      case 'deleted':
        // Remove from store if it exists
        scheduleStore.fetchSchedules(); // Refresh the list
        break;

      case 'published':
      case 'archived':
        if (schedule) {
          scheduleStore.fetchSchedule(eventScheduleId);
        }
        break;

      default:
        console.warn('Unknown timetable update action:', action);
    }
  }, [scheduleStore]);

  // Handle conflict resolution updates
  const handleConflictResolution = useCallback((event: ConflictResolutionEvent) => {
    const { scheduleId: eventScheduleId, resolutions, status } = event.data;

    if (status === 'completed') {
      // Update conflict resolutions in AI store
      aiStore.conflictResolutions = resolutions;
      
      // Refresh the schedule to get updated data
      if (eventScheduleId) {
        scheduleStore.fetchSchedule(eventScheduleId);
        scheduleStore.detectClashes(eventScheduleId);
      }
    } else if (status === 'failed') {
      aiStore.setError('Conflict resolution failed');
    }
  }, [aiStore, scheduleStore]);

  // Handle optimization progress updates
  const handleOptimizationProgress = useCallback((event: OptimizationProgressEvent) => {
    const { jobId, progress, status, message, result } = event.data;

    // Update the optimization job status in AI store
    const currentJobs = new Map(aiStore.optimizationJobs);
    const existingJob = currentJobs.get(jobId) || { status: 'running', progress: 0 };
    
    currentJobs.set(jobId, {
      ...existingJob,
      progress,
      status,
      result: result || existingJob.result,
    });

    aiStore.optimizationJobs = currentJobs;

    if (status === 'completed' && result) {
      // Refresh the schedule with the optimized result
      if (result.scheduleId) {
        scheduleStore.fetchSchedule(result.scheduleId);
      }
    } else if (status === 'failed') {
      aiStore.setError(message || 'Optimization failed');
    }
  }, [aiStore, scheduleStore]);

  // Set up event listeners
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    if (enableTimetableUpdates) {
      const cleanup = webSocketService.addEventListener('timetable_update', handleTimetableUpdate);
      cleanupFunctions.push(cleanup);
    }

    if (enableConflictResolution) {
      const cleanup = webSocketService.addEventListener('conflict_resolution', handleConflictResolution);
      cleanupFunctions.push(cleanup);
    }

    if (enableOptimizationProgress) {
      const cleanup = webSocketService.addEventListener('optimization_progress', handleOptimizationProgress);
      cleanupFunctions.push(cleanup);
    }

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [
    enableTimetableUpdates,
    enableConflictResolution,
    enableOptimizationProgress,
    handleTimetableUpdate,
    handleConflictResolution,
    handleOptimizationProgress,
  ]);

  // Subscribe to specific schedule updates
  useEffect(() => {
    if (scheduleId) {
      webSocketService.subscribeToSchedule(scheduleId);
      return () => {
        webSocketService.unsubscribeFromSchedule(scheduleId);
      };
    }
  }, [scheduleId]);

  // Subscribe to specific optimization job updates
  useEffect(() => {
    if (optimizationJobId) {
      webSocketService.subscribeToOptimization(optimizationJobId);
      return () => {
        webSocketService.unsubscribeFromOptimization(optimizationJobId);
      };
    }
  }, [optimizationJobId]);

  return {
    isConnected: webSocketService.isConnected(),
    subscribeToSchedule: webSocketService.subscribeToSchedule.bind(webSocketService),
    unsubscribeFromSchedule: webSocketService.unsubscribeFromSchedule.bind(webSocketService),
    subscribeToOptimization: webSocketService.subscribeToOptimization.bind(webSocketService),
    unsubscribeFromOptimization: webSocketService.unsubscribeFromOptimization.bind(webSocketService),
  };
};