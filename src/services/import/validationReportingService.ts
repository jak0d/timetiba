import { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning, 
  MappedImportData, 
  EntityMatchResults 
} from '../../types/import';

export interface ValidationReport {
  summary: ValidationSummary;
  entityBreakdown: EntityValidationBreakdown;
  dataQualityReport: DataQualityReport;
  conflictReport: ConflictReport;
  recommendations: ValidationRecommendation[];
  detailedErrors: GroupedValidationErrors;
  detailedWarnings: GroupedValidationWarnings;
}

export interface ValidationSummary {
  totalEntities: number;
  validEntities: number;
  invalidEntities: number;
  entitiesWithWarnings: number;
  totalErrors: number;
  totalWarnings: number;
  totalConflicts: number;
  overallStatus: 'valid' | 'invalid' | 'warnings';
  readyForImport: boolean;
}

export interface EntityValidationBreakdown {
  venues: EntityTypeBreakdown;
  lecturers: EntityTypeBreakdown;
  courses: EntityTypeBreakdown;
  studentGroups: EntityTypeBreakdown;
  schedules: EntityTypeBreakdown;
}

export interface EntityTypeBreakdown {
  total: number;
  valid: number;
  invalid: number;
  withWarnings: number;
  new: number;
  existing: number;
  conflicts?: number;
  errorCount: number;
  warningCount: number;
  commonIssues: string[];
}

export interface DataQualityReport {
  overallScore: number; // 0-100
  qualityMetrics: {
    completeness: number; // Percentage of required fields filled
    consistency: number; // Consistency of data formats
    accuracy: number; // Estimated accuracy based on validation
    uniqueness: number; // Percentage of unique records
  };
  qualityIssues: DataQualityIssue[];
  suggestions: DataQualitySuggestion[];
}

export interface DataQualityIssue {
  type: 'missing_data' | 'duplicate_data' | 'format_inconsistency' | 'invalid_reference' | 'unusual_value';
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedRows: number[];
  affectedFields: string[];
  impact: string;
}

export interface DataQualitySuggestion {
  category: 'data_cleanup' | 'format_standardization' | 'validation_improvement' | 'conflict_resolution';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
}

export interface ConflictReport {
  totalConflicts: number;
  conflictsByType: {
    venueConflicts: number;
    lecturerConflicts: number;
    studentGroupConflicts: number;
  };
  affectedSessions: number;
  conflictDetails: ConflictDetail[];
  resolutionSuggestions: ConflictResolutionSuggestion[];
}

export interface ConflictDetail {
  type: 'venue_double_booking' | 'lecturer_conflict' | 'student_group_overlap';
  affectedSessions: number[];
  description: string;
  severity: 'critical' | 'high' | 'medium';
  impact: string;
}

export interface ConflictResolutionSuggestion {
  conflictType: string;
  strategy: string;
  description: string;
  pros: string[];
  cons: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ValidationRecommendation {
  type: 'error_fix' | 'warning_review' | 'data_improvement' | 'conflict_resolution';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionRequired: boolean;
  estimatedTime: string;
  affectedEntities: number;
}

export interface GroupedValidationErrors {
  byEntityType: Record<string, ValidationError[]>;
  byErrorType: Record<string, ValidationError[]>;
  bySeverity: Record<string, ValidationError[]>;
  byField: Record<string, ValidationError[]>;
}

export interface GroupedValidationWarnings {
  byEntityType: Record<string, ValidationWarning[]>;
  byWarningType: Record<string, ValidationWarning[]>;
  byField: Record<string, ValidationWarning[]>;
}

export class ValidationReportingService {
  /**
   * Generates a comprehensive validation report
   */
  generateValidationReport(
    validationResult: ValidationResult,
    mappedData: MappedImportData,
    matchResults: EntityMatchResults
  ): ValidationReport {
    const summary = this.generateValidationSummary(validationResult, mappedData);
    const entityBreakdown = this.generateEntityBreakdown(validationResult, mappedData, matchResults);
    const dataQualityReport = this.generateDataQualityReport(validationResult, mappedData);
    const conflictReport = this.generateConflictReport(validationResult);
    const recommendations = this.generateRecommendations(validationResult, summary);
    const detailedErrors = this.groupValidationErrors(validationResult.errors);
    const detailedWarnings = this.groupValidationWarnings(validationResult.warnings);

    return {
      summary,
      entityBreakdown,
      dataQualityReport,
      conflictReport,
      recommendations,
      detailedErrors,
      detailedWarnings
    };
  }

  /**
   * Generates validation summary
   */
  private generateValidationSummary(
    validationResult: ValidationResult,
    mappedData: MappedImportData
  ): ValidationSummary {
    const totalEntities = 
      mappedData.venues.length + 
      mappedData.lecturers.length + 
      mappedData.courses.length + 
      mappedData.studentGroups.length + 
      mappedData.schedules.length;

    const errorRows = new Set(validationResult.errors.map(e => e.row));
    const warningRows = new Set(validationResult.warnings.map(w => w.row));
    
    const invalidEntities = errorRows.size;
    const entitiesWithWarnings = warningRows.size;
    const validEntities = totalEntities - invalidEntities;

    const totalErrors = validationResult.errors.length;
    const totalWarnings = validationResult.warnings.length;
    const totalConflicts = validationResult.entityCounts.schedules.conflicts || 0;

    let overallStatus: 'valid' | 'invalid' | 'warnings' = 'valid';
    if (totalErrors > 0) {
      overallStatus = 'invalid';
    } else if (totalWarnings > 0) {
      overallStatus = 'warnings';
    }

    const readyForImport = totalErrors === 0;

    return {
      totalEntities,
      validEntities,
      invalidEntities,
      entitiesWithWarnings,
      totalErrors,
      totalWarnings,
      totalConflicts,
      overallStatus,
      readyForImport
    };
  }

  /**
   * Generates entity breakdown
   */
  private generateEntityBreakdown(
    validationResult: ValidationResult,
    mappedData: MappedImportData,
    _matchResults: EntityMatchResults
  ): EntityValidationBreakdown {
    const entityTypes = ['venues', 'lecturers', 'courses', 'studentGroups', 'schedules'] as const;
    const breakdown: Partial<EntityValidationBreakdown> = {};

    entityTypes.forEach(entityType => {
      const entities = mappedData[entityType];
      const entityErrors = validationResult.errors.filter(e => 
        this.getEntityTypeFromRow(e.row, mappedData) === entityType
      );
      const entityWarnings = validationResult.warnings.filter(w => 
        this.getEntityTypeFromRow(w.row, mappedData) === entityType
      );

      const errorRows = new Set(entityErrors.map(e => e.row));
      const warningRows = new Set(entityWarnings.map(w => w.row));

      const invalid = errorRows.size;
      const withWarnings = warningRows.size;
      const valid = entities.length - invalid;

      // Calculate new vs existing entities
      const entityCounts = validationResult.entityCounts[entityType];
      const newCount = entityCounts?.new || 0;
      const existingCount = 'existing' in entityCounts ? entityCounts.existing : 0;
      const conflicts = 'conflicts' in entityCounts ? entityCounts.conflicts : 0;

      // Identify common issues
      const commonIssues = this.identifyCommonIssues(entityErrors, entityWarnings);

      const entityBreakdown: EntityTypeBreakdown = {
        total: entities.length,
        valid,
        invalid,
        withWarnings,
        new: newCount,
        existing: existingCount,
        errorCount: entityErrors.length,
        warningCount: entityWarnings.length,
        commonIssues
      };

      if (entityType === 'schedules') {
        entityBreakdown.conflicts = conflicts;
      }

      breakdown[entityType] = entityBreakdown;
    });

    return breakdown as EntityValidationBreakdown;
  }

  /**
   * Generates data quality report
   */
  private generateDataQualityReport(
    validationResult: ValidationResult,
    mappedData: MappedImportData
  ): DataQualityReport {
    const qualityMetrics = this.calculateQualityMetrics(mappedData, validationResult);
    const qualityIssues = this.identifyQualityIssues(validationResult, mappedData);
    const suggestions = this.generateQualitySuggestions(qualityIssues, qualityMetrics);
    
    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      (qualityMetrics.completeness * 0.3 +
       qualityMetrics.consistency * 0.25 +
       qualityMetrics.accuracy * 0.25 +
       qualityMetrics.uniqueness * 0.2)
    );

    return {
      overallScore,
      qualityMetrics,
      qualityIssues,
      suggestions
    };
  }

  /**
   * Generates conflict report
   */
  private generateConflictReport(validationResult: ValidationResult): ConflictReport {
    const conflictErrors = validationResult.errors.filter(e => 
      e.message.includes('conflict') || 
      e.message.includes('double-booking') || 
      e.message.includes('overlap')
    );

    const conflictsByType = {
      venueConflicts: conflictErrors.filter(e => e.message.includes('Venue double-booking')).length,
      lecturerConflicts: conflictErrors.filter(e => e.message.includes('Lecturer conflict')).length,
      studentGroupConflicts: conflictErrors.filter(e => e.message.includes('Student group overlap')).length
    };

    const totalConflicts = validationResult.entityCounts.schedules.conflicts || 0;
    const affectedSessions = new Set(conflictErrors.map(e => e.row)).size;

    const conflictDetails = this.generateConflictDetails(conflictErrors);
    const resolutionSuggestions = this.generateConflictResolutionSuggestions(conflictsByType);

    return {
      totalConflicts,
      conflictsByType,
      affectedSessions,
      conflictDetails,
      resolutionSuggestions
    };
  }

  /**
   * Generates validation recommendations
   */
  private generateRecommendations(
    _validationResult: ValidationResult,
    summary: ValidationSummary
  ): ValidationRecommendation[] {
    const recommendations: ValidationRecommendation[] = [];

    // Critical errors that must be fixed
    if (summary.totalErrors > 0) {
      recommendations.push({
        type: 'error_fix',
        priority: 'critical',
        title: 'Fix Validation Errors',
        description: `${summary.totalErrors} validation errors must be resolved before import can proceed.`,
        actionRequired: true,
        estimatedTime: this.estimateFixTime(summary.totalErrors),
        affectedEntities: summary.invalidEntities
      });
    }

    // Conflicts that need resolution
    if (summary.totalConflicts > 0) {
      recommendations.push({
        type: 'conflict_resolution',
        priority: 'critical',
        title: 'Resolve Schedule Conflicts',
        description: `${summary.totalConflicts} schedule conflicts detected that will cause issues if not resolved.`,
        actionRequired: true,
        estimatedTime: this.estimateConflictResolutionTime(summary.totalConflicts),
        affectedEntities: summary.totalConflicts
      });
    }

    // Warnings that should be reviewed
    if (summary.totalWarnings > 0) {
      recommendations.push({
        type: 'warning_review',
        priority: summary.totalWarnings > 10 ? 'high' : 'medium',
        title: 'Review Data Quality Warnings',
        description: `${summary.totalWarnings} warnings detected that may indicate data quality issues.`,
        actionRequired: false,
        estimatedTime: this.estimateReviewTime(summary.totalWarnings),
        affectedEntities: summary.entitiesWithWarnings
      });
    }

    // Data improvement suggestions
    if (summary.overallStatus === 'valid' && summary.totalWarnings === 0) {
      recommendations.push({
        type: 'data_improvement',
        priority: 'low',
        title: 'Data Quality Optimization',
        description: 'Consider additional data validation and enrichment opportunities.',
        actionRequired: false,
        estimatedTime: '30-60 minutes',
        affectedEntities: 0
      });
    }

    return recommendations;
  }

  /**
   * Groups validation errors by different criteria
   */
  private groupValidationErrors(errors: ValidationError[]): GroupedValidationErrors {
    const byEntityType: Record<string, ValidationError[]> = {};
    const byErrorType: Record<string, ValidationError[]> = {};
    const bySeverity: Record<string, ValidationError[]> = {};
    const byField: Record<string, ValidationError[]> = {};

    errors.forEach(error => {
      // Group by entity type (inferred from error patterns)
      const entityType = this.inferEntityTypeFromError(error);
      if (!byEntityType[entityType]) byEntityType[entityType] = [];
      byEntityType[entityType].push(error);

      // Group by error type
      const errorType = this.categorizeError(error);
      if (!byErrorType[errorType]) byErrorType[errorType] = [];
      byErrorType[errorType].push(error);

      // Group by severity
      const severity = error.severity || 'error';
      if (!bySeverity[severity]) bySeverity[severity] = [];
      bySeverity[severity].push(error);

      // Group by field
      const field = error.field;
      if (!byField[field]) byField[field] = [];
      byField[field].push(error);
    });

    return { byEntityType, byErrorType, bySeverity, byField };
  }

  /**
   * Groups validation warnings by different criteria
   */
  private groupValidationWarnings(warnings: ValidationWarning[]): GroupedValidationWarnings {
    const byEntityType: Record<string, ValidationWarning[]> = {};
    const byWarningType: Record<string, ValidationWarning[]> = {};
    const byField: Record<string, ValidationWarning[]> = {};

    warnings.forEach(warning => {
      // Group by entity type
      const entityType = this.inferEntityTypeFromWarning(warning);
      if (!byEntityType[entityType]) byEntityType[entityType] = [];
      byEntityType[entityType].push(warning);

      // Group by warning type
      const warningType = this.categorizeWarning(warning);
      if (!byWarningType[warningType]) byWarningType[warningType] = [];
      byWarningType[warningType].push(warning);

      // Group by field
      const field = warning.field;
      if (!byField[field]) byField[field] = [];
      byField[field].push(warning);
    });

    return { byEntityType, byWarningType, byField };
  }

  // Helper methods

  private getEntityTypeFromRow(row: number, mappedData: MappedImportData): string {
    // This is a simplified approach - in practice, you'd need to track which rows belong to which entity types
    // For now, we'll make educated guesses based on the data structure
    let currentRow = 2; // Start from row 2 (after header)
    
    if (row < currentRow + mappedData.venues.length) return 'venues';
    currentRow += mappedData.venues.length;
    
    if (row < currentRow + mappedData.lecturers.length) return 'lecturers';
    currentRow += mappedData.lecturers.length;
    
    if (row < currentRow + mappedData.courses.length) return 'courses';
    currentRow += mappedData.courses.length;
    
    if (row < currentRow + mappedData.studentGroups.length) return 'studentGroups';
    currentRow += mappedData.studentGroups.length;
    
    return 'schedules';
  }

  private identifyCommonIssues(errors: ValidationError[], warnings: ValidationWarning[]): string[] {
    const issueCount: Record<string, number> = {};
    
    [...errors, ...warnings].forEach(item => {
      const issue = this.categorizeError(item as ValidationError);
      issueCount[issue] = (issueCount[issue] || 0) + 1;
    });

    return Object.entries(issueCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([issue]) => issue);
  }

  private calculateQualityMetrics(
    mappedData: MappedImportData,
    validationResult: ValidationResult
  ): DataQualityReport['qualityMetrics'] {
    const totalEntities = 
      mappedData.venues.length + 
      mappedData.lecturers.length + 
      mappedData.courses.length + 
      mappedData.studentGroups.length + 
      mappedData.schedules.length;

    const errorCount = validationResult.errors.length;
    const warningCount = validationResult.warnings.length;

    // Simplified quality metrics calculation
    const completeness = totalEntities === 0 ? 100 : Math.max(0, 100 - (errorCount / totalEntities) * 100);
    const consistency = totalEntities === 0 ? 100 : Math.max(0, 100 - (warningCount / totalEntities) * 50);
    const accuracy = totalEntities === 0 ? 100 : Math.max(0, 100 - ((errorCount + warningCount) / totalEntities) * 75);
    const uniqueness = 95; // Placeholder - would need duplicate detection logic

    return {
      completeness: Math.round(completeness),
      consistency: Math.round(consistency),
      accuracy: Math.round(accuracy),
      uniqueness: Math.round(uniqueness)
    };
  }

  private identifyQualityIssues(
    validationResult: ValidationResult,
    _mappedData: MappedImportData
  ): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];

    // Identify missing data issues
    const missingDataErrors = validationResult.errors.filter(e => 
      e.message.includes('required') || e.message.includes('empty')
    );
    
    if (missingDataErrors.length > 0) {
      issues.push({
        type: 'missing_data',
        severity: 'high',
        description: `${missingDataErrors.length} required fields are missing data`,
        affectedRows: missingDataErrors.map(e => e.row),
        affectedFields: [...new Set(missingDataErrors.map(e => e.field))],
        impact: 'Import will fail for affected entities'
      });
    }

    // Identify format inconsistencies
    const formatErrors = validationResult.errors.filter(e => 
      e.message.includes('format') || e.message.includes('pattern')
    );
    
    if (formatErrors.length > 0) {
      issues.push({
        type: 'format_inconsistency',
        severity: 'medium',
        description: `${formatErrors.length} fields have format inconsistencies`,
        affectedRows: formatErrors.map(e => e.row),
        affectedFields: [...new Set(formatErrors.map(e => e.field))],
        impact: 'Data may not be processed correctly'
      });
    }

    return issues;
  }

  private generateQualitySuggestions(
    qualityIssues: DataQualityIssue[],
    qualityMetrics: DataQualityReport['qualityMetrics']
  ): DataQualitySuggestion[] {
    const suggestions: DataQualitySuggestion[] = [];

    // Data cleanup suggestions
    if (qualityIssues.some(issue => issue.type === 'missing_data')) {
      suggestions.push({
        category: 'data_cleanup',
        priority: 'high',
        title: 'Fill Missing Required Fields',
        description: 'Complete all required fields to ensure successful import',
        actionItems: [
          'Review rows with missing data',
          'Obtain missing information from source systems',
          'Use default values where appropriate'
        ],
        estimatedEffort: 'medium'
      });
    }

    // Format standardization
    if (qualityMetrics.consistency < 90) {
      suggestions.push({
        category: 'format_standardization',
        priority: 'medium',
        title: 'Standardize Data Formats',
        description: 'Improve data consistency by standardizing formats',
        actionItems: [
          'Review format validation errors',
          'Apply consistent date/time formats',
          'Standardize naming conventions'
        ],
        estimatedEffort: 'low'
      });
    }

    return suggestions;
  }

  private generateConflictDetails(conflictErrors: ValidationError[]): ConflictDetail[] {
    return conflictErrors.map(error => ({
      type: this.getConflictType(error.message),
      affectedSessions: [error.row],
      description: error.message,
      severity: 'critical' as const,
      impact: 'Will cause scheduling conflicts if not resolved'
    }));
  }

  private generateConflictResolutionSuggestions(
    conflictsByType: ConflictReport['conflictsByType']
  ): ConflictResolutionSuggestion[] {
    const suggestions: ConflictResolutionSuggestion[] = [];

    if (conflictsByType.venueConflicts > 0) {
      suggestions.push({
        conflictType: 'venue_double_booking',
        strategy: 'Venue Reassignment',
        description: 'Assign conflicting sessions to different venues',
        pros: ['Quick resolution', 'Maintains original time slots'],
        cons: ['May require venue with similar capacity/equipment'],
        difficulty: 'easy'
      });
    }

    if (conflictsByType.lecturerConflicts > 0) {
      suggestions.push({
        conflictType: 'lecturer_conflict',
        strategy: 'Schedule Adjustment',
        description: 'Reschedule one of the conflicting sessions',
        pros: ['Maintains lecturer assignments', 'Flexible solution'],
        cons: ['May affect other dependencies', 'Requires coordination'],
        difficulty: 'medium'
      });
    }

    return suggestions;
  }

  private getConflictType(message: string): ConflictDetail['type'] {
    if (message.includes('Venue double-booking')) return 'venue_double_booking';
    if (message.includes('Lecturer conflict')) return 'lecturer_conflict';
    if (message.includes('Student group overlap')) return 'student_group_overlap';
    return 'venue_double_booking'; // Default
  }

  private inferEntityTypeFromError(error: ValidationError): string {
    if (error.message.includes('venue') || error.field.includes('venue')) return 'venues';
    if (error.message.includes('lecturer') || error.field.includes('lecturer')) return 'lecturers';
    if (error.message.includes('course') || error.field.includes('course')) return 'courses';
    if (error.message.includes('group') || error.field.includes('group')) return 'studentGroups';
    if (error.message.includes('schedule') || error.field.includes('schedule')) return 'schedules';
    return 'unknown';
  }

  private inferEntityTypeFromWarning(warning: ValidationWarning): string {
    if (warning.message.includes('venue') || warning.field.includes('venue')) return 'venues';
    if (warning.message.includes('lecturer') || warning.field.includes('lecturer')) return 'lecturers';
    if (warning.message.includes('course') || warning.field.includes('course')) return 'courses';
    if (warning.message.includes('group') || warning.field.includes('group')) return 'studentGroups';
    if (warning.message.includes('schedule') || warning.field.includes('schedule')) return 'schedules';
    return 'unknown';
  }

  private categorizeError(error: ValidationError): string {
    if (error.message.includes('required') || error.message.includes('empty')) return 'missing_required_field';
    if (error.message.includes('format') || error.message.includes('pattern')) return 'invalid_format';
    if (error.message.includes('conflict') || error.message.includes('overlap')) return 'scheduling_conflict';
    if (error.message.includes('GUID') || error.message.includes('UUID')) return 'invalid_reference';
    if (error.message.includes('greater than') || error.message.includes('less than')) return 'value_out_of_range';
    return 'validation_error';
  }

  private categorizeWarning(warning: ValidationWarning): string {
    if (warning.message.includes('unusual') || warning.message.includes('high')) return 'unusual_value';
    if (warning.message.includes('duplicate')) return 'duplicate_data';
    if (warning.message.includes('format') || warning.message.includes('should')) return 'format_suggestion';
    if (warning.message.includes('verify')) return 'verification_needed';
    return 'data_quality_warning';
  }

  private estimateFixTime(errorCount: number): string {
    if (errorCount <= 5) return '15-30 minutes';
    if (errorCount <= 20) return '30-60 minutes';
    if (errorCount <= 50) return '1-2 hours';
    return '2+ hours';
  }

  private estimateConflictResolutionTime(conflictCount: number): string {
    if (conflictCount <= 3) return '30-45 minutes';
    if (conflictCount <= 10) return '1-2 hours';
    return '2+ hours';
  }

  private estimateReviewTime(warningCount: number): string {
    if (warningCount <= 10) return '15-30 minutes';
    if (warningCount <= 30) return '30-60 minutes';
    return '1+ hours';
  }
}