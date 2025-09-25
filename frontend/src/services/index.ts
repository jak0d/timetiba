// Central API services export
export { default as apiClient, ApiClient } from './apiClient';
export { venueApi, VenueApi } from './venueApi';
export { lecturerApi, LecturerApi } from './lecturerApi';
export { courseApi, CourseApi } from './courseApi';
export { studentGroupApi, StudentGroupApi } from './studentGroupApi';
export { scheduleApi, ScheduleApi } from './scheduleApi';
export { aiApi, AiApi } from './aiApi';
export { authApi, AuthApi } from './authApi';

// Re-export types
export type { ApiResponse, PaginatedResponse, ErrorResponse, LoadingState, OptimisticUpdate } from '../types/api';