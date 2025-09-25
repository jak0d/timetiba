import { DayOfWeek, Priority, Severity, Equipment } from './common';

describe('Common Models', () => {
  describe('DayOfWeek enum', () => {
    it('should have all days of the week', () => {
      expect(DayOfWeek.MONDAY).toBe('monday');
      expect(DayOfWeek.TUESDAY).toBe('tuesday');
      expect(DayOfWeek.WEDNESDAY).toBe('wednesday');
      expect(DayOfWeek.THURSDAY).toBe('thursday');
      expect(DayOfWeek.FRIDAY).toBe('friday');
      expect(DayOfWeek.SATURDAY).toBe('saturday');
      expect(DayOfWeek.SUNDAY).toBe('sunday');
    });
  });

  describe('Priority enum', () => {
    it('should have all priority levels', () => {
      expect(Priority.LOW).toBe('low');
      expect(Priority.MEDIUM).toBe('medium');
      expect(Priority.HIGH).toBe('high');
      expect(Priority.CRITICAL).toBe('critical');
    });
  });

  describe('Severity enum', () => {
    it('should have all severity levels', () => {
      expect(Severity.INFO).toBe('info');
      expect(Severity.WARNING).toBe('warning');
      expect(Severity.ERROR).toBe('error');
      expect(Severity.CRITICAL).toBe('critical');
    });
  });

  describe('Equipment enum', () => {
    it('should have common equipment types', () => {
      expect(Equipment.PROJECTOR).toBe('projector');
      expect(Equipment.COMPUTER).toBe('computer');
      expect(Equipment.WHITEBOARD).toBe('whiteboard');
      expect(Equipment.SMARTBOARD).toBe('smartboard');
    });
  });
});