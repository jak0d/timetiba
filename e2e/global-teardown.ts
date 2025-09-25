import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalTeardown(config: FullConfig) {
  console.log('Tearing down E2E test environment...');
  
  try {
    // Clean up test database
    console.log('Cleaning up test database...');
    await execAsync('npm run db:reset');
    
    // Stop any running services
    console.log('Stopping test services...');
    // Note: In a real setup, you'd stop the AI service here
    
    console.log('E2E test environment teardown complete');
  } catch (error) {
    console.error('Failed to tear down E2E test environment:', error);
    // Don't throw here as it might mask test failures
  }
}

export default globalTeardown;