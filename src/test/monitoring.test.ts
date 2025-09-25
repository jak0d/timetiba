import request from 'supertest';
import { app } from '../index';
import { logger } from '../utils/logger';
import { alertingService, AlertType, AlertSeverity } from '../services/alertingService';

describe('Monitoring and Health Checks', () => {
  describe('Health Check Endpoints', () => {
    test('GET /health should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.status).toBeOneOf([200, 503]);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('checks');
      
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('redis');
      expect(response.body.checks).toHaveProperty('memory');
    });

    test('GET /health/live should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    test('GET /health/ready should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect('Content-Type', /json/);

      expect(response.status).toBeOneOf([200, 503]);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('GET /metrics should return system metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('process');
      
      expect(response.body.memory).toHaveProperty('heapUsed');
      expect(response.body.memory).toHaveProperty('heapTotal');
    });
  });

  describe('Performance Monitoring', () => {
    test('should log request performance metrics', async () => {
      const logSpy = jest.spyOn(logger, 'http');
      
      await request(app)
        .get('/health/live')
        .expect(200);

      expect(logSpy).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          method: 'GET',
          url: '/health/live',
          statusCode: 200,
          duration: expect.any(Number)
        })
      );
      
      logSpy.mockRestore();
    });

    test('should track memory usage', async () => {
      const logSpy = jest.spyOn(logger, 'debug');
      
      await request(app)
        .get('/health/live')
        .expect(200);

      expect(logSpy).toHaveBeenCalledWith(
        'Memory usage',
        expect.objectContaining({
          rss: expect.any(Number),
          heapTotal: expect.any(Number),
          heapUsed: expect.any(Number),
          type: 'memory'
        })
      );
      
      logSpy.mockRestore();
    });
  });

  describe('Error Tracking', () => {
    test('should log and track application errors', async () => {
      const logSpy = jest.spyOn(logger, 'error');
      
      // Trigger an error by accessing non-existent endpoint
      await request(app)
        .get('/non-existent-endpoint')
        .expect(404);

      // The error middleware should have logged the 404
      expect(logSpy).toHaveBeenCalled();
      
      logSpy.mockRestore();
    });

    test('should handle database connection errors gracefully', async () => {
      // Mock database connection failure
      const originalEnv = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://invalid:invalid@localhost:5432/invalid';
      
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.body.checks.database.status).toBe('unhealthy');
      
      // Restore original environment
      process.env.DATABASE_URL = originalEnv;
    });
  });

  describe('Alerting System', () => {
    beforeEach(() => {
      // Clear any existing alerts
      alertingService.getActiveAlerts().forEach(alert => {
        alertingService.resolveAlert(alert.id);
      });
    });

    test('should trigger alert for system errors', async () => {
      const errorData = {
        error: {
          name: 'TestError',
          message: 'Test error message',
          stack: 'Error stack trace'
        },
        type: 'system_error'
      };

      await alertingService.processEvent(errorData);

      const activeAlerts = alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].type).toBe(AlertType.SYSTEM_ERROR);
      expect(activeAlerts[0].severity).toBe(AlertSeverity.HIGH);
    });

    test('should trigger alert for performance degradation', async () => {
      const performanceData = {
        operation: 'test-operation',
        duration: 6000, // 6 seconds - above threshold
        type: 'performance'
      };

      await alertingService.processEvent(performanceData);

      const activeAlerts = alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].type).toBe(AlertType.PERFORMANCE_DEGRADATION);
    });

    test('should trigger alert for high memory usage', async () => {
      const memoryData = {
        memoryUsagePercent: 90, // Above 85% threshold
        heapUsed: 500,
        type: 'memory'
      };

      await alertingService.processEvent(memoryData);

      const activeAlerts = alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].type).toBe(AlertType.HIGH_MEMORY_USAGE);
      expect(activeAlerts[0].severity).toBe(AlertSeverity.HIGH);
    });

    test('should respect alert cooldown periods', async () => {
      const errorData = {
        error: { name: 'TestError', message: 'Test' },
        type: 'system_error'
      };

      // Trigger first alert
      await alertingService.processEvent(errorData);
      expect(alertingService.getActiveAlerts()).toHaveLength(1);

      // Trigger same alert immediately - should be ignored due to cooldown
      await alertingService.processEvent(errorData);
      expect(alertingService.getActiveAlerts()).toHaveLength(1);
    });

    test('should resolve alerts', async () => {
      const errorData = {
        error: { name: 'TestError', message: 'Test' },
        type: 'system_error'
      };

      await alertingService.processEvent(errorData);
      const activeAlerts = alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);

      const alertId = activeAlerts[0].id;
      await alertingService.resolveAlert(alertId);

      expect(alertingService.getActiveAlerts()).toHaveLength(0);
    });

    test('should maintain alert history', async () => {
      const errorData = {
        error: { name: 'TestError', message: 'Test' },
        type: 'system_error'
      };

      await alertingService.processEvent(errorData);
      const activeAlerts = alertingService.getActiveAlerts();
      const alertId = activeAlerts[0].id;
      
      await alertingService.resolveAlert(alertId);

      const history = alertingService.getAlertHistory();
      expect(history).toHaveLength(1);
      expect(history[0].resolved).toBe(true);
      expect(history[0].resolvedAt).toBeDefined();
    });
  });

  describe('Database Query Monitoring', () => {
    test('should monitor database query performance', async () => {
      const { createDatabaseMonitor } = require('../middleware/monitoring');
      const monitor = createDatabaseMonitor();
      
      const logSpy = jest.spyOn(logger, 'debug');
      
      const queryId = 'test-query-1';
      const query = 'SELECT * FROM test_table';
      
      monitor.startQuery(queryId, query);
      
      // Simulate query completion
      setTimeout(() => {
        monitor.endQuery(queryId, { rowCount: 5 });
      }, 100);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(logSpy).toHaveBeenCalledWith(
        'Database query started',
        expect.objectContaining({
          queryId,
          query,
          type: 'db_query_start'
        })
      );
      
      expect(logSpy).toHaveBeenCalledWith(
        'Database query completed',
        expect.objectContaining({
          queryId,
          duration: expect.any(Number),
          rowCount: 5,
          type: 'db_query_end'
        })
      );
      
      logSpy.mockRestore();
    });

    test('should detect and log slow queries', async () => {
      const { createDatabaseMonitor } = require('../middleware/monitoring');
      const monitor = createDatabaseMonitor();
      
      const logSpy = jest.spyOn(logger, 'warn');
      
      const queryId = 'slow-query-1';
      const query = 'SELECT * FROM large_table';
      
      monitor.startQuery(queryId, query);
      
      // Simulate slow query (> 1000ms)
      setTimeout(() => {
        monitor.endQuery(queryId, { rowCount: 1000 });
      }, 1100);
      
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      expect(logSpy).toHaveBeenCalledWith(
        'Slow database query detected',
        expect.objectContaining({
          queryId,
          duration: expect.any(Number),
          type: 'slow_query'
        })
      );
      
      logSpy.mockRestore();
    });
  });

  describe('WebSocket Monitoring', () => {
    test('should monitor WebSocket connections', () => {
      const { websocketMonitor } = require('../middleware/monitoring');
      const logSpy = jest.spyOn(logger, 'info');
      
      const connectionId = 'ws-conn-1';
      const userId = 'user-123';
      
      websocketMonitor.connectionEstablished(connectionId, userId);
      
      expect(logSpy).toHaveBeenCalledWith(
        'WebSocket connection established',
        expect.objectContaining({
          connectionId,
          userId,
          type: 'websocket_connect'
        })
      );
      
      websocketMonitor.connectionClosed(connectionId, userId, 'client_disconnect');
      
      expect(logSpy).toHaveBeenCalledWith(
        'WebSocket connection closed',
        expect.objectContaining({
          connectionId,
          userId,
          reason: 'client_disconnect',
          type: 'websocket_disconnect'
        })
      );
      
      logSpy.mockRestore();
    });
  });

  describe('AI Service Monitoring', () => {
    test('should monitor AI service operations', () => {
      const { aiServiceMonitor } = require('../middleware/monitoring');
      const logSpy = jest.spyOn(logger, 'info');
      
      const operationId = 'ai-op-1';
      const operation = 'optimize_timetable';
      const data = { courses: 10, venues: 5 };
      
      aiServiceMonitor.startOperation(operationId, operation, data);
      
      expect(logSpy).toHaveBeenCalledWith(
        'AI operation started',
        expect.objectContaining({
          operationId,
          operation,
          dataSize: expect.any(Number),
          type: 'ai_operation_start'
        })
      );
      
      const result = { schedule: 'optimized' };
      aiServiceMonitor.endOperation(operationId, operation, result, 2500);
      
      expect(logSpy).toHaveBeenCalledWith(
        'AI operation completed',
        expect.objectContaining({
          operationId,
          operation,
          duration: 2500,
          resultSize: expect.any(Number),
          type: 'ai_operation_end'
        })
      );
      
      logSpy.mockRestore();
    });
  });
});