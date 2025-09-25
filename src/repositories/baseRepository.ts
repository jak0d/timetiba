import { QueryResultRow } from 'pg';
import { getDatabase } from '../utils/database';
import { BaseEntity } from '../models/common';

export interface BaseRepository<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  findAll(filters?: Record<string, unknown>): Promise<T[]>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
  count(filters?: Record<string, unknown>): Promise<number>;
}

export abstract class AbstractBaseRepository<T extends BaseEntity> implements BaseRepository<T> {
  protected abstract tableName: string;
  protected abstract mapRowToEntity(row: QueryResultRow): T;
  protected abstract getInsertFields(): string[];
  protected abstract getUpdateFields(): string[];

  public get db() {
    return getDatabase();
  }

  async findById(id: string): Promise<T | null> {
    const result = await this.db.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows[0]!);
  }

  async findAll(filters: Record<string, unknown> = {}): Promise<T[]> {
    let query = `SELECT * FROM ${this.tableName} WHERE is_active = true`;
    const params: unknown[] = [];
    let paramIndex = 1;

    // Build WHERE clause from filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query += ` AND ${key} = $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRowToEntity(row));
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const fields = this.getInsertFields();
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
    const values = fields.map(field => (data as any)[field]);

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return this.mapRowToEntity(result.rows[0]!);
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T | null> {
    const updateFields = this.getUpdateFields().filter(field => 
      data.hasOwnProperty(field) && (data as any)[field] !== undefined
    );

    if (updateFields.length === 0) {
      return this.findById(id);
    }

    const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [id, ...updateFields.map(field => (data as any)[field])];

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows[0]!);
  }

  async delete(id: string): Promise<boolean> {
    // Soft delete by setting is_active to false
    const result = await this.db.query(
      `UPDATE ${this.tableName} SET is_active = false WHERE id = $1 AND is_active = true`,
      [id]
    );

    return result.rowCount > 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT 1 FROM ${this.tableName} WHERE id = $1 AND is_active = true`,
      [id]
    );

    return result.rows.length > 0;
  }

  async count(filters: Record<string, unknown> = {}): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_active = true`;
    const params: unknown[] = [];
    let paramIndex = 1;

    // Build WHERE clause from filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query += ` AND ${key} = $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }

    const result = await this.db.query<{ count: string }>(query, params);
    return parseInt(result.rows[0]!.count, 10);
  }

  protected buildWhereClause(filters: Record<string, unknown>): { clause: string; params: unknown[] } {
    const conditions: string[] = ['is_active = true'];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle array values (e.g., for IN clauses)
          const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
          conditions.push(`${key} = ANY(ARRAY[${placeholders}])`);
          params.push(...value);
        } else {
          conditions.push(`${key} = $${paramIndex++}`);
          params.push(value);
        }
      }
    }

    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  }
}