import { logger } from '../../utils/logger';
import { entityImportService, EntityImportResult } from './entityImportService';
import { 
  MappedImportData, 
  EntityMatchResults 
} from '../../types/import';

export interface BatchProcessingOptions {
  batchSize: number;
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface BatchProcessingProgress {
  totalBatches: number;
  completedBatches: number;
  currentBatch: number;
  totalEntities: number;
  processedEntities: number;
  failedEntities: number;
}

export class BatchEntityProcessor {
  private static instance: BatchEntityProcessor;
  private readonly defaultOptions: BatchProcessingOptions = {
    batchSize: 100,
    maxConcurrency: 2,
    retryAttempts: 3,
    retryDelay: 1000
  };

  private constructor() {}

  public static getInstance(): BatchEntityProcessor {
    if (!BatchEntityProcessor.instance) {
      BatchEntityProcessor.instance = new BatchEntityProcessor();
    }
    return BatchEntityProcessor.instance;
  }

  public async processBatchImport(
    mappedData: MappedImportData,
    matchResults: EntityMatchResults,
    options: Partial<BatchProcessingOptions> = {},
    progressCallback?: (progress: BatchProcessingProgress) => void
  ): Promise<EntityImportResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    logger.info('Starting batch entity processing', {
      batchSize: opts.batchSize,
      maxConcurrency: opts.maxConcurrency,
      totalVenues: mappedData.venues.length,
      totalLecturers: mappedData.lecturers.length,
      totalCourses: mappedData.courses.length,
      totalStudentGroups: mappedData.studentGroups.length
    });

    const totalEntities = mappedData.venues.length + 
                         mappedData.lecturers.length + 
                         mappedData.courses.length + 
                         mappedData.studentGroups.length;

    let processedEntities = 0;
    let failedEntities = 0;

    const result: EntityImportResult = {
      venues: { created: 0, updated: 0, failed: 0, errors: [] },
      lecturers: { created: 0, updated: 0, failed: 0, errors: [] },
      courses: { created: 0, updated: 0, failed: 0, errors: [] },
      studentGroups: { created: 0, updated: 0, failed: 0, errors: [] }
    };

    try {
      // Process venues in batches
      const venueResult = await this.processBatches(
        'venues',
        mappedData.venues,
        matchResults.venues,
        opts,
        (progress) => {
          processedEntities += progress.processedInBatch;
          failedEntities += progress.failedInBatch;
          
          if (progressCallback) {
            progressCallback({
              totalBatches: progress.totalBatches,
              completedBatches: progress.completedBatches,
              currentBatch: progress.currentBatch,
              totalEntities,
              processedEntities,
              failedEntities
            });
          }
        }
      );
      this.mergeResults(result.venues, venueResult);

      // Process lecturers in batches
      const lecturerResult = await this.processBatches(
        'lecturers',
        mappedData.lecturers,
        matchResults.lecturers,
        opts,
        (progress) => {
          processedEntities += progress.processedInBatch;
          failedEntities += progress.failedInBatch;
          
          if (progressCallback) {
            progressCallback({
              totalBatches: progress.totalBatches,
              completedBatches: progress.completedBatches,
              currentBatch: progress.currentBatch,
              totalEntities,
              processedEntities,
              failedEntities
            });
          }
        }
      );
      this.mergeResults(result.lecturers, lecturerResult);

      // Process student groups in batches
      const studentGroupResult = await this.processBatches(
        'studentGroups',
        mappedData.studentGroups,
        matchResults.studentGroups,
        opts,
        (progress) => {
          processedEntities += progress.processedInBatch;
          failedEntities += progress.failedInBatch;
          
          if (progressCallback) {
            progressCallback({
              totalBatches: progress.totalBatches,
              completedBatches: progress.completedBatches,
              currentBatch: progress.currentBatch,
              totalEntities,
              processedEntities,
              failedEntities
            });
          }
        }
      );
      this.mergeResults(result.studentGroups, studentGroupResult);

      // Process courses in batches (last due to dependencies)
      const courseResult = await this.processBatches(
        'courses',
        mappedData.courses,
        matchResults.courses,
        opts,
        (progress) => {
          processedEntities += progress.processedInBatch;
          failedEntities += progress.failedInBatch;
          
          if (progressCallback) {
            progressCallback({
              totalBatches: progress.totalBatches,
              completedBatches: progress.completedBatches,
              currentBatch: progress.currentBatch,
              totalEntities,
              processedEntities,
              failedEntities
            });
          }
        }
      );
      this.mergeResults(result.courses, courseResult);

      logger.info('Batch entity processing completed', {
        totalProcessed: processedEntities,
        totalFailed: failedEntities,
        result
      });

      return result;

    } catch (error) {
      logger.error('Batch entity processing failed:', error);
      throw error;
    }
  }

  private async processBatches<T>(
    entityType: string,
    entities: T[],
    matchResults: Map<number, any>,
    options: BatchProcessingOptions,
    progressCallback?: (progress: {
      totalBatches: number;
      completedBatches: number;
      currentBatch: number;
      processedInBatch: number;
      failedInBatch: number;
    }) => void
  ): Promise<EntityImportResult[keyof EntityImportResult]> {
    if (entities.length === 0) {
      return { created: 0, updated: 0, failed: 0, errors: [] };
    }

    const batches = this.createBatches(entities, options.batchSize);
    const totalBatches = batches.length;
    let completedBatches = 0;

    logger.info(`Processing ${entities.length} ${entityType} in ${totalBatches} batches`);

    const result = { created: 0, updated: 0, failed: 0, errors: [] };

    // Process batches with controlled concurrency
    const semaphore = new Semaphore(options.maxConcurrency);

    const batchPromises = batches.map(async (batch, batchIndex) => {
      await semaphore.acquire();
      
      try {
        const batchResult = await this.processSingleBatch(
          entityType,
          batch,
          this.createBatchMatchResults(matchResults, batchIndex * options.batchSize, batch.length),
          options,
          batchIndex
        );

        completedBatches++;
        
        if (progressCallback) {
          progressCallback({
            totalBatches,
            completedBatches,
            currentBatch: batchIndex + 1,
            processedInBatch: batchResult.created + batchResult.updated + batchResult.failed,
            failedInBatch: batchResult.failed
          });
        }

        return batchResult;
      } finally {
        semaphore.release();
      }
    });

    const batchResults = await Promise.all(batchPromises);

    // Merge all batch results
    for (const batchResult of batchResults) {
      this.mergeResults(result, batchResult);
    }

    return result;
  }

  private async processSingleBatch<T>(
    entityType: string,
    batch: T[],
    batchMatchResults: Map<number, any>,
    options: BatchProcessingOptions,
    batchIndex: number
  ): Promise<EntityImportResult[keyof EntityImportResult]> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < options.retryAttempts) {
      try {
        logger.debug(`Processing batch ${batchIndex + 1} for ${entityType}, attempt ${attempt + 1}`);

        // Create a mini mapped data object for this batch
        const batchMappedData: MappedImportData = {
          venues: entityType === 'venues' ? batch as any[] : [],
          lecturers: entityType === 'lecturers' ? batch as any[] : [],
          courses: entityType === 'courses' ? batch as any[] : [],
          studentGroups: entityType === 'studentGroups' ? batch as any[] : [],
          metadata: {
            sourceFile: 'batch-import',
            mappingConfig: 'batch-config',
            importedAt: new Date(),
            importedBy: 'batch-processor'
          }
        };

        const batchEntityMatchResults = {
          venues: entityType === 'venues' ? batchMatchResults : new Map(),
          lecturers: entityType === 'lecturers' ? batchMatchResults : new Map(),
          courses: entityType === 'courses' ? batchMatchResults : new Map(),
          studentGroups: entityType === 'studentGroups' ? batchMatchResults : new Map()
        };

        const batchResult = await entityImportService.importEntities(
          batchMappedData,
          batchEntityMatchResults
        );

        // Return the result for the specific entity type
        return batchResult[entityType as keyof EntityImportResult];

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;
        
        if (attempt < options.retryAttempts) {
          logger.warn(`Batch ${batchIndex + 1} failed, retrying in ${options.retryDelay}ms`, {
            entityType,
            attempt,
            error: lastError.message
          });
          await this.delay(options.retryDelay);
        }
      }
    }

    // If all retries failed, return a failed result
    logger.error(`Batch ${batchIndex + 1} failed after ${options.retryAttempts} attempts`, {
      entityType,
      error: lastError?.message
    });

    return {
      created: 0,
      updated: 0,
      failed: batch.length,
      errors: [{
        rowIndex: batchIndex * options.batchSize,
        entityType,
        operation: 'create',
        error: lastError?.message || 'Unknown batch processing error',
        data: batch
      }]
    };
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private createBatchMatchResults(
    originalMatchResults: Map<number, any>,
    startIndex: number,
    batchSize: number
  ): Map<number, any> {
    const batchMatchResults = new Map<number, any>();
    
    for (let i = 0; i < batchSize; i++) {
      const originalIndex = startIndex + i;
      const matchResult = originalMatchResults.get(originalIndex);
      if (matchResult) {
        batchMatchResults.set(i, matchResult);
      }
    }
    
    return batchMatchResults;
  }

  private mergeResults(
    target: EntityImportResult[keyof EntityImportResult],
    source: EntityImportResult[keyof EntityImportResult]
  ): void {
    target.created += source.created;
    target.updated += source.updated;
    target.failed += source.failed;
    target.errors.push(...source.errors);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Simple semaphore implementation for controlling concurrency
class Semaphore {
  private permits: number;
  private waitQueue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift();
      if (resolve) {
        this.permits--;
        resolve();
      }
    }
  }
}

// Export singleton instance
export const batchEntityProcessor = BatchEntityProcessor.getInstance();