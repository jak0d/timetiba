import { ExportFormat, ExportOptions, ExportResult, TimetableExportData, ExportSession, ExportMetadata } from '../types/export';
import { Schedule, ScheduledSession } from '../models/schedule';
import { ScheduleRepository } from '../repositories/scheduleRepository';
import { VenueRepository } from '../repositories/venueRepository';
import { LecturerRepository } from '../repositories/lecturerRepository';
import { CourseRepository } from '../repositories/courseRepository';
import { StudentGroupRepository } from '../repositories/studentGroupRepository';
import { PDFExporter } from './exporters/pdfExporter';
import { ExcelExporter } from './exporters/excelExporter';
import { CSVExporter } from './exporters/csvExporter';
import { ICalExporter } from './exporters/icalExporter';

export class ExportService {
  private scheduleRepository: ScheduleRepository;
  private venueRepository: VenueRepository;
  private lecturerRepository: LecturerRepository;
  private courseRepository: CourseRepository;
  private studentGroupRepository: StudentGroupRepository;
  private pdfExporter: PDFExporter;
  private excelExporter: ExcelExporter;
  private csvExporter: CSVExporter;
  private icalExporter: ICalExporter;

  constructor(
    scheduleRepository: ScheduleRepository,
    venueRepository: VenueRepository,
    lecturerRepository: LecturerRepository,
    courseRepository: CourseRepository,
    studentGroupRepository: StudentGroupRepository
  ) {
    this.scheduleRepository = scheduleRepository;
    this.venueRepository = venueRepository;
    this.lecturerRepository = lecturerRepository;
    this.courseRepository = courseRepository;
    this.studentGroupRepository = studentGroupRepository;
    this.pdfExporter = new PDFExporter();
    this.excelExporter = new ExcelExporter();
    this.csvExporter = new CSVExporter();
    this.icalExporter = new ICalExporter();
  }

  async exportTimetable(scheduleId: string, options: ExportOptions): Promise<ExportResult> {
    // Get schedule data
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule with ID ${scheduleId} not found`);
    }

    // Prepare export data
    const exportData = await this.prepareExportData(schedule, options);

    // Export based on format
    switch (options.format) {
      case ExportFormat.PDF:
        return await this.pdfExporter.export(exportData, options);
      case ExportFormat.EXCEL:
        return await this.excelExporter.export(exportData, options);
      case ExportFormat.CSV:
        return await this.csvExporter.export(exportData, options);
      case ExportFormat.ICAL:
        return await this.icalExporter.export(exportData, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private async prepareExportData(schedule: Schedule, options: ExportOptions): Promise<TimetableExportData> {
    // Filter sessions based on options
    let filteredSessions = schedule.timeSlots;

    // Apply date range filter
    if (options.dateRange) {
      filteredSessions = filteredSessions.filter(session => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= options.dateRange!.startDate && 
               sessionDate <= options.dateRange!.endDate;
      });
    }

    // Apply entity filters
    if (options.entityFilter) {
      const { venueIds, lecturerIds, courseIds, studentGroupIds } = options.entityFilter;
      
      filteredSessions = filteredSessions.filter(session => {
        if (venueIds && !venueIds.includes(session.venueId)) return false;
        if (lecturerIds && !lecturerIds.includes(session.lecturerId)) return false;
        if (courseIds && !courseIds.includes(session.courseId)) return false;
        if (studentGroupIds && !session.studentGroups.some(sg => studentGroupIds.includes(sg))) return false;
        return true;
      });
    }

    // Convert to export sessions with enriched data
    const exportSessions = await Promise.all(
      filteredSessions.map(session => this.enrichSessionData(session))
    );

    // Create metadata
    const metadata: ExportMetadata = {
      generatedAt: new Date(),
      totalSessions: exportSessions.length,
      dateRange: this.calculateDateRange(exportSessions),
      filters: options.entityFilter ? {
        venues: options.entityFilter.venueIds,
        lecturers: options.entityFilter.lecturerIds,
        courses: options.entityFilter.courseIds,
        studentGroups: options.entityFilter.studentGroupIds
      } : undefined
    };

    return {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      academicPeriod: schedule.academicPeriod,
      sessions: exportSessions,
      metadata
    };
  }

  private async enrichSessionData(session: ScheduledSession): Promise<ExportSession> {
    // Get related entity data
    const [course, lecturer, venue, studentGroups] = await Promise.all([
      this.courseRepository.findById(session.courseId),
      this.lecturerRepository.findById(session.lecturerId),
      this.venueRepository.findById(session.venueId),
      Promise.all(session.studentGroups.map(sgId => this.studentGroupRepository.findById(sgId)))
    ]);

    return {
      id: session.id,
      courseName: course?.name || 'Unknown Course',
      courseCode: course?.code || 'N/A',
      lecturerName: lecturer?.name || 'Unknown Lecturer',
      venueName: venue?.name || 'Unknown Venue',
      studentGroups: studentGroups.filter(sg => sg !== null).map(sg => sg!.name),
      startTime: new Date(session.startTime),
      endTime: new Date(session.endTime),
      dayOfWeek: this.getDayOfWeek(new Date(session.startTime)),
      duration: session.endTime.getTime() - session.startTime.getTime()
    };
  }

  private getDayOfWeek(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()] || 'Unknown';
  }

  private calculateDateRange(sessions: ExportSession[]): { startDate: Date; endDate: Date } {
    if (sessions.length === 0) {
      const now = new Date();
      return { startDate: now, endDate: now };
    }

    const dates = sessions.map(s => s.startTime);
    return {
      startDate: new Date(Math.min(...dates.map(d => d.getTime()))),
      endDate: new Date(Math.max(...dates.map(d => d.getTime())))
    };
  }

  async getSupportedFormats(): Promise<ExportFormat[]> {
    return Object.values(ExportFormat);
  }

  async validateExportOptions(options: ExportOptions): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate format
    if (!Object.values(ExportFormat).includes(options.format)) {
      errors.push(`Invalid export format: ${options.format}`);
    }

    // Validate date range
    if (options.dateRange) {
      if (options.dateRange.startDate >= options.dateRange.endDate) {
        errors.push('Start date must be before end date');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}