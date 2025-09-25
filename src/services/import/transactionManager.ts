import { logger } from '../../utils/logger';
import { DatabaseConnection } from '../../utils/database';

export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  timeout?: number; // in milliseconds
  retryAttempts?: number;
  retryDelay?: number;
}

export interface TransactionResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  rollbackReason?: string;
}

export class TransactionManager {
  private static instance: TransactionManager;
  private db: DatabaseConnection;

  private constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  public static getInstance(): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager();
    }
    return TransactionManager.instance;
  }

  public async executeInTransaction<T>(
    operation: (trx: any) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const {
      isolationLevel = 'READ_COMMITTED',
      timeout = 30000,
      retryAttempts = 3,
      retryDelay = 1000
    } = options;

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < retryAttempts) {
      try {
        logger.debug(`Starting transaction attempt ${attempt + 1}`, {
          isolationLevel,
          timeout
        });

        const result = await this.db.transaction(async (trx) => {
          // Set isolation level if specified
          if (isolationLevel !== 'READ_COMMITTED') {
            await trx.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
          }

          // Set timeout if specified
          if (timeout > 0) {
            await trx.query(`SET statement_timeout = ${timeout}`);
          }

          return await operation(trx);
        });

        logger.debug(`Transaction completed successfully on attempt ${attempt + 1}`);
        
        return {
          success: true,
          result
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        logger.warn(`Transaction failed on attempt ${attempt}`, {
          error: lastError.message,
          willRetry: attempt < retryAttempts
        });

        // Check if this is a retryable error
        if (!this.isRetryableError(lastError) || attempt >= retryAttempts) {
          break;
        }

        // Wait before retrying
        if (attempt < retryAttempts) {
          await this.delay(retryDelay * attempt); // Exponential backoff
        }
      }
    }

    logger.error(`Transaction failed after ${retryAttempts} attempts`, {
      error: lastError?.message
    });

    return {
      success: false,
      error: lastError || new Error('Unknown transaction error')
    };
  }

  public async executeBatchInTransaction<T>(
    items: T[],
    batchOperation: (batch: T[], trx: any) => Promise<void>,
    batchSize: number = 100,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<void>> {
    return this.executeInTransaction(async (trx) => {
      logger.info(`Processing ${items.length} items in batches of ${batchSize}`);

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        logger.debug(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
        
        await batchOperation(batch, trx);
      }

      logger.info('Batch processing completed successfully');
    }, options);
  }

  public async executeWithSavepoint<T>(
    operation: (trx: any) => Promise<T>,
    savepointName: string = 'sp_import'
  ): Promise<TransactionResult<T>> {
    return this.executeInTransaction(async (trx) => {
      // Create savepoint
      await trx.query(`SAVEPOINT ${savepointName}`);
      
      try {
        const result = await operation(trx);
        
        // Release savepoint on success
        await trx.query(`RELEASE SAVEPOINT ${savepointName}`);
        
        return result;
      } catch (error) {
        // Rollback to savepoint on error
        await trx.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
        throw error;
      }
    });
  }

  public async executeWithRollbackCondition<T>(
    operation: (trx: any) => Promise<T>,
    rollbackCondition: (result: T) => boolean,
    rollbackReason: string = 'Rollback condition met'
  ): Promise<TransactionResult<T>> {
    return this.executeInTransaction(async (trx) => {
      const result = await operation(trx);
      
      if (rollbackCondition(result)) {
        throw new Error(rollbackReason);
      }
      
      return result;
    });
  }

  public async validateTransactionIntegrity(
    validationQueries: string[],
    trx: any
  ): Promise<boolean> {
    try {
      for (const query of validationQueries) {
        const result = await trx.query(query);
        
        // If any validation query returns no rows or fails, integrity is compromised
        if (!result.rows || result.rows.length === 0) {
          logger.warn('Transaction integrity validation failed', { query });
          return false;
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Transaction integrity validation error', { error });
      return false;
    }
  }

  public async getTransactionStats(trx: any): Promise<{
    activeConnections: number;
    locksHeld: number;
    transactionAge: number;
  }> {
    try {
      // Get active connections
      const connectionsResult = await trx.query(
        'SELECT count(*) as count FROM pg_stat_activity WHERE state = \'active\''
      );
      
      // Get locks held by current transaction
      const locksResult = await trx.query(`
        SELECT count(*) as count 
        FROM pg_locks 
        WHERE pid = pg_backend_pid()
      `);
      
      // Get transaction age
      const ageResult = await trx.query(`
        SELECT EXTRACT(EPOCH FROM (now() - xact_start)) as age
        FROM pg_stat_activity 
        WHERE pid = pg_backend_pid()
      `);

      return {
        activeConnections: parseInt(connectionsResult.rows[0]?.count || '0'),
        locksHeld: parseInt(locksResult.rows[0]?.count || '0'),
        transactionAge: parseFloat(ageResult.rows[0]?.age || '0')
      };
    } catch (error) {
      logger.error('Failed to get transaction stats', { error });
      return {
        activeConnections: 0,
        locksHeld: 0,
        transactionAge: 0
      };
    }
  }

  private isRetryableError(error: Error): boolean {
    const retryableErrorCodes = [
      '40001', // serialization_failure
      '40P01', // deadlock_detected
      '53300', // too_many_connections
      '08006', // connection_failure
      '08000', // connection_exception
    ];

    // Check if error has a PostgreSQL error code
    const pgError = error as any;
    if (pgError.code && retryableErrorCodes.includes(pgError.code)) {
      return true;
    }

    // Check error message for common retryable patterns
    const retryablePatterns = [
      /connection/i,
      /timeout/i,
      /deadlock/i,
      /serialization/i,
      /lock/i
    ];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const transactionManager = TransactionManager.getInstance();