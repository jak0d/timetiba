import { ExportService } from '../services/exportService';
import { ExportFormat, ExportOptions } from '../types/export';
import { Schedule, ScheduleStatus } from '../models/schedule';
import { DayOfWeek } from '../models/common';
import { ScheduleRepository } from '../repositories/scheduleRepository';
import { VenueRepository } from '../repositories/venueRepository';
import { LecturerRepository } from '../repositories/lecturerRepository';
import { CourseRepository } from '../repositories/courseRepository';
import { StudentGroupRepository } from '../repositories/studentGroupRepository';
import { Frequency } from '../models/common';

// Mock repositories
jest.mock('../repositories/scheduleRepository');
jest.mock('../repositories/venueRepository');
jest.mock('../repositories/lecturerRepository');
jest.mock('../repositories/courseRepository');
jest.mock('../repositories/studentGroupRepository');

describe('ExportService', () => {
  let exportService: ExportService;
  let mockScheduleRepository: jest.Mocked<ScheduleRepository>;
  let mockVenueRepository: jest.Mocked<VenueRepository>;
  let mockLecturerRepository: jest.Mocked<LecturerRepository>;
  let mockCourseRepository: jest.Mocked<CourseRepository>;
  let mockStudentGroupRepository: jest.Mocked<StudentGroupRepository>;

  const mockSchedule: Schedule = {
    id: 'schedule-1',
    name: 'Fall 2024 Schedule',
    academicPeriod: 'Fall 2024',
    startDate: new Date('2024-01-15T00:00:00Z'),
    endDate: new Date('2024-05-15T00:00:00Z'),
    version: 1,
    timeSlots: [
      {
        id: 'session-1',
        courseId: 'course-1',
        lecturerId: 'lecturer-1',
        venueId: 'venue-1',
        studentGroups: ['group-1'],
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T10:30:00Z'),
        dayOfWeek: DayOfWeek.MONDAY
      },
      {
        id: 'session-2',
        courseId: 'course-2',
        lecturerId: 'lecturer-2',
        venueId: 'venue-2',
        studentGroups: ['group-2'],
        startTime: new Date('2024-01-16T14:00:00Z'),
        endTime: new Date('2024-01-16T15:30:00Z'),
        dayOfWeek: DayOfWeek.TUESDAY
      }
    ],
    status: ScheduleStatus.PUBLISHED,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  };

  beforeEach(() => {
    mockScheduleRepository = {} as jest.Mocked<ScheduleRepository>;
    mockVenueRepository = {} as jest.Mocked<VenueRepository>;
    mockLecturerRepository = {} as jest.Mocked<LecturerRepository>;
    mockCourseRepository = {} as jest.Mocked<CourseRepository>;
    mockStudentGroupRepository = {} as jest.Mocked<StudentGroupRepository>;

    exportService = new ExportService(
      mockScheduleRepository,
      mockVenueRepository,
      mockLecturerRepository,
      mockCourseRepository,
      mockStudentGroupRepository
    );

    // Setup mock data
    mockScheduleRepository.findById = jest.fn().mockResolvedValue(mockSchedule);
    mockCourseRepository.findById = jest.fn().mockImplementation(async (id) => ({
      id,
      name: `Course ${id}`,
      code: `CS${id}`,
      duration: 90,
      frequency: Frequency.WEEKLY,
      requiredEquipment: [],
      studentGroups: [],
      lecturerId: 'lecturer-1',
      constraints: [],
      department: 'Computer Science',
      credits: 3,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    mockLecturerRepository.findById = jest.fn().mockImplementation(async (id) => ({
      id,
      name: `Lecturer ${id}`,
      email: `lecturer${id}@university.edu`,
      department: 'Computer Science',
      subjects: ['Programming'],
      availability: {},
      preferences: {},
      maxHoursPerDay: 8,
      maxHoursPerWeek: 40,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    mockVenueRepository.findById = jest.fn().mockImplementation(async (id) => ({
      id,
      name: `Room ${id}`,
      capacity: 50,
      equipment: [],
      availability: [],
      location: 'Building A',
      accessibility: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    mockStudentGroupRepository.findById = jest.fn().mockImplementation(async (id) => ({
      id,
      name: `Group ${id}`,
      size: 25,
      courses: [],
      yearLevel: 1,
      department: 'Computer Science',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  });

  describe('exportTimetable', () => {
    it('should export timetable in PDF format', async () => {
      const options: ExportOptions = {
        format: ExportFormat.PDF,
        includeDetails: true
      };

      const result = await exportService.exportTimetable('schedule-1', options);

      expect(result).toBeDefined();
      expect(result.mimeType).toBe('application/pdf');
      expect(result.filename).toMatch(/Fall_2024_Schedule_\d{4}-\d{2}-\d{2}\.pdf/);
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should export timetable in Excel format', async () => {
      const options: ExportOptions = {
        format: ExportFormat.EXCEL,
        includeDetails: true
      };

      const result = await exportService.exportTimetable('schedule-1', options);

      expect(result).toBeDefined();
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(result.filename).toMatch(/Fall_2024_Schedule_\d{4}-\d{2}-\d{2}\.xlsx/);
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should export timetable in CSV format', async () => {
      const options: ExportOptions = {
        format: ExportFormat.CSV,
        includeDetails: false
      };

      const result = await exportService.exportTimetable('schedule-1', options);

      expect(result).toBeDefined();
      expect(result.mimeType).toBe('text/csv');
      expect(result.filename).toMatch(/Fall_2024_Schedule_\d{4}-\d{2}-\d{2}\.csv/);
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.size).toBeGreaterThan(0);

      // Verify CSV content structure
      const csvContent = result.buffer.toString('utf-8');
      expect(csvContent).toContain('Fall 2024 Schedule - Timetable Export');
      expect(csvContent).toContain('Day,Date,Start Time,End Time,Course Code,Course Name,Lecturer,Venue');
    });

    it('should export timetable in iCal format', async () => {
      const options: ExportOptions = {
        format: ExportFormat.ICAL,
        includeDetails: true
      };

      const result = await exportService.exportTimetable('schedule-1', options);

      expect(result).toBeDefined();
      expect(result.mimeType).toBe('text/calendar');
      expect(result.filename).toMatch(/Fall_2024_Schedule_\d{4}-\d{2}-\d{2}\.ics/);
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.size).toBeGreaterThan(0);

      // Verify iCal content structure
      const icalContent = result.buffer.toString('utf-8');
      expect(icalContent).toContain('BEGIN:VCALENDAR');
      expect(icalContent).toContain('END:VCALENDAR');
      expect(icalContent).toContain('BEGIN:VEVENT');
      expect(icalContent).toContain('END:VEVENT');
    });

    it('should apply date range filter', async () => {
      const options: ExportOptions = {
        format: ExportFormat.CSV,
        dateRange: {
          startDate: new Date('2024-01-15T00:00:00Z'),
          endDate: new Date('2024-01-15T23:59:59Z')
        }
      };

      const result = await exportService.exportTimetable('schedule-1', options);
      const csvContent = result.buffer.toString('utf-8');

      // Should only include Monday session, not Tuesday
      expect(csvContent).toContain('Monday');
      expect(csvContent).not.toContain('Tuesday');
    });

    it('should apply entity filters', async () => {
      const options: ExportOptions = {
        format: ExportFormat.CSV,
        entityFilter: {
          courseIds: ['course-1']
        }
      };

      const result = await exportService.exportTimetable('schedule-1', options);
      const csvContent = result.buffer.toString('utf-8');

      // Should only include course-1 sessions
      expect(csvContent).toContain('CScourse-1');
      expect(csvContent).not.toContain('CScourse-2');
    });

    it('should throw error for non-existent schedule', async () => {
      mockScheduleRepository.findById = jest.fn().mockResolvedValue(null);

      const options: ExportOptions = {
        format: ExportFormat.PDF
      };

      await expect(exportService.exportTimetable('non-existent', options))
        .rejects.toThrow('Schedule with ID non-existent not found');
    });

    it('should throw error for unsupported format', async () => {
      const options: ExportOptions = {
        format: 'unsupported' as ExportFormat
      };

      await expect(exportService.exportTimetable('schedule-1', options))
        .rejects.toThrow('Unsupported export format: unsupported');
    });
  });

  describe('getSupportedFormats', () => {
    it('should return all supported export formats', async () => {
      const formats = await exportService.getSupportedFormats();

      expect(formats).toEqual([
        ExportFormat.PDF,
        ExportFormat.EXCEL,
        ExportFormat.CSV,
        ExportFormat.ICAL
      ]);
    });
  });

  describe('validateExportOptions', () => {
    it('should validate valid export options', async () => {
      const options: ExportOptions = {
        format: ExportFormat.PDF,
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        }
      };

      const result = await exportService.validateExportOptions(options);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid export format', async () => {
      const options: ExportOptions = {
        format: 'invalid' as ExportFormat
      };

      const result = await exportService.validateExportOptions(options);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid export format: invalid');
    });

    it('should detect invalid date range', async () => {
      const options: ExportOptions = {
        format: ExportFormat.PDF,
        dateRange: {
          startDate: new Date('2024-01-31'),
          endDate: new Date('2024-01-01')
        }
      };

      const result = await exportService.validateExportOptions(options);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Start date must be before end date');
    });
  });
});