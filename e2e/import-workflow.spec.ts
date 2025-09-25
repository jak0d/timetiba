import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Import Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to import page
    await page.goto('/import');
    
    // Wait for page to load
    await expect(page.getByText('Import Timetable Data')).toBeVisible();
  });

  test('complete CSV import workflow', async ({ page }) => {
    // Step 1: Upload file
    await test.step('Upload CSV file', async () => {
      const fileInput = page.locator('input[type="file"]');
      const csvPath = path.join(__dirname, 'fixtures', 'sample-timetable.csv');
      
      await fileInput.setInputFiles(csvPath);
      
      // Wait for upload to complete
      await expect(page.getByText('sample-timetable.csv')).toBeVisible();
      await expect(page.getByText('Next')).toBeEnabled();
    });

    // Step 2: Column mapping
    await test.step('Configure column mapping', async () => {
      await page.getByText('Next').click();
      
      // Wait for mapping interface
      await expect(page.getByText('Column Mapping')).toBeVisible();
      
      // Verify auto-mapping suggestions
      await expect(page.getByText('Auto-map')).toBeVisible();
      
      // Check that some mappings are suggested
      const mappingCards = page.locator('[data-testid="mapping-card"]');
      await expect(mappingCards.first()).toBeVisible();
      
      // Verify validation passes
      await expect(page.getByText('Next')).toBeEnabled();
    });

    // Step 3: Data validation
    await test.step('Validate data', async () => {
      await page.getByText('Next').click();
      
      // Wait for validation to complete
      await expect(page.getByText('Data Validation Results')).toBeVisible();
      
      // Check validation summary
      await expect(page.getByText('Total Rows')).toBeVisible();
      await expect(page.getByText('Valid Rows')).toBeVisible();
      
      // Proceed if validation passes
      await expect(page.getByText('Next')).toBeEnabled();
    });

    // Step 4: Preview and review
    await test.step('Preview data and resolve matches', async () => {
      await page.getByText('Next').click();
      
      // Wait for preview interface
      await expect(page.getByText('Data Preview & Validation')).toBeVisible();
      
      // Check data table
      await expect(page.locator('table')).toBeVisible();
      
      // Handle entity matches if any
      const matchChips = page.locator('[data-testid="entity-match-chip"]');
      const matchCount = await matchChips.count();
      
      if (matchCount > 0) {
        // Click on first match to review
        await matchChips.first().click();
        
        // Review match dialog
        await expect(page.getByText('Review Entity Match')).toBeVisible();
        
        // Approve or reject match
        await page.getByText('Cancel').click();
      }
      
      // Proceed to import
      await expect(page.getByText('Start Import')).toBeEnabled();
    });

    // Step 5: Execute import
    await test.step('Execute import', async () => {
      await page.getByText('Start Import').click();
      
      // Wait for import to start
      await expect(page.getByText('Import Progress')).toBeVisible();
      
      // Check progress indicators
      await expect(page.getByText('Overall Progress')).toBeVisible();
      await expect(page.locator('[role="progressbar"]')).toBeVisible();
      
      // Wait for import to complete (with timeout)
      await expect(page.getByText('Import Completed Successfully!')).toBeVisible({ timeout: 30000 });
    });

    // Step 6: Review results
    await test.step('Review import results', async () => {
      // Check completion message
      await expect(page.getByText('Your data has been imported successfully')).toBeVisible();
      
      // Check import summary
      await expect(page.getByText('Import Summary')).toBeVisible();
      await expect(page.getByText('Successful')).toBeVisible();
      
      // Test navigation options
      await expect(page.getByText('Import Another File')).toBeVisible();
      await expect(page.getByText('View Timetables')).toBeVisible();
    });
  });

  test('handles upload errors gracefully', async ({ page }) => {
    await test.step('Upload invalid file', async () => {
      const fileInput = page.locator('input[type="file"]');
      const invalidPath = path.join(__dirname, 'fixtures', 'invalid-file.txt');
      
      await fileInput.setInputFiles(invalidPath);
      
      // Should show error message
      await expect(page.getByText(/upload failed/i)).toBeVisible();
      
      // Next button should remain disabled
      await expect(page.getByText('Next')).toBeDisabled();
    });
  });

  test('validates required field mappings', async ({ page }) => {
    // Upload valid file first
    const fileInput = page.locator('input[type="file"]');
    const csvPath = path.join(__dirname, 'fixtures', 'sample-timetable.csv');
    await fileInput.setInputFiles(csvPath);
    await expect(page.getByText('Next')).toBeEnabled();
    
    // Go to mapping step
    await page.getByText('Next').click();
    await expect(page.getByText('Column Mapping')).toBeVisible();
    
    // Clear a required mapping
    const firstDropdown = page.locator('select').first();
    await firstDropdown.selectOption('');
    
    // Should show validation error
    await expect(page.getByText(/required field.*not mapped/i)).toBeVisible();
    
    // Next button should be disabled
    await expect(page.getByText('Next')).toBeDisabled();
  });

  test('allows import cancellation', async ({ page }) => {
    // Complete workflow up to import step
    await completeWorkflowToImport(page);
    
    // Start import
    await page.getByText('Start Import').click();
    await expect(page.getByText('Import Progress')).toBeVisible();
    
    // Cancel import
    await page.getByText('Cancel').click();
    
    // Confirm cancellation
    await expect(page.getByText('Cancel Import')).toBeVisible();
    await page.getByText('Cancel Import').click();
    
    // Should return to appropriate state
    await expect(page.getByText('Import cancelled')).toBeVisible();
  });

  test('handles large file imports', async ({ page }) => {
    await test.step('Upload large file', async () => {
      const fileInput = page.locator('input[type="file"]');
      const largePath = path.join(__dirname, 'fixtures', 'large-timetable.csv');
      
      await fileInput.setInputFiles(largePath);
      
      // Should show progress indicator
      await expect(page.locator('[role="progressbar"]')).toBeVisible();
      
      // Wait for upload to complete
      await expect(page.getByText('large-timetable.csv')).toBeVisible({ timeout: 10000 });
    });
  });

  test('preserves workflow state on page refresh', async ({ page }) => {
    // Upload file and go to mapping step
    const fileInput = page.locator('input[type="file"]');
    const csvPath = path.join(__dirname, 'fixtures', 'sample-timetable.csv');
    await fileInput.setInputFiles(csvPath);
    await page.getByText('Next').click();
    
    // Refresh page
    await page.reload();
    
    // Should return to mapping step with file preserved
    await expect(page.getByText('Column Mapping')).toBeVisible();
    await expect(page.getByText('sample-timetable.csv')).toBeVisible();
  });

  test('downloads import report', async ({ page }) => {
    // Complete full import workflow
    await completeFullImportWorkflow(page);
    
    // Download report
    const downloadPromise = page.waitForDownload();
    await page.getByText('Download Report').click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/import-report.*\.(pdf|csv|xlsx)$/);
  });

  test('handles entity matching workflow', async ({ page }) => {
    // Upload file with potential entity matches
    const fileInput = page.locator('input[type="file"]');
    const csvPath = path.join(__dirname, 'fixtures', 'timetable-with-matches.csv');
    await fileInput.setInputFiles(csvPath);
    
    // Complete to preview step
    await page.getByText('Next').click(); // Mapping
    await page.getByText('Next').click(); // Validation
    await page.getByText('Next').click(); // Preview
    
    // Should show entity matches
    await expect(page.getByText('Entity Matching Summary')).toBeVisible();
    
    // Test bulk approval
    await page.getByText('Approve High Confidence').click();
    
    // Verify matches were approved
    await expect(page.getByText(/approved/i)).toBeVisible();
  });
});

// Helper functions
async function completeWorkflowToImport(page: any) {
  const fileInput = page.locator('input[type="file"]');
  const csvPath = path.join(__dirname, 'fixtures', 'sample-timetable.csv');
  
  await fileInput.setInputFiles(csvPath);
  await page.getByText('Next').click(); // Upload -> Mapping
  await page.getByText('Next').click(); // Mapping -> Validation
  await page.getByText('Next').click(); // Validation -> Preview
}

async function completeFullImportWorkflow(page: any) {
  await completeWorkflowToImport(page);
  await page.getByText('Start Import').click();
  await expect(page.getByText('Import Completed Successfully!')).toBeVisible({ timeout: 30000 });
}