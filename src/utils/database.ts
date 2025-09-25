import { Pool, QueryResult as PgQueryResult, QueryResultRow } from 'pg';
import { DatabaseConfig, QueryResult, Transaction } from '../types/database';

class DatabaseConnection {
  private pool: Pool;
  private static instance: DatabaseConnection;

  private constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      max: config.maxConnections || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  public static getInstance(config?: DatabaseConfig): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      if (!config) {
        throw new Error('Database configuration is required for first initialization');
      }
      DatabaseConnection.instance = new DatabaseConnection(config);
    }
    return DatabaseConnection.instance;
  }

  public async query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
    const client = await this.pool.connect();
    try {
      const result: PgQueryResult<T> = await client.query(text, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        command: result.command
      };
    } finally {
      client.release();
    }
  }

  public async transaction<T>(callback: (trx: Transaction) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    const transaction: Transaction = {
      query: async <U extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<U>> => {
        const result: PgQueryResult<U> = await client.query(text, params);
        return {
          rows: result.rows,
          rowCount: result.rowCount || 0,
          command: result.command
        };
      },
      commit: async (): Promise<void> => {
        await client.query('COMMIT');
      },
      rollback: async (): Promise<void> => {
        await client.query('ROLLBACK');
      }
    };

    try {
      await client.query('BEGIN');
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    } finally {
      client.release();
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      return result.rows.length > 0;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public getPool(): Pool {
    return this.pool;
  }
}

// Database configuration from environment variables
export const getDatabaseConfig = (): DatabaseConfig => {
  return {
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432', 10),
    database: process.env['DB_NAME'] || 'ai_timetabler',
    username: process.env['DB_USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || 'password',
    ssl: process.env['DB_SSL'] === 'true',
    maxConnections: parseInt(process.env['DB_MAX_CONNECTIONS'] || '20', 10),
    idleTimeoutMillis: parseInt(process.env['DB_IDLE_TIMEOUT'] || '30000', 10)
  };
};

// Initialize database connection
let dbInstance: DatabaseConnection | null = null;

export const initializeDatabase = async (config?: DatabaseConfig): Promise<DatabaseConnection> => {
  const dbConfig = config || getDatabaseConfig();
  dbInstance = DatabaseConnection.getInstance(dbConfig);
  
  // Test the connection
  const isConnected = await dbInstance.testConnection();
  if (!isConnected) {
    throw new Error('Failed to connect to database');
  }
  
  console.log('Database connection established successfully');
  return dbInstance;
};

export const getDatabase = (): DatabaseConnection => {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbInstance;
};

export const closeDatabase = async (): Promise<void> => {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
};