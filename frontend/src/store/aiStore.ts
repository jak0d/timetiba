import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { aiApi } from '../services/aiApi';
import { OptimizationRequest, OptimizationResult, ConflictResolution } from '../types/ai';
import { LoadingState } from '../types/api';

interface AiStoreState extends LoadingState {
  optimizationJobs: Map<string, { status: string; progress: number; result?: OptimizationResult }>;
  conflictResolutions: ConflictResolution[];
  optimizationParameters: any;
  currentJobId: string | null;
}

interface AiStoreActions {
  // Optimization
  startOptimization: (request: OptimizationRequest) => Promise<string>;
  getOptimizationStatus: (jobId: string) => Promise<void>;
  cancelOptimization: (jobId: string) => Promise<void>;
  
  // Conflict resolution
  getConflictResolutions: (scheduleId: string, clashIds: string[]) => Promise<void>;
  applyResolution: (scheduleId: string, resolutionId: string) => Promise<void>;
  
  // Parameters
  fetchOptimizationParameters: () => Promise<void>;
  updateOptimizationParameters: (parameters: any) => Promise<void>;
  
  // State management
  setCurrentJob: (jobId: string | null) => void;
  clearResolutions: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type AiStore = AiStoreState & AiStoreActions;

export const useAiStore = create<AiStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      optimizationJobs: new Map(),
      conflictResolutions: [],
      optimizationParameters: {},
      currentJobId: null,
      isLoading: false,
      error: null,
      lastUpdated: null,

      // Optimization
      startOptimization: async (request: OptimizationRequest) => {
        try {
          set({ isLoading: true, error: null });
          const response = await aiApi.optimizeSchedule(request);
          
          if (response.success && response.data) {
            const jobId = response.data.jobId || `job-${Date.now()}`;
            
            set((state) => ({
              optimizationJobs: new Map(state.optimizationJobs).set(jobId, {
                status: 'running',
                progress: 0,
                result: response.data,
              }),
              currentJobId: jobId,
              isLoading: false,
            }));
            
            return jobId;
          } else {
            throw new Error(response.message || 'Failed to start optimization');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false,
          });
          throw error;
        }
      },

      getOptimizationStatus: async (jobId: string) => {
        try {
          const response = await aiApi.getOptimizationStatus(jobId);
          
          if (response.success && response.data) {
            set((state) => ({
              optimizationJobs: new Map(state.optimizationJobs).set(jobId, response.data!),
              lastUpdated: new Date(),
            }));
          } else {
            throw new Error(response.message || 'Failed to get optimization status');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
          });
        }
      },

      cancelOptimization: async (jobId: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await aiApi.cancelOptimization(jobId);
          
          if (response.success) {
            set((state) => {
              const newJobs = new Map(state.optimizationJobs);
              const job = newJobs.get(jobId);
              if (job) {
                newJobs.set(jobId, { ...job, status: 'cancelled' });
              }
              
              return {
                optimizationJobs: newJobs,
                currentJobId: state.currentJobId === jobId ? null : state.currentJobId,
                isLoading: false,
              };
            });
          } else {
            throw new Error(response.message || 'Failed to cancel optimization');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false,
          });
        }
      },

      // Conflict resolution
      getConflictResolutions: async (scheduleId: string, clashIds: string[]) => {
        try {
          set({ isLoading: true, error: null });
          const response = await aiApi.getConflictResolutions(scheduleId, clashIds);
          
          if (response.success && response.data) {
            set({
              conflictResolutions: response.data,
              isLoading: false,
              lastUpdated: new Date(),
            });
          } else {
            throw new Error(response.message || 'Failed to get conflict resolutions');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false,
          });
        }
      },

      applyResolution: async (scheduleId: string, resolutionId: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await aiApi.applyResolution(scheduleId, resolutionId);
          
          if (response.success) {
            set({
              isLoading: false,
              lastUpdated: new Date(),
            });
          } else {
            throw new Error(response.message || 'Failed to apply resolution');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false,
          });
        }
      },

      // Parameters
      fetchOptimizationParameters: async () => {
        try {
          set({ isLoading: true, error: null });
          const response = await aiApi.getOptimizationParameters();
          
          if (response.success && response.data) {
            set({
              optimizationParameters: response.data,
              isLoading: false,
              lastUpdated: new Date(),
            });
          } else {
            throw new Error(response.message || 'Failed to fetch optimization parameters');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false,
          });
        }
      },

      updateOptimizationParameters: async (parameters: any) => {
        try {
          set({ isLoading: true, error: null });
          const response = await aiApi.updateOptimizationParameters(parameters);
          
          if (response.success && response.data) {
            set({
              optimizationParameters: response.data,
              isLoading: false,
              lastUpdated: new Date(),
            });
          } else {
            throw new Error(response.message || 'Failed to update optimization parameters');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false,
          });
        }
      },

      // State management
      setCurrentJob: (jobId: string | null) => {
        set({ currentJobId: jobId });
      },

      clearResolutions: () => {
        set({ conflictResolutions: [] });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      reset: () => {
        set({
          optimizationJobs: new Map(),
          conflictResolutions: [],
          optimizationParameters: {},
          currentJobId: null,
          isLoading: false,
          error: null,
          lastUpdated: null,
        });
      },
    }),
    {
      name: 'ai-store',
    }
  )
);