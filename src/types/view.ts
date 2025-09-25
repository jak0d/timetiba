export enum UserRole {
  ADMIN = 'admin',
  LECTURER = 'lecturer',
  STUDENT = 'student'
}

export interface ViewFilter {
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  entityIds?: string[];
  dayOfWeek?: string[];
  timeRange?: {
    startTime: string; // HH:MM format
    endTime: string;   // HH:MM format
  };
}

export interface ViewConfiguration {
  id: string;
  name: string;
  userRole: UserRole;
  userId?: string; // For personalized views
  filters: ViewFilter;
  displayOptions: ViewDisplayOptions;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ViewDisplayOptions {
  showDetails: boolean;
  showConflicts: boolean;
  groupBy: 'day' | 'lecturer' | 'venue' | 'course';
  timeFormat: '12h' | '24h';
  showWeekends: boolean;
  compactView: boolean;
}

export interface PersonalizedTimetableRequest {
  userRole: UserRole;
  userId: string;
  filters?: ViewFilter;
  displayOptions?: Partial<ViewDisplayOptions>;
}

export interface TimetableView {
  id: string;
  name: string;
  sessions: ViewSession[];
  metadata: ViewMetadata;
  displayOptions: ViewDisplayOptions;
}

export interface ViewSession {
  id: string;
  courseName: string;
  courseCode: string;
  lecturerName: string;
  venueName: string;
  studentGroups: string[];
  startTime: Date;
  endTime: Date;
  dayOfWeek: string;
  duration: number;
  hasConflict?: boolean;
  conflictType?: string;
}

export interface ViewMetadata {
  userRole: UserRole;
  userId?: string;
  generatedAt: Date;
  totalSessions: number;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  appliedFilters: ViewFilter;
}