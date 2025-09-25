import { CSVExporter } from '../../services/exporters/csvExporter';
import { ExportOptions, ExportFormat, TimetableExportData } from '../../types/export';

describe('CSVExporter', () => {
  let csvExporter: CSVExporter;

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
    csvExporter = new CSVExporter();
  });

  describe('export', () => {
    it('should generate CSV with basic options', async () => {
      const options: ExportOptions = {
        format: ExportFormat.CSV,
        includeDetails: false
      };

      const result = await csvExporter.export(mockExportData, options);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toMatch(/Test_Schedule_\d{4}-\d{2}-\d{2}\.csv/);
      expect(result.mimeType).toBe('text/csv');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should include metadata header', async () => {
      const options: ExportOptions = {
        format: ExportFormat.CSV
      };

      const result = await csvExporter.export(mockExportData, options);
      const csvContent = result.buffer.toString('utf-8');

      expect(csvContent).toContain('# Test Schedule - Timetable Export');
      expect(csvContent).toContain('# Academic Period: Fall 2024');
      expect(csvContent).toContain('# Total Sessions: 2');
    });

    it('should include correct headers without details', async () => {
      const options: ExportOptions = {
        format: ExportFormat.CSV,
        includeDetails: false
      };

      const result = await csvExporter.export(mockExportData, options);
      const csvContent = result.buffer.toString('utf-8');

      expect(csvContent).toContain('Day,Date,Start Time,End Time,Course Code,Course Name,Lecturer,Venue');
      expect(csvContent).not.toContain('Student Groups');
      expect(csvContent).not.toContain('Duration (minutes)');
    });

    it('should include correct headers with details', async () => {
      const options: ExportOptions = {
        format: ExportFormat.CSV,
        includeDetails: true
      };

      const result = await csvExporter.export(mockExportData, options);
      const csvContent = result.buffer.toString('utf-8');

      expect(csvContent).toContain('Day,Date,Start Time,End Time,Course Code,Course Name,Lecturer,Venue,Student Groups,Duration (minutes)');
    });

    it('should include session data', async () => {
      const options: ExportOptions = {
        format: ExportFormat.CSV,
        includeDetails: true
      };

      const result = await csvExporter.export(mockExportData, options);
      const csvContent = result.buffer.toString('utf-8');

      expect(csvContent).toContain('Monday,2024-01-15,09:00,10:30,CS101,Introduction to Programming,Dr. Smith,Room A101,"Group 1; Group 2",90');
      expect(csvContent).toContain('Tuesday,2024-01-16,14:00,15:30,CS201,Data Structures,Prof. Johnson,Room B202,Group 3,90');
    });

    it('should properly escape CSV fields with commas', async () => {
      const dataWithCommas: TimetableExportData = {
        ...mockExportData,
        sessions: [{
          ...mockExportData.sessions[0]!,
          courseName: 'Introduction to Programming, Part 1',
          lecturerName: 'Dr. Smith, PhD'
        }]
      };

      const options: ExportOptions = {
        format: ExportFormat.CSV
      };

      const result = await csvExporter.export(dataWithCommas, options);
      const csvContent = result.buffer.toString('utf-8');

      expect(csvContent).toContain('"Introduction to Programming, Part 1"');
      expect(csvContent).toContain('"Dr. Smith, PhD"');
    });

    it('should properly escape CSV fields with quotes', async () => {
      const dataWithQuotes: TimetableExportData = {
        ...mockExportData,
        sessions: [{
          ...mockExportData.sessions[0]!,
          courseName: 'Introduction to "Programming"',
          venueName: 'Room "A101"'
        }]
      };

      const options: ExportOptions = {
        format: ExportFormat.CSV
      };

      const result = await csvExporter.export(dataWithQuotes, options);
      const csvContent = result.buffer.toString('utf-8');

      expect(csvContent).toContain('"Introduction to ""Programming"""');
      expect(csvContent).toContain('"Room ""A101"""');
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
        format: ExportFormat.CSV
      };

      const result = await csvExporter.export(emptyData, options);
      const csvContent = result.buffer.toString('utf-8');

      expect(csvContent).toContain('# Total Sessions: 0');
      expect(csvContent).toContain('Day,Date,Start Time,End Time,Course Code,Course Name,Lecturer,Venue');
      // Should not contain any session data rows
      const lines = csvContent.split('\n').filter(line => !line.startsWith('#') && line.trim() !== '');
      expect(lines).toHaveLength(1); // Only header row
    });

    it('should sort sessions by date and time', async () => {
      const unsortedData: TimetableExportData = {
        ...mockExportData,
        sessions: [
          mockExportData.sessions[1]!, // Tuesday session first
          mockExportData.sessions[0]!  // Monday session second
        ]
      };

      const options: ExportOptions = {
        format: ExportFormat.CSV
      };

      const result = await csvExporter.export(unsortedData, options);
      const csvContent = result.buffer.toString('utf-8');

      const lines = csvContent.split('\n').filter(line => !line.startsWith('#') && line.trim() !== '');
      const dataLines = lines.slice(1); // Skip header

      // Monday session should come first (earlier date)
      expect(dataLines[0]).toContain('Monday');
      expect(dataLines[1]).toContain('Tuesday');
    });

    it('should sanitize filename properly', async () => {
      const dataWithSpecialChars: TimetableExportData = {
        ...mockExportData,
        scheduleName: 'Test/Schedule:With*Special?Chars'
      };

      const options: ExportOptions = {
        format: ExportFormat.CSV
      };

      const result = await csvExporter.export(dataWithSpecialChars, options);

      expect(result.filename).toMatch(/Test_Schedule_With_Special_Chars_\d{4}-\d{2}-\d{2}\.csv/);
    });

    it('should use semicolon separator for student groups', async () => {
      const options: ExportOptions = {
        format: ExportFormat.CSV,
        includeDetails: true
      };

      const result = await csvExporter.export(mockExportData, options);
      const csvContent = result.buffer.toString('utf-8');

      // Student groups should be separated by semicolons to avoid CSV conflicts
      expect(csvContent).toContain('Group 1; Group 2');
    });
  });
});