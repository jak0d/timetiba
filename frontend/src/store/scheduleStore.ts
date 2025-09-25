import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { scheduleApi, Schedule, CreateScheduleRequest, UpdateScheduleRequest, Clash } from '../services/scheduleApi';
import { LoadingState } from '../types/api';

interface ScheduleStoreState extends LoadingState {
  schedules: Schedule[];
  selectedSchedule: Schedule | null;
  clashes: Clash[];
  generationProgress: number;
  isGenerating: boolean;
}

interface ScheduleStoreActions {
  // Basic CRUD
  fetchSchedules: () => Promise<void>;
  fetchSchedule: (id: string) => Promise<void>;
  createSchedule: (schedule: CreateScheduleRequest) => Promise<void>;
  updateSchedule: (id: string, schedule: UpdateScheduleRequest) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  
  // Schedule-specific actions
  generateTimetable: (scheduleId: string, constraints?: any) => Promise<void>;
  detectClashes: (scheduleId: string) => Promise<void>;
  publishSchedule: (id: string) => Promise<void>;
  archiveSchedule: (id: string) => Promise<void>;
  
  // Selection and state
  selectSchedule: (schedule: Schedule | null) => void;
  setGenerationProgress: (progress: number) => void;
  setGenerating: (generating: boolean) => void;
  clearClashes: () => void;
  
  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type ScheduleStore = ScheduleStoreState & ScheduleStoreActions;

export const useScheduleStore = create<ScheduleStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      schedules: [],
      selectedSchedule: null,
      clashes: [],
      generationProgress: 0,
      isGenerating: false,
      isLoading: false,
      error: null,
      lastUpdated: null,

      // Basic CRUD
      fetchSchedules: async () => {
        try {
          set({ isLoading: true, error: null });
          const response = await scheduleApi.getSchedules();
          
          if (response.success && response.data) {
            set({
              schedules: response.data,
              lastUpdated: new Date(),
              isLoading: false,
            });
          } else {
            throw new Error(response.message || 'Failed to fetch schedules');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false,
          });
        }
      },

      fetchSchedule: async (id: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await scheduleApi.getSchedule(id);
          
          if (response.success && response.data) {
            set((state) => ({
              schedules: state.schedules.map(s => s.id === id ? response.data! : s),
              selectedSchedule: response.data,
              lastUpdated: new Date(),
              isLoading: false,
            }));
          } else {
            throw new Error(response.message || 'Failed to fetch schedule');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false,
          });
        }
      },

      createSchedule: async (schedule: CreateScheduleRequest) => {
        try {
          set({ isLoading: true, error: null });
          const response = await scheduleApi.createSchedule(schedule);
          
          if (response.success && response.data) {
            set((state) => ({
              schedules: [...state.schedules, response.data!],
              lastUpdated: new Date(),
              isLoading: false,
            }));
          } else {
            throw new Error(response.message || 'Failed to create schedule');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false,
          });
        }
      },

      updateSchedule: async (id: string, schedule: UpdateScheduleRequest) => {
        try {
          set({ isLoading: true, error: null });
          const response = await scheduleApi.updateSchedule(id, schedule);
          
          if (response.success && response.data) {
            set((state) => ({
              schedules: state.schedules.map(s => s.id === id ? response.data! : s),
              selectedSchedule: state.selectedSchedule?.id === id ? response.data : state.selectedSchedule,
              lastUpdated: new Date(),
              isLoading: false,
            }));
          } else {
            throw new Error(response.message || 'Failed to update schedule');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false,
          });
        }
      },

      deleteSchedule: async (id: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await scheduleApi.deleteSchedule(id);
          
          if (response.success) {
            set((state) => ({
              schedules: state.schedules.filter(s => s.id !== id),
              selectedSchedule: state.selectedSchedule?.id === id ? null : state.selectedSchedule,
              lastUpdated: new Date(),
              isLoading: false,
            }));
          } else {
            throw new Error(response.message || 'Failed to delete schedule');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false,
          });
        }
      },

      // Schedule-specific actions
      generateTimetable: async (scheduleId: string, constraints?: any) => {
        try {
          set({ isGenerating: true, generationProgress: 0, error: null });
          
          const response = await scheduleApi.generateTimetable({
            scheduleId,
            constraints,
          });
          
          if (response.success && response.data) {
            set((state) => ({
              schedules: state.schedules.map(s => s.id === scheduleId ? response.data! : s),
              selectedSchedule: state.selectedSchedule?.id === scheduleId ? response.data : state.selectedSchedule,
              generationProgress: 100,
              isGenerating: false,
              lastUpdated: new Date(),
            }));
          } else {
            throw new Error(response.message || 'Failed to generate timetable');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isGenerating: false,
            generationProgress: 0,
          });
        }
      },

      detectClashes: async (scheduleId: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await scheduleApi.detectClashes(scheduleId);
          
          if (response.success && response.data) {
            set({
              clashes: response.data,
              isLoading: false,
            });
          } else {
            throw new Error(response.message || 'Failed to detect clashes');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false,
          });
        }
      },

      publishSchedule: async (id: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await scheduleApi.publishSchedule(id);
          
          if (response.success && response.data) {
            set((state) => ({
              schedules: state.schedules.map(s => s.id === id ? response.data! : s),
              selectedSchedule: state.selectedSchedule?.id === id ? response.data : state.selectedSchedule,
              isLoading: false,
            }));
          } else {
            throw new Error(response.message || 'Failed to publish schedule');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false,
          });
        }
      },

      archiveSchedule: async (id: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await scheduleApi.archiveSchedule(id);
          
          if (response.success && response.data) {
            set((state) => ({
              schedules: state.schedules.map(s => s.id === id ? response.data! : s),
              selectedSchedule: state.selectedSchedule?.id === id ? response.data : state.selectedSchedule,
              isLoading: false,
            }));
          } else {
            throw new Error(response.message || 'Failed to archive schedule');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false,
          });
        }
      },

      // Selection and state
      selectSchedule: (schedule: Schedule | null) => {
        set({ selectedSchedule: schedule });
      },

      setGenerationProgress: (progress: number) => {
        set({ generationProgress: progress });
      },

      setGenerating: (generating: boolean) => {
        set({ isGenerating: generating });
      },

      clearClashes: () => {
        set({ clashes: [] });
      },

      // State management
      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      reset: () => {
        set({
          schedules: [],
          selectedSchedule: null,
          clashes: [],
          generationProgress: 0,
          isGenerating: false,
          isLoading: false,
          error: null,
          lastUpdated: null,
        });
      },
    }),
    {
      name: 'schedule-store',
    }
  )
);