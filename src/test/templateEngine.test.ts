import { TemplateEngine } from '../services/templateEngine';
import { NotificationChannel } from '../types/notification';

describe('TemplateEngine', () => {
  let templateEngine: TemplateEngine;

  beforeEach(() => {
    templateEngine = new TemplateEngine();
  });

  describe('Default Templates', () => {
    it('should initialize with default templates', () => {
      const templates = templateEngine.getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);
      
      const templateIds = templates.map(t => t.id);
      expect(templateIds).toContain('schedule-change');
      expect(templateIds).toContain('clash-detected');
      expect(templateIds).toContain('generation-complete');
      expect(templateIds).toContain('critical-clash-sms');
      expect(templateIds).toContain('schedule-change-sms');
    });

    it('should have valid default templates', () => {
      const templates = templateEngine.getAllTemplates();
      
      for (const template of templates) {
        const errors = templateEngine.validateTemplate(template);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('Template Management', () => {
    it('should add new template', () => {
      const newTemplate = {
        id: 'test-template',
        name: 'Test Template',
        subject: 'Test Subject {{name}}',
        body: 'Hello {{name}}, this is a test.',
        channel: NotificationChannel.EMAIL,
        variables: ['name'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      templateEngine.addTemplate(newTemplate);
      const retrieved = templateEngine.getTemplate('test-template');
      
      expect(retrieved).toEqual(newTemplate);
    });

    it('should get template by ID', () => {
      const template = templateEngine.getTemplate('schedule-change');
      
      expect(template).toBeDefined();
      expect(template?.id).toBe('schedule-change');
      expect(template?.name).toBe('Schedule Change Notification');
    });

    it('should return undefined for non-existent template', () => {
      const template = templateEngine.getTemplate('non-existent');
      expect(template).toBeUndefined();
    });

    it('should get templates by channel', () => {
      const emailTemplates = templateEngine.getTemplatesByChannel(NotificationChannel.EMAIL);
      const smsTemplates = templateEngine.getTemplatesByChannel(NotificationChannel.SMS);
      
      expect(emailTemplates.length).toBeGreaterThan(0);
      expect(smsTemplates.length).toBeGreaterThan(0);
      
      emailTemplates.forEach(template => {
        expect(template.channel).toBe(NotificationChannel.EMAIL);
      });
      
      smsTemplates.forEach(template => {
        expect(template.channel).toBe(NotificationChannel.SMS);
      });
    });
  });

  describe('Template Processing', () => {
    it('should process template with variables', () => {
      const variables = {
        recipientName: 'John Doe',
        courseName: 'Mathematics 101',
        previousTime: '9:00 AM',
        newTime: '10:00 AM',
        venueName: 'Room A101',
        changeReason: 'Venue conflict'
      };

      const result = templateEngine.processTemplate('schedule-change', variables);
      
      expect(result).toBeDefined();
      expect(result?.subject).toBe('Schedule Update: Mathematics 101');
      expect(result?.body).toContain('Dear John Doe,');
      expect(result?.body).toContain('Course: Mathematics 101');
      expect(result?.body).toContain('Previous Time: 9:00 AM');
      expect(result?.body).toContain('New Time: 10:00 AM');
      expect(result?.body).toContain('Venue: Room A101');
      expect(result?.body).toContain('Reason: Venue conflict');
    });

    it('should handle missing variables gracefully', () => {
      const variables = {
        recipientName: 'John Doe',
        courseName: 'Mathematics 101'
        // Missing other variables
      };

      const result = templateEngine.processTemplate('schedule-change', variables);
      
      expect(result).toBeDefined();
      expect(result?.subject).toBe('Schedule Update: Mathematics 101');
      expect(result?.body).toContain('Dear John Doe,');
      expect(result?.body).toContain('{{previousTime}}'); // Unchanged placeholder
      expect(result?.body).toContain('{{newTime}}'); // Unchanged placeholder
    });

    it('should return null for non-existent template', () => {
      const result = templateEngine.processTemplate('non-existent', {});
      expect(result).toBeNull();
    });
  });

  describe('Template Validation', () => {
    it('should validate valid template', () => {
      const validTemplate = {
        id: 'valid-template',
        name: 'Valid Template',
        subject: 'Subject {{var1}}',
        body: 'Body {{var1}} {{var2}}',
        channel: NotificationChannel.EMAIL,
        variables: ['var1', 'var2'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const errors = templateEngine.validateTemplate(validTemplate);
      expect(errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidTemplate = {
        id: '',
        name: '',
        subject: '',
        body: '',
        channel: NotificationChannel.EMAIL,
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const errors = templateEngine.validateTemplate(invalidTemplate);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Template ID is required');
      expect(errors).toContain('Template name is required');
      expect(errors).toContain('Template subject is required');
      expect(errors).toContain('Template body is required');
    });

    it('should detect undeclared variables', () => {
      const templateWithUndeclaredVars = {
        id: 'test-template',
        name: 'Test Template',
        subject: 'Subject {{var1}} {{var2}}',
        body: 'Body {{var1}} {{var3}}',
        channel: NotificationChannel.EMAIL,
        variables: ['var1'], // Missing var2 and var3
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const errors = templateEngine.validateTemplate(templateWithUndeclaredVars);
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('Undeclared variables: var2, var3');
    });

    it('should detect invalid channel', () => {
      const templateWithInvalidChannel = {
        id: 'test-template',
        name: 'Test Template',
        subject: 'Subject',
        body: 'Body',
        channel: 'invalid-channel' as NotificationChannel,
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const errors = templateEngine.validateTemplate(templateWithInvalidChannel);
      expect(errors).toContain('Invalid notification channel');
    });
  });

  describe('Template Updates', () => {
    it('should update existing template', async () => {
      const originalTemplate = templateEngine.getTemplate('schedule-change');
      expect(originalTemplate).toBeDefined();

      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));

      const success = templateEngine.updateTemplate('schedule-change', {
        name: 'Updated Schedule Change'
      });

      expect(success).toBe(true);
      
      const updatedTemplate = templateEngine.getTemplate('schedule-change');
      expect(updatedTemplate?.name).toBe('Updated Schedule Change');
      expect(updatedTemplate?.updatedAt.getTime()).toBeGreaterThanOrEqual(originalTemplate!.updatedAt.getTime());
    });

    it('should fail to update non-existent template', () => {
      const success = templateEngine.updateTemplate('non-existent', {
        name: 'Updated Name'
      });

      expect(success).toBe(false);
    });

    it('should validate updates before applying', () => {
      expect(() => {
        templateEngine.updateTemplate('schedule-change', {
          subject: '{{undeclaredVar}}',
          variables: [] // This will cause validation to fail
        });
      }).toThrow('Template validation failed');
    });
  });

  describe('Template Deletion', () => {
    it('should delete existing template', () => {
      // Add a template first
      const testTemplate = {
        id: 'delete-test',
        name: 'Delete Test',
        subject: 'Test',
        body: 'Test body',
        channel: NotificationChannel.EMAIL,
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      templateEngine.addTemplate(testTemplate);
      expect(templateEngine.getTemplate('delete-test')).toBeDefined();

      const success = templateEngine.deleteTemplate('delete-test');
      expect(success).toBe(true);
      expect(templateEngine.getTemplate('delete-test')).toBeUndefined();
    });

    it('should return false when deleting non-existent template', () => {
      const success = templateEngine.deleteTemplate('non-existent');
      expect(success).toBe(false);
    });
  });
});