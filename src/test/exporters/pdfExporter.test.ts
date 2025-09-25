import { PDFExporter } from '../../services/exporters/pdfExporter';
import { ExportOptions, ExportFormat, TimetableExportData } from '../../types/export';

describe('PDFExporter', () => {
  let pdfExporter: PDFExporter;

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
        duration: 90 * 60 * 1000 // 90 minutes in milliseconds
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
    pdfExporter = new PDFExporter();
  });

  describe('export', () => {
    it('should generate PDF with basic options', async () => {
      const options: ExportOptions = {
        format: ExportFormat.PDF,
        includeDetails: false
      };

      const result = await pdfExporter.export(mockExportData, options);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toMatch(/Test_Schedule_\d{4}-\d{2}-\d{2}\.pdf/);
      expect(result.mimeType).toBe('application/pdf');
      expect(result.size).toBeGreaterThan(0);
      expect(result.size).toBe(result.buffer.length);
    });

    it('should generate PDF with detailed information', async () => {
      const options: ExportOptions = {
        format: ExportFormat.PDF,
        includeDetails: true
      };

      const result = await pdfExporter.export(mockExportData, options);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.size).toBeGreaterThan(0);
      // Detailed PDF should be larger due to additional information
    });

    it('should generate PDF with custom title', async () => {
      const options: ExportOptions = {
        format: ExportFormat.PDF,
        customTitle: 'Custom Timetable Title'
      };

      const result = await pdfExporter.export(mockExportData, options);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.size).toBeGreaterThan(0);
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
        format: ExportFormat.PDF
      };

      const result = await pdfExporter.export(emptyData, options);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should generate valid PDF structure', async () => {
      const options: ExportOptions = {
        format: ExportFormat.PDF
      };

      const result = await pdfExporter.export(mockExportData, options);

      // Check PDF header
      const pdfHeader = result.buffer.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    });

    it('should sanitize filename properly', async () => {
      const dataWithSpecialChars: TimetableExportData = {
        ...mockExportData,
        scheduleName: 'Test/Schedule:With*Special?Chars'
      };

      const options: ExportOptions = {
        format: ExportFormat.PDF
      };

      const result = await pdfExporter.export(dataWithSpecialChars, options);

      expect(result.filename).toMatch(/Test_Schedule_With_Special_Chars_\d{4}-\d{2}-\d{2}\.pdf/);
    });
  });
});