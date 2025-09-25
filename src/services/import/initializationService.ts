import { logger } from '../../utils/logger';
import { redisManager } from '../../utils/redisConfig';
import { importQueueManager } from './queueConfig';
import { temporaryStorage } from './temporaryStorage';

export class ImportInitializationService {
  private static instance: ImportInitializationService;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): ImportInitializationService {
    if (!ImportInitializationService.instance) {
      ImportInitializationService.instance = new ImportInitializationService();
    }
    return ImportInitializationService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('Import infrastructure already initialized');
      return;
    }

    try {
      logger.info('Initializing import infrastructure...');

      // Initialize temporary storage first (doesn't require Redis)
      logger.info('Initializing temporary storage...');
      await temporaryStorage.initialize();
      logger.info('Temporary storage initialized');

      // Try to initialize Redis connection (optional for basic functionality)
      try {
        logger.info('Connecting to Redis...');
        await redisManager.connect();
        logger.info('Redis connection established');

        // Initialize import queue manager (requires Redis)
        logger.info('Initializing import queue manager...');
        await importQueueManager.initialize();
        logger.info('Import queue manager initialized');
      } catch (redisError) {
        logger.warn('Redis connection failed, continuing without queue functionality:', redisError);
        // Continue without Redis - basic file upload will still work
      }

      this.isInitialized = true;
      logger.info('Import infrastructure initialization completed successfully');
    } catch (error) {
      logger.error('Failed to initialize import infrastructure:', error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      logger.info('Shutting down import infrastructure...');

      // Shutdown temporary storage
      await temporaryStorage.shutdown();
      logger.info('Temporary storage shut down');

      // Shutdown import queue manager
      await importQueueManager.shutdown();
      logger.info('Import queue manager shut down');

      // Disconnect Redis
      await redisManager.disconnect();
      logger.info('Redis disconnected');

      this.isInitialized = false;
      logger.info('Import infrastructure shutdown completed');
    } catch (error) {
      logger.error('Error during import infrastructure shutdown:', error);
      throw error;
    }
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public async getHealthStatus(): Promise<{
    redis: boolean;
    queue: boolean;
    storage: boolean;
    overall: boolean;
  }> {
    const redis = redisManager.isClientConnected();
    const queue = importQueueManager['isInitialized'] || false;
    const storage = temporaryStorage['cleanupTimer'] !== null;
    
    return {
      redis,
      queue,
      storage,
      overall: redis && queue && storage,
    };
  }
}

// Export singleton instance
export const importInitialization = ImportInitializationService.getInstance();