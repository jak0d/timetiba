import * as XLSX from 'xlsx';
import { ExportOptions, ExportResult, TimetableExportData, ExportSession } from '../../types/export';

export class ExcelExporter {
  async export(data: TimetableExportData, options: ExportOptions): Promise<ExportResult> {
    const workbook = XLSX.utils.book_new();

    // Create main timetable sheet
    const timetableSheet = this.createTimetableSheet(data, options);
    XLSX.utils.book_append_sheet(workbook, timetableSheet, 'Timetable');

    // Create summary sheet
    const summarySheet = this.createSummarySheet(data);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Create sessions by day sheets
    const sessionsByDay = this.groupSessionsByDay(data.sessions);
    Object.entries(sessionsByDay).forEach(([day, sessions]) => {
      if (sessions.length > 0) {
        const daySheet = this.createDaySheet(sessions, day, options);
        XLSX.utils.book_append_sheet(workbook, daySheet, day);
      }
    });

    // Generate Excel buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = this.generateFilename(data, options);

    return {
      buffer: Buffer.from(buffer),
      filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length
    };
  }

  private createTimetableSheet(data: TimetableExportData, options: ExportOptions): XLSX.WorkSheet {
    const headers = [
      'Day',
      'Start Time',
      'End Time',
      'Course Code',
      'Course Name',
      'Lecturer',
      'Venue'
    ];

    if (options.includeDetails) {
      headers.push('Student Groups', 'Duration (min)');
    }

    const rows = data.sessions.map(session => {
      const row = [
        session.dayOfWeek,
        session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        session.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        session.courseCode,
        session.courseName,
        session.lecturerName,
        session.venueName
      ];

      if (options.includeDetails) {
        row.push(
          session.studentGroups.join(', '),
          Math.round(session.duration / (1000 * 60)).toString()
        );
      }

      return row;
    });

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Day
      { wch: 12 }, // Start Time
      { wch: 12 }, // End Time
      { wch: 15 }, // Course Code
      { wch: 25 }, // Course Name
      { wch: 20 }, // Lecturer
      { wch: 20 }  // Venue
    ];

    if (options.includeDetails) {
      columnWidths.push(
        { wch: 30 }, // Student Groups
        { wch: 12 }  // Duration
      );
    }

    worksheet['!cols'] = columnWidths;

    // Style header row
    const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E6E6FA' } }
      };
    }

    return worksheet;
  }

  private createSummarySheet(data: TimetableExportData): XLSX.WorkSheet {
    const summaryData = [
      ['Schedule Information', ''],
      ['Schedule Name', data.scheduleName],
      ['Academic Period', data.academicPeriod],
      ['Generated At', data.metadata.generatedAt.toLocaleString()],
      ['Total Sessions', data.metadata.totalSessions.toString()],
      ['Date Range', `${data.metadata.dateRange.startDate.toDateString()} - ${data.metadata.dateRange.endDate.toDateString()}`],
      ['', ''],
      ['Statistics', ''],
      ...this.generateStatistics(data.sessions)
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
    worksheet['!cols'] = [{ wch: 20 }, { wch: 30 }];

    return worksheet;
  }

  private createDaySheet(sessions: ExportSession[], _day: string, options: ExportOptions): XLSX.WorkSheet {
    const headers = [
      'Time',
      'Course',
      'Lecturer',
      'Venue'
    ];

    if (options.includeDetails) {
      headers.push('Student Groups');
    }

    const sortedSessions = sessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
    const rows = sortedSessions.map(session => {
      const startTime = session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endTime = session.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const row = [
        `${startTime} - ${endTime}`,
        `${session.courseCode} - ${session.courseName}`,
        session.lecturerName,
        session.venueName
      ];

      if (options.includeDetails) {
        row.push(session.studentGroups.join(', '));
      }

      return row;
    });

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Time
      { wch: 30 }, // Course
      { wch: 20 }, // Lecturer
      { wch: 20 }  // Venue
    ];

    if (options.includeDetails) {
      columnWidths.push({ wch: 30 }); // Student Groups
    }

    worksheet['!cols'] = columnWidths;

    return worksheet;
  }

  private generateStatistics(sessions: ExportSession[]): string[][] {
    const stats: string[][] = [];
    
    // Sessions per day
    const sessionsByDay = this.groupSessionsByDay(sessions);
    Object.entries(sessionsByDay).forEach(([day, daySessions]) => {
      stats.push([`${day} Sessions`, daySessions.length.toString()]);
    });

    // Unique lecturers
    const uniqueLecturers = new Set(sessions.map(s => s.lecturerName));
    stats.push(['Unique Lecturers', uniqueLecturers.size.toString()]);

    // Unique venues
    const uniqueVenues = new Set(sessions.map(s => s.venueName));
    stats.push(['Unique Venues', uniqueVenues.size.toString()]);

    // Unique courses
    const uniqueCourses = new Set(sessions.map(s => s.courseCode));
    stats.push(['Unique Courses', uniqueCourses.size.toString()]);

    return stats;
  }

  private groupSessionsByDay(sessions: ExportSession[]): Record<string, ExportSession[]> {
    const grouped: Record<string, ExportSession[]> = {};
    
    sessions.forEach(session => {
      const day = session.dayOfWeek;
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(session);
    });

    return grouped;
  }

  private generateFilename(data: TimetableExportData, _options: ExportOptions): string {
    const sanitizedName = data.scheduleName.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitizedName}_${timestamp}.xlsx`;
  }
}