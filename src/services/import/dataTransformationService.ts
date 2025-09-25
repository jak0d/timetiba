import { ColumnMapping, TransformationType, MappedImportData } from '../../types/import';

export interface TransformationResult {
  success: boolean;
  transformedValue: any;
  error?: string;
  warnings?: string[];
}

export interface FieldMappingResult {
  sourceColumn: string;
  targetField: string;
  entityType: string;
  originalValue: any;
  transformedValue: any;
  success: boolean;
  error?: string;
  warnings?: string[];
}

export interface DataTransformationResult {
  success: boolean;
  mappedData: MappedImportData;
  fieldResults: FieldMappingResult[];
  errors: string[];
  warnings: string[];
  statistics: {
    totalRows: number;
    successfulRows: number;
    failedRows: number;
    transformationCounts: Record<TransformationType, number>;
  };
}

export class DataTransformationService {
  /**
   * Apply field mappings and transformations to raw data
   */
  async transformData(
    rawData: Record<string, any>[],
    mappings: ColumnMapping[],
    options: {
      skipInvalidRows?: boolean;
      useDefaultValues?: boolean;
      validateRequired?: boolean;
    } = {}
  ): Promise<DataTransformationResult> {
    const {
      skipInvalidRows = false,
      useDefaultValues = true,
      validateRequired = true
    } = options;

    const mappedData: MappedImportData = {
      venues: [],
      lecturers: [],
      courses: [],
      studentGroups: [],
      schedules: [],
      metadata: {
        sourceFile: 'unknown',
        mappingConfig: 'unknown',
        importedAt: new Date(),
        importedBy: 'system'
      }
    };

    const fieldResults: FieldMappingResult[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const transformationCounts: Record<TransformationType, number> = {
      [TransformationType.NONE]: 0,
      [TransformationType.UPPERCASE]: 0,
      [TransformationType.LOWERCASE]: 0,
      [TransformationType.TRIM]: 0,
      [TransformationType.DATE_PARSE]: 0,
      [TransformationType.NUMBER_PARSE]: 0,
      [TransformationType.BOOLEAN_PARSE]: 0,
      [TransformationType.SPLIT_ARRAY]: 0
    };

    let successfulRows = 0;
    let failedRows = 0;

    // Group mappings by entity type for easier processing
    const mappingsByEntity = this.groupMappingsByEntity(mappings);

    // Process each row of data
    for (let rowIndex = 0; rowIndex < rawData.length; rowIndex++) {
      const row = rawData[rowIndex];
      let rowHasErrors = false;

      // Process each entity type
      for (const [entityType, entityMappings] of Object.entries(mappingsByEntity)) {
        const entityData: Record<string, any> = {};
        let entityHasErrors = false;

        // Apply mappings for this entity
        for (const mapping of entityMappings) {
          const originalValue = row[mapping.sourceColumn];
          
          // Handle missing values
          if (originalValue === undefined || originalValue === null || originalValue === '') {
            if (mapping.required && validateRequired) {
              const error = `Missing required field '${mapping.targetField}' in row ${rowIndex + 1}`;
              errors.push(error);
              fieldResults.push({
                sourceColumn: mapping.sourceColumn,
                targetField: mapping.targetField,
                entityType: mapping.entityType,
                originalValue,
                transformedValue: null,
                success: false,
                error
              });
              entityHasErrors = true;
              continue;
            }

            // Use default value if available
            if (useDefaultValues && mapping.defaultValue !== undefined) {
              entityData[mapping.targetField] = mapping.defaultValue;
              fieldResults.push({
                sourceColumn: mapping.sourceColumn,
                targetField: mapping.targetField,
                entityType: mapping.entityType,
                originalValue,
                transformedValue: mapping.defaultValue,
                success: true,
                warnings: [`Used default value for '${mapping.targetField}'`]
              });
              continue;
            }

            // Skip optional empty fields
            if (!mapping.required) {
              continue;
            }
          }

          // Apply transformation
          const transformationResult = this.applyTransformation(
            originalValue,
            mapping.transformation || TransformationType.NONE
          );

          transformationCounts[mapping.transformation || TransformationType.NONE]++;

          if (transformationResult.success) {
            entityData[mapping.targetField] = transformationResult.transformedValue;
            fieldResults.push({
              sourceColumn: mapping.sourceColumn,
              targetField: mapping.targetField,
              entityType: mapping.entityType,
              originalValue,
              transformedValue: transformationResult.transformedValue,
              success: true,
              warnings: transformationResult.warnings
            });
          } else {
            const error = `Transformation failed for '${mapping.targetField}' in row ${rowIndex + 1}: ${transformationResult.error}`;
            errors.push(error);
            fieldResults.push({
              sourceColumn: mapping.sourceColumn,
              targetField: mapping.targetField,
              entityType: mapping.entityType,
              originalValue,
              transformedValue: null,
              success: false,
              error: transformationResult.error
            });
            entityHasErrors = true;
          }
        }

        // Add entity data if no errors or if we're not skipping invalid rows
        if (!entityHasErrors || !skipInvalidRows) {
          if (Object.keys(entityData).length > 0) {
            this.addEntityToMappedData(mappedData, entityType, entityData);
          }
        }

        if (entityHasErrors) {
          rowHasErrors = true;
        }
      }

      if (rowHasErrors) {
        failedRows++;
      } else {
        successfulRows++;
      }
    }

    // Collect warnings from field results
    fieldResults.forEach(result => {
      if (result.warnings) {
        warnings.push(...result.warnings);
      }
    });

    return {
      success: errors.length === 0,
      mappedData,
      fieldResults,
      errors,
      warnings,
      statistics: {
        totalRows: rawData.length,
        successfulRows,
        failedRows,
        transformationCounts
      }
    };
  }

  /**
   * Apply a specific transformation to a value
   */
  applyTransformation(value: any, transformation: TransformationType): TransformationResult {
    try {
      switch (transformation) {
        case TransformationType.NONE:
          return { success: true, transformedValue: value };

        case TransformationType.UPPERCASE:
          if (typeof value !== 'string') {
            return {
              success: false,
              transformedValue: null,
              error: 'UPPERCASE transformation requires string input'
            };
          }
          return { success: true, transformedValue: value.toUpperCase() };

        case TransformationType.LOWERCASE:
          if (typeof value !== 'string') {
            return {
              success: false,
              transformedValue: null,
              error: 'LOWERCASE transformation requires string input'
            };
          }
          return { success: true, transformedValue: value.toLowerCase() };

        case TransformationType.TRIM:
          if (typeof value !== 'string') {
            return {
              success: false,
              transformedValue: null,
              error: 'TRIM transformation requires string input'
            };
          }
          return { success: true, transformedValue: value.trim() };

        case TransformationType.DATE_PARSE:
          return this.parseDate(value);

        case TransformationType.NUMBER_PARSE:
          return this.parseNumber(value);

        case TransformationType.BOOLEAN_PARSE:
          return this.parseBoolean(value);

        case TransformationType.SPLIT_ARRAY:
          return this.splitArray(value);

        default:
          return {
            success: false,
            transformedValue: null,
            error: `Unknown transformation type: ${transformation}`
          };
      }
    } catch (error) {
      return {
        success: false,
        transformedValue: null,
        error: error instanceof Error ? error.message : 'Transformation failed'
      };
    }
  }

  /**
   * Parse date values with multiple format support
   */
  private parseDate(value: any): TransformationResult {
    if (!value) {
      return { success: false, transformedValue: null, error: 'Empty date value' };
    }

    const stringValue = String(value).trim();
    
    // Common date formats to try
    const dateFormats = [
      // ISO formats
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime
      /^\d{4}-\d{2}-\d{2}/, // ISO date
      
      // Common formats
      /^\d{1,2}\/\d{1,2}\/\d{4}/, // MM/DD/YYYY or DD/MM/YYYY
      /^\d{1,2}-\d{1,2}-\d{4}/, // MM-DD-YYYY or DD-MM-YYYY
      /^\d{4}\/\d{1,2}\/\d{1,2}/, // YYYY/MM/DD
      
      // Time formats
      /^\d{1,2}:\d{2}(:\d{2})?(\s?(AM|PM))?$/i // HH:MM or HH:MM:SS with optional AM/PM
    ];

    // Try parsing as Date
    const parsedDate = new Date(stringValue);
    
    if (!isNaN(parsedDate.getTime())) {
      // Check if it matches expected formats
      const matchesFormat = dateFormats.some(format => format.test(stringValue));
      
      if (matchesFormat || !isNaN(Date.parse(stringValue))) {
        return { 
          success: true, 
          transformedValue: parsedDate.toISOString(),
          warnings: matchesFormat ? undefined : ['Date format may be ambiguous']
        };
      }
    }

    // Try parsing time-only values
    const timeMatch = stringValue.match(/^(\d{1,2}):(\d{2})(:\d{2})?(\s?(AM|PM))?$/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = timeMatch[3] ? parseInt(timeMatch[3].substring(1)) : 0;
      const ampm = timeMatch[5];

      if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
      }

      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59) {
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        return { success: true, transformedValue: timeString };
      }
    }

    return {
      success: false,
      transformedValue: null,
      error: `Unable to parse date/time: ${stringValue}`
    };
  }

  /**
   * Parse numeric values
   */
  private parseNumber(value: any): TransformationResult {
    if (value === null || value === undefined || value === '') {
      return { success: false, transformedValue: null, error: 'Empty numeric value' };
    }

    // Handle already numeric values
    if (typeof value === 'number') {
      return { success: true, transformedValue: value };
    }

    const stringValue = String(value).trim();
    
    // Remove common formatting characters
    const cleanedValue = stringValue
      .replace(/,/g, '') // Remove commas
      .replace(/\$/g, '') // Remove dollar signs
      .replace(/%/g, ''); // Remove percent signs

    const numericValue = Number(cleanedValue);
    
    if (isNaN(numericValue)) {
      return {
        success: false,
        transformedValue: null,
        error: `Unable to parse number: ${stringValue}`
      };
    }

    const warnings: string[] = [];
    if (stringValue !== cleanedValue) {
      warnings.push('Removed formatting characters from numeric value');
    }

    return { 
      success: true, 
      transformedValue: numericValue,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Parse boolean values
   */
  private parseBoolean(value: any): TransformationResult {
    if (typeof value === 'boolean') {
      return { success: true, transformedValue: value };
    }

    if (value === null || value === undefined) {
      return { success: false, transformedValue: null, error: 'Empty boolean value' };
    }

    const stringValue = String(value).trim().toLowerCase();
    
    const trueValues = ['true', 'yes', 'y', '1', 'on', 'enabled', 'active'];
    const falseValues = ['false', 'no', 'n', '0', 'off', 'disabled', 'inactive'];

    if (trueValues.includes(stringValue)) {
      return { success: true, transformedValue: true };
    }

    if (falseValues.includes(stringValue)) {
      return { success: true, transformedValue: false };
    }

    return {
      success: false,
      transformedValue: null,
      error: `Unable to parse boolean: ${stringValue}`
    };
  }

  /**
   * Split string into array
   */
  private splitArray(value: any, delimiter: string = ','): TransformationResult {
    if (Array.isArray(value)) {
      return { success: true, transformedValue: value };
    }

    if (value === null || value === undefined || value === '') {
      return { success: true, transformedValue: [] };
    }

    const stringValue = String(value);
    const arrayValue = stringValue
      .split(delimiter)
      .map(item => item.trim())
      .filter(item => item.length > 0);

    return { success: true, transformedValue: arrayValue };
  }

  /**
   * Validate transformed data against business rules
   */
  validateTransformedData(mappedData: MappedImportData): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate venues
    mappedData.venues.forEach((venue, index) => {
      if (!venue.name) {
        errors.push(`Venue ${index + 1}: Missing required name`);
      }
      if (venue.capacity && (typeof venue.capacity !== 'number' || venue.capacity <= 0)) {
        errors.push(`Venue ${index + 1}: Invalid capacity value`);
      }
    });

    // Validate lecturers
    mappedData.lecturers.forEach((lecturer, index) => {
      if (!lecturer.name) {
        errors.push(`Lecturer ${index + 1}: Missing required name`);
      }
      if (lecturer.email && !this.isValidEmail(lecturer.email as string)) {
        errors.push(`Lecturer ${index + 1}: Invalid email format`);
      }
    });

    // Validate courses
    mappedData.courses.forEach((course, index) => {
      if (!course.name) {
        errors.push(`Course ${index + 1}: Missing required name`);
      }
      if (!course.code) {
        errors.push(`Course ${index + 1}: Missing required code`);
      }
      if (course.credits && (typeof course.credits !== 'number' || course.credits <= 0)) {
        errors.push(`Course ${index + 1}: Invalid credits value`);
      }
    });

    // Validate student groups
    mappedData.studentGroups.forEach((group, index) => {
      if (!group.name) {
        errors.push(`Student Group ${index + 1}: Missing required name`);
      }
      if (group.size && (typeof group.size !== 'number' || group.size <= 0)) {
        errors.push(`Student Group ${index + 1}: Invalid size value`);
      }
    });

    // Validate schedules
    mappedData.schedules.forEach((schedule, index) => {
      const requiredFields = ['course', 'lecturer', 'venue', 'startTime', 'endTime', 'dayOfWeek'];
      requiredFields.forEach(field => {
        if (!schedule[field as string]) {
          errors.push(`Schedule ${index + 1}: Missing required field '${field}'`);
        }
      });

      // Validate time format
      if (schedule.startTime && !this.isValidTimeFormat(schedule.startTime as string)) {
        errors.push(`Schedule ${index + 1}: Invalid start time format`);
      }
      if (schedule.endTime && !this.isValidTimeFormat(schedule.endTime as string)) {
        errors.push(`Schedule ${index + 1}: Invalid end time format`);
      }

      // Validate day of week
      if (schedule.dayOfWeek && !this.isValidDayOfWeek(schedule.dayOfWeek as string)) {
        errors.push(`Schedule ${index + 1}: Invalid day of week`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
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
   * Add entity data to mapped data structure
   */
  private addEntityToMappedData(mappedData: MappedImportData, entityType: string, entityData: Record<string, any>): void {
    switch (entityType) {
      case 'venue':
        mappedData.venues.push(entityData);
        break;
      case 'lecturer':
        mappedData.lecturers.push(entityData);
        break;
      case 'course':
        mappedData.courses.push(entityData);
        break;
      case 'studentGroup':
        mappedData.studentGroups.push(entityData);
        break;
      case 'schedule':
        mappedData.schedules.push(entityData);
        break;
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate time format (HH:MM:SS or HH:MM)
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    return timeRegex.test(time);
  }

  /**
   * Validate day of week
   */
  private isValidDayOfWeek(day: string): boolean {
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return validDays.includes(day.toLowerCase());
  }
}