import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getDatabase } from './database';

export interface Migration {
  version: string;
  name: string;
  sql: string;
  filename: string;
}

export interface MigrationRecord {
  id: string;
  version: string;
  name: string;
  filename: string;
  executed_at: Date;
  checksum: string;
}

class MigrationRunner {
  private migrationsPath: string;

  constructor(migrationsPath: string = join(__dirname, '../migrations')) {
    this.migrationsPath = migrationsPath;
  }

  /**
   * Create the migrations tracking table if it doesn't exist
   */
  private async createMigrationsTable(): Promise<void> {
    const db = getDatabase();
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        version VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_migrations_version ON migrations(version);
    `;

    await db.query(createTableSQL);
  }

  /**
   * Get all migration files from the migrations directory
   */
  private getMigrationFiles(): Migration[] {
    try {
      const files = readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      return files.map(filename => {
        const filePath = join(this.migrationsPath, filename);
        const sql = readFileSync(filePath, 'utf8');
        
        // Extract version from filename (e.g., "001_create_base_tables.sql" -> "001")
        const versionMatch = filename.match(/^(\d+)_(.+)\.sql$/);
        if (!versionMatch) {
          throw new Error(`Invalid migration filename format: ${filename}`);
        }

        const [, version, name] = versionMatch;
        
        return {
          version: version!,
          name: name!.replace(/_/g, ' '),
          sql,
          filename
        };
      });
    } catch (error) {
      throw new Error(`Failed to read migration files: ${error}`);
    }
  }

  /**
   * Get executed migrations from the database
   */
  private async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const db = getDatabase();
    
    const result = await db.query<MigrationRecord>(
      'SELECT * FROM migrations ORDER BY version'
    );
    
    return result.rows;
  }

  /**
   * Calculate checksum for migration content
   */
  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: Migration): Promise<void> {
    const db = getDatabase();
    
    console.log(`Executing migration ${migration.version}: ${migration.name}`);
    
    await db.transaction(async (trx) => {
      // Execute the migration SQL
      await trx.query(migration.sql);
      
      // Record the migration as executed
      const checksum = this.calculateChecksum(migration.sql);
      await trx.query(
        `INSERT INTO migrations (version, name, filename, checksum) 
         VALUES ($1, $2, $3, $4)`,
        [migration.version, migration.name, migration.filename, checksum]
      );
    });
    
    console.log(`Migration ${migration.version} completed successfully`);
  }

  /**
   * Run all pending migrations
   */
  public async runMigrations(): Promise<void> {
    console.log('Starting database migrations...');
    
    // Ensure migrations table exists
    await this.createMigrationsTable();
    
    // Get all migration files and executed migrations
    const migrationFiles = this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();
    
    // Create a set of executed versions for quick lookup
    const executedVersions = new Set(executedMigrations.map(m => m.version));
    
    // Validate executed migrations (check for changes)
    for (const executed of executedMigrations) {
      const migrationFile = migrationFiles.find(m => m.version === executed.version);
      if (migrationFile) {
        const currentChecksum = this.calculateChecksum(migrationFile.sql);
        if (currentChecksum !== executed.checksum) {
          throw new Error(
            `Migration ${executed.version} has been modified after execution. ` +
            `This is not allowed. Expected checksum: ${executed.checksum}, ` +
            `Current checksum: ${currentChecksum}`
          );
        }
      }
    }
    
    // Find pending migrations
    const pendingMigrations = migrationFiles.filter(
      migration => !executedVersions.has(migration.version)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations found');
      return;
    }
    
    console.log(`Found ${pendingMigrations.length} pending migrations`);
    
    // Execute pending migrations in order
    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }
    
    console.log('All migrations completed successfully');
  }

  /**
   * Get migration status
   */
  public async getMigrationStatus(): Promise<{
    total: number;
    executed: number;
    pending: number;
    migrations: Array<{
      version: string;
      name: string;
      status: 'executed' | 'pending';
      executedAt?: Date;
    }>;
  }> {
    await this.createMigrationsTable();
    
    const migrationFiles = this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();
    
    const executedMap = new Map(
      executedMigrations.map(m => [m.version, m])
    );
    
    const migrations = migrationFiles.map(file => {
      const executed = executedMap.get(file.version);
      const result: {
        version: string;
        name: string;
        status: 'executed' | 'pending';
        executedAt?: Date;
      } = {
        version: file.version,
        name: file.name,
        status: executed ? 'executed' as const : 'pending' as const
      };
      
      if (executed?.executed_at) {
        result.executedAt = executed.executed_at;
      }
      
      return result;
    });
    
    return {
      total: migrationFiles.length,
      executed: executedMigrations.length,
      pending: migrationFiles.length - executedMigrations.length,
      migrations
    };
  }

  /**
   * Reset database (drop all tables) - USE WITH CAUTION
   */
  public async resetDatabase(): Promise<void> {
    const db = getDatabase();
    
    console.log('WARNING: Resetting database - this will drop all tables!');
    
    await db.transaction(async (trx) => {
      // Drop all tables in the correct order to handle foreign key constraints
      const dropTablesSQL = `
        DROP TABLE IF EXISTS resolutions CASCADE;
        DROP TABLE IF EXISTS clash_affected_sessions CASCADE;
        DROP TABLE IF EXISTS clash_affected_entities CASCADE;
        DROP TABLE IF EXISTS clashes CASCADE;
        DROP TABLE IF EXISTS constraint_rules CASCADE;
        DROP TABLE IF EXISTS constraint_entities CASCADE;
        DROP TABLE IF EXISTS constraints CASCADE;
        DROP TABLE IF EXISTS session_student_groups CASCADE;
        DROP TABLE IF EXISTS scheduled_sessions CASCADE;
        DROP TABLE IF EXISTS schedules CASCADE;
        DROP TABLE IF EXISTS course_constraints CASCADE;
        DROP TABLE IF EXISTS course_student_groups CASCADE;
        DROP TABLE IF EXISTS courses CASCADE;
        DROP TABLE IF EXISTS lecturer_preferred_time_slots CASCADE;
        DROP TABLE IF EXISTS lecturer_preferences CASCADE;
        DROP TABLE IF EXISTS lecturer_availability CASCADE;
        DROP TABLE IF EXISTS lecturers CASCADE;
        DROP TABLE IF EXISTS venue_availability CASCADE;
        DROP TABLE IF EXISTS venues CASCADE;
        DROP TABLE IF EXISTS student_groups CASCADE;
        DROP TABLE IF EXISTS migrations CASCADE;
        
        -- Drop custom types
        DROP TYPE IF EXISTS effort_level CASCADE;
        DROP TYPE IF EXISTS resolution_type CASCADE;
        DROP TYPE IF EXISTS clash_type CASCADE;
        DROP TYPE IF EXISTS constraint_type CASCADE;
        DROP TYPE IF EXISTS schedule_status CASCADE;
        DROP TYPE IF EXISTS severity_level CASCADE;
        DROP TYPE IF EXISTS priority_level CASCADE;
        DROP TYPE IF EXISTS frequency_type CASCADE;
        DROP TYPE IF EXISTS accessibility_feature CASCADE;
        DROP TYPE IF EXISTS equipment_type CASCADE;
        DROP TYPE IF EXISTS day_of_week CASCADE;
        
        -- Drop functions
        DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
      `;
      
      await trx.query(dropTablesSQL);
    });
    
    console.log('Database reset completed');
  }
}

// Export singleton instance
export const migrationRunner = new MigrationRunner();

// Convenience functions
export const runMigrations = () => migrationRunner.runMigrations();
export const getMigrationStatus = () => migrationRunner.getMigrationStatus();
export const resetDatabase = () => migrationRunner.resetDatabase();