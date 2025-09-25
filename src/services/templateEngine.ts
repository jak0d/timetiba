import { NotificationTemplate, NotificationChannel } from '../types/notification';

export class TemplateEngine {
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    // Schedule change notification
    this.addTemplate({
      id: 'schedule-change',
      name: 'Schedule Change Notification',
      subject: 'Schedule Update: {{courseName}}',
      body: `Dear {{recipientName}},

Your schedule has been updated for the following course:

Course: {{courseName}}
Previous Time: {{previousTime}}
New Time: {{newTime}}
Venue: {{venueName}}
Reason: {{changeReason}}

Please update your calendar accordingly.

Best regards,
AI Timetabler System`,
      channel: NotificationChannel.EMAIL,
      variables: ['recipientName', 'courseName', 'previousTime', 'newTime', 'venueName', 'changeReason'],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Clash detected notification
    this.addTemplate({
      id: 'clash-detected',
      name: 'Scheduling Clash Detected',
      subject: 'URGENT: Scheduling Conflict Detected',
      body: `URGENT: A scheduling conflict has been detected.

Conflict Details:
- Type: {{clashType}}
- Affected Entities: {{affectedEntities}}
- Time Slot: {{timeSlot}}
- Description: {{description}}

Please review and resolve this conflict immediately.

AI Timetabler System`,
      channel: NotificationChannel.EMAIL,
      variables: ['clashType', 'affectedEntities', 'timeSlot', 'description'],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Timetable generation complete
    this.addTemplate({
      id: 'generation-complete',
      name: 'Timetable Generation Complete',
      subject: 'Timetable Generation Completed',
      body: `Your timetable generation has been completed.

Generation Summary:
- Total Sessions: {{totalSessions}}
- Conflicts Resolved: {{conflictsResolved}}
- Optimization Score: {{optimizationScore}}
- Generation Time: {{generationTime}}

You can now review and publish the timetable.

Best regards,
AI Timetabler System`,
      channel: NotificationChannel.EMAIL,
      variables: ['totalSessions', 'conflictsResolved', 'optimizationScore', 'generationTime'],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // SMS templates
    this.addTemplate({
      id: 'critical-clash-sms',
      name: 'Critical Clash SMS',
      subject: 'Critical Scheduling Conflict',
      body: 'URGENT: Critical scheduling conflict detected for {{courseName}} at {{timeSlot}}. Please check your timetable system immediately.',
      channel: NotificationChannel.SMS,
      variables: ['courseName', 'timeSlot'],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.addTemplate({
      id: 'schedule-change-sms',
      name: 'Schedule Change SMS',
      subject: 'Schedule Update',
      body: 'Schedule update: {{courseName}} moved from {{previousTime}} to {{newTime}} at {{venueName}}.',
      channel: NotificationChannel.SMS,
      variables: ['courseName', 'previousTime', 'newTime', 'venueName'],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  addTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  getTemplate(templateId: string): NotificationTemplate | undefined {
    return this.templates.get(templateId);
  }

  getAllTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByChannel(channel: NotificationChannel): NotificationTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.channel === channel);
  }

  processTemplate(templateId: string, variables: Record<string, any>): { subject: string; body: string } | null {
    const template = this.getTemplate(templateId);
    if (!template) {
      return null;
    }

    const processedSubject = this.replaceVariables(template.subject, variables);
    const processedBody = this.replaceVariables(template.body, variables);

    return {
      subject: processedSubject,
      body: processedBody
    };
  }

  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key];
      return value !== undefined ? String(value) : match;
    });
  }

  validateTemplate(template: NotificationTemplate): string[] {
    const errors: string[] = [];

    if (!template.id || template.id.trim() === '') {
      errors.push('Template ID is required');
    }

    if (!template.name || template.name.trim() === '') {
      errors.push('Template name is required');
    }

    if (!template.subject || template.subject.trim() === '') {
      errors.push('Template subject is required');
    }

    if (!template.body || template.body.trim() === '') {
      errors.push('Template body is required');
    }

    if (!Object.values(NotificationChannel).includes(template.channel)) {
      errors.push('Invalid notification channel');
    }

    // Validate that all variables in template are declared
    const subjectVars = this.extractVariables(template.subject);
    const bodyVars = this.extractVariables(template.body);
    const allVars = [...new Set([...subjectVars, ...bodyVars])];
    
    const undeclaredVars = allVars.filter(v => !template.variables.includes(v));
    if (undeclaredVars.length > 0) {
      errors.push(`Undeclared variables: ${undeclaredVars.join(', ')}`);
    }

    return errors;
  }

  private extractVariables(text: string): string[] {
    const matches = text.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    
    return matches.map(match => match.replace(/\{\{|\}\}/g, ''));
  }

  updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): boolean {
    const template = this.templates.get(templateId);
    if (!template) {
      return false;
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    const errors = this.validateTemplate(updatedTemplate);
    if (errors.length > 0) {
      throw new Error(`Template validation failed: ${errors.join(', ')}`);
    }

    this.templates.set(templateId, updatedTemplate);
    return true;
  }

  deleteTemplate(templateId: string): boolean {
    return this.templates.delete(templateId);
  }
}