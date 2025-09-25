import { ExportOptions, ExportResult, TimetableExportData } from '../../types/export';

export class CSVExporter {
  async export(data: TimetableExportData, options: ExportOptions): Promise<ExportResult> {
    const csvContent = this.generateCSVContent(data, options);
    const buffer = Buffer.from(csvContent, 'utf-8');
    const filename = this.generateFilename(data, options);

    return {
      buffer,
      filename,
      mimeType: 'text/csv',
      size: buffer.length
    };
  }

  private generateCSVContent(data: TimetableExportData, options: ExportOptions): string {
    const lines: string[] = [];

    // Add header with metadata
    lines.push(`# ${data.scheduleName} - Timetable Export`);
    lines.push(`# Academic Period: ${data.academicPeriod}`);
    lines.push(`# Generated: ${data.metadata.generatedAt.toISOString()}`);
    lines.push(`# Total Sessions: ${data.metadata.totalSessions}`);
    lines.push(`# Date Range: ${data.metadata.dateRange.startDate.toISOString()} to ${data.metadata.dateRange.endDate.toISOString()}`);
    lines.push('');

    // CSV headers
    const headers = [
      'Day',
      'Date',
      'Start Time',
      'End Time',
      'Course Code',
      'Course Name',
      'Lecturer',
      'Venue'
    ];

    if (options.includeDetails) {
      headers.push('Student Groups', 'Duration (minutes)');
    }

    lines.push(this.escapeCSVRow(headers));

    // Sort sessions by date and time
    const sortedSessions = data.sessions.sort((a, b) => {
      const dateCompare = a.startTime.getTime() - b.startTime.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.getTime() - b.startTime.getTime();
    });

    // Add session data
    sortedSessions.forEach(session => {
      const row: string[] = [
        session.dayOfWeek,
        session.startTime.toISOString().split('T')[0] || '', // Date only
        session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        session.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        session.courseCode,
        session.courseName,
        session.lecturerName,
        session.venueName
      ];

      if (options.includeDetails) {
        row.push(
          session.studentGroups.join('; '), // Use semicolon to avoid CSV conflicts
          Math.round(session.duration / (1000 * 60)).toString()
        );
      }

      lines.push(this.escapeCSVRow(row));
    });

    return lines.join('\n');
  }

  private escapeCSVRow(row: string[]): string {
    return row.map(field => {
      // Escape fields that contain commas, quotes, or newlines
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    }).join(',');
  }

  private generateFilename(data: TimetableExportData, _options: ExportOptions): string {
    const sanitizedName = data.scheduleName.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitizedName}_${timestamp}.csv`;
  }
}