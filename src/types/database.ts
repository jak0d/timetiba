// Database connection and query types

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMillis?: number;
}

export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
  command: string;
}

import { QueryResultRow } from 'pg';

export interface Transaction {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}