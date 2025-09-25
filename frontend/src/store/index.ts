// Central store exports
export { useVenueStore } from './venueStore';
export { useLecturerStore } from './lecturerStore';
export { useCourseStore } from './courseStore';
export { useStudentGroupStore } from './studentGroupStore';
export { useScheduleStore } from './scheduleStore';
export { useAiStore } from './aiStore';
export { useAuthStore } from './authStore';
export { useNotificationStore } from './notificationStore';

// Re-export store types
export type { BaseStore, BaseStoreState, BaseStoreActions, StoreConfig } from './types';
export { createBaseStore } from './baseStore';

// Store utilities
export const resetAllStores = () => {
  // This would be called on logout or app reset
  // Individual stores can implement their own reset methods
};