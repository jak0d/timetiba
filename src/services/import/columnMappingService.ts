import { ColumnMapping, TransformationType } from '../../types/import';
import Fuse from 'fuse.js';

export interface MappingSuggestion {
  sourceColumn: string;
  targetField: string;
  entityType: 'venue' | 'lecturer' | 'course' | 'studentGroup' | 'schedule';
  confidence: number;
  transformation?: TransformationType;
  required: boolean;
  reasoning: string;
}

export interface ColumnMappingDetectionResult {
  suggestions: MappingSuggestion[];
  unmappedColumns: string[];
  requiredFieldsCovered: string[];
  missingRequiredFields: string[];
  confidence: number;
}

export class ColumnMappingService {
  private readonly fieldMappings = {
    venue: {
      required: ['name'],
      optional: ['capacity', 'location', 'type', 'equipment', 'description'],
      patterns: {
        name: ['venue', 'room', 'location', 'hall', 'building', 'space', 'facility', 'roomname', 'venuename', 'name', 'rm'],
        capacity: ['capacity', 'size', 'seats', 'max', 'maximum', 'roomcapacity'],
        location: ['location', 'address', 'building', 'floor', 'wing', 'buildinglocation'],
        type: ['type', 'category', 'kind', 'class', 'roomtype'],
        equipment: ['equipment', 'facilities', 'resources', 'tech'],
        description: ['description', 'notes', 'details', 'info']
      }
    },
    lecturer: {
      required: ['name'],
      optional: ['email', 'department', 'title', 'phone', 'office'],
      patterns: {
        name: ['lecturer', 'teacher', 'instructor', 'professor', 'staff', 'faculty', 'name', 'lecturername', 'prof'],
        email: ['email', 'mail', 'contact', 'emailaddress'],
        department: ['department', 'dept', 'faculty', 'school', 'division'],
        title: ['title', 'position', 'rank', 'designation'],
        phone: ['phone', 'tel', 'telephone', 'mobile', 'contact'],
        office: ['office', 'room', 'location', 'officeroom']
      }
    },
    course: {
      required: ['name', 'code'],
      optional: ['credits', 'department', 'description', 'level'],
      patterns: {
        name: ['course', 'subject', 'module', 'unit', 'class', 'name', 'title', 'coursetitle'],
        code: ['code', 'id', 'number', 'ref', 'reference', 'coursecode'],
        credits: ['credits', 'points', 'hours', 'units', 'credithours'],
        department: ['department', 'dept', 'faculty', 'school'],
        description: ['description', 'details', 'info', 'notes'],
        level: ['level', 'year', 'grade', 'stage']
      }
    },
    studentGroup: {
      required: ['name'],
      optional: ['size', 'department', 'year', 'program'],
      patterns: {
        name: ['group', 'class', 'cohort', 'section', 'batch', 'name', 'groupname'],
        size: ['size', 'count', 'number', 'students', 'enrollment', 'classsize'],
        department: ['department', 'dept', 'faculty', 'school'],
        year: ['year', 'level', 'grade', 'stage', 'yearlevel'],
        program: ['program', 'course', 'degree', 'major']
      }
    },
    schedule: {
      required: ['course', 'lecturer', 'venue', 'startTime', 'endTime', 'dayOfWeek'],
      optional: ['studentGroup', 'sessionType', 'duration', 'notes'],
      patterns: {
        course: ['course', 'subject', 'module', 'class'],
        lecturer: ['lecturer', 'teacher', 'instructor', 'staff'],
        venue: ['venue', 'room', 'location', 'hall'],
        startTime: ['start', 'begin', 'from', 'time', 'starttime'],
        endTime: ['end', 'finish', 'to', 'until', 'endtime'],
        dayOfWeek: ['day', 'weekday', 'dayofweek'],
        studentGroup: ['group', 'class', 'students', 'cohort', 'studentgroup'],
        sessionType: ['type', 'session', 'kind', 'format'],
        duration: ['duration', 'length', 'minutes', 'hours'],
        notes: ['notes', 'comments', 'remarks', 'info']
      }
    }
  };

  /**
   * Automatically detect column mappings based on header analysis
   */
  public detectColumnMappings(headers: string[]): ColumnMappingDetectionResult {
    const suggestions: MappingSuggestion[] = [];
    const unmappedColumns: string[] = [];
    const requiredFieldsCovered: string[] = [];
    const missingRequiredFields: string[] = [];

    // Normalize headers for better matching
    const normalizedHeaders = headers.map(header => this.normalizeHeader(header));

    // Track which entity types are likely present based on detected fields
    const entityTypeScores = {
      venue: 0,
      lecturer: 0,
      course: 0,
      studentGroup: 0,
      schedule: 0
    };

    // First pass: detect individual field mappings
    for (let i = 0; i < headers.length; i++) {
      const originalHeader = headers[i];
      const normalizedHeader = normalizedHeaders[i];
      
      if (!originalHeader || !normalizedHeader) continue;
      
      const bestMatch = this.findBestFieldMatch(normalizedHeader);
      
      if (bestMatch && bestMatch.confidence >= 0.7) {
        suggestions.push({
          sourceColumn: originalHeader,
          targetField: bestMatch.field,
          entityType: bestMatch.entityType,
          confidence: bestMatch.confidence,
          transformation: this.suggestTransformation(bestMatch.field, normalizedHeader),
          required: this.isRequiredField(bestMatch.entityType, bestMatch.field),
          reasoning: bestMatch.reasoning
        });

        entityTypeScores[bestMatch.entityType] += bestMatch.confidence;
        
        if (this.isRequiredField(bestMatch.entityType, bestMatch.field)) {
          requiredFieldsCovered.push(`${bestMatch.entityType}.${bestMatch.field}`);
        }
      } else {
        unmappedColumns.push(originalHeader);
      }
    }

    // Determine primary entity type based on scores and required fields
    const primaryEntityType = this.determinePrimaryEntityType(entityTypeScores, suggestions);

    // Check for missing required fields for the primary entity type
    if (primaryEntityType) {
      const entityConfig = this.fieldMappings[primaryEntityType as keyof typeof this.fieldMappings];
      const requiredFields = entityConfig?.required || [];
      const coveredFields = suggestions
        .filter(s => s.entityType === primaryEntityType)
        .map(s => s.targetField);

      for (const requiredField of requiredFields) {
        if (!coveredFields.includes(requiredField)) {
          missingRequiredFields.push(`${primaryEntityType}.${requiredField}`);
        }
      }
    }

    // Calculate overall confidence
    const totalConfidence = suggestions.length > 0 
      ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length
      : 0;

    return {
      suggestions,
      unmappedColumns,
      requiredFieldsCovered,
      missingRequiredFields,
      confidence: totalConfidence
    };
  }

  /**
   * Find the best field match for a normalized header
   */
  private findBestFieldMatch(normalizedHeader: string): {
    field: string;
    entityType: 'venue' | 'lecturer' | 'course' | 'studentGroup' | 'schedule';
    confidence: number;
    reasoning: string;
  } | null {
    let bestMatch: any = null;
    let highestScore = 0;

    for (const [entityType, config] of Object.entries(this.fieldMappings)) {
      for (const [field, patterns] of Object.entries(config.patterns)) {
        const fuse = new Fuse(patterns, {
          threshold: 0.3,
          includeScore: true,
          ignoreLocation: true,
          findAllMatches: false
        });

        const results = fuse.search(normalizedHeader);
        
        if (results.length > 0 && results[0]) {
          let score = 1 - (results[0].score || 0);
          
          // Boost score for exact matches
          if (patterns.includes(normalizedHeader)) {
            score = score * 1.3;
          }

          // Boost score for required fields
          if (config.required.includes(field)) {
            score = score * 1.1;
          }

          // Boost score for more specific field matches
          if (normalizedHeader.includes(field.toLowerCase())) {
            score = score * 1.15;
          }

          // Additional boost for longer, more specific matches
          if (normalizedHeader.length > 4 && results[0].item && results[0].item.length > 4) {
            score = score * 1.05;
          }

          if (score > highestScore) {
            highestScore = score;
            bestMatch = {
              field,
              entityType: entityType as any,
              confidence: Math.min(score, 1.0),
              reasoning: `Matched "${normalizedHeader}" to "${results[0].item}" pattern`
            };
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Normalize header text for better matching
   */
  private normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '')
      .trim();
  }

  /**
   * Suggest appropriate transformation based on field type and header
   */
  private suggestTransformation(field: string, _normalizedHeader: string): TransformationType {
    // Time fields
    if (field.includes('time') || field.includes('Time')) {
      return TransformationType.DATE_PARSE;
    }

    // Numeric fields
    if (['capacity', 'size', 'credits', 'duration', 'year'].includes(field)) {
      return TransformationType.NUMBER_PARSE;
    }

    // Email fields
    if (field === 'email') {
      return TransformationType.LOWERCASE;
    }

    // Name fields that should be properly formatted
    if (field === 'name' || field.includes('Name')) {
      return TransformationType.TRIM;
    }

    // Code fields that should be uppercase
    if (field === 'code' || field.includes('Code')) {
      return TransformationType.UPPERCASE;
    }

    return TransformationType.TRIM; // Default to trim for most text fields
  }

  /**
   * Check if a field is required for the given entity type
   */
  private isRequiredField(entityType: string, field: string): boolean {
    const config = this.fieldMappings[entityType as keyof typeof this.fieldMappings];
    return config?.required.includes(field) || false;
  }

  /**
   * Determine the primary entity type based on field detection scores
   */
  private determinePrimaryEntityType(
    scores: Record<string, number>,
    suggestions: MappingSuggestion[]
  ): string | null {
    // If we have schedule-specific fields, it's likely a schedule import
    const hasScheduleFields = suggestions.some(s => 
      s.entityType === 'schedule' && 
      ['startTime', 'endTime', 'dayOfWeek'].includes(s.targetField)
    );

    if (hasScheduleFields) {
      return 'schedule';
    }

    // Otherwise, return the entity type with the highest score
    const sortedTypes = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)
      .filter(([,score]) => score > 0);

    return sortedTypes.length > 0 ? sortedTypes[0]?.[0] || null : null;
  }

  /**
   * Generate mapping suggestions with confidence scoring
   */
  public generateMappingSuggestions(
    headers: string[],
    entityType?: 'venue' | 'lecturer' | 'course' | 'studentGroup' | 'schedule'
  ): MappingSuggestion[] {
    const detectionResult = this.detectColumnMappings(headers);
    
    if (entityType) {
      // Filter suggestions for specific entity type
      return detectionResult.suggestions.filter(s => s.entityType === entityType);
    }

    return detectionResult.suggestions;
  }

  /**
   * Validate mapping completeness for a specific entity type
   */
  public validateMappingCompleteness(
    mappings: ColumnMapping[],
    entityType: 'venue' | 'lecturer' | 'course' | 'studentGroup' | 'schedule'
  ): {
    isComplete: boolean;
    missingRequired: string[];
    warnings: string[];
  } {
    const config = this.fieldMappings[entityType];
    const mappedFields = mappings
      .filter(m => m.entityType === entityType)
      .map(m => m.targetField);

    const missingRequired = config.required.filter(field => !mappedFields.includes(field));
    const warnings: string[] = [];

    // Check for important optional fields that are missing
    const importantOptional = {
      venue: ['capacity'],
      lecturer: ['email'],
      course: ['credits'],
      studentGroup: ['size'],
      schedule: ['duration']
    };

    const missingImportant = importantOptional[entityType]?.filter(field => 
      !mappedFields.includes(field)
    ) || [];

    if (missingImportant.length > 0) {
      warnings.push(`Consider mapping these important fields: ${missingImportant.join(', ')}`);
    }

    return {
      isComplete: missingRequired.length === 0,
      missingRequired,
      warnings
    };
  }
}