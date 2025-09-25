export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  ICAL = 'ical'
}

export interface ExportOptions {
  format: ExportFormat;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  entityFilter?: {
    venueIds?: string[];
    lecturerIds?: string[];
    courseIds?: string[];
    studentGroupIds?: string[];
  };
  includeDetails?: boolean;
  customTitle?: string;
}

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

export interface TimetableExportData {
  scheduleId: string;
  scheduleName: string;
  academicPeriod: string;
  sessions: ExportSession[];
  metadata: ExportMetadata;
}

export interface ExportSession {
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
}

export interface ExportMetadata {
  generatedAt: Date;
  generatedBy?: string;
  totalSessions: number;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  filters?: {
    venues?: string[];
    lecturers?: string[];
    courses?: string[];
    studentGroups?: string[];
  };
}