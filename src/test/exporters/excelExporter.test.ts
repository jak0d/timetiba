import { ExcelExporter } from '../../services/exporters/excelExporter';
import { ExportOptions, ExportFormat, TimetableExportData } from '../../types/export';
import * as XLSX from 'xlsx';

describe('ExcelExporter', () => {
  let excelExporter: ExcelExporter;

  const mockExportData: TimetableExportData = {
    scheduleId: 'schedule-1',
    scheduleName: 'Test Schedule',
    academicPeriod: 'Fall 2024',
    sessions: [
      {
        id: 'session-1',
        courseName: 'Introduction to Programming',
        courseCode: 'CS101',
        lecturerName: 'Dr. Smith',
        venueName: 'Room A101',
        studentGroups: ['Group 1', 'Group 2'],
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T10:30:00Z'),
        dayOfWeek: 'Monday',
        duration: 90 * 60 * 1000
      },
      {
        id: 'session-2',
        courseName: 'Data Structures',
        courseCode: 'CS201',
        lecturerName: 'Prof. Johnson',
        venueName: 'Room B202',
        studentGroups: ['Group 3'],
        startTime: new Date('2024-01-16T14:00:00Z'),
        endTime: new Date('2024-01-16T15:30:00Z'),
        dayOfWeek: 'Tuesday',
        duration: 90 * 60 * 1000
      }
    ],
    metadata: {
      generatedAt: new Date('2024-01-01T00:00:00Z'),
      totalSessions: 2,
      dateRange: {
        startDate: new Date('2024-01-15T00:00:00Z'),
        endDate: new Date('2024-01-16T23:59:59Z')
      }
    }
  };

  beforeEach(() => {
    excelExporter = new ExcelExporter();
  });

  describe('export', () => {
    it('should generate Excel file with basic options', async () => {
      const options: ExportOptions = {
        format: ExportFormat.EXCEL,
        includeDetails: false
      };

      const result = await excelExporter.export(mockExportData, options);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toMatch(/Test_Schedule_\d{4}-\d{2}-\d{2}\.xlsx/);
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should generate Excel file with detailed information', async () => {
      const options: ExportOptions = {
        format: ExportFormat.EXCEL,
        includeDetails: true
      };

      const result = await excelExporter.export(mockExportData, options);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should create multiple worksheets', async () => {
      const options: ExportOptions = {
        format: ExportFormat.EXCEL,
        includeDetails: true
      };

      const result = await excelExporter.export(mockExportData, options);

      // Parse the generated Excel file to verify structure
      const workbook = XLSX.read(result.buffer, { type: 'buffer' });

      // Should have at least Timetable, Summary, Monday, and Tuesday sheets
      expect(workbook.SheetNames).toContain('Timetable');
      expect(workbook.SheetNames).toContain('Summary');
      expect(workbook.SheetNames).toContain('Monday');
      expect(workbook.SheetNames).toContain('Tuesday');
    });

    it('should include correct headers in timetable sheet', async () => {
      const options: ExportOptions = {
        format: ExportFormat.EXCEL,
        includeDetails: true
      };

      const result = await excelExporter.export(mockExportData, options);
      const workbook = XLSX.read(result.buffer, { type: 'buffer' });
      const timetableSheet = workbook.Sheets['Timetable'];
      if (!timetableSheet) throw new Error('Timetable sheet not found');
      const data = XLSX.utils.sheet_to_json(timetableSheet, { header: 1 }) as string[][];

      const headers = data[0];
      expect(headers).toContain('Day');
      expect(headers).toContain('Start Time');
      expect(headers).toContain('End Time');
      expect(headers).toContain('Course Code');
      expect(headers).toContain('Course Name');
      expect(headers).toContain('Lecturer');
      expect(headers).toContain('Venue');
      expect(headers).toContain('Student Groups');
      expect(headers).toContain('Duration (min)');
    });

    it('should include summary information', async () => {
      const options: ExportOptions = {
        format: ExportFormat.EXCEL
      };

      const result = await excelExporter.export(mockExportData, options);
      const workbook = XLSX.read(result.buffer, { type: 'buffer' });
      const summarySheet = workbook.Sheets['Summary'];
      if (!summarySheet) throw new Error('Summary sheet not found');
      const data = XLSX.utils.sheet_to_json(summarySheet, { header: 1 }) as string[][];

      // Find the row with schedule name
      const scheduleNameRow = data.find(row => row[0] === 'Schedule Name');
      expect(scheduleNameRow).toBeDefined();
      expect(scheduleNameRow![1]).toBe('Test Schedule');

      // Find the row with total sessions
      const totalSessionsRow = data.find(row => row[0] === 'Total Sessions');
      expect(totalSessionsRow).toBeDefined();
      expect(totalSessionsRow![1]).toBe('2');
    });

    it('should handle empty sessions', async () => {
      const emptyData: TimetableExportData = {
        ...mockExportData,
        sessions: [],
        metadata: {
          ...mockExportData.metadata,
          totalSessions: 0
        }
      };

      const options: ExportOptions = {
        format: ExportFormat.EXCEL
      };

      const result = await excelExporter.export(emptyData, options);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.size).toBeGreaterThan(0);

      const workbook = XLSX.read(result.buffer, { type: 'buffer' });
      expect(workbook.SheetNames).toContain('Timetable');
      expect(workbook.SheetNames).toContain('Summary');
    });

    it('should sanitize filename properly', async () => {
      const dataWithSpecialChars: TimetableExportData = {
        ...mockExportData,
        scheduleName: 'Test/Schedule:With*Special?Chars'
      };

      const options: ExportOptions = {
        format: ExportFormat.EXCEL
      };

      const result = await excelExporter.export(dataWithSpecialChars, options);

      expect(result.filename).toMatch(/Test_Schedule_With_Special_Chars_\d{4}-\d{2}-\d{2}\.xlsx/);
    });

    it('should include statistics in summary sheet', async () => {
      const options: ExportOptions = {
        format: ExportFormat.EXCEL
      };

      const result = await excelExporter.export(mockExportData, options);
      const workbook = XLSX.read(result.buffer, { type: 'buffer' });
      const summarySheet = workbook.Sheets['Summary'];
      if (!summarySheet) throw new Error('Summary sheet not found');
      const data = XLSX.utils.sheet_to_json(summarySheet, { header: 1 }) as string[][];

      // Should include statistics
      const mondaySessionsRow = data.find(row => row[0] === 'Monday Sessions');
      expect(mondaySessionsRow).toBeDefined();
      expect(mondaySessionsRow![1]).toBe('1');

      const tuesdaySessionsRow = data.find(row => row[0] === 'Tuesday Sessions');
      expect(tuesdaySessionsRow).toBeDefined();
      expect(tuesdaySessionsRow![1]).toBe('1');

      const uniqueLecturersRow = data.find(row => row[0] === 'Unique Lecturers');
      expect(uniqueLecturersRow).toBeDefined();
      expect(uniqueLecturersRow![1]).toBe('2');
    });
  });
});