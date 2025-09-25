import { AbstractBaseRepository } from './baseRepository';
import { User, CreateUserRequest } from '../models/user';
import { v4 as uuidv4 } from 'uuid';

export class UserRepository extends AbstractBaseRepository<User> {
  protected tableName = 'users';

  protected getInsertFields(): string[] {
    return ['id', 'email', 'password', 'first_name', 'last_name', 'role', 'is_active', 'tenant_id'];
  }

  protected getUpdateFields(): string[] {
    return ['email', 'password', 'first_name', 'last_name', 'role', 'is_active', 'last_login', 'refresh_token', 'refresh_token_expires_at'];
  }

  protected mapRowToEntity(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      isActive: row.is_active,
      lastLogin: row.last_login,
      refreshToken: row.refresh_token,
      refreshTokenExpiresAt: row.refresh_token_expires_at,
      tenantId: row.tenant_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE email = $1 AND is_active = true
    `;
    const result = await this.db.query(query, [email]);
    return result.rows[0] ? this.mapRowToEntity(result.rows[0]) : null;
  }

  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE refresh_token = $1 
      AND refresh_token_expires_at > NOW() 
      AND is_active = true
    `;
    const result = await this.db.query(query, [refreshToken]);
    return result.rows[0] ? this.mapRowToEntity(result.rows[0]) : null;
  }

  override async create(userData: CreateUserRequest): Promise<User> {
    const query = `
      INSERT INTO ${this.tableName} 
      (id, email, password, first_name, last_name, role, is_active, tenant_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;
    
    const id = uuidv4();
    const values = [
      id,
      userData.email,
      userData.password,
      userData.firstName,
      userData.lastName,
      userData.role,
      true,
      userData.tenantId
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToEntity(result.rows[0]);
  }

  async updateRefreshToken(userId: string, refreshToken: string, expiresAt: Date): Promise<void> {
    const query = `
      UPDATE ${this.tableName} 
      SET refresh_token = $1, refresh_token_expires_at = $2, updated_at = NOW()
      WHERE id = $3
    `;
    await this.db.query(query, [refreshToken, expiresAt, userId]);
  }

  async clearRefreshToken(userId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName} 
      SET refresh_token = NULL, refresh_token_expires_at = NULL, updated_at = NOW()
      WHERE id = $1
    `;
    await this.db.query(query, [userId]);
  }

  async updateLastLogin(userId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName} 
      SET last_login = NOW(), updated_at = NOW()
      WHERE id = $1
    `;
    await this.db.query(query, [userId]);
  }

  async findByTenant(tenantId: string): Promise<User[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `;
    const result = await this.db.query(query, [tenantId]);
    return result.rows.map(row => this.mapRowToEntity(row));
  }
}