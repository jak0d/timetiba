import { timetableEngine } from '../services/timetableEngine';

describe('TimetableEngine - Automated Generation Simple Tests', () => {
  describe('configureOptimizationParameters', () => {
    it('should use default parameters when none provided', () => {
      const params = timetableEngine.configureOptimizationParameters({});

      expect(params.max_solve_time_seconds).toBe(300);
      expect(params.preference_weight).toBe(0.3);
      expect(params.efficiency_weight).toBe(0.4);
      expect(params.balance_weight).toBe(0.3);
      expect(params.allow_partial_solutions).toBe(true);
    });

    it('should override default parameters with provided values', () => {
      const customParams = {
        max_solve_time_seconds: 600,
        preference_weight: 0.5,
        efficiency_weight: 0.3,
        balance_weight: 0.2
      };

      const params = timetableEngine.configureOptimizationParameters(customParams);

      expect(params.max_solve_time_seconds).toBe(600);
      expect(params.preference_weight).toBe(0.5);
      expect(params.efficiency_weight).toBe(0.3);
      expect(params.balance_weight).toBe(0.2);
    });

    it('should validate solve time bounds', () => {
      expect(() => {
        timetableEngine.configureOptimizationParameters({ max_solve_time_seconds: 5 });
      }).toThrow('max_solve_time_seconds must be between 10 and 3600 seconds');

      expect(() => {
        timetableEngine.configureOptimizationParameters({ max_solve_time_seconds: 4000 });
      }).toThrow('max_solve_time_seconds must be between 10 and 3600 seconds');
    });

    it('should validate weight parameters sum to 1.0', () => {
      expect(() => {
        timetableEngine.configureOptimizationParameters({
          preference_weight: 0.5,
          efficiency_weight: 0.3,
          balance_weight: 0.3 // Sum = 1.1
        });
      }).toThrow('Weight parameters must sum to 1.0');
    });

    it('should validate non-negative weights', () => {
      expect(() => {
        timetableEngine.configureOptimizationParameters({
          preference_weight: -0.1,
          efficiency_weight: 0.6,
          balance_weight: 0.5
        });
      }).toThrow('Weight parameters must be non-negative');
    });

    it('should allow weights that sum to exactly 1.0', () => {
      const params = timetableEngine.configureOptimizationParameters({
        preference_weight: 0.4,
        efficiency_weight: 0.35,
        balance_weight: 0.25
      });

      expect(params.preference_weight).toBe(0.4);
      expect(params.efficiency_weight).toBe(0.35);
      expect(params.balance_weight).toBe(0.25);
    });

    it('should handle edge case of minimum solve time', () => {
      const params = timetableEngine.configureOptimizationParameters({
        max_solve_time_seconds: 10
      });

      expect(params.max_solve_time_seconds).toBe(10);
    });

    it('should handle edge case of maximum solve time', () => {
      const params = timetableEngine.configureOptimizationParameters({
        max_solve_time_seconds: 3600
      });

      expect(params.max_solve_time_seconds).toBe(3600);
    });
  });

  describe('getGenerationProgress', () => {
    it('should return null for non-existent operation', async () => {
      const progress = await timetableEngine.getGenerationProgress('non-existent-id');
      expect(progress).toBeNull();
    });
  });

  describe('cancelGeneration', () => {
    it('should return false for non-existent operation', async () => {
      const cancelled = await timetableEngine.cancelGeneration('non-existent-id');
      expect(cancelled).toBe(false);
    });
  });
});