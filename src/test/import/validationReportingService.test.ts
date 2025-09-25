import { ValidationReportingService } from '../../services/import/validationReportingService';
import { ValidationResult, MappedImportData, EntityMatchResults, MatchResult } from '../../types/import';
import { DayOfWeek } from '../../models/common';

describe('ValidationReportingService', () => {
  let service: ValidationReportingService;
  let mockValidationResult: ValidationResult;
  let mockMappedData: MappedImportData;
  let mockMatchResults: EntityMatchResults;

  beforeEach(() => {
    service = new ValidationReportingService();
    
    mockMappedData = {
      venues: [
        { name: 'Room A', capacity: 50, location: 'Building 1' },
        { name: 'Room B', capacity: 100, location: 'Building 2' }
      ],
      lecturers: [
        { name: 'Dr. Smith', email: 'smith@test.com', department: 'CS' }
      ],
      courses: [
        { name: 'Programming 101', code: 'CS101', duration: 90 }
      ],
      studentGroups: [
        { name: 'CS Year 1', size: 30, yearLevel: 1, department: 'CS' }
      ],
      schedules: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          courseId: '550e8400-e29b-41d4-a716-446655440002',
          lecturerId: '550e8400-e29b-41d4-a716-446655440003',
          venueId: '550e8400-e29b-41d4-a716-446655440004',
          studentGroups: ['550e8400-e29b-41d4-a716-446655440005'],
          startTime: new Date('2024-01-15T09:00:00Z'),
          endTime: new Date('2024-01-15T10:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ],
      metadata: {
        sourceFile: 'test.csv',
        mappingConfig: 'test-config',
        importedAt: new Date(),
        importedBy: 'test-user'
      }
    };

    mockMatchResults = {
      venues: new Map<number, MatchResult>(),
      lecturers: new Map<number, MatchResult>(),
      courses: new Map<number, MatchResult>(),
      studentGroups: new Map<number, MatchResult>()
    };

    mockValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      entityCounts: {
        venues: { new: 2, existing: 0 },
        lecturers: { new: 1, existing: 0 },
        courses: { new: 1, existing: 0 },
        studentGroups: { new: 1, existing: 0 },
        schedules: { new: 1, conflicts: 0 }
      }
    };
  });

  describe('generateValidationReport', () => {
    it('should generate a complete validation report for valid data', () => {
      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.entityBreakdown).toBeDefined();
      expect(report.dataQualityReport).toBeDefined();
      expect(report.conflictReport).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.detailedErrors).toBeDefined();
      expect(report.detailedWarnings).toBeDefined();
    });

    it('should generate correct summary for valid data', () => {
      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      expect(report.summary.totalEntities).toBe(6); // 2 venues + 1 lecturer + 1 course + 1 group + 1 schedule
      expect(report.summary.validEntities).toBe(6);
      expect(report.summary.invalidEntities).toBe(0);
      expect(report.summary.totalErrors).toBe(0);
      expect(report.summary.totalWarnings).toBe(0);
      expect(report.summary.totalConflicts).toBe(0);
      expect(report.summary.overallStatus).toBe('valid');
      expect(report.summary.readyForImport).toBe(true);
    });

    it('should generate correct summary for data with errors', () => {
      mockValidationResult.isValid = false;
      mockValidationResult.errors = [
        {
          row: 2,
          field: 'name',
          message: 'Name is required',
          severity: 'error',
          suggestedFix: 'Provide a name'
        },
        {
          row: 3,
          field: 'capacity',
          message: 'Capacity must be positive',
          severity: 'error',
          suggestedFix: 'Set positive capacity'
        }
      ];

      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      expect(report.summary.totalErrors).toBe(2);
      expect(report.summary.invalidEntities).toBe(2);
      expect(report.summary.validEntities).toBe(4);
      expect(report.summary.overallStatus).toBe('invalid');
      expect(report.summary.readyForImport).toBe(false);
    });

    it('should generate correct summary for data with warnings', () => {
      mockValidationResult.warnings = [
        {
          row: 2,
          field: 'capacity',
          message: 'Capacity is unusually high',
          suggestedFix: 'Verify capacity'
        }
      ];

      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      expect(report.summary.totalWarnings).toBe(1);
      expect(report.summary.entitiesWithWarnings).toBe(1);
      expect(report.summary.overallStatus).toBe('warnings');
      expect(report.summary.readyForImport).toBe(true);
    });

    it('should generate correct summary for data with conflicts', () => {
      mockValidationResult.entityCounts.schedules.conflicts = 2;
      mockValidationResult.errors = [
        {
          row: 6,
          field: 'schedule',
          message: 'Venue double-booking detected',
          severity: 'error',
          suggestedFix: 'Assign different venue'
        }
      ];

      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      expect(report.summary.totalConflicts).toBe(2);
      expect(report.conflictReport.totalConflicts).toBe(2);
      expect(report.conflictReport.conflictsByType.venueConflicts).toBe(1);
    });
  });

  describe('entity breakdown', () => {
    it('should generate correct entity breakdown', () => {
      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      expect(report.entityBreakdown.venues.total).toBe(2);
      expect(report.entityBreakdown.venues.valid).toBe(2);
      expect(report.entityBreakdown.venues.invalid).toBe(0);
      expect(report.entityBreakdown.venues.new).toBe(2);
      expect(report.entityBreakdown.venues.existing).toBe(0);

      expect(report.entityBreakdown.lecturers.total).toBe(1);
      expect(report.entityBreakdown.courses.total).toBe(1);
      expect(report.entityBreakdown.studentGroups.total).toBe(1);
      expect(report.entityBreakdown.schedules.total).toBe(1);
      expect(report.entityBreakdown.schedules.conflicts).toBe(0);
    });

    it('should handle entity breakdown with existing entities', () => {
      // Mock some existing entities
      mockMatchResults.venues.set(0, {
        entityId: 'existing-venue-1',
        confidence: 0.9,
        matchType: 'exact',
        suggestedMatches: []
      });
      
      mockValidationResult.entityCounts.venues.existing = 1;
      mockValidationResult.entityCounts.venues.new = 1;

      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      expect(report.entityBreakdown.venues.new).toBe(1);
      expect(report.entityBreakdown.venues.existing).toBe(1);
    });
  });

  describe('data quality report', () => {
    it('should generate data quality report with high scores for valid data', () => {
      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      expect(report.dataQualityReport.overallScore).toBeGreaterThan(90);
      expect(report.dataQualityReport.qualityMetrics.completeness).toBeGreaterThan(90);
      expect(report.dataQualityReport.qualityMetrics.consistency).toBeGreaterThan(90);
      expect(report.dataQualityReport.qualityMetrics.accuracy).toBeGreaterThan(90);
      expect(report.dataQualityReport.qualityIssues).toHaveLength(0);
    });

    it('should identify quality issues from validation errors', () => {
      mockValidationResult.errors = [
        {
          row: 2,
          field: 'name',
          message: 'Name is required',
          severity: 'error',
          suggestedFix: 'Provide a name'
        },
        {
          row: 3,
          field: 'email',
          message: 'Invalid email format',
          severity: 'error',
          suggestedFix: 'Use valid email format'
        }
      ];

      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      expect(report.dataQualityReport.qualityIssues.length).toBeGreaterThan(0);
      
      const missingDataIssue = report.dataQualityReport.qualityIssues.find(
        issue => issue.type === 'missing_data'
      );
      expect(missingDataIssue).toBeDefined();
      expect(missingDataIssue?.affectedRows).toContain(2);

      const formatIssue = report.dataQualityReport.qualityIssues.find(
        issue => issue.type === 'format_inconsistency'
      );
      expect(formatIssue).toBeDefined();
      expect(formatIssue?.affectedRows).toContain(3);
    });

    it('should generate quality suggestions based on issues', () => {
      mockValidationResult.errors = [
        {
          row: 2,
          field: 'name',
          message: 'Name is required',
          severity: 'error',
          suggestedFix: 'Provide a name'
        }
      ];

      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      expect(report.dataQualityReport.suggestions.length).toBeGreaterThan(0);
      
      const cleanupSuggestion = report.dataQualityReport.suggestions.find(
        suggestion => suggestion.category === 'data_cleanup'
      );
      expect(cleanupSuggestion).toBeDefined();
      expect(cleanupSuggestion?.priority).toBe('high');
    });
  });

  describe('conflict report', () => {
    it('should generate empty conflict report for data without conflicts', () => {
      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      expect(report.conflictReport.totalConflicts).toBe(0);
      expect(report.conflictReport.conflictsByType.venueConflicts).toBe(0);
      expect(report.conflictReport.conflictsByType.lecturerConflicts).toBe(0);
      expect(report.conflictReport.conflictsByType.studentGroupConflicts).toBe(0);
      expect(report.conflictReport.affectedSessions).toBe(0);
      expect(report.conflictReport.conflictDetails).toHaveLength(0);
    });

    it('should generate conflict report with venue conflicts', () => {
      mockValidationResult.entityCounts.schedules.conflicts = 1;
      mockValidationResult.errors = [
        {
          row: 6,
          field: 'schedule',
          message: 'Venue double-booking detected: venue-1 is booked for overlapping time slots',
          severity: 'error',
          suggestedFix: 'Assign different venue'
        }
      ];

      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      expect(report.conflictReport.totalConflicts).toBe(1);
      expect(report.conflictReport.conflictsByType.venueConflicts).toBe(1);
      expect(report.conflictReport.conflictDetails).toHaveLength(1);
      expect(report.conflictReport.conflictDetails[0]?.type).toBe('venue_double_booking');
      expect(report.conflictReport.resolutionSuggestions.length).toBeGreaterThan(0);
    });

    it('should generate conflict report with lecturer conflicts', () => {
      mockValidationResult.entityCounts.schedules.conflicts = 1;
      mockValidationResult.errors = [
        {
          row: 6,
          field: 'schedule',
          message: 'Lecturer conflict detected: lecturer-1 has overlapping sessions',
          severity: 'error',
          suggestedFix: 'Reschedule session'
        }
      ];

      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      expect(report.conflictReport.conflictsByType.lecturerConflicts).toBe(1);
      expect(report.conflictReport.conflictDetails[0]?.type).toBe('lecturer_conflict');
    });

    it('should generate conflict report with student group conflicts', () => {
      mockValidationResult.entityCounts.schedules.conflicts = 1;
      mockValidationResult.errors = [
        {
          row: 6,
          field: 'schedule',
          message: 'Student group overlap detected: group-1 has overlapping sessions',
          severity: 'error',
          suggestedFix: 'Reschedule session'
        }
      ];

      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      expect(report.conflictReport.conflictsByType.studentGroupConflicts).toBe(1);
      expect(report.conflictReport.conflictDetails[0]?.type).toBe('student_group_overlap');
    });
  });

  describe('recommendations', () => {
    it('should generate no critical recommendations for valid data', () => {
      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      const criticalRecommendations = report.recommendations.filter(r => r.priority === 'critical');
      expect(criticalRecommendations).toHaveLength(0);
      
      // Should have at least one low-priority improvement recommendation
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.type === 'data_improvement')).toBe(true);
    });

    it('should generate critical recommendations for data with errors', () => {
      mockValidationResult.isValid = false;
      mockValidationResult.errors = [
        {
          row: 2,
          field: 'name',
          message: 'Name is required',
          severity: 'error',
          suggestedFix: 'Provide a name'
        }
      ];

      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      const errorFixRecommendation = report.recommendations.find(r => r.type === 'error_fix');
      expect(errorFixRecommendation).toBeDefined();
      expect(errorFixRecommendation?.priority).toBe('critical');
      expect(errorFixRecommendation?.actionRequired).toBe(true);
    });

    it('should generate conflict resolution recommendations', () => {
      mockValidationResult.entityCounts.schedules.conflicts = 2;
      mockValidationResult.errors = [
        {
          row: 6,
          field: 'schedule',
          message: 'Venue double-booking detected',
          severity: 'error',
          suggestedFix: 'Assign different venue'
        }
      ];

      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      const conflictRecommendation = report.recommendations.find(r => r.type === 'conflict_resolution');
      expect(conflictRecommendation).toBeDefined();
      expect(conflictRecommendation?.priority).toBe('critical');
      expect(conflictRecommendation?.actionRequired).toBe(true);
    });

    it('should generate warning review recommendations', () => {
      mockValidationResult.warnings = [
        {
          row: 2,
          field: 'capacity',
          message: 'Capacity is unusually high',
          suggestedFix: 'Verify capacity'
        },
        {
          row: 3,
          field: 'duration',
          message: 'Duration is unusually long',
          suggestedFix: 'Verify duration'
        }
      ];

      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      const warningRecommendation = report.recommendations.find(r => r.type === 'warning_review');
      expect(warningRecommendation).toBeDefined();
      expect(warningRecommendation?.actionRequired).toBe(false);
    });
  });

  describe('detailed error and warning grouping', () => {
    it('should group errors by different criteria', () => {
      mockValidationResult.errors = [
        {
          row: 2,
          field: 'name',
          message: 'Name is required',
          severity: 'error',
          suggestedFix: 'Provide a name'
        },
        {
          row: 3,
          field: 'capacity',
          message: 'Capacity must be greater than 0',
          severity: 'error',
          suggestedFix: 'Set positive capacity'
        },
        {
          row: 4,
          field: 'email',
          message: 'Invalid email format',
          severity: 'error',
          suggestedFix: 'Use valid email'
        }
      ];

      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      // Check grouping by error type
      expect(report.detailedErrors.byErrorType['missing_required_field']).toHaveLength(1);
      expect(report.detailedErrors.byErrorType['value_out_of_range']).toHaveLength(1);
      expect(report.detailedErrors.byErrorType['invalid_format']).toHaveLength(1);

      // Check grouping by field
      expect(report.detailedErrors.byField['name']).toHaveLength(1);
      expect(report.detailedErrors.byField['capacity']).toHaveLength(1);
      expect(report.detailedErrors.byField['email']).toHaveLength(1);

      // Check grouping by severity
      expect(report.detailedErrors.bySeverity['error']).toHaveLength(3);
    });

    it('should group warnings by different criteria', () => {
      mockValidationResult.warnings = [
        {
          row: 2,
          field: 'capacity',
          message: 'Capacity is unusually high',
          suggestedFix: 'Verify capacity'
        },
        {
          row: 3,
          field: 'duration',
          message: 'Duration should be multiple of 15 minutes',
          suggestedFix: 'Adjust duration'
        }
      ];

      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      // Check grouping by warning type
      expect(report.detailedWarnings.byWarningType['unusual_value']).toHaveLength(1);
      expect(report.detailedWarnings.byWarningType['format_suggestion']).toHaveLength(1);

      // Check grouping by field
      expect(report.detailedWarnings.byField['capacity']).toHaveLength(1);
      expect(report.detailedWarnings.byField['duration']).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty validation result', () => {
      mockMappedData = {
        venues: [],
        lecturers: [],
        courses: [],
        studentGroups: [],
        schedules: [],
        metadata: {
          sourceFile: 'empty.csv',
          mappingConfig: 'test-config',
          importedAt: new Date(),
          importedBy: 'test-user'
        }
      };

      mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        entityCounts: {
          venues: { new: 0, existing: 0 },
          lecturers: { new: 0, existing: 0 },
          courses: { new: 0, existing: 0 },
          studentGroups: { new: 0, existing: 0 },
          schedules: { new: 0, conflicts: 0 }
        }
      };

      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      expect(report.summary.totalEntities).toBe(0);
      expect(report.summary.overallStatus).toBe('valid');
      expect(report.dataQualityReport.overallScore).toBeGreaterThan(0);
    });

    it('should handle large numbers of errors and warnings', () => {
      // Generate many errors and warnings
      const errors = Array.from({ length: 100 }, (_, i) => ({
        row: i + 2,
        field: 'testField',
        message: `Error ${i}`,
        severity: 'error' as const,
        suggestedFix: 'Fix it'
      }));

      const warnings = Array.from({ length: 50 }, (_, i) => ({
        row: i + 2,
        field: 'testField',
        message: `Warning ${i}`,
        suggestedFix: 'Review it'
      }));

      mockValidationResult.errors = errors;
      mockValidationResult.warnings = warnings;
      mockValidationResult.isValid = false;

      const report = service.generateValidationReport(mockValidationResult, mockMappedData, mockMatchResults);

      expect(report.summary.totalErrors).toBe(100);
      expect(report.summary.totalWarnings).toBe(50);
      expect(report.summary.overallStatus).toBe('invalid');
      
      // Should still generate meaningful recommendations
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      // Should estimate longer fix times
      const errorFixRecommendation = report.recommendations.find(r => r.type === 'error_fix');
      expect(errorFixRecommendation?.estimatedTime).toContain('hours');
    });
  });
});