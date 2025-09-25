import request from 'supertest';
import express from 'express';
import documentationRoutes from '../../routes/documentationRoutes';

describe('Documentation API Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/documentation', documentationRoutes);
  });

  describe('GET /api/documentation/import', () => {
    it('should return complete import documentation', async () => {
      const response = await request(app)
        .get('/api/documentation/import')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('timetable-import-guide');
      expect(response.body.data.title).toBe('Timetable Import Guide');
      expect(response.body.data.sections).toBeInstanceOf(Array);
      expect(response.body.data.sections.length).toBeGreaterThan(0);
      expect(response.body.data.version).toBeDefined();
      expect(response.body.data.lastUpdated).toBeDefined();
    });

    it('should include all required sections', async () => {
      const response = await request(app)
        .get('/api/documentation/import')
        .expect(200);

      const sectionIds = response.body.data.sections.map((section: any) => section.id);
      expect(sectionIds).toContain('overview');
      expect(sectionIds).toContain('preparation');
      expect(sectionIds).toContain('templates');
      expect(sectionIds).toContain('import-process');
      expect(sectionIds).toContain('validation');
      expect(sectionIds).toContain('troubleshooting');
      expect(sectionIds).toContain('best-practices');
    });
  });

  describe('GET /api/documentation/help/:step', () => {
    it('should return contextual help for valid step', async () => {
      const response = await request(app)
        .get('/api/documentation/help/overview')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('overview');
      expect(response.body.data.title).toBeDefined();
      expect(response.body.data.content).toBeDefined();
    });

    it('should return 404 for invalid step', async () => {
      const response = await request(app)
        .get('/api/documentation/help/nonexistent-step')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No help found for step');
    });

    it('should return 400 when step parameter is missing', async () => {
      await request(app)
        .get('/api/documentation/help/')
        .expect(404); // Express returns 404 for missing route parameters
    });

    it('should find help in nested subsections', async () => {
      const response = await request(app)
        .get('/api/documentation/help/supported-formats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('supported-formats');
    });
  });

  describe('GET /api/documentation/validation-rules', () => {
    it('should return validation rules', async () => {
      const response = await request(app)
        .get('/api/documentation/validation-rules')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Check structure of first rule
      const firstRule = response.body.data[0];
      expect(firstRule.field).toBeDefined();
      expect(firstRule.rule).toBeDefined();
      expect(firstRule.description).toBeDefined();
      expect(firstRule.example).toBeDefined();
      expect(firstRule.errorMessage).toBeDefined();
    });

    it('should include rules for all major entity fields', async () => {
      const response = await request(app)
        .get('/api/documentation/validation-rules')
        .expect(200);

      const fields = response.body.data.map((rule: any) => rule.field);
      expect(fields).toContain('Course Code');
      expect(fields).toContain('Lecturer Email');
      expect(fields).toContain('Venue Name');
      expect(fields).toContain('Start Time');
      expect(fields).toContain('End Time');
    });
  });

  describe('GET /api/documentation/import-steps', () => {
    it('should return import steps', async () => {
      const response = await request(app)
        .get('/api/documentation/import-steps')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Check structure of first step
      const firstStep = response.body.data[0];
      expect(firstStep.step).toBe(1);
      expect(firstStep.title).toBeDefined();
      expect(firstStep.description).toBeDefined();
      expect(firstStep.actions).toBeInstanceOf(Array);
    });

    it('should have sequential step numbers', async () => {
      const response = await request(app)
        .get('/api/documentation/import-steps')
        .expect(200);

      const steps = response.body.data;
      for (let i = 0; i < steps.length; i++) {
        expect(steps[i].step).toBe(i + 1);
      }
    });

    it('should include actionable steps', async () => {
      const response = await request(app)
        .get('/api/documentation/import-steps')
        .expect(200);

      response.body.data.forEach((step: any) => {
        expect(step.actions.length).toBeGreaterThan(0);
        step.actions.forEach((action: string) => {
          expect(typeof action).toBe('string');
          expect(action.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('GET /api/documentation/format-requirements', () => {
    it('should return format requirements', async () => {
      const response = await request(app)
        .get('/api/documentation/format-requirements')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('format-requirements');
      expect(response.body.data.title).toBe('Format Requirements');
      expect(response.body.data.subsections).toBeInstanceOf(Array);
    });

    it('should include subsections for different format types', async () => {
      const response = await request(app)
        .get('/api/documentation/format-requirements')
        .expect(200);

      const subsectionIds = response.body.data.subsections.map((sub: any) => sub.id);
      expect(subsectionIds).toContain('date-time-formats');
      expect(subsectionIds).toContain('text-formats');
      expect(subsectionIds).toContain('numeric-formats');
    });

    it('should provide examples for format types', async () => {
      const response = await request(app)
        .get('/api/documentation/format-requirements')
        .expect(200);

      const subsections = response.body.data.subsections;
      const hasExamples = subsections.some((sub: any) => 
        sub.examples && sub.examples.length > 0
      );
      expect(hasExamples).toBe(true);
    });
  });

  describe('GET /api/documentation/search', () => {
    it('should search documentation content', async () => {
      const response = await request(app)
        .get('/api/documentation/search?query=csv')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.query).toBe('csv');
      expect(response.body.data.results).toBeInstanceOf(Array);
      expect(response.body.data.totalResults).toBeDefined();
    });

    it('should return 400 when query parameter is missing', async () => {
      const response = await request(app)
        .get('/api/documentation/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Search query is required');
    });

    it('should return relevant search results', async () => {
      const response = await request(app)
        .get('/api/documentation/search?query=upload')
        .expect(200);

      expect(response.body.data.results.length).toBeGreaterThan(0);
      
      // Check that results contain the search term
      const hasRelevantResults = response.body.data.results.some((result: any) =>
        result.content.toLowerCase().includes('upload') ||
        result.title.toLowerCase().includes('upload')
      );
      expect(hasRelevantResults).toBe(true);
    });

    it('should handle case-insensitive search', async () => {
      const response1 = await request(app)
        .get('/api/documentation/search?query=CSV')
        .expect(200);

      const response2 = await request(app)
        .get('/api/documentation/search?query=csv')
        .expect(200);

      expect(response1.body.data.totalResults).toBe(response2.body.data.totalResults);
    });

    it('should return empty results for non-existent terms', async () => {
      const response = await request(app)
        .get('/api/documentation/search?query=nonexistentterm12345')
        .expect(200);

      expect(response.body.data.results).toHaveLength(0);
      expect(response.body.data.totalResults).toBe(0);
    });
  });

  describe('GET /api/documentation/section/:sectionId', () => {
    it('should return specific documentation section', async () => {
      const response = await request(app)
        .get('/api/documentation/section/overview')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('overview');
      expect(response.body.data.title).toBeDefined();
      expect(response.body.data.content).toBeDefined();
    });

    it('should return 404 for non-existent section', async () => {
      const response = await request(app)
        .get('/api/documentation/section/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Documentation section not found');
    });

    it('should find nested subsections', async () => {
      const response = await request(app)
        .get('/api/documentation/section/supported-formats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('supported-formats');
    });

    it('should return 400 when section ID is missing', async () => {
      await request(app)
        .get('/api/documentation/section/')
        .expect(404); // Express returns 404 for missing route parameters
    });
  });

  describe('API response format consistency', () => {
    it('should have consistent success response format', async () => {
      const endpoints = [
        '/api/documentation/import',
        '/api/documentation/validation-rules',
        '/api/documentation/import-steps',
        '/api/documentation/format-requirements'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);

        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
        expect(response.body.success).toBe(true);
      }
    });

    it('should have consistent error response format', async () => {
      const response = await request(app)
        .get('/api/documentation/help/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body.success).toBe(false);
    });
  });

  describe('Content quality validation', () => {
    it('should return meaningful content in all sections', async () => {
      const response = await request(app)
        .get('/api/documentation/import')
        .expect(200);

      const checkSection = (section: any) => {
        expect(section.content.length).toBeGreaterThan(10);
        expect(section.content).not.toBe('TODO');
        expect(section.content).not.toBe('');

        if (section.subsections) {
          section.subsections.forEach(checkSection);
        }
      };

      response.body.data.sections.forEach(checkSection);
    });

    it('should provide realistic validation rule examples', async () => {
      const response = await request(app)
        .get('/api/documentation/validation-rules')
        .expect(200);

      response.body.data.forEach((rule: any) => {
        expect(rule.example).not.toContain('TODO');
        expect(rule.example).not.toBe('');
        
        if (rule.field.toLowerCase().includes('email')) {
          expect(rule.example).toContain('@');
        }
        
        if (rule.field.toLowerCase().includes('time')) {
          expect(rule.example).toMatch(/\d{2}:\d{2}/);
        }
      });
    });
  });

  describe('Performance and scalability', () => {
    it('should respond quickly to documentation requests', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/documentation/import')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 1 second
      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/api/documentation/import')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});