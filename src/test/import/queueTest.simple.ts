// Simple test to verify queue functionality
import { importQueueManager } from '../../services/import/queueConfig';
import { importJobWorker } from '../../services/import/importJobWorker';
import { ImportJob, ImportStatus, ImportStage } from '../../types/import';

async function testQueue() {
  try {
    console.log('Testing queue functionality...');
    
    // Initialize queue
    await importQueueManager.initialize();
    console.log('✓ Queue initialized');
    
    // Create a test job
    const testJob: ImportJob = {
      id: 'test-job-123',
      userId: 'test-user',
      fileId: 'test-file',
      mappingConfig: {
        id: 'test-mapping',
        name: 'Test Mapping',
        fileType: 'csv',
        mappings: [],
        createdAt: new Date(),
        lastUsed: new Date()
      },
      validationResult: {
        isValid: true,
        errors: [],
        warnings: [],
        entityCounts: {
          venues: { new: 1, existing: 0 },
          lecturers: { new: 1, existing: 0 },
          courses: { new: 1, existing: 0 },
          studentGroups: { new: 1, existing: 0 },
          schedules: { new: 1, conflicts: 0 }
        }
      },
      status: ImportStatus.PENDING,
      progress: {
        totalRows: 5,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        currentStage: ImportStage.PARSING
      },
      createdAt: new Date()
    };
    
    // Add job to queue
    const queueJob = await importQueueManager.addImportJob(testJob);
    console.log('✓ Job added to queue:', queueJob.id);
    
    // Get queue stats
    const stats = await importQueueManager.getQueueStats();
    console.log('✓ Queue stats:', stats);
    
    // Start worker
    await importJobWorker.start();
    console.log('✓ Worker started');
    
    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get worker stats
    const workerStats = await importJobWorker.getWorkerStats();
    console.log('✓ Worker stats:', workerStats);
    
    // Stop worker
    await importJobWorker.stop();
    console.log('✓ Worker stopped');
    
    // Shutdown queue
    await importQueueManager.shutdown();
    console.log('✓ Queue shutdown');
    
    console.log('All tests passed!');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testQueue().then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}