import { Request, Response } from 'express';
import { MappingConfigurationService, CreateMappingConfigRequest, UpdateMappingConfigRequest } from '../services/import/mappingConfigurationService';
import { ColumnMapping } from '../types/import';

export class MappingConfigurationController {
  private mappingConfigService: MappingConfigurationService;

  constructor() {
    this.mappingConfigService = new MappingConfigurationService();
  }

  /**
   * Create a new mapping configuration
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const request: CreateMappingConfigRequest = req.body;
      
      // Validate request
      if (!request.name || !request.fileType || !request.mappings) {
        res.status(400).json({
          error: 'Missing required fields: name, fileType, mappings'
        });
        return;
      }

      if (!['csv', 'excel'].includes(request.fileType)) {
        res.status(400).json({
          error: 'Invalid fileType. Must be csv or excel'
        });
        return;
      }

      const config = await this.mappingConfigService.create(request);
      res.status(201).json(config);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create mapping configuration'
      });
    }
  }

  /**
   * Get all mapping configurations
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const fileType = req.query['fileType'] as 'csv' | 'excel' | undefined;
      
      let configurations;
      if (fileType) {
        if (!['csv', 'excel'].includes(fileType)) {
          res.status(400).json({
            error: 'Invalid fileType parameter. Must be csv or excel'
          });
          return;
        }
        configurations = await this.mappingConfigService.getByFileType(fileType);
      } else {
        configurations = await this.mappingConfigService.getAll();
      }

      res.json(configurations);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to retrieve mapping configurations'
      });
    }
  }

  /**
   * Get a mapping configuration by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Missing configuration ID' });
        return;
      }
      const config = await this.mappingConfigService.getById(id);
      
      if (!config) {
        res.status(404).json({
          error: 'Mapping configuration not found'
        });
        return;
      }

      res.json(config);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to retrieve mapping configuration'
      });
    }
  }

  /**
   * Update a mapping configuration
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Missing configuration ID' });
        return;
      }
      const request: UpdateMappingConfigRequest = {
        id,
        ...req.body
      };

      const config = await this.mappingConfigService.update(request);
      res.json(config);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: error.message
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to update mapping configuration'
        });
      }
    }
  }

  /**
   * Delete a mapping configuration
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Missing configuration ID' });
        return;
      }
      const deleted = await this.mappingConfigService.delete(id);
      
      if (!deleted) {
        res.status(404).json({
          error: 'Mapping configuration not found'
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete mapping configuration'
      });
    }
  }

  /**
   * Validate a mapping configuration
   */
  async validate(req: Request, res: Response): Promise<void> {
    try {
      const mappings: ColumnMapping[] = req.body.mappings;
      
      if (!mappings || !Array.isArray(mappings)) {
        res.status(400).json({
          error: 'Missing or invalid mappings array'
        });
        return;
      }

      const validation = this.mappingConfigService.validateMappingConfiguration(mappings);
      res.json(validation);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to validate mapping configuration'
      });
    }
  }

  /**
   * Find similar configurations
   */
  async findSimilar(req: Request, res: Response): Promise<void> {
    try {
      const mappings: ColumnMapping[] = req.body.mappings;
      
      if (!mappings || !Array.isArray(mappings)) {
        res.status(400).json({
          error: 'Missing or invalid mappings array'
        });
        return;
      }

      const similar = await this.mappingConfigService.findSimilarConfigurations(mappings);
      res.json(similar);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to find similar configurations'
      });
    }
  }

  /**
   * Create a template from existing configuration
   */
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { templateName } = req.body;
      
      if (!id) {
        res.status(400).json({ error: 'Missing configuration ID' });
        return;
      }
      
      if (!templateName) {
        res.status(400).json({
          error: 'Missing templateName'
        });
        return;
      }

      const template = await this.mappingConfigService.createTemplate(id, templateName);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: error.message
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to create template'
        });
      }
    }
  }

  /**
   * Apply a template to source columns
   */
  async applyTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { sourceColumns } = req.body;
      
      if (!id) {
        res.status(400).json({ error: 'Missing template ID' });
        return;
      }
      
      if (!sourceColumns || !Array.isArray(sourceColumns)) {
        res.status(400).json({
          error: 'Missing or invalid sourceColumns array'
        });
        return;
      }

      const mappings = await this.mappingConfigService.applyTemplate(id, sourceColumns);
      res.json({ mappings });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: error.message
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to apply template'
        });
      }
    }
  }

  /**
   * Mark configuration as used
   */
  async markAsUsed(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Missing configuration ID' });
        return;
      }
      await this.mappingConfigService.markAsUsed(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to mark configuration as used'
      });
    }
  }
}