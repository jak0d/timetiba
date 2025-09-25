import { ICalExporter } from '../../services/exporters/icalExporter';
import { ExportOptions, ExportFormat, TimetableExportData } from '../../types/export';

describe('ICalExporter', () => {
  let icalExporter: ICalExporter;

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
    icalExporter = new ICalExporter();
  });

  describe('export', () => {
    it('should generate iCal file with basic options', async () => {
      const options: ExportOptions = {
        format: ExportFormat.ICAL,
        includeDetails: false
      };

      const result = await icalExporter.export(mockExportData, options);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toMatch(/Test_Schedule_\d{4}-\d{2}-\d{2}\.ics/);
      expect(result.mimeType).toBe('text/calendar');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should include valid iCal structure', async () => {
      const options: ExportOptions = {
        format: ExportFormat.ICAL
      };

      const result = await icalExporter.export(mockExportData, options);
      const icalContent = result.buffer.toString('utf-8');

      // Check basic iCal structure
      expect(icalContent).toMatch(/^BEGIN:VCALENDAR/);
      expect(icalContent).toMatch(/END:VCALENDAR$/);
      expect(icalContent).toContain('VERSION:2.0');
      expect(icalContent).toContain('PRODID:-//AI Timetabler//Timetable Export//EN');
      expect(icalContent).toContain('CALSCALE:GREGORIAN');
      expect(icalContent).toContain('METHOD:PUBLISH');
    });

    it('should include calendar metadata', async () => {
      const options: ExportOptions = {
        format: ExportFormat.ICAL
      };

      const result = await icalExporter.export(mockExportData, options);
      const icalContent = result.buffer.toString('utf-8');

      expect(icalContent).toContain('X-WR-CALNAME:Test Schedule');
      expect(icalContent).toContain('X-WR-CALDESC:Timetable for Fall 2024');
    });

    it('should create events for each session', async () => {
      const options: ExportOptions = {
        format: ExportFormat.ICAL
      };

      const result = await icalExporter.export(mockExportData, options);
      const icalContent = result.buffer.toString('utf-8');

      // Should have 2 events
      const eventCount = (icalContent.match(/BEGIN:VEVENT/g) || []).length;
      expect(eventCount).toBe(2);

      const endEventCount = (icalContent.match(/END:VEVENT/g) || []).length;
      expect(endEventCount).toBe(2);
    });

    it('should include correct event properties', async () => {
      const options: ExportOptions = {
        format: ExportFormat.ICAL
      };

      const result = await icalExporter.export(mockExportData, options);
      const icalContent = result.buffer.toString('utf-8');

      // Check for required event properties
      expect(icalContent).toContain('UID:session-1@ai-timetabler.com');
      expect(icalContent).toContain('UID:session-2@ai-timetabler.com');
      expect(icalContent).toContain('SUMMARY:CS101 - Introduction to Programming');
      expect(icalContent).toContain('SUMMARY:CS201 - Data Structures');
      expect(icalContent).toContain('LOCATION:Room A101');
      expect(icalContent).toContain('LOCATION:Room B202');
      expect(icalContent).toContain('CATEGORIES:EDUCATION,LECTURE');
      expect(icalContent).toContain('STATUS:CONFIRMED');
      expect(icalContent).toContain('TRANSP:OPAQUE');
    });

    it('should format datetime correctly', async () => {
      const options: ExportOptions = {
        format: ExportFormat.ICAL
      };

      const result = await icalExporter.export(mockExportData, options);
      const icalContent = result.buffer.toString('utf-8');

      // Check datetime format (YYYYMMDDTHHMMSSZ)
      expect(icalContent).toContain('DTSTART:20240115T090000Z');
      expect(icalContent).toContain('DTEND:20240115T103000Z');
      expect(icalContent).toContain('DTSTART:20240116T140000Z');
      expect(icalContent).toContain('DTEND:20240116T153000Z');
    });

    it('should include event descriptions', async () => {
      const options: ExportOptions = {
        format: ExportFormat.ICAL,
        includeDetails: false
      };

      const result = await icalExporter.export(mockExportData, options);
      const icalContent = result.buffer.toString('utf-8');

      expect(icalContent).toContain('DESCRIPTION:Course: Introduction to Programming (CS101)\\\\nLecturer: Dr. Smith\\\\nVenue: Room A101');
      expect(icalContent).toContain('DESCRIPTION:Course: Data Structures (CS201)\\\\nLecturer: Prof. Johnson\\\\nVenue: Room B202');
    });

    it('should include student groups in description when details enabled', async () => {
      const options: ExportOptions = {
        format: ExportFormat.ICAL,
        includeDetails: true
      };

      const result = await icalExporter.export(mockExportData, options);
      const icalContent = result.buffer.toString('utf-8');

      expect(icalContent).toContain('Student Groups: Group 1\\, Group 2');
      expect(icalContent).toContain('Student Groups: Group 3');
    });

    it('should properly escape special characters', async () => {
      const dataWithSpecialChars: TimetableExportData = {
        ...mockExportData,
        sessions: [{
          ...mockExportData.sessions[0]!,
          courseName: 'Programming; Basics, Part 1\nAdvanced Topics',
          lecturerName: 'Dr. Smith\\Jones',
          venueName: 'Room A101; Building B'
        }]
      };

      const options: ExportOptions = {
        format: ExportFormat.ICAL
      };

      const result = await icalExporter.export(dataWithSpecialChars, options);
      const icalContent = result.buffer.toString('utf-8');

      expect(icalContent).toContain('SUMMARY:CS101 - Programming\\; Basics\\, Part 1\\nAdvanced Topics');
      expect(icalContent).toContain('Lecturer: Dr. Smith\\\\Jones');
      expect(icalContent).toContain('LOCATION:Room A101\\; Building B');
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
        format: ExportFormat.ICAL
      };

      const result = await icalExporter.export(emptyData, options);
      const icalContent = result.buffer.toString('utf-8');

      expect(icalContent).toContain('BEGIN:VCALENDAR');
      expect(icalContent).toContain('END:VCALENDAR');
      expect(icalContent).not.toContain('BEGIN:VEVENT');
    });

    it('should include timestamps for created and modified', async () => {
      const options: ExportOptions = {
        format: ExportFormat.ICAL
      };

      const result = await icalExporter.export(mockExportData, options);
      const icalContent = result.buffer.toString('utf-8');

      // Should include CREATED and LAST-MODIFIED timestamps
      expect(icalContent).toMatch(/CREATED:\d{8}T\d{6}Z/);
      expect(icalContent).toMatch(/LAST-MODIFIED:\d{8}T\d{6}Z/);
    });

    it('should sanitize filename properly', async () => {
      const dataWithSpecialChars: TimetableExportData = {
        ...mockExportData,
        scheduleName: 'Test/Schedule:With*Special?Chars'
      };

      const options: ExportOptions = {
        format: ExportFormat.ICAL
      };

      const result = await icalExporter.export(dataWithSpecialChars, options);

      expect(result.filename).toMatch(/Test_Schedule_With_Special_Chars_\d{4}-\d{2}-\d{2}\.ics/);
    });

    it('should use CRLF line endings', async () => {
      const options: ExportOptions = {
        format: ExportFormat.ICAL
      };

      const result = await icalExporter.export(mockExportData, options);
      const icalContent = result.buffer.toString('utf-8');

      // iCal specification requires CRLF line endings
      expect(icalContent).toContain('\r\n');
      expect(icalContent.split('\r\n').length).toBeGreaterThan(1);
    });
  });
});