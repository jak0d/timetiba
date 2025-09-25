import { chromium, FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalSetup(config: FullConfig) {
  console.log('Setting up E2E test environment...');
  
  try {
    // Set up test database
    console.log('Setting up test database...');
    await execAsync('npm run db:reset');
    
    // Seed test data
    console.log('Seeding test data...');
    await execAsync('npm run db:seed:test');
    
    // Start AI service in test mode
    console.log('Starting AI service...');
    // Note: In a real setup, you'd start the AI service here
    
    console.log('E2E test environment setup complete');
  } catch (error) {
    console.error('Failed to set up E2E test environment:', error);
    throw error;
  }
}

export default globalSetup;