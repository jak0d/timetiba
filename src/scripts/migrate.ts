#!/usr/bin/env ts-node

import { initializeDatabase, closeDatabase } from '../utils/database';
import { runMigrations, getMigrationStatus, resetDatabase } from '../utils/migrations';

async function main() {
  const command = process.argv[2];
  
  try {
    // Initialize database connection
    await initializeDatabase();
    
    switch (command) {
      case 'up':
      case 'migrate':
        await runMigrations();
        break;
        
      case 'status':
        const status = await getMigrationStatus();
        console.log('\nMigration Status:');
        console.log(`Total migrations: ${status.total}`);
        console.log(`Executed: ${status.executed}`);
        console.log(`Pending: ${status.pending}\n`);
        
        status.migrations.forEach(migration => {
          const statusIcon = migration.status === 'executed' ? '✓' : '○';
          const executedInfo = migration.executedAt 
            ? ` (executed: ${migration.executedAt.toISOString()})`
            : '';
          console.log(`${statusIcon} ${migration.version}: ${migration.name}${executedInfo}`);
        });
        break;
        
      case 'reset':
        console.log('WARNING: This will drop all tables and data!');
        console.log('Are you sure? This action cannot be undone.');
        
        // In a real application, you might want to add a confirmation prompt
        if (process.env.NODE_ENV === 'development' || process.env.FORCE_RESET === 'true') {
          await resetDatabase();
          console.log('Database reset completed. Run "npm run migrate" to recreate tables.');
        } else {
          console.log('Reset cancelled. Set FORCE_RESET=true to proceed.');
        }
        break;
        
      default:
        console.log('Usage: npm run migrate [command]');
        console.log('Commands:');
        console.log('  up, migrate  - Run pending migrations');
        console.log('  status       - Show migration status');
        console.log('  reset        - Reset database (development only)');
        process.exit(1);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}