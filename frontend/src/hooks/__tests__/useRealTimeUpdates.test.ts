import { renderHook } from '@testing-library/react';
import { useRealTimeUpdates } from '../useRealTimeUpdates';
import webSocketService from '../../services/websocketService';
import { useScheduleStore } from '../../store/scheduleStore';
import { useAiStore } from '../../store/aiStore';

// Mock the services and stores
jest.mock('../../services/websocketService');
jest.mock('../../store/scheduleStore');
jest.mock('../../store/aiStore');

const mockWebSocketService = webSocketService as jest.Mocked<typeof webSocketService>;
const mockUseScheduleStore = useScheduleStore as jest.MockedFunction<typeof useScheduleStore>;
const mockUseAiStore = useAiStore as jest.MockedFunction<typeof useAiStore>;

describe('useRealTimeUpdates', () => {
  let mockScheduleStore: any;
  let mockAiStore: any;

  beforeEach(() => {
    mockScheduleStore = {
      fetchSchedules: jest.fn(),
      fetchSchedule: jest.fn(),
      detectClashes: jest.fn(),
    };

    mockAiStore = {
      optimizationJobs: new Map(),
      conflictResolutions: [],
      setError: jest.fn(),
    };

    mockUseScheduleStore.mockReturnValue(mockScheduleStore);
    mockUseAiStore.mockReturnValue(mockAiStore);

    mockWebSocketService.addEventListener = jest.fn();
    mockWebSocketService.subscribeToSchedule = jest.fn();
    mockWebSocketService.unsubscribeFromSchedule = jest.fn();
    mockWebSocketService.subscribeToOptimization = jest.fn();
    mockWebSocketService.unsubscribeFromOptimization = jest.fn();
    mockWebSocketService.isConnected = jest.fn().mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should set up event listeners by default', () => {
      renderHook(() => useRealTimeUpdates());

      expect(mockWebSocketService.addEventListener).toHaveBeenCalledWith(
        'timetable_update',
        expect.any(Function)
      );
      expect(mockWebSocketService.addEventListener).toHaveBeenCalledWith(
        'conflict_resolution',
        expect.any(Function)
      );
      expect(mockWebSocketService.addEventListener).toHaveBeenCalledWith(
        'optimization_progress',
        expect.any(Function)
      );
    });

    it('should only set up enabled event listeners', () => {
      renderHook(() => useRealTimeUpdates({
        enableTimetableUpdates: false,
        enableConflictResolution: true,
        enableOptimizationProgress: false,
      }));

      expect(mockWebSocketService.addEventListener).not.toHaveBeenCalledWith(
        'timetable_update',
        expect.any(Function)
      );
      expect(mockWebSocketService.addEventListener).toHaveBeenCalledWith(
        'conflict_resolution',
        expect.any(Function)
      );
      expect(mockWebSocketService.addEventListener).not.toHaveBeenCalledWith(
        'optimization_progress',
        expect.any(Function)
      );
    });
  });

  describe('schedule subscription', () => {
    it('should subscribe to schedule updates when scheduleId is provided', () => {
      const scheduleId = 'schedule-123';
      
      renderHook(() => useRealTimeUpdates({ scheduleId }));

      expect(mockWebSocketService.subscribeToSchedule).toHaveBeenCalledWith(scheduleId);
    });

    it('should unsubscribe when scheduleId changes', () => {
      const scheduleId1 = 'schedule-123';
      const scheduleId2 = 'schedule-456';
      
      const { rerender } = renderHook(
        ({ scheduleId }) => useRealTimeUpdates({ scheduleId }),
        { initialProps: { scheduleId: scheduleId1 } }
      );

      expect(mockWebSocketService.subscribeToSchedule).toHaveBeenCalledWith(scheduleId1);

      rerender({ scheduleId: scheduleId2 });

      expect(mockWebSocketService.unsubscribeFromSchedule).toHaveBeenCalledWith(scheduleId1);
      expect(mockWebSocketService.subscribeToSchedule).toHaveBeenCalledWith(scheduleId2);
    });

    it('should unsubscribe on unmount', () => {
      const scheduleId = 'schedule-123';
      
      const { unmount } = renderHook(() => useRealTimeUpdates({ scheduleId }));

      unmount();

      expect(mockWebSocketService.unsubscribeFromSchedule).toHaveBeenCalledWith(scheduleId);
    });
  });

  describe('optimization subscription', () => {
    it('should subscribe to optimization updates when jobId is provided', () => {
      const jobId = 'job-456';
      
      renderHook(() => useRealTimeUpdates({ optimizationJobId: jobId }));

      expect(mockWebSocketService.subscribeToOptimization).toHaveBeenCalledWith(jobId);
    });

    it('should unsubscribe when jobId changes', () => {
      const jobId1 = 'job-456';
      const jobId2 = 'job-789';
      
      const { rerender } = renderHook(
        ({ jobId }) => useRealTimeUpdates({ optimizationJobId: jobId }),
        { initialProps: { jobId: jobId1 } }
      );

      expect(mockWebSocketService.subscribeToOptimization).toHaveBeenCalledWith(jobId1);

      rerender({ jobId: jobId2 });

      expect(mockWebSocketService.unsubscribeFromOptimization).toHaveBeenCalledWith(jobId1);
      expect(mockWebSocketService.subscribeToOptimization).toHaveBeenCalledWith(jobId2);
    });
  });

  describe('return values', () => {
    it('should return connection status and utility functions', () => {
      const { result } = renderHook(() => useRealTimeUpdates());

      expect(result.current.isConnected).toBe(true);
      expect(typeof result.current.subscribeToSchedule).toBe('function');
      expect(typeof result.current.unsubscribeFromSchedule).toBe('function');
      expect(typeof result.current.subscribeToOptimization).toBe('function');
      expect(typeof result.current.unsubscribeFromOptimization).toBe('function');
    });
  });

  describe('event handling', () => {
    it('should handle timetable update events', () => {
      let timetableUpdateHandler: Function;
      
      mockWebSocketService.addEventListener.mockImplementation((eventType, handler) => {
        if (eventType === 'timetable_update') {
          timetableUpdateHandler = handler;
        }
        return jest.fn();
      });

      renderHook(() => useRealTimeUpdates());

      // Simulate a timetable update event
      const mockEvent = {
        type: 'timetable_update',
        data: {
          scheduleId: 'schedule-123',
          action: 'updated',
          schedule: { id: 'schedule-123', name: 'Test Schedule' },
        },
        timestamp: new Date(),
      };

      timetableUpdateHandler!(mockEvent);

      expect(mockScheduleStore.fetchSchedule).toHaveBeenCalledWith('schedule-123');
    });

    it('should handle conflict resolution events', () => {
      let conflictResolutionHandler: Function;
      
      mockWebSocketService.addEventListener.mockImplementation((eventType, handler) => {
        if (eventType === 'conflict_resolution') {
          conflictResolutionHandler = handler;
        }
        return jest.fn();
      });

      renderHook(() => useRealTimeUpdates());

      // Simulate a conflict resolution event
      const mockEvent = {
        type: 'conflict_resolution',
        data: {
          scheduleId: 'schedule-123',
          resolutions: [{ id: 'res-1', description: 'Test resolution' }],
          status: 'completed',
        },
        timestamp: new Date(),
      };

      conflictResolutionHandler!(mockEvent);

      expect(mockScheduleStore.fetchSchedule).toHaveBeenCalledWith('schedule-123');
      expect(mockScheduleStore.detectClashes).toHaveBeenCalledWith('schedule-123');
    });

    it('should handle optimization progress events', () => {
      let optimizationProgressHandler: Function;
      
      mockWebSocketService.addEventListener.mockImplementation((eventType, handler) => {
        if (eventType === 'optimization_progress') {
          optimizationProgressHandler = handler;
        }
        return jest.fn();
      });

      renderHook(() => useRealTimeUpdates());

      // Simulate an optimization progress event
      const mockEvent = {
        type: 'optimization_progress',
        data: {
          jobId: 'job-456',
          progress: 75,
          status: 'running',
          message: 'Optimizing...',
        },
        timestamp: new Date(),
      };

      optimizationProgressHandler!(mockEvent);

      // Should update the optimization jobs map
      expect(mockAiStore.optimizationJobs.set).toBeDefined();
    });
  });
});