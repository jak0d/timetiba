import request from 'supertest';
import express from 'express';
import mappingConfigurationRoutes from '../../routes/mappingConfigurationRoutes';
import { TransformationType } from '../../types/import';

const app = express();
app.use(express.json());
app.use('/api/mapping-configs', mappingConfigurationRoutes);

describe('MappingConfigurationController Integration Tests', () => {
  describe('POST /api/mapping-configs', () => {
    it('should create a new mapping configuration', async () => {
      const mappingConfig = {
        name: 'Test Venue Mapping',
        fileType: 'csv',
        mappings: [
          {
            sourceColumn: 'Room Name',
            targetField: 'name',
            entityType: 'venue',
            required: true,
            transformation: TransformationType.TRIM
          },
          {
            sourceColumn: 'Capacity',
            targetField: 'capacity',
            entityType: 'venue',
            required: false,
            transformation: TransformationType.NUMBER_PARSE
          }
        ]
      };

      const response = await request(app)
        .post('/api/mapping-configs')
        .send(mappingConfig)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(mappingConfig.name);
      expect(response.body.fileType).toBe(mappingConfig.fileType);
      expect(response.body.mappings).toEqual(mappingConfig.mappings);
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.lastUsed).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const invalidConfig = {
        name: 'Invalid Config'
        // Missing fileType and mappings
      };

      const response = await request(app)
        .post('/api/mapping-configs')
        .send(invalidConfig)
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid file type', async () => {
      const invalidConfig = {
        name: 'Invalid Config',
        fileType: 'invalid',
        mappings: []
      };

      const response = await request(app)
        .post('/api/mapping-configs')
        .send(invalidConfig)
        .expect(400);

      expect(response.body.error).toContain('Invalid fileType');
    });

    it('should return 400 for invalid mapping configuration', async () => {
      const invalidConfig = {
        name: 'Invalid Mapping',
        fileType: 'csv',
        mappings: [
          {
            sourceColumn: 'Capacity',
            targetField: 'capacity',
            entityType: 'venue',
            required: false,
            transformation: TransformationType.NUMBER_PARSE
          }
          // Missing required 'name' field for venue
        ]
      };

      const response = await request(app)
        .post('/api/mapping-configs')
        .send(invalidConfig)
        .expect(400);

      expect(response.body.error).toContain('Invalid mapping configuration');
    });
  });

  describe('GET /api/mapping-configs', () => {
    beforeEach(async () => {
      const mappingConfig = {
        name: 'Test Config',
        fileType: 'csv',
        mappings: [
          {
            sourceColumn: 'Name',
            targetField: 'name',
            entityType: 'venue',
            required: true,
            transformation: TransformationType.TRIM
          }
        ]
      };

      await request(app)
        .post('/api/mapping-configs')
        .send(mappingConfig);
    });

    it('should get all mapping configurations', async () => {
      const response = await request(app)
        .get('/api/mapping-configs')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].id).toBeDefined();
    });

    it('should filter by file type', async () => {
      // Create an Excel config
      await request(app)
        .post('/api/mapping-configs')
        .send({
          name: 'Excel Config',
          fileType: 'excel',
          mappings: [
            {
              sourceColumn: 'Name',
              targetField: 'name',
              entityType: 'venue',
              required: true,
              transformation: TransformationType.TRIM
            }
          ]
        });

      const csvResponse = await request(app)
        .get('/api/mapping-configs?fileType=csv')
        .expect(200);

      const excelResponse = await request(app)
        .get('/api/mapping-configs?fileType=excel')
        .expect(200);

      expect(csvResponse.body.every((config: any) => config.fileType === 'csv')).toBe(true);
      expect(excelResponse.body.every((config: any) => config.fileType === 'excel')).toBe(true);
    });

    it('should return 400 for invalid file type filter', async () => {
      const response = await request(app)
        .get('/api/mapping-configs?fileType=invalid')
        .expect(400);

      expect(response.body.error).toContain('Invalid fileType parameter');
    });
  });

  describe('GET /api/mapping-configs/:id', () => {
    let configId: string;

    beforeEach(async () => {
      const mappingConfig = {
        name: 'Test Config',
        fileType: 'csv',
        mappings: [
          {
            sourceColumn: 'Name',
            targetField: 'name',
            entityType: 'venue',
            required: true,
            transformation: TransformationType.TRIM
          }
        ]
      };

      const response = await request(app)
        .post('/api/mapping-configs')
        .send(mappingConfig);
      
      configId = response.body.id;
    });

    it('should get mapping configuration by ID', async () => {
      const response = await request(app)
        .get(`/api/mapping-configs/${configId}`)
        .expect(200);

      expect(response.body.id).toBe(configId);
      expect(response.body.name).toBe('Test Config');
    });

    it('should return 404 for non-existent configuration', async () => {
      const response = await request(app)
        .get('/api/mapping-configs/non-existent-id')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /api/mapping-configs/:id', () => {
    let configId: string;

    beforeEach(async () => {
      const mappingConfig = {
        name: 'Original Config',
        fileType: 'csv',
        mappings: [
          {
            sourceColumn: 'Name',
            targetField: 'name',
            entityType: 'venue',
            required: true,
            transformation: TransformationType.TRIM
          }
        ]
      };

      const response = await request(app)
        .post('/api/mapping-configs')
        .send(mappingConfig);
      
      configId = response.body.id;
    });

    it('should update mapping configuration', async () => {
      const updateData = {
        name: 'Updated Config',
        mappings: [
          {
            sourceColumn: 'Room Name',
            targetField: 'name',
            entityType: 'venue',
            required: true,
            transformation: TransformationType.TRIM
          },
          {
            sourceColumn: 'Capacity',
            targetField: 'capacity',
            entityType: 'venue',
            required: false,
            transformation: TransformationType.NUMBER_PARSE
          }
        ]
      };

      const response = await request(app)
        .put(`/api/mapping-configs/${configId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.id).toBe(configId);
      expect(response.body.name).toBe('Updated Config');
      expect(response.body.mappings).toHaveLength(2);
    });

    it('should return 404 for non-existent configuration', async () => {
      const response = await request(app)
        .put('/api/mapping-configs/non-existent-id')
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should return 400 for invalid mappings', async () => {
      const invalidUpdate = {
        mappings: [
          {
            sourceColumn: 'Capacity',
            targetField: 'capacity',
            entityType: 'venue',
            required: false,
            transformation: TransformationType.NUMBER_PARSE
          }
          // Missing required 'name' field
        ]
      };

      const response = await request(app)
        .put(`/api/mapping-configs/${configId}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.error).toContain('Invalid mapping configuration');
    });
  });

  describe('DELETE /api/mapping-configs/:id', () => {
    let configId: string;

    beforeEach(async () => {
      const mappingConfig = {
        name: 'To Delete',
        fileType: 'csv',
        mappings: [
          {
            sourceColumn: 'Name',
            targetField: 'name',
            entityType: 'venue',
            required: true,
            transformation: TransformationType.TRIM
          }
        ]
      };

      const response = await request(app)
        .post('/api/mapping-configs')
        .send(mappingConfig);
      
      configId = response.body.id;
    });

    it('should delete mapping configuration', async () => {
      await request(app)
        .delete(`/api/mapping-configs/${configId}`)
        .expect(204);

      // Verify it's deleted
      await request(app)
        .get(`/api/mapping-configs/${configId}`)
        .expect(404);
    });

    it('should return 404 for non-existent configuration', async () => {
      const response = await request(app)
        .delete('/api/mapping-configs/non-existent-id')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/mapping-configs/validate', () => {
    it('should validate mapping configuration', async () => {
      const mappings = [
        {
          sourceColumn: 'Room Name',
          targetField: 'name',
          entityType: 'venue',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Capacity',
          targetField: 'capacity',
          entityType: 'venue',
          required: false,
          transformation: TransformationType.NUMBER_PARSE
        }
      ];

      const response = await request(app)
        .post('/api/mapping-configs/validate')
        .send({ mappings })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.errors).toHaveLength(0);
      expect(response.body.requiredFieldsCovered).toBeDefined();
      expect(response.body.missingRequiredFields).toBeDefined();
    });

    it('should return validation errors for invalid mappings', async () => {
      const mappings = [
        {
          sourceColumn: 'Capacity',
          targetField: 'capacity',
          entityType: 'venue',
          required: false,
          transformation: TransformationType.NUMBER_PARSE
        }
        // Missing required 'name' field
      ];

      const response = await request(app)
        .post('/api/mapping-configs/validate')
        .send({ mappings })
        .expect(200);

      expect(response.body.isValid).toBe(false);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should return 400 for missing mappings', async () => {
      const response = await request(app)
        .post('/api/mapping-configs/validate')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('Missing or invalid mappings');
    });
  });

  describe('POST /api/mapping-configs/find-similar', () => {
    beforeEach(async () => {
      // Create a base configuration for similarity testing
      await request(app)
        .post('/api/mapping-configs')
        .send({
          name: 'Base Venue Config',
          fileType: 'csv',
          mappings: [
            {
              sourceColumn: 'Room Name',
              targetField: 'name',
              entityType: 'venue',
              required: true,
              transformation: TransformationType.TRIM
            },
            {
              sourceColumn: 'Capacity',
              targetField: 'capacity',
              entityType: 'venue',
              required: false,
              transformation: TransformationType.NUMBER_PARSE
            }
          ]
        });
    });

    it('should find similar configurations', async () => {
      const mappings = [
        {
          sourceColumn: 'Venue Name',
          targetField: 'name',
          entityType: 'venue',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Size',
          targetField: 'capacity',
          entityType: 'venue',
          required: false,
          transformation: TransformationType.NUMBER_PARSE
        }
      ];

      const response = await request(app)
        .post('/api/mapping-configs/find-similar')
        .send({ mappings })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return 400 for missing mappings', async () => {
      const response = await request(app)
        .post('/api/mapping-configs/find-similar')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('Missing or invalid mappings');
    });
  });

  describe('POST /api/mapping-configs/:id/template', () => {
    let configId: string;

    beforeEach(async () => {
      const mappingConfig = {
        name: 'Original Config',
        fileType: 'csv',
        mappings: [
          {
            sourceColumn: 'Room Name',
            targetField: 'name',
            entityType: 'venue',
            required: true,
            transformation: TransformationType.TRIM
          }
        ]
      };

      const response = await request(app)
        .post('/api/mapping-configs')
        .send(mappingConfig);
      
      configId = response.body.id;
    });

    it('should create template from configuration', async () => {
      const response = await request(app)
        .post(`/api/mapping-configs/${configId}/template`)
        .send({ templateName: 'Venue Template' })
        .expect(201);

      expect(response.body.name).toBe('Venue Template');
      expect(response.body.mappings[0].sourceColumn).toBe('');
      expect(response.body.mappings[0].targetField).toBe('name');
    });

    it('should return 400 for missing template name', async () => {
      const response = await request(app)
        .post(`/api/mapping-configs/${configId}/template`)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('Missing templateName');
    });

    it('should return 404 for non-existent configuration', async () => {
      const response = await request(app)
        .post('/api/mapping-configs/non-existent-id/template')
        .send({ templateName: 'Template' })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/mapping-configs/:id/apply', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = {
        name: 'Venue Template',
        fileType: 'csv',
        mappings: [
          {
            sourceColumn: '',
            targetField: 'name',
            entityType: 'venue',
            required: true,
            transformation: TransformationType.TRIM
          },
          {
            sourceColumn: '',
            targetField: 'capacity',
            entityType: 'venue',
            required: false,
            transformation: TransformationType.NUMBER_PARSE
          }
        ]
      };

      const response = await request(app)
        .post('/api/mapping-configs')
        .send(template);
      
      templateId = response.body.id;
    });

    it('should apply template to source columns', async () => {
      const sourceColumns = ['Room Name', 'Room Capacity', 'Location'];

      const response = await request(app)
        .post(`/api/mapping-configs/${templateId}/apply`)
        .send({ sourceColumns })
        .expect(200);

      expect(response.body.mappings).toHaveLength(2);
      expect(response.body.mappings.find((m: any) => m.targetField === 'name')?.sourceColumn).toBe('Room Name');
      expect(response.body.mappings.find((m: any) => m.targetField === 'capacity')?.sourceColumn).toBe('Room Capacity');
    });

    it('should return 400 for missing source columns', async () => {
      const response = await request(app)
        .post(`/api/mapping-configs/${templateId}/apply`)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('Missing or invalid sourceColumns');
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .post('/api/mapping-configs/non-existent-id/apply')
        .send({ sourceColumns: ['Column1'] })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('PATCH /api/mapping-configs/:id/mark-used', () => {
    let configId: string;

    beforeEach(async () => {
      const mappingConfig = {
        name: 'Test Config',
        fileType: 'csv',
        mappings: [
          {
            sourceColumn: 'Name',
            targetField: 'name',
            entityType: 'venue',
            required: true,
            transformation: TransformationType.TRIM
          }
        ]
      };

      const response = await request(app)
        .post('/api/mapping-configs')
        .send(mappingConfig);
      
      configId = response.body.id;
    });

    it('should mark configuration as used', async () => {
      await request(app)
        .patch(`/api/mapping-configs/${configId}/mark-used`)
        .expect(204);

      // Verify the lastUsed timestamp was updated by checking it appears first in the list
      const response = await request(app)
        .get('/api/mapping-configs')
        .expect(200);

      expect(response.body[0].id).toBe(configId);
    });
  });
});