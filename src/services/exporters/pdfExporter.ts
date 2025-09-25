import PDFDocument from 'pdfkit';
import { ExportOptions, ExportResult, TimetableExportData, ExportSession } from '../../types/export';

export class PDFExporter {
  async export(data: TimetableExportData, options: ExportOptions): Promise<ExportResult> {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    // Collect PDF data
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const filename = this.generateFilename(data, options);
        
        resolve({
          buffer,
          filename,
          mimeType: 'application/pdf',
          size: buffer.length
        });
      });

      doc.on('error', reject);

      try {
        this.generatePDFContent(doc, data, options);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private generatePDFContent(doc: PDFKit.PDFDocument, data: TimetableExportData, options: ExportOptions): void {
    // Title
    const title = options.customTitle || `${data.scheduleName} - Timetable`;
    doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown();

    // Metadata
    doc.fontSize(12).font('Helvetica');
    doc.text(`Academic Period: ${data.academicPeriod}`);
    doc.text(`Generated: ${data.metadata.generatedAt.toLocaleString()}`);
    doc.text(`Total Sessions: ${data.metadata.totalSessions}`);
    doc.text(`Date Range: ${data.metadata.dateRange.startDate.toDateString()} - ${data.metadata.dateRange.endDate.toDateString()}`);
    doc.moveDown();

    // Group sessions by day
    const sessionsByDay = this.groupSessionsByDay(data.sessions);

    // Generate timetable for each day
    Object.entries(sessionsByDay).forEach(([day, sessions]) => {
      if (sessions.length === 0) return;

      // Day header
      doc.fontSize(16).font('Helvetica-Bold').text(day, { underline: true });
      doc.moveDown(0.5);

      // Sessions for this day
      sessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      
      sessions.forEach(session => {
        const startTime = session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endTime = session.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(`${startTime} - ${endTime}`, { continued: true });
        doc.font('Helvetica').text(` | ${session.courseCode} - ${session.courseName}`);
        
        if (options.includeDetails) {
          doc.fontSize(9).font('Helvetica');
          doc.text(`  Lecturer: ${session.lecturerName}`);
          doc.text(`  Venue: ${session.venueName}`);
          if (session.studentGroups.length > 0) {
            doc.text(`  Groups: ${session.studentGroups.join(', ')}`);
          }
        }
        doc.moveDown(0.3);
      });

      doc.moveDown();
    });

    // Add page numbers
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(`Page ${i + 1} of ${pages.count}`, 
        doc.page.width - 100, doc.page.height - 30, { align: 'right' });
    }
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
    return `${sanitizedName}_${timestamp}.pdf`;
  }
}