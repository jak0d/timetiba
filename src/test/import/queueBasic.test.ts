import { describe, it, expect } from '@jest/globals';
import { ImportJob, ImportStatus, ImportStage } from '../../types/import';

describe('Import Queue Basic Functionality', () => {
  it('should create valid ImportJob objects', () => {
    const testJob: ImportJob = {
      id: 'test-job-123',
      userId: 'test-user',
      fileId: 'test-file',
      mappingConfig: {
        id: 'test-mapping',
        name: 'Test Mapping',
        fileType: 'csv',
        mappings: [],
        createdAt: new Date(),
        lastUsed: new Date()
      },
      validationResult: {
        isValid: true,
        errors: [],
        warnings: [],
        entityCounts: {
          venues: { new: 1, existing: 0 },
          lecturers: { new: 1, existing: 0 },
          courses: { new: 1, existing: 0 },
          studentGroups: { new: 1, existing: 0 },
          schedules: { new: 1, conflicts: 0 }
        }
      },
      status: ImportStatus.PENDING,
      progress: {
        totalRows: 5,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        currentStage: ImportStage.PARSING
      },
      createdAt: new Date()
    };

    expect(testJob.id).toBe('test-job-123');
    expect(testJob.status).toBe(ImportStatus.PENDING);
    expect(testJob.progress.currentStage).toBe(ImportStage.PARSING);
    expect(testJob.progress.totalRows).toBe(5);
  });

  it('should have all required import stages', () => {
    expect(ImportStage.PARSING).toBeDefined();
    expect(ImportStage.MAPPING).toBeDefined();
    expect(ImportStage.VALIDATION).toBeDefined();
    expect(ImportStage.ENTITY_CREATION).toBeDefined();
    expect(ImportStage.SCHEDULE_IMPORT).toBeDefined();
    expect(ImportStage.FINALIZATION).toBeDefined();
  });

  it('should have all required import statuses', () => {
    expect(ImportStatus.PENDING).toBeDefined();
    expect(ImportStatus.PROCESSING).toBeDefined();
    expect(ImportStatus.COMPLETED).toBeDefined();
    expect(ImportStatus.FAILED).toBeDefined();
    expect(ImportStatus.CANCELLED).toBeDefined();
  });

  it('should allow importing queue services', async () => {
    // Test that all services can be imported without errors
    const queueConfig = await import('../../services/import/queueConfig');
    const jobWorker = await import('../../services/import/importJobWorker');
    const jobService = await import('../../services/import/importJobService');
    const jobProcessor = await import('../../services/import/importJobProcessor');

    expect(queueConfig.importQueueManager).toBeDefined();
    expect(jobWorker.importJobWorker).toBeDefined();
    expect(jobService.importJobService).toBeDefined();
    expect(jobProcessor.importJobProcessor).toBeDefined();
  });
});