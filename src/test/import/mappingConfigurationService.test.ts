import { MappingConfigurationService, CreateMappingConfigRequest, UpdateMappingConfigRequest } from '../../services/import/mappingConfigurationService';
import { ColumnMapping, TransformationType } from '../../types/import';

describe('MappingConfigurationService', () => {
  let service: MappingConfigurationService;

  beforeEach(() => {
    service = new MappingConfigurationService();
  });

  describe('create', () => {
    it('should create a valid mapping configuration', async () => {
      const request: CreateMappingConfigRequest = {
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

      const config = await service.create(request);

      expect(config.id).toBeDefined();
      expect(config.name).toBe(request.name);
      expect(config.fileType).toBe(request.fileType);
      expect(config.mappings).toEqual(request.mappings);
      expect(config.createdAt).toBeInstanceOf(Date);
      expect(config.lastUsed).toBeInstanceOf(Date);
    });

    it('should reject invalid mapping configuration', async () => {
      const request: CreateMappingConfigRequest = {
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

      await expect(service.create(request)).rejects.toThrow('Invalid mapping configuration');
    });

    it('should reject duplicate source columns', async () => {
      const request: CreateMappingConfigRequest = {
        name: 'Duplicate Columns',
        fileType: 'csv',
        mappings: [
          {
            sourceColumn: 'Name',
            targetField: 'name',
            entityType: 'venue',
            required: true,
            transformation: TransformationType.TRIM
          },
          {
            sourceColumn: 'Name',
            targetField: 'name',
            entityType: 'lecturer',
            required: true,
            transformation: TransformationType.TRIM
          }
        ]
      };

      await expect(service.create(request)).rejects.toThrow('Duplicate source columns');
    });
  });

  describe('getById', () => {
    it('should retrieve existing configuration', async () => {
      const request: CreateMappingConfigRequest = {
        name: 'Test Config',
        fileType: 'excel',
        mappings: [
          {
            sourceColumn: 'Lecturer Name',
            targetField: 'name',
            entityType: 'lecturer',
            required: true,
            transformation: TransformationType.TRIM
          }
        ]
      };

      const created = await service.create(request);
      const retrieved = await service.getById(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should return null for non-existent configuration', async () => {
      const result = await service.getById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all configurations sorted by lastUsed', async () => {
      const config1 = await service.create({
        name: 'Config 1',
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
      });

      const config2 = await service.create({
        name: 'Config 2',
        fileType: 'excel',
        mappings: [
          {
            sourceColumn: 'Lecturer',
            targetField: 'name',
            entityType: 'lecturer',
            required: true,
            transformation: TransformationType.TRIM
          }
        ]
      });

      // Mark config1 as used more recently
      await service.markAsUsed(config1.id);

      const all = await service.getAll();
      expect(all).toHaveLength(2);
      expect(all[0]?.id).toBe(config1.id); // Most recently used first
      expect(all[1]?.id).toBe(config2.id);
    });
  });

  describe('getByFileType', () => {
    it('should filter configurations by file type', async () => {
      await service.create({
        name: 'CSV Config',
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
      });

      await service.create({
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

      const csvConfigs = await service.getByFileType('csv');
      const excelConfigs = await service.getByFileType('excel');

      expect(csvConfigs).toHaveLength(1);
      expect(csvConfigs[0]?.fileType).toBe('csv');
      expect(excelConfigs).toHaveLength(1);
      expect(excelConfigs[0]?.fileType).toBe('excel');
    });
  });

  describe('update', () => {
    it('should update existing configuration', async () => {
      const created = await service.create({
        name: 'Original Name',
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
      });

      const updateRequest: UpdateMappingConfigRequest = {
        id: created.id,
        name: 'Updated Name',
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

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updated = await service.update(updateRequest);

      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe('Updated Name');
      expect(updated.mappings).toHaveLength(2);
      expect(updated.lastUsed.getTime()).toBeGreaterThan(created.lastUsed.getTime());
    });

    it('should reject update with invalid mappings', async () => {
      const created = await service.create({
        name: 'Valid Config',
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
      });

      const updateRequest: UpdateMappingConfigRequest = {
        id: created.id,
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

      await expect(service.update(updateRequest)).rejects.toThrow('Invalid mapping configuration');
    });

    it('should throw error for non-existent configuration', async () => {
      const updateRequest: UpdateMappingConfigRequest = {
        id: 'non-existent-id',
        name: 'Updated Name'
      };

      await expect(service.update(updateRequest)).rejects.toThrow('Mapping configuration not found');
    });
  });

  describe('delete', () => {
    it('should delete existing configuration', async () => {
      const created = await service.create({
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
      });

      const deleted = await service.delete(created.id);
      expect(deleted).toBe(true);

      const retrieved = await service.getById(created.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent configuration', async () => {
      const deleted = await service.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('validateMappingConfiguration', () => {
    it('should validate complete venue mapping', () => {
      const mappings: ColumnMapping[] = [
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

      const result = service.validateMappingConfiguration(mappings);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.requiredFieldsCovered['venue']).toContain('name');
      expect(result.missingRequiredFields['venue']).toHaveLength(0);
    });

    it('should identify missing required fields', () => {
      const mappings: ColumnMapping[] = [
        {
          sourceColumn: 'Course Title',
          targetField: 'name',
          entityType: 'course',
          required: true,
          transformation: TransformationType.TRIM
        }
        // Missing required 'code' field for course
      ];

      const result = service.validateMappingConfiguration(mappings);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required fields for course: code');
      expect(result.missingRequiredFields['course']).toContain('code');
    });

    it('should identify duplicate field mappings', () => {
      const mappings: ColumnMapping[] = [
        {
          sourceColumn: 'Name1',
          targetField: 'name',
          entityType: 'venue',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Name2',
          targetField: 'name',
          entityType: 'venue',
          required: true,
          transformation: TransformationType.TRIM
        }
      ];

      const result = service.validateMappingConfiguration(mappings);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate field mappings for venue: name');
    });

    it('should identify duplicate source columns', () => {
      const mappings: ColumnMapping[] = [
        {
          sourceColumn: 'Name',
          targetField: 'name',
          entityType: 'venue',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Name',
          targetField: 'name',
          entityType: 'lecturer',
          required: true,
          transformation: TransformationType.TRIM
        }
      ];

      const result = service.validateMappingConfiguration(mappings);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate source columns: Name');
    });

    it('should generate warnings for missing optional fields', () => {
      const mappings: ColumnMapping[] = [
        {
          sourceColumn: 'Room Name',
          targetField: 'name',
          entityType: 'venue',
          required: true,
          transformation: TransformationType.TRIM
        }
        // Missing optional but important 'capacity' field
      ];

      const result = service.validateMappingConfiguration(mappings);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Consider mapping these important venue fields: capacity, location');
    });

    it('should validate complete schedule mapping', () => {
      const mappings: ColumnMapping[] = [
        {
          sourceColumn: 'Course',
          targetField: 'course',
          entityType: 'schedule',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Lecturer',
          targetField: 'lecturer',
          entityType: 'schedule',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Room',
          targetField: 'venue',
          entityType: 'schedule',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Start Time',
          targetField: 'startTime',
          entityType: 'schedule',
          required: true,
          transformation: TransformationType.DATE_PARSE
        },
        {
          sourceColumn: 'End Time',
          targetField: 'endTime',
          entityType: 'schedule',
          required: true,
          transformation: TransformationType.DATE_PARSE
        },
        {
          sourceColumn: 'Day',
          targetField: 'dayOfWeek',
          entityType: 'schedule',
          required: true,
          transformation: TransformationType.TRIM
        }
      ];

      const result = service.validateMappingConfiguration(mappings);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.requiredFieldsCovered['schedule']).toHaveLength(6);
      expect(result.missingRequiredFields['schedule']).toHaveLength(0);
    });
  });

  describe('findSimilarConfigurations', () => {
    it('should find similar configurations', async () => {
      // Create a base configuration
      const baseConfig = await service.create({
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

      // Create a similar configuration
      await service.create({
        name: 'Similar Venue Config',
        fileType: 'csv',
        mappings: [
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
        ]
      });

      // Create a different configuration
      await service.create({
        name: 'Lecturer Config',
        fileType: 'csv',
        mappings: [
          {
            sourceColumn: 'Lecturer Name',
            targetField: 'name',
            entityType: 'lecturer',
            required: true,
            transformation: TransformationType.TRIM
          }
        ]
      });

      const similar = await service.findSimilarConfigurations(baseConfig.mappings);

      expect(similar.length).toBeGreaterThan(0);
      expect(similar.some(config => config.name === 'Similar Venue Config')).toBe(true);
    });
  });

  describe('createTemplate', () => {
    it('should create template from existing configuration', async () => {
      const original = await service.create({
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
      });

      const template = await service.createTemplate(original.id, 'Venue Template');

      expect(template.name).toBe('Venue Template');
      expect(template.fileType).toBe(original.fileType);
      expect(template.mappings).toHaveLength(1);
      expect(template.mappings[0]?.sourceColumn).toBe(''); // Should be cleared for template
      expect(template.mappings[0]?.targetField).toBe('name');
    });

    it('should throw error for non-existent configuration', async () => {
      await expect(service.createTemplate('non-existent-id', 'Template')).rejects.toThrow('Configuration not found');
    });
  });

  describe('applyTemplate', () => {
    it('should apply template to source columns', async () => {
      const template = await service.create({
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
      });

      const sourceColumns = ['Room Name', 'Room Capacity', 'Location'];
      const appliedMappings = await service.applyTemplate(template.id, sourceColumns);

      expect(appliedMappings).toHaveLength(2);
      expect(appliedMappings.find(m => m.targetField === 'name')?.sourceColumn).toBe('Room Name');
      expect(appliedMappings.find(m => m.targetField === 'capacity')?.sourceColumn).toBe('Room Capacity');
    });

    it('should throw error for non-existent template', async () => {
      await expect(service.applyTemplate('non-existent-id', ['Column1'])).rejects.toThrow('Template not found');
    });
  });

  describe('markAsUsed', () => {
    it('should update lastUsed timestamp', async () => {
      const config = await service.create({
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
      });

      const originalLastUsed = config.lastUsed;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await service.markAsUsed(config.id);
      
      const updated = await service.getById(config.id);
      expect(updated?.lastUsed.getTime()).toBeGreaterThan(originalLastUsed.getTime());
    });
  });
});