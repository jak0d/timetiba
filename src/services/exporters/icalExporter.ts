import { ExportOptions, ExportResult, TimetableExportData, ExportSession } from '../../types/export';

export class ICalExporter {
  async export(data: TimetableExportData, options: ExportOptions): Promise<ExportResult> {
    const icalContent = this.generateICalContent(data, options);
    const buffer = Buffer.from(icalContent, 'utf-8');
    const filename = this.generateFilename(data, options);

    return {
      buffer,
      filename,
      mimeType: 'text/calendar',
      size: buffer.length
    };
  }

  private generateICalContent(data: TimetableExportData, options: ExportOptions): string {
    const lines: string[] = [];

    // iCal header
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//AI Timetabler//Timetable Export//EN');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');
    lines.push(`X-WR-CALNAME:${data.scheduleName}`);
    lines.push(`X-WR-CALDESC:Timetable for ${data.academicPeriod}`);

    // Add events for each session
    data.sessions.forEach(session => {
      lines.push(...this.generateEventLines(session, data, options));
    });

    // iCal footer
    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
  }

  private generateEventLines(session: ExportSession, _data: TimetableExportData, options: ExportOptions): string[] {
    const lines: string[] = [];
    
    lines.push('BEGIN:VEVENT');
    
    // Generate unique ID
    const uid = `${session.id}@ai-timetabler.com`;
    lines.push(`UID:${uid}`);
    
    // Date and time (convert to UTC)
    const startTime = this.formatICalDateTime(session.startTime);
    const endTime = this.formatICalDateTime(session.endTime);
    lines.push(`DTSTART:${startTime}`);
    lines.push(`DTEND:${endTime}`);
    
    // Event summary
    const summary = `${session.courseCode} - ${session.courseName}`;
    lines.push(`SUMMARY:${this.escapeICalText(summary)}`);
    
    // Description
    let description = `Course: ${session.courseName} (${session.courseCode})\\n`;
    description += `Lecturer: ${session.lecturerName}\\n`;
    description += `Venue: ${session.venueName}`;
    
    if (options.includeDetails && session.studentGroups.length > 0) {
      description += `\\nStudent Groups: ${session.studentGroups.join(', ')}`;
    }
    
    lines.push(`DESCRIPTION:${this.escapeICalText(description)}`);
    
    // Location
    lines.push(`LOCATION:${this.escapeICalText(session.venueName)}`);
    
    // Categories
    lines.push('CATEGORIES:EDUCATION,LECTURE');
    
    // Status
    lines.push('STATUS:CONFIRMED');
    
    // Transparency (show as busy)
    lines.push('TRANSP:OPAQUE');
    
    // Created and last modified timestamps
    const now = this.formatICalDateTime(new Date());
    lines.push(`CREATED:${now}`);
    lines.push(`LAST-MODIFIED:${now}`);
    
    // Sequence number
    lines.push('SEQUENCE:0');
    
    lines.push('END:VEVENT');
    
    return lines;
  }

  private formatICalDateTime(date: Date): string {
    // Format as YYYYMMDDTHHMMSSZ (UTC)
    const utcDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return utcDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  private escapeICalText(text: string): string {
    // Escape special characters for iCal format
    return text
      .replace(/\\/g, '\\\\')  // Escape backslashes
      .replace(/;/g, '\\;')    // Escape semicolons
      .replace(/,/g, '\\,')    // Escape commas
      .replace(/\n/g, '\\n')   // Escape newlines
      .replace(/\r/g, '\\r');  // Escape carriage returns
  }

  private generateFilename(data: TimetableExportData, _options: ExportOptions): string {
    const sanitizedName = data.scheduleName.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitizedName}_${timestamp}.ics`;
  }
}