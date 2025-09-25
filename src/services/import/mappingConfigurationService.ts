import { MappingConfiguration, ColumnMapping } from '../../types/import';
import { v4 as uuidv4 } from 'uuid';

export interface CreateMappingConfigRequest {
  name: string;
  fileType: 'csv' | 'excel';
  mappings: ColumnMapping[];
}

export interface UpdateMappingConfigRequest {
  id: string;
  name?: string;
  mappings?: ColumnMapping[];
}

export interface MappingValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiredFieldsCovered: Record<string, string[]>;
  missingRequiredFields: Record<string, string[]>;
}

export class MappingConfigurationService {
  private configurations: Map<string, MappingConfiguration> = new Map();

  /**
   * Create a new mapping configuration
   */
  async create(request: CreateMappingConfigRequest): Promise<MappingConfiguration> {
    const validation = this.validateMappingConfiguration(request.mappings);
    
    if (!validation.isValid) {
      throw new Error(`Invalid mapping configuration: ${validation.errors.join(', ')}`);
    }

    const config: MappingConfiguration = {
      id: uuidv4(),
      name: request.name,
      fileType: request.fileType,
      mappings: request.mappings,
      createdAt: new Date(),
      lastUsed: new Date()
    };

    this.configurations.set(config.id, config);
    return config;
  }

  /**
   * Get a mapping configuration by ID
   */
  async getById(id: string): Promise<MappingConfiguration | null> {
    const config = this.configurations.get(id);
    return config || null;
  }

  /**
   * Get all mapping configurations
   */
  async getAll(): Promise<MappingConfiguration[]> {
    return Array.from(this.configurations.values())
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
  }

  /**
   * Get mapping configurations by file type
   */
  async getByFileType(fileType: 'csv' | 'excel'): Promise<MappingConfiguration[]> {
    return Array.from(this.configurations.values())
      .filter(config => config.fileType === fileType)
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
  }

  /**
   * Update a mapping configuration
   */
  async update(request: UpdateMappingConfigRequest): Promise<MappingConfiguration> {
    const existing = this.configurations.get(request.id);
    if (!existing) {
      throw new Error(`Mapping configuration not found: ${request.id}`);
    }

    const updatedMappings = request.mappings || existing.mappings;
    const validation = this.validateMappingConfiguration(updatedMappings);
    
    if (!validation.isValid) {
      throw new Error(`Invalid mapping configuration: ${validation.errors.join(', ')}`);
    }

    const updated: MappingConfiguration = {
      ...existing,
      name: request.name || existing.name,
      mappings: updatedMappings,
      lastUsed: new Date()
    };

    this.configurations.set(request.id, updated);
    return updated;
  }

  /**
   * Delete a mapping configuration
   */
  async delete(id: string): Promise<boolean> {
    return this.configurations.delete(id);
  }

  /**
   * Mark a configuration as used (updates lastUsed timestamp)
   */
  async markAsUsed(id: string): Promise<void> {
    const config = this.configurations.get(id);
    if (config) {
      config.lastUsed = new Date();
      this.configurations.set(id, config);
    }
  }

  /**
   * Validate a mapping configuration
   */
  validateMappingConfiguration(mappings: ColumnMapping[]): MappingValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requiredFieldsCovered: Record<string, string[]> = {};
    const missingRequiredFields: Record<string, string[]> = {};

    // Group mappings by entity type
    const mappingsByEntity = this.groupMappingsByEntity(mappings);

    // Define required fields for each entity type
    const requiredFields = {
      venue: ['name'],
      lecturer: ['name'],
      course: ['name', 'code'],
      studentGroup: ['name'],
      schedule: ['course', 'lecturer', 'venue', 'startTime', 'endTime', 'dayOfWeek']
    };

    // Validate each entity type
    for (const [entityType, entityMappings] of Object.entries(mappingsByEntity)) {
      const mappedFields = entityMappings.map(m => m.targetField);
      const required = requiredFields[entityType as keyof typeof requiredFields] || [];
      
      requiredFieldsCovered[entityType] = mappedFields.filter(field => required.includes(field));
      missingRequiredFields[entityType] = required.filter(field => !mappedFields.includes(field));

      // Check for missing required fields
      if (missingRequiredFields[entityType].length > 0) {
        errors.push(`Missing required fields for ${entityType}: ${missingRequiredFields[entityType].join(', ')}`);
      }

      // Check for duplicate mappings
      const duplicateFields = this.findDuplicateFields(mappedFields);
      if (duplicateFields.length > 0) {
        errors.push(`Duplicate field mappings for ${entityType}: ${duplicateFields.join(', ')}`);
      }

      // Check for empty source columns (skip for templates)
      const emptySourceColumns = entityMappings.filter(m => !m.sourceColumn || m.sourceColumn.trim() === '');
      const hasNonEmptyColumns = entityMappings.some(m => m.sourceColumn && m.sourceColumn.trim() !== '');
      
      // Only error if all columns are empty (indicating it's not a template) and some are empty
      if (emptySourceColumns.length > 0 && hasNonEmptyColumns) {
        errors.push(`Empty source columns found for ${entityType}`);
      }
    }

    // Check for duplicate source columns across all mappings (skip empty columns for templates)
    const allSourceColumns = mappings.map(m => m.sourceColumn).filter(col => col && col.trim() !== '');
    const duplicateSourceColumns = this.findDuplicateFields(allSourceColumns);
    if (duplicateSourceColumns.length > 0) {
      errors.push(`Duplicate source columns: ${duplicateSourceColumns.join(', ')}`);
    }

    // Generate warnings for missing important optional fields
    this.generateOptionalFieldWarnings(mappingsByEntity, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiredFieldsCovered,
      missingRequiredFields
    };
  }

  /**
   * Find similar existing configurations
   */
  async findSimilarConfigurations(mappings: ColumnMapping[]): Promise<MappingConfiguration[]> {
    const allConfigs = await this.getAll();
    const similar: Array<{ config: MappingConfiguration; similarity: number }> = [];

    for (const config of allConfigs) {
      const similarity = this.calculateMappingSimilarity(mappings, config.mappings);
      if (similarity > 0.5) {
        similar.push({ config, similarity });
      }
    }

    return similar
      .sort((a, b) => b.similarity - a.similarity)
      .map(item => item.config);
  }

  /**
   * Create a mapping template from existing configuration
   */
  async createTemplate(configId: string, templateName: string): Promise<MappingConfiguration> {
    const existing = await this.getById(configId);
    if (!existing) {
      throw new Error(`Configuration not found: ${configId}`);
    }

    return this.create({
      name: templateName,
      fileType: existing.fileType,
      mappings: existing.mappings.map(mapping => ({
        ...mapping,
        sourceColumn: '' // Clear source column for template
      }))
    });
  }

  /**
   * Apply a template to new source columns
   */
  async applyTemplate(templateId: string, sourceColumns: string[]): Promise<ColumnMapping[]> {
    const template = await this.getById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const appliedMappings: ColumnMapping[] = [];
    
    // Try to match template fields with source columns
    for (const templateMapping of template.mappings) {
      const matchingColumn = this.findBestColumnMatch(templateMapping.targetField, sourceColumns);
      if (matchingColumn) {
        appliedMappings.push({
          ...templateMapping,
          sourceColumn: matchingColumn
        });
      }
    }

    return appliedMappings;
  }

  /**
   * Group mappings by entity type
   */
  private groupMappingsByEntity(mappings: ColumnMapping[]): Record<string, ColumnMapping[]> {
    const grouped: Record<string, ColumnMapping[]> = {};
    
    for (const mapping of mappings) {
      if (!grouped[mapping.entityType]) {
        grouped[mapping.entityType] = [];
      }
      grouped[mapping.entityType]!.push(mapping);
    }

    return grouped;
  }

  /**
   * Find duplicate fields in an array
   */
  private findDuplicateFields(fields: string[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const field of fields) {
      if (seen.has(field)) {
        duplicates.add(field);
      } else {
        seen.add(field);
      }
    }

    return Array.from(duplicates);
  }

  /**
   * Generate warnings for missing optional but important fields
   */
  private generateOptionalFieldWarnings(
    mappingsByEntity: Record<string, ColumnMapping[]>,
    warnings: string[]
  ): void {
    const importantOptionalFields = {
      venue: ['capacity', 'location'],
      lecturer: ['email', 'department'],
      course: ['credits', 'department'],
      studentGroup: ['size', 'department'],
      schedule: ['duration', 'sessionType']
    };

    for (const [entityType, entityMappings] of Object.entries(mappingsByEntity)) {
      const mappedFields = entityMappings.map(m => m.targetField);
      const important = importantOptionalFields[entityType as keyof typeof importantOptionalFields] || [];
      const missing = important.filter(field => !mappedFields.includes(field));

      if (missing.length > 0) {
        warnings.push(`Consider mapping these important ${entityType} fields: ${missing.join(', ')}`);
      }
    }
  }

  /**
   * Calculate similarity between two mapping configurations
   */
  private calculateMappingSimilarity(mappings1: ColumnMapping[], mappings2: ColumnMapping[]): number {
    const fields1 = new Set(mappings1.map(m => `${m.entityType}.${m.targetField}`));
    const fields2 = new Set(mappings2.map(m => `${m.entityType}.${m.targetField}`));

    const fields1Array = Array.from(fields1);
    const fields2Array = Array.from(fields2);
    const intersection = new Set(fields1Array.filter(field => fields2.has(field)));
    const union = new Set([...fields1Array, ...fields2Array]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Find the best matching column for a target field
   */
  private findBestColumnMatch(targetField: string, sourceColumns: string[]): string | null {
    // Simple matching logic - could be enhanced with fuzzy matching
    const normalizedTarget = targetField.toLowerCase();
    
    // Look for exact matches first
    for (const column of sourceColumns) {
      if (column.toLowerCase().includes(normalizedTarget)) {
        return column;
      }
    }

    // Look for partial matches
    for (const column of sourceColumns) {
      const normalizedColumn = column.toLowerCase().replace(/[^a-z]/g, '');
      if (normalizedColumn.includes(normalizedTarget) || normalizedTarget.includes(normalizedColumn)) {
        return column;
      }
    }

    return null;
  }
}