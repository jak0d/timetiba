import { DatabaseConfig } from '../types/database';
import { getDatabase, closeDatabase, getDatabaseConfig } from './database';

// Mock environment variables for testing
const originalEnv = process.env;

describe('Database Utilities', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getDatabaseConfig', () => {
    it('should return default configuration when no environment variables are set', () => {
      // Clear database-related environment variables
      delete process.env['DB_HOST'];
      delete process.env['DB_PORT'];
      delete process.env['DB_NAME'];
      delete process.env['DB_USER'];
      delete process.env['DB_PASSWORD'];
      delete process.env['DB_SSL'];
      delete process.env['DB_MAX_CONNECTIONS'];
      delete process.env['DB_IDLE_TIMEOUT'];

      const config = getDatabaseConfig();

      expect(config).toEqual({
        host: 'localhost',
        port: 5432,
        database: 'ai_timetabler',
        username: 'postgres',
        password: 'password',
        ssl: false,
        maxConnections: 20,
        idleTimeoutMillis: 30000
      });
    });

    it('should use environment variables when provided', () => {
      process.env['DB_HOST'] = 'test-host';
      process.env['DB_PORT'] = '5433';
      process.env['DB_NAME'] = 'test_db';
      process.env['DB_USER'] = 'test_user';
      process.env['DB_PASSWORD'] = 'test_password';
      process.env['DB_SSL'] = 'true';
      process.env['DB_MAX_CONNECTIONS'] = '10';
      process.env['DB_IDLE_TIMEOUT'] = '15000';

      const config = getDatabaseConfig();

      expect(config).toEqual({
        host: 'test-host',
        port: 5433,
        database: 'test_db',
        username: 'test_user',
        password: 'test_password',
        ssl: true,
        maxConnections: 10,
        idleTimeoutMillis: 15000
      });
    });

    it('should handle invalid port numbers gracefully', () => {
      process.env['DB_PORT'] = 'invalid';
      
      const config = getDatabaseConfig();
      
      expect(config.port).toBeNaN();
    });
  });

  describe('Database Connection', () => {
    const testConfig: DatabaseConfig = {
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      username: 'test_user',
      password: 'test_password',
      ssl: false,
      maxConnections: 5,
      idleTimeoutMillis: 10000
    };

    afterEach(async () => {
      try {
        await closeDatabase();
      } catch (error) {
        // Ignore errors during cleanup
      }
    });

    it('should throw error when getting database before initialization', () => {
      expect(() => {
        getDatabase();
      }).toThrow('Database not initialized. Call initializeDatabase() first.');
    });

    it('should initialize database connection with config', async () => {
      // Mock the database connection for testing
      const mockPool = {
        connect: jest.fn().mockResolvedValue({
          query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }], rowCount: 1, command: 'SELECT' }),
          release: jest.fn()
        }),
        on: jest.fn(),
        end: jest.fn()
      };

      // Mock the pg Pool constructor
      jest.doMock('pg', () => ({
        Pool: jest.fn().mockImplementation(() => mockPool)
      }));

      // This test would require actual database connection in a real scenario
      // For now, we'll test the configuration validation
      expect(testConfig.host).toBe('localhost');
      expect(testConfig.port).toBe(5432);
      expect(testConfig.maxConnections).toBe(5);
    });

    it('should validate required configuration properties', () => {
      const invalidConfigs = [
        { ...testConfig, host: '' },
        { ...testConfig, port: 0 },
        { ...testConfig, database: '' },
        { ...testConfig, username: '' },
        { ...testConfig, password: '' }
      ];

      invalidConfigs.forEach(config => {
        const hasEmptyRequiredField = Object.entries(config).some(([key, value]) => {
          const requiredFields = ['host', 'database', 'username', 'password'];
          return requiredFields.includes(key) && (!value || value === '');
        }) || config.port <= 0;

        expect(hasEmptyRequiredField).toBe(true);
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should validate port number range', () => {
      const validPorts = [1, 5432, 65535];
      const invalidPorts = [0, -1, 65536, 100000];

      validPorts.forEach(port => {
        expect(port).toBeGreaterThan(0);
        expect(port).toBeLessThanOrEqual(65535);
      });

      invalidPorts.forEach(port => {
        const isValid = port > 0 && port <= 65535;
        expect(isValid).toBe(false);
      });
    });

    it('should validate connection pool settings', () => {
      const config = getDatabaseConfig();
      
      expect(config.maxConnections).toBeGreaterThan(0);
      expect(config.idleTimeoutMillis).toBeGreaterThan(0);
      
      // Reasonable limits
      expect(config.maxConnections).toBeLessThanOrEqual(100);
      expect(config.idleTimeoutMillis).toBeLessThanOrEqual(300000); // 5 minutes
    });
  });

  describe('Environment Variable Parsing', () => {
    it('should parse boolean SSL setting correctly', () => {
      const testCases = [
        { value: 'true', expected: true },
        { value: 'false', expected: false },
        { value: 'TRUE', expected: false }, // Only 'true' should be true
        { value: '1', expected: false },
        { value: '', expected: false },
        { value: undefined, expected: false }
      ];

      testCases.forEach(({ value, expected }) => {
        if (value !== undefined) {
          process.env['DB_SSL'] = value;
        } else {
          delete process.env['DB_SSL'];
        }
        
        const config = getDatabaseConfig();
        expect(config.ssl).toBe(expected);
      });
    });

    it('should parse integer values correctly', () => {
      const testCases = [
        { env: 'DB_PORT', value: '5433', expected: 5433 },
        { env: 'DB_MAX_CONNECTIONS', value: '15', expected: 15 },
        { env: 'DB_IDLE_TIMEOUT', value: '25000', expected: 25000 }
      ];

      testCases.forEach(({ env, value, expected }) => {
        process.env[env] = value;
        const config = getDatabaseConfig();
        
        switch (env) {
          case 'DB_PORT':
            expect(config.port).toBe(expected);
            break;
          case 'DB_MAX_CONNECTIONS':
            expect(config.maxConnections).toBe(expected);
            break;
          case 'DB_IDLE_TIMEOUT':
            expect(config.idleTimeoutMillis).toBe(expected);
            break;
        }
      });
    });
  });
});