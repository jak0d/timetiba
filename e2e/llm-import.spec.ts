import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('LLM Import Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the import page
    await page.goto('/import');
    
    // Wait for the page to load
    await expect(page.locator('h4')).toContainText('Import Timetable Data');
  });

  test('should display AI import option after file upload', async ({ page }) => {
    // Upload a sample timetable file
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'sample-llm-timetable.csv');
    
    await fileInput.setInputFiles(filePath);
    
    // Wait for upload to complete
    await expect(page.locator('text=Upload successful')).toBeVisible({ timeout: 10000 });
    
    // Check if AI import option appears
    await expect(page.locator('text=AI-Powered Smart Import')).toBeVisible();
    await expect(page.locator('text=Recommended')).toBeVisible();
    
    // Verify AI import features are listed
    await expect(page.locator('text=Preserves original names')).toBeVisible();
    await expect(page.locator('text=Intelligent entity detection')).toBeVisible();
    await expect(page.locator('text=Automatic column mapping')).toBeVisible();
    await expect(page.locator('text=Contextual understanding')).toBeVisible();
  });

  test('should start LLM analysis when AI import is clicked', async ({ page }) => {
    // Skip if GEMINI_API_KEY is not available
    if (!process.env.GEMINI_API_KEY) {
      test.skip('GEMINI_API_KEY not available for testing');
    }

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'sample-llm-timetable.csv');
    await fileInput.setInputFiles(filePath);
    
    // Wait for upload
    await expect(page.locator('text=Upload successful')).toBeVisible({ timeout: 10000 });
    
    // Click AI import button
    await page.locator('button:has-text("Use AI Import")').click();
    
    // Verify LLM interface appears
    await expect(page.locator('text=AI-Powered Import Analysis')).toBeVisible();
    await expect(page.locator('text=Processing Options')).toBeVisible();
    
    // Check processing options
    await expect(page.locator('text=Preserve Original Names')).toBeVisible();
    await expect(page.locator('text=Create Missing Entities')).toBeVisible();
    
    // Start AI analysis
    await page.locator('button:has-text("Start AI Analysis")').click();
    
    // Wait for analysis to complete (this might take a while with real API)
    await expect(page.locator('text=Analyzing data with AI...')).toBeVisible();
    
    // Check for analysis results (with extended timeout for API call)
    await expect(page.locator('text=Analysis Complete')).toBeVisible({ timeout: 60000 });
  });

  test('should display detected entities after analysis', async ({ page }) => {
    // Mock the API response for faster testing
    await page.route('**/api/import/files/*/llm-process', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'LLM processing completed successfully',
          data: {
            analysis: {
              detectedEntities: {
                venues: [
                  {
                    originalName: 'Room A-101',
                    normalizedName: 'Room A-101',
                    confidence: 0.95,
                    sourceRows: [0],
                    suggestedFields: { capacity: 30, building: 'A' }
                  },
                  {
                    originalName: 'Lab B-202',
                    normalizedName: 'Lab B-202',
                    confidence: 0.90,
                    sourceRows: [1],
                    suggestedFields: { capacity: 25, building: 'B' }
                  }
                ],
                lecturers: [
                  {
                    originalName: 'Dr. Sarah Smith',
                    normalizedName: 'Dr. Sarah Smith',
                    confidence: 0.98,
                    sourceRows: [0, 3, 8],
                    suggestedFields: { 
                      email: 'sarah.smith@university.edu',
                      department: 'Mathematics',
                      title: 'Dr.'
                    }
                  },
                  {
                    originalName: 'Prof. John Johnson',
                    normalizedName: 'Prof. John Johnson',
                    confidence: 0.95,
                    sourceRows: [1],
                    suggestedFields: {
                      email: 'john.johnson@university.edu',
                      department: 'Physics',
                      title: 'Prof.'
                    }
                  }
                ],
                courses: [
                  {
                    originalName: 'Mathematics 101',
                    normalizedName: 'Mathematics 101',
                    confidence: 0.92,
                    sourceRows: [0],
                    suggestedFields: {
                      code: 'MATH101',
                      duration: 90,
                      credits: 3
                    }
                  },
                  {
                    originalName: 'Physics 201',
                    normalizedName: 'Physics 201',
                    confidence: 0.90,
                    sourceRows: [1],
                    suggestedFields: {
                      code: 'PHYS201',
                      duration: 90,
                      credits: 4
                    }
                  }
                ],
                studentGroups: [
                  {
                    originalName: 'Computer Science Year 1',
                    normalizedName: 'Computer Science Year 1',
                    confidence: 0.88,
                    sourceRows: [0, 3, 5],
                    suggestedFields: {
                      size: 25,
                      yearLevel: 1,
                      department: 'Computer Science'
                    }
                  }
                ],
                schedules: [
                  {
                    course: 'Mathematics 101',
                    lecturer: 'Dr. Sarah Smith',
                    venue: 'Room A-101',
                    studentGroups: ['Computer Science Year 1'],
                    timeSlot: {
                      day: 'Monday',
                      startTime: '09:00',
                      endTime: '10:30'
                    },
                    originalRow: 0,
                    confidence: 0.95
                  }
                ]
              },
              confidence: 0.92,
              recommendations: [
                'All entities detected successfully with high confidence',
                'Original naming conventions preserved',
                'Time format is consistent (HH:MM)'
              ],
              dataStructure: {
                format: 'timetable',
                primaryEntityType: 'schedule',
                timeFormat: 'HH:MM'
              }
            }
          }
        })
      });
    });

    // Upload file and start AI import
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'sample-llm-timetable.csv');
    await fileInput.setInputFiles(filePath);
    
    await expect(page.locator('text=Upload successful')).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Use AI Import")').click();
    await page.locator('button:has-text("Start AI Analysis")').click();
    
    // Wait for analysis results
    await expect(page.locator('text=Analysis Complete')).toBeVisible({ timeout: 10000 });
    
    // Check confidence display
    await expect(page.locator('text=92% Confidence')).toBeVisible();
    
    // Check entity counts
    await expect(page.locator('text=Venues')).toBeVisible();
    await expect(page.locator('text=Lecturers')).toBeVisible();
    await expect(page.locator('text=Courses')).toBeVisible();
    await expect(page.locator('text=Student Groups')).toBeVisible();
    
    // Expand entity details
    await page.locator('text=Venues (2)').click();
    await expect(page.locator('text=Room A-101')).toBeVisible();
    await expect(page.locator('text=Lab B-202')).toBeVisible();
    
    await page.locator('text=Lecturers (2)').click();
    await expect(page.locator('text=Dr. Sarah Smith')).toBeVisible();
    await expect(page.locator('text=Prof. John Johnson')).toBeVisible();
    
    // Check recommendations
    await expect(page.locator('text=Recommendations')).toBeVisible();
    await expect(page.locator('text=All entities detected successfully')).toBeVisible();
  });

  test('should create entities when Create Entities button is clicked', async ({ page }) => {
    // Mock both analysis and entity creation APIs
    await page.route('**/api/import/files/*/llm-process', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            analysis: {
              detectedEntities: {
                venues: [{ originalName: 'Room A-101', confidence: 0.95 }],
                lecturers: [{ originalName: 'Dr. Sarah Smith', confidence: 0.98 }],
                courses: [{ originalName: 'Mathematics 101', confidence: 0.92 }],
                studentGroups: [{ originalName: 'Computer Science Year 1', confidence: 0.88 }],
                schedules: [{ course: 'Mathematics 101', confidence: 0.95 }]
              },
              confidence: 0.92,
              recommendations: []
            }
          }
        })
      });
    });

    await page.route('**/api/import/llm-analysis/create-entities', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Entities created successfully from LLM analysis',
          data: {
            mappedData: {
              venues: [{ name: 'Room A-101', capacity: 30 }],
              lecturers: [{ name: 'Dr. Sarah Smith', email: 'sarah.smith@university.edu' }],
              courses: [{ name: 'Mathematics 101', code: 'MATH101' }],
              studentGroups: [{ name: 'Computer Science Year 1', size: 25 }],
              schedules: [{ courseId: 'math101', lecturerId: 'sarah-smith' }]
            },
            summary: {
              totalEntitiesCreated: 4,
              schedulesCreated: 1,
              createdAt: new Date().toISOString()
            }
          }
        })
      });
    });

    // Upload file and complete AI analysis
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'sample-llm-timetable.csv');
    await fileInput.setInputFiles(filePath);
    
    await expect(page.locator('text=Upload successful')).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Use AI Import")').click();
    await page.locator('button:has-text("Start AI Analysis")').click();
    await expect(page.locator('text=Analysis Complete')).toBeVisible({ timeout: 10000 });
    
    // Create entities
    await page.locator('button:has-text("Create Entities")').click();
    
    // Wait for entity creation to complete
    await expect(page.locator('text=Creating entities...')).toBeVisible();
    
    // Should navigate to completion or show success message
    // This depends on the implementation - adjust based on actual behavior
    await expect(page.locator('text=Import Completed Successfully!')).toBeVisible({ timeout: 15000 });
  });

  test('should handle LLM processing errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/import/files/*/llm-process', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'LLM processing failed: API quota exceeded'
        })
      });
    });

    // Upload file and try AI import
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'sample-llm-timetable.csv');
    await fileInput.setInputFiles(filePath);
    
    await expect(page.locator('text=Upload successful')).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Use AI Import")').click();
    await page.locator('button:has-text("Start AI Analysis")').click();
    
    // Should show error message
    await expect(page.locator('text=LLM processing failed')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=API quota exceeded')).toBeVisible();
    
    // Should be able to cancel and go back to regular import
    await page.locator('button:has-text("Cancel")').click();
    
    // Should return to regular import workflow
    await expect(page.locator('text=AI-Powered Smart Import')).toBeVisible();
  });

  test('should allow switching between preserve names options', async ({ page }) => {
    // Upload file and start AI import
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'sample-llm-timetable.csv');
    await fileInput.setInputFiles(filePath);
    
    await expect(page.locator('text=Upload successful')).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Use AI Import")').click();
    
    // Check processing options
    const preserveNamesSwitch = page.locator('input[type="checkbox"]').first();
    const createEntitiesSwitch = page.locator('input[type="checkbox"]').last();
    
    // Verify default states
    await expect(preserveNamesSwitch).toBeChecked();
    await expect(createEntitiesSwitch).toBeChecked();
    
    // Toggle options
    await preserveNamesSwitch.uncheck();
    await expect(preserveNamesSwitch).not.toBeChecked();
    
    await createEntitiesSwitch.uncheck();
    await expect(createEntitiesSwitch).not.toBeChecked();
    
    // Toggle back
    await preserveNamesSwitch.check();
    await createEntitiesSwitch.check();
    
    await expect(preserveNamesSwitch).toBeChecked();
    await expect(createEntitiesSwitch).toBeChecked();
  });
});