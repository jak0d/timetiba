import { redisManager } from '../../utils/redisConfig';
import { importQueueManager } from '../../services/import/queueConfig';
import { temporaryStorage } from '../../services/import/temporaryStorage';
import { importInitialization } from '../../services/import/initializationService';

describe('Import Infrastructure', () => {
  beforeAll(async () => {
    // Skip Redis tests in CI environment if Redis is not available
    if (process.env.CI && !process.env.REDIS_URL) {
      return;
    }
  });

  afterAll(async () => {
    try {
      await importInitialization.shutdown();
    } catch (error) {
      // Ignore shutdown errors in tests
    }
  });

  describe('RedisConnectionManager', () => {
    it('should be able to create an instance', () => {
      expect(redisManager).toBeDefined();
    });

    it('should have connection methods', () => {
      expect(typeof redisManager.connect).toBe('function');
      expect(typeof redisManager.disconnect).toBe('function');
      expect(typeof redisManager.isClientConnected).toBe('function');
    });
  });

  describe('ImportQueueManager', () => {
    it('should be able to create an instance', () => {
      expect(importQueueManager).toBeDefined();
    });

    it('should have queue management methods', () => {
      expect(typeof importQueueManager.initialize).toBe('function');
      expect(typeof importQueueManager.addImportJob).toBe('function');
      expect(typeof importQueueManager.getJobStatus).toBe('function');
      expect(typeof importQueueManager.shutdown).toBe('function');
    });
  });

  describe('TemporaryStorageService', () => {
    it('should be able to create an instance', () => {
      expect(temporaryStorage).toBeDefined();
    });

    it('should have storage methods', () => {
      expect(typeof temporaryStorage.initialize).toBe('function');
      expect(typeof temporaryStorage.storeFile).toBe('function');
      expect(typeof temporaryStorage.getFile).toBe('function');
      expect(typeof temporaryStorage.deleteFile).toBe('function');
      expect(typeof temporaryStorage.shutdown).toBe('function');
    });

    it('should provide storage stats', () => {
      const stats = temporaryStorage.getStorageStats();
      expect(stats).toHaveProperty('totalFiles');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('expiredFiles');
      expect(typeof stats.totalFiles).toBe('number');
      expect(typeof stats.totalSize).toBe('number');
      expect(typeof stats.expiredFiles).toBe('number');
    });
  });

  describe('ImportInitializationService', () => {
    it('should be able to create an instance', () => {
      expect(importInitialization).toBeDefined();
    });

    it('should have initialization methods', () => {
      expect(typeof importInitialization.initialize).toBe('function');
      expect(typeof importInitialization.shutdown).toBe('function');
      expect(typeof importInitialization.isReady).toBe('function');
      expect(typeof importInitialization.getHealthStatus).toBe('function');
    });

    it('should report not ready initially', () => {
      expect(importInitialization.isReady()).toBe(false);
    });
  });

  describe('File Storage', () => {
    beforeEach(async () => {
      await temporaryStorage.initialize();
    });

    afterEach(async () => {
      await temporaryStorage.shutdown();
    });

    it('should store and retrieve files', async () => {
      const testContent = Buffer.from('test,data,content\n1,2,3\n4,5,6');
      const originalName = 'test.csv';
      const mimeType = 'text/csv';

      const storedFile = await temporaryStorage.storeFile(testContent, originalName, mimeType);

      expect(storedFile).toBeDefined();
      expect(storedFile.originalName).toBe(originalName);
      expect(storedFile.size).toBe(testContent.length);
      expect(storedFile.mimeType).toBe(mimeType);

      const retrievedFile = await temporaryStorage.getFile(storedFile.id);
      expect(retrievedFile).toBeDefined();
      expect(retrievedFile!.id).toBe(storedFile.id);

      const fileBuffer = await temporaryStorage.getFileBuffer(storedFile.id);
      expect(fileBuffer).toBeDefined();
      expect(fileBuffer!.toString()).toBe(testContent.toString());

      // Clean up
      await temporaryStorage.deleteFile(storedFile.id);
    });

    it('should reject files that are too large', async () => {
      const largeContent = Buffer.alloc(20 * 1024 * 1024); // 20MB
      const originalName = 'large.csv';
      const mimeType = 'text/csv';

      await expect(
        temporaryStorage.storeFile(largeContent, originalName, mimeType)
      ).rejects.toThrow('File size exceeds maximum allowed size');
    });

    it('should reject files with invalid extensions', async () => {
      const testContent = Buffer.from('test content');
      const originalName = 'test.txt';
      const mimeType = 'text/plain';

      await expect(
        temporaryStorage.storeFile(testContent, originalName, mimeType)
      ).rejects.toThrow('File extension .txt is not allowed');
    });
  });
});