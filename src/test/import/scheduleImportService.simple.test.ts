import { describe, it, expect } from '@jest/globals';

describe('ScheduleImportService Simple Test', () => {
  it('should be able to import the service', async () => {
    const { scheduleImportService } = await import('../../services/import/scheduleImportService');
    expect(scheduleImportService).toBeDefined();
  });

  it('should have the expected methods', async () => {
    const { scheduleImportService } = await import('../../services/import/scheduleImportService');
    expect(typeof scheduleImportService.importScheduleSessions).toBe('function');
  });
});