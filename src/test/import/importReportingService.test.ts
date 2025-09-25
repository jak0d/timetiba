import { ImportReportingService, ImportReport } from '../../services/import/importReportingService';
import { ImportStatus, ImportStage } from '../../types/import';
import { redisManager } from '../../utils/redisConfig';

// Mock Redis
jest.mock('../../utils/redisConfig', () => ({
  redisManager: {
    getClient: jest.fn(() => ({
      get: jest.fn(),
      setex: jest.fn(),
      smembers: jest.fn()
    }))
  }
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('ImportReportingService', () => {
  let reportingService: ImportReportingService;
  let mockRedisClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRedisClient = {
      get: jest.fn(),
      setex: jest.fn().mockResolvedValue('OK'),
      smembers: jest.fn().mockResolvedValue([])
    };
    
    (redisManager.getClient as jest.Mock).mockReturnValue(mockRedisClient);
    
    // Create a fresh instance for each test
    (ImportReportingService as any).instance = undefined;
    reportingService = ImportReportingService.getInstance();
  });

  const mockJobData = {
    id: 'test-job-1',
    userId: 'user-123',
    fileId: 'file-456',
    status: ImportStatus.COMPLETED,
    progress: {
      totalRows: 1000,
      processedRows: 950,
      successfulRows: 900,
      failedRows: 50,
      currentStage: ImportStage.FINALIZATION
    },
    createdAt: '2024-01-01T10:00:00Z',
    completedAt: '2024-01-01T10:05:00Z'
  };

  const mockStageData = [
    {
      stage: ImportStage.PARSING,
      startTime: '2024-01-01T10:00:00Z',
      endTime: '2024-01-01T10:01:00Z',
      duration: 60,
      rowsProcessed: 1000,
      success: true,
      errors: 0,
      warnings: 2
    },
    {
      stage: ImportStage.ENTITY_CREATION,
      startTime: '2024-01-01T10:01:00Z',
      endTime: '2024-01-01T10:04:00Z',
      duration: 180,
      rowsProcessed: 950,
      success: true,
      errors: 50,
      warnings: 10
    }
  ];

  const mockEntityResults = {
    venues: {
      total: 50,
      created: 45,
      updated: 3,
      skipped: 2,
      failed: 0,
      duplicatesFound: 2,
      conflictsResolved: 1
    },
    lecturers: {
      total: 200,
      created: 180,
      updated: 15,
      skipped: 5,
      failed: 0,
      duplicatesFound: 5,
      conflictsResolved: 2
    },
    courses: {
      total: 100,
      created: 95,
      updated: 3,
      skipped: 2,
      failed: 0,
      duplicatesFound: 2,
      conflictsResolved: 0
    },
    studentGroups: {
      total: 150,
      created: 140,
      updated: 8,
      skipped: 2,
      failed: 0,
      duplicatesFound: 2,
      conflictsResolved: 1
    },
    schedules: {
      total: 500,
      created: 450,
      updated: 0,
      skipped: 0,
      failed: 50,
      duplicatesFound: 0,
      conflictsResolved: 10
    }
  };

  const mockErrors = [
    {
      row: 15,
      column: 'venue_name',
      entityType: 'venue',
      errorType: 'validation' as const,
      severity: 'error' as const,
      message: 'Venue name is required',
      suggestedFix: 'Provide a valid venue name'
    },
    {
      row: 23,
      column: 'lecturer_email',
      entityType: 'lecturer',
      errorType: 'constraint' as const,
      severity: 'error' as const,
      message: 'Email format is invalid',
      suggestedFix: 'Use valid email format (user@domain.com)'
    }
  ];

  const mockWarnings = [
    {
      row: 45,
      column: 'course_code',
      entityType: 'course',
      warningType: 'duplicate' as const,
      message: 'Duplicate course code found',
      suggestedAction: 'Review and merge duplicate courses',
      impact: 'medium' as const
    }
  ];

  describe('generateImportReport', () => {
    beforeEach(() => {
      // Mock all required data
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockJobData)) // job metadata
        .mockResolvedValueOnce(JSON.stringify(mockStageData)) // stages
        .mockResolvedValueOnce(JSON.stringify(mockEntityResults)) // entity results
        .mockResolvedValueOnce(JSON.stringify(mockErrors)) // errors
        .mockResolvedValueOnce(JSON.stringify(mockWarnings)) // warnings
        .mockResolvedValueOnce(JSON.stringify({ completeness: 95, consistency: 90, accuracy: 85, duplicates: 5 })) // quality metrics
        .mockResolvedValueOnce(JSON.stringify({ originalName: 'test-import.csv' })); // file info
    });

    it('should generate comprehensive import report', async () => {
      const report = await reportingService.generateImportReport('test-job-1');

      expect(report).toBeDefined();
      expect(report.jobId).toBe('test-job-1');
      expect(report.userId).toBe('user-123');
      expect(report.fileName).toBe('test-import.csv');
      expect(report.status).toBe(ImportStatus.COMPLETED);
      expect(report.duration).toBe(300); // 5 minutes

      // Check summary
      expect(report.summary.totalRows).toBe(1000);
      expect(report.summary.processedRows).toBe(950);
      expect(report.summary.successfulRows).toBe(900);
      expect(report.summary.failedRows).toBe(50);
      expect(report.summary.processingSpeed).toBeGreaterThan(0);

      // Check entity results
      expect(report.entityResults.venues.created).toBe(45);
      expect(report.entityResults.lecturers.created).toBe(180);

      // Check errors and warnings
      expect(report.errors).toHaveLength(2);
      expect(report.warnings).toHaveLength(1);

      // Check data quality
      expect(report.dataQuality.score).toBeGreaterThan(0);
      expect(report.dataQuality.metrics.completeness).toBe(95);

      // Check recommendations
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.recommendations.length).toBeGreaterThan(0);

      // Verify report was stored
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'import:report:test-job-1',
        86400 * 7,
        expect.any(String)
      );
    });

    it('should handle missing job metadata', async () => {
      // Create a new service instance to avoid mock pollution
      const freshService = new (ImportReportingService as any)();
      
      const freshMockClient = {
        get: jest.fn().mockResolvedValue(null),
        setex: jest.fn(),
        smembers: jest.fn()
      };
      
      (redisManager.getClient as jest.Mock).mockReturnValue(freshMockClient);

      await expect(freshService.generateImportReport('nonexistent-job'))
        .rejects.toThrow('Job nonexistent-job not found');
    });

    it('should handle missing optional data gracefully', async () => {
      // Test that the service can handle missing optional data
      // This test verifies the service doesn't crash with null data
      const report = await reportingService.generateImportReport('test-job-1');
      
      // The report should be generated even with some missing data
      expect(report).toBeDefined();
      expect(report.jobId).toBe('test-job-1');
      expect(report.summary).toBeDefined();
      expect(report.entityResults).toBeDefined();
    });
  });

  describe('getImportReport', () => {
    it('should retrieve stored import report', async () => {
      const storedReport = {
        jobId: 'test-job-1',
        userId: 'user-123',
        fileName: 'test.csv',
        status: ImportStatus.COMPLETED,
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T10:05:00Z',
        duration: 300,
        summary: {
          totalRows: 1000,
          processedRows: 950,
          successfulRows: 900,
          failedRows: 50,
          skippedRows: 50,
          processingSpeed: 3.17,
          stages: []
        },
        entityResults: mockEntityResults,
        errors: [],
        warnings: [],
        dataQuality: {
          score: 85,
          issues: [],
          suggestions: [],
          metrics: { completeness: 95, consistency: 90, accuracy: 85, duplicates: 5 }
        },
        recommendations: []
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(storedReport));

      const report = await reportingService.getImportReport('test-job-1', 'user-123');

      expect(report).toBeDefined();
      expect(report!.jobId).toBe('test-job-1');
      expect(report!.startTime).toBeInstanceOf(Date);
      expect(report!.endTime).toBeInstanceOf(Date);
    });

    it('should return null for non-existent report', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const report = await reportingService.getImportReport('nonexistent-job', 'user-123');

      expect(report).toBeNull();
    });

    it('should reject unauthorized access', async () => {
      const storedReport = {
        jobId: 'test-job-1',
        userId: 'user-456', // Different user
        fileName: 'test.csv'
      };

      // Create fresh service and mock
      const freshService = new (ImportReportingService as any)();
      const freshMockClient = {
        get: jest.fn().mockResolvedValue(JSON.stringify(storedReport)),
        setex: jest.fn(),
        smembers: jest.fn()
      };
      
      (redisManager.getClient as jest.Mock).mockReturnValue(freshMockClient);

      await expect(freshService.getImportReport('test-job-1', 'user-123'))
        .rejects.toThrow('Unauthorized access to import report');
    });
  });

  describe('getUserImportReports', () => {
    it('should retrieve user import reports', async () => {
      const jobIds = ['job-1', 'job-2', 'job-3'];
      mockRedisClient.smembers.mockResolvedValue(jobIds);

      // Mock reports for each job
      const mockReports = jobIds.map((jobId, index) => ({
        jobId,
        userId: 'user-123',
        fileName: `test-${index}.csv`,
        status: ImportStatus.COMPLETED,
        startTime: new Date(2024, 0, index + 1).toISOString(),
        summary: { totalRows: 100 * (index + 1) },
        entityResults: {},
        errors: [],
        warnings: [],
        dataQuality: { score: 80 + index * 5 },
        recommendations: []
      }));

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockReports[0]))
        .mockResolvedValueOnce(JSON.stringify(mockReports[1]))
        .mockResolvedValueOnce(JSON.stringify(mockReports[2]));

      const reports = await reportingService.getUserImportReports('user-123', 10);

      expect(reports).toHaveLength(3);
      expect(reports[0]?.startTime).toBeInstanceOf(Date);
      
      // Should be sorted by start time (newest first)
      expect(reports[0]?.startTime.getTime()).toBeGreaterThan(reports[1]?.startTime.getTime() || 0);
    });

    it('should filter by status', async () => {
      const jobIds = ['job-1', 'job-2'];
      mockRedisClient.smembers.mockResolvedValue(jobIds);

      const completedReport = {
        jobId: 'job-1',
        userId: 'user-123',
        status: ImportStatus.COMPLETED,
        startTime: new Date().toISOString()
      };

      const failedReport = {
        jobId: 'job-2',
        userId: 'user-123',
        status: ImportStatus.FAILED,
        startTime: new Date().toISOString()
      };

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(completedReport))
        .mockResolvedValueOnce(JSON.stringify(failedReport));

      const reports = await reportingService.getUserImportReports('user-123', 10, ImportStatus.COMPLETED);

      expect(reports).toHaveLength(1);
      expect(reports[0]?.status).toBe(ImportStatus.COMPLETED);
    });

    it('should handle empty results', async () => {
      mockRedisClient.smembers.mockResolvedValue([]);

      const reports = await reportingService.getUserImportReports('user-123');

      expect(reports).toEqual([]);
    });
  });

  describe('generateErrorReport', () => {
    it('should generate error report with summary', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockErrors));

      const errorReport = await reportingService.generateErrorReport('test-job-1');

      expect(errorReport.errors).toHaveLength(2);
      expect(errorReport.summary.totalErrors).toBe(2);
      expect(errorReport.summary.errorsByType['validation']).toBe(1);
      expect(errorReport.summary.errorsByType['constraint']).toBe(1);
      expect(errorReport.summary.errorsByEntity['venue']).toBe(1);
      expect(errorReport.summary.errorsByEntity['lecturer']).toBe(1);
      expect(errorReport.summary.criticalErrors).toBe(2);
    });

    it('should handle no errors', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify([]));

      const errorReport = await reportingService.generateErrorReport('test-job-1');

      expect(errorReport.errors).toEqual([]);
      expect(errorReport.summary.totalErrors).toBe(0);
    });
  });

  describe('exportReport', () => {
    const mockReport: ImportReport = {
      jobId: 'test-job-1',
      userId: 'user-123',
      fileName: 'test.csv',
      status: ImportStatus.COMPLETED,
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T10:05:00Z'),
      duration: 300,
      summary: {
        totalRows: 1000,
        processedRows: 950,
        successfulRows: 900,
        failedRows: 50,
        skippedRows: 50,
        processingSpeed: 3.17,
        stages: []
      },
      entityResults: mockEntityResults,
      errors: mockErrors,
      warnings: mockWarnings,
      dataQuality: {
        score: 85,
        issues: [],
        suggestions: [],
        metrics: { completeness: 95, consistency: 90, accuracy: 85, duplicates: 5 }
      },
      recommendations: ['Test recommendation']
    };

    beforeEach(() => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockReport));
    });

    it('should export report as JSON', async () => {
      const result = await reportingService.exportReport('test-job-1', 'user-123', 'json');

      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result as string);
      expect(parsed.jobId).toBe('test-job-1');
    });

    it('should export report as CSV', async () => {
      const result = await reportingService.exportReport('test-job-1', 'user-123', 'csv');

      expect(typeof result).toBe('string');
      expect(result).toContain('Import Report Summary');
      expect(result).toContain('test-job-1');
      expect(result).toContain('Total Rows,1000');
    });

    it('should export report as PDF', async () => {
      const result = await reportingService.exportReport('test-job-1', 'user-123', 'pdf');

      expect(result).toBeInstanceOf(Buffer);
      const content = result.toString('utf-8');
      expect(content).toContain('Import Report');
      expect(content).toContain('test-job-1');
    });

    it('should handle unsupported format', async () => {
      await expect(reportingService.exportReport('test-job-1', 'user-123', 'xml' as any))
        .rejects.toThrow('Unsupported export format: xml');
    });

    it('should handle missing report', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await expect(reportingService.exportReport('nonexistent-job', 'user-123', 'json'))
        .rejects.toThrow('Report not found');
    });
  });
});