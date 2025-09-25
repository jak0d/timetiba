import { DocumentationService } from '../../services/import/documentationService';

describe('DocumentationService', () => {
  let service: DocumentationService;

  beforeEach(() => {
    service = new DocumentationService();
  });

  describe('getImportDocumentation', () => {
    it('should return complete documentation structure', () => {
      const documentation = service.getImportDocumentation();

      expect(documentation).toBeDefined();
      expect(documentation.id).toBe('timetable-import-guide');
      expect(documentation.title).toBe('Timetable Import Guide');
      expect(documentation.description).toContain('Complete guide for importing timetable data');
      expect(documentation.version).toBe('1.0.0');
      expect(documentation.lastUpdated).toBeInstanceOf(Date);
      expect(documentation.sections).toBeInstanceOf(Array);
      expect(documentation.sections.length).toBeGreaterThan(0);
    });

    it('should include all required sections', () => {
      const documentation = service.getImportDocumentation();
      const sectionIds = documentation.sections.map(section => section.id);

      expect(sectionIds).toContain('overview');
      expect(sectionIds).toContain('preparation');
      expect(sectionIds).toContain('templates');
      expect(sectionIds).toContain('import-process');
      expect(sectionIds).toContain('validation');
      expect(sectionIds).toContain('troubleshooting');
      expect(sectionIds).toContain('best-practices');
    });

    it('should have properly structured sections', () => {
      const documentation = service.getImportDocumentation();
      
      documentation.sections.forEach(section => {
        expect(section.id).toBeDefined();
        expect(section.title).toBeDefined();
        expect(section.content).toBeDefined();
        expect(typeof section.id).toBe('string');
        expect(typeof section.title).toBe('string');
        expect(typeof section.content).toBe('string');
      });
    });
  });

  describe('getContextualHelp', () => {
    it('should return help for valid step IDs', () => {
      const help = service.getContextualHelp('overview');
      
      expect(help).toBeDefined();
      expect(help?.id).toBe('overview');
      expect(help?.title).toBeDefined();
      expect(help?.content).toBeDefined();
    });

    it('should return null for invalid step IDs', () => {
      const help = service.getContextualHelp('nonexistent-step');
      
      expect(help).toBeNull();
    });

    it('should find help in nested subsections', () => {
      const help = service.getContextualHelp('supported-formats');
      
      expect(help).toBeDefined();
      expect(help?.id).toBe('supported-formats');
    });

    it('should handle deeply nested sections', () => {
      const help = service.getContextualHelp('complete-timetable');
      
      expect(help).toBeDefined();
      expect(help?.id).toBe('complete-timetable');
    });
  });

  describe('getValidationRules', () => {
    it('should return array of validation rules', () => {
      const rules = service.getValidationRules();

      expect(rules).toBeInstanceOf(Array);
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should have properly structured validation rules', () => {
      const rules = service.getValidationRules();

      rules.forEach(rule => {
        expect(rule.field).toBeDefined();
        expect(rule.rule).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.example).toBeDefined();
        expect(rule.errorMessage).toBeDefined();
        expect(typeof rule.field).toBe('string');
        expect(typeof rule.rule).toBe('string');
        expect(typeof rule.description).toBe('string');
        expect(typeof rule.example).toBe('string');
        expect(typeof rule.errorMessage).toBe('string');
      });
    });

    it('should include rules for all major entity fields', () => {
      const rules = service.getValidationRules();
      const fields = rules.map(rule => rule.field);

      expect(fields).toContain('Course Code');
      expect(fields).toContain('Course Name');
      expect(fields).toContain('Lecturer Name');
      expect(fields).toContain('Lecturer Email');
      expect(fields).toContain('Venue Name');
      expect(fields).toContain('Student Group');
      expect(fields).toContain('Day of Week');
      expect(fields).toContain('Start Time');
      expect(fields).toContain('End Time');
      expect(fields).toContain('Venue Capacity');
    });

    it('should provide meaningful examples for each rule', () => {
      const rules = service.getValidationRules();

      rules.forEach(rule => {
        expect(rule.example.length).toBeGreaterThan(0);
        expect(rule.example).not.toBe('');
      });
    });
  });

  describe('getImportSteps', () => {
    it('should return array of import steps', () => {
      const steps = service.getImportSteps();

      expect(steps).toBeInstanceOf(Array);
      expect(steps.length).toBeGreaterThan(0);
    });

    it('should have properly structured steps', () => {
      const steps = service.getImportSteps();

      steps.forEach(step => {
        expect(step.step).toBeDefined();
        expect(step.title).toBeDefined();
        expect(step.description).toBeDefined();
        expect(step.actions).toBeDefined();
        expect(typeof step.step).toBe('number');
        expect(typeof step.title).toBe('string');
        expect(typeof step.description).toBe('string');
        expect(step.actions).toBeInstanceOf(Array);
      });
    });

    it('should have sequential step numbers', () => {
      const steps = service.getImportSteps();

      for (let i = 0; i < steps.length; i++) {
        expect(steps[i]!.step).toBe(i + 1);
      }
    });

    it('should include all major import steps', () => {
      const steps = service.getImportSteps();
      const titles = steps.map(step => step.title.toLowerCase());

      expect(titles.some(title => title.includes('prepare'))).toBe(true);
      expect(titles.some(title => title.includes('upload'))).toBe(true);
      expect(titles.some(title => title.includes('map'))).toBe(true);
      expect(titles.some(title => title.includes('review') || title.includes('match'))).toBe(true);
      expect(titles.some(title => title.includes('validate'))).toBe(true);
      expect(titles.some(title => title.includes('import') || title.includes('execute'))).toBe(true);
    });

    it('should provide actionable steps for each phase', () => {
      const steps = service.getImportSteps();

      steps.forEach(step => {
        expect(step.actions.length).toBeGreaterThan(0);
        step.actions.forEach(action => {
          expect(typeof action).toBe('string');
          expect(action.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('getFormatRequirements', () => {
    it('should return format requirements section', () => {
      const requirements = service.getFormatRequirements();

      expect(requirements).toBeDefined();
      expect(requirements.id).toBe('format-requirements');
      expect(requirements.title).toBe('Format Requirements');
      expect(requirements.content).toBeDefined();
      expect(requirements.subsections).toBeDefined();
      expect(requirements.subsections?.length).toBeGreaterThan(0);
    });

    it('should include subsections for different format types', () => {
      const requirements = service.getFormatRequirements();
      const subsectionIds = requirements.subsections?.map(sub => sub.id) || [];

      expect(subsectionIds).toContain('date-time-formats');
      expect(subsectionIds).toContain('text-formats');
      expect(subsectionIds).toContain('numeric-formats');
    });

    it('should provide examples for each format type', () => {
      const requirements = service.getFormatRequirements();

      requirements.subsections?.forEach(subsection => {
        if (subsection.examples) {
          expect(subsection.examples.length).toBeGreaterThan(0);
          subsection.examples.forEach(example => {
            expect(example.title).toBeDefined();
            expect(example.description).toBeDefined();
            expect(example.code).toBeDefined();
            expect(example.language).toBeDefined();
          });
        }
      });
    });

    it('should include tips and warnings for format requirements', () => {
      const requirements = service.getFormatRequirements();

      requirements.subsections?.forEach(subsection => {
        if (subsection.tips) {
          expect(subsection.tips.length).toBeGreaterThan(0);
        }
        if (subsection.warnings) {
          expect(subsection.warnings.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('documentation content quality', () => {
    it('should have meaningful content in all sections', () => {
      const documentation = service.getImportDocumentation();

      const checkSection = (section: any) => {
        expect(section.content.length).toBeGreaterThan(10);
        expect(section.content).not.toBe('TODO');
        expect(section.content).not.toBe('');

        if (section.subsections) {
          section.subsections.forEach(checkSection);
        }
      };

      documentation.sections.forEach(checkSection);
    });

    it('should provide helpful tips where available', () => {
      const documentation = service.getImportDocumentation();

      const checkTips = (section: any) => {
        if (section.tips) {
          section.tips.forEach((tip: string) => {
            expect(tip.length).toBeGreaterThan(5);
            expect(tip).not.toBe('');
          });
        }

        if (section.subsections) {
          section.subsections.forEach(checkTips);
        }
      };

      documentation.sections.forEach(checkTips);
    });

    it('should provide clear warnings where needed', () => {
      const documentation = service.getImportDocumentation();

      const checkWarnings = (section: any) => {
        if (section.warnings) {
          section.warnings.forEach((warning: string) => {
            expect(warning.length).toBeGreaterThan(5);
            expect(warning).not.toBe('');
          });
        }

        if (section.subsections) {
          section.subsections.forEach(checkWarnings);
        }
      };

      documentation.sections.forEach(checkWarnings);
    });
  });

  describe('validation rules completeness', () => {
    it('should cover all critical validation scenarios', () => {
      const rules = service.getValidationRules();
      const ruleDescriptions = rules.map(rule => rule.description.toLowerCase());

      // Check for time validation
      expect(ruleDescriptions.some(desc => desc.includes('time'))).toBe(true);
      
      // Check for email validation
      expect(ruleDescriptions.some(desc => desc.includes('email'))).toBe(true);
      
      // Check for required field validation
      expect(rules.some(rule => rule.rule.toLowerCase().includes('required'))).toBe(true);
      
      // Check for length validation
      expect(rules.some(rule => rule.rule.toLowerCase().includes('max'))).toBe(true);
    });

    it('should provide realistic examples', () => {
      const rules = service.getValidationRules();

      rules.forEach(rule => {
        // Examples should not be placeholder text
        expect(rule.example).not.toContain('TODO');
        expect(rule.example).not.toContain('example');
        expect(rule.example).not.toBe('N/A');
        
        // Examples should be relevant to the field
        if (rule.field.toLowerCase().includes('email')) {
          expect(rule.example).toContain('@');
        }
        
        if (rule.field.toLowerCase().includes('time')) {
          expect(rule.example).toMatch(/\d{2}:\d{2}/);
        }
      });
    });
  });

  describe('import steps completeness', () => {
    it('should cover the complete import workflow', () => {
      const steps = service.getImportSteps();
      const allContent = steps.map(step => 
        `${step.title} ${step.description} ${step.actions.join(' ')}`
      ).join(' ').toLowerCase();

      // Check that all major workflow steps are covered
      expect(allContent).toContain('prepare');
      expect(allContent).toContain('upload');
      expect(allContent).toContain('map');
      expect(allContent).toContain('validate');
      expect(allContent).toContain('import');
      expect(allContent).toContain('review');
    });

    it('should provide troubleshooting information', () => {
      const steps = service.getImportSteps();

      steps.forEach(step => {
        if (step.commonIssues) {
          expect(step.commonIssues.length).toBeGreaterThan(0);
          step.commonIssues.forEach(issue => {
            expect(issue.length).toBeGreaterThan(5);
          });
        }
      });
    });
  });
});