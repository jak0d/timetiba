import { test, expect } from '@playwright/test';
import { TestDataHelper, testVenues, testLecturers, testCourses, testStudentGroups } from './fixtures/test-data';
import { promises as fs } from 'fs';
import path from 'path';

test.describe('Export and Sharing', () => {
  let helper: TestDataHelper;

  test.beforeEach(async ({ page }) => {
    helper = new TestDataHelper(page);
    await helper.loginAs('admin');
    
    // Set up test data and create a timetable
    await helper.createVenue(testVenues[0]);
    await helper.createLecturer(testLecturers[0]);
    await helper.createStudentGroup(testStudentGroups[0]);
    await helper.createCourse(testCourses[0]);
    
    // Create timetable with session
    await page.goto('/timetables');
    await page.click('[data-testid="create-timetable-button"]');
    await page.fill('[data-testid="timetable-name-input"]', 'Export Test Timetable');
    await page.click('[data-testid="create-button"]');
    
    await page.click('[data-testid="add-session-button"]');
    await page.selectOption('[data-testid="session-course-select"]', testCourses[0].code);
    await page.selectOption('[data-testid="session-venue-select"]', testVenues[0].name);
    await page.selectOption('[data-testid="session-day-select"]', 'monday');
    await page.fill('[data-testid="session-start-time"]', '09:00');
    await page.click('[data-testid="save-session-button"]');
  });

  test('should export timetable as PDF', async ({ page }) => {
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-button"]');
    await page.click('[data-testid="export-pdf-button"]');
    
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/Export Test Timetable.*\.pdf$/);
    
    // Save and verify file exists
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    const stats = await fs.stat(downloadPath);
    expect(stats.size).toBeGreaterThan(0);
    
    // Clean up
    await fs.unlink(downloadPath);
  });

  test('should export timetable as Excel', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-button"]');
    await page.click('[data-testid="export-excel-button"]');
    
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/Export Test Timetable.*\.xlsx$/);
    
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    const stats = await fs.stat(downloadPath);
    expect(stats.size).toBeGreaterThan(0);
    
    await fs.unlink(downloadPath);
  });

  test('should export timetable as CSV', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-button"]');
    await page.click('[data-testid="export-csv-button"]');
    
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/Export Test Timetable.*\.csv$/);
    
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    // Verify CSV content
    const content = await fs.readFile(downloadPath, 'utf-8');
    expect(content).toContain('Course,Lecturer,Venue,Day,Start Time,End Time');
    expect(content).toContain(testCourses[0].name);
    expect(content).toContain(testVenues[0].name);
    
    await fs.unlink(downloadPath);
  });

  test('should export timetable as iCal', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-button"]');
    await page.click('[data-testid="export-ical-button"]');
    
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/Export Test Timetable.*\.ics$/);
    
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    // Verify iCal content
    const content = await fs.readFile(downloadPath, 'utf-8');
    expect(content).toContain('BEGIN:VCALENDAR');
    expect(content).toContain('BEGIN:VEVENT');
    expect(content).toContain(testCourses[0].name);
    expect(content).toContain('END:VCALENDAR');
    
    await fs.unlink(downloadPath);
  });

  test('should export filtered timetable views', async ({ page }) => {
    // Apply lecturer filter
    await page.selectOption('[data-testid="view-filter"]', 'lecturer');
    await page.selectOption('[data-testid="lecturer-filter"]', testLecturers[0].email);
    
    // Export filtered view
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-button"]');
    await page.click('[data-testid="export-pdf-button"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('Lecturer View');
    
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    const stats = await fs.stat(downloadPath);
    expect(stats.size).toBeGreaterThan(0);
    
    await fs.unlink(downloadPath);
  });

  test('should export with date range filter', async ({ page }) => {
    // Set date range
    await page.fill('[data-testid="start-date-filter"]', '2024-01-01');
    await page.fill('[data-testid="end-date-filter"]', '2024-01-31');
    await page.click('[data-testid="apply-date-filter"]');
    
    // Export with date filter
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-button"]');
    await page.click('[data-testid="export-csv-button"]');
    
    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    // Verify date filtering in CSV
    const content = await fs.readFile(downloadPath, 'utf-8');
    expect(content).toContain('2024-01');
    
    await fs.unlink(downloadPath);
  });

  test('should share timetable via link', async ({ page }) => {
    await page.click('[data-testid="share-button"]');
    
    // Generate share link
    await page.click('[data-testid="generate-share-link"]');
    
    // Verify share link is generated
    await expect(page.locator('[data-testid="share-link"]')).toBeVisible();
    
    const shareLink = await page.locator('[data-testid="share-link"]').inputValue();
    expect(shareLink).toMatch(/^https?:\/\/.+\/shared\/timetables\/.+$/);
    
    // Copy link
    await page.click('[data-testid="copy-share-link"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="copy-success"]')).toBeVisible();
  });

  test('should access shared timetable without authentication', async ({ page, context }) => {
    // Generate share link
    await page.click('[data-testid="share-button"]');
    await page.click('[data-testid="generate-share-link"]');
    const shareLink = await page.locator('[data-testid="share-link"]').inputValue();
    
    // Open new incognito context
    const incognitoContext = await context.browser()?.newContext();
    const incognitoPage = await incognitoContext?.newPage();
    
    if (incognitoPage) {
      // Access shared link without authentication
      await incognitoPage.goto(shareLink);
      
      // Verify timetable is accessible
      await expect(incognitoPage.locator('[data-testid="shared-timetable"]')).toBeVisible();
      await expect(incognitoPage.locator('[data-testid="session-monday-9"]')).toBeVisible();
      
      // Verify no edit capabilities
      await expect(incognitoPage.locator('[data-testid="add-session-button"]')).not.toBeVisible();
      await expect(incognitoPage.locator('[data-testid="edit-session-button"]')).not.toBeVisible();
      
      await incognitoContext?.close();
    }
  });

  test('should configure export preferences', async ({ page }) => {
    await page.click('[data-testid="export-button"]');
    await page.click('[data-testid="export-settings-button"]');
    
    // Configure export settings
    await page.check('[data-testid="include-lecturer-details"]');
    await page.check('[data-testid="include-venue-details"]');
    await page.uncheck('[data-testid="include-student-groups"]');
    await page.selectOption('[data-testid="time-format"]', '12-hour');
    await page.click('[data-testid="save-export-settings"]');
    
    // Export with custom settings
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-csv-button"]');
    
    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    // Verify custom settings applied
    const content = await fs.readFile(downloadPath, 'utf-8');
    expect(content).toContain('AM'); // 12-hour format
    expect(content).toContain(testLecturers[0].name); // Lecturer details included
    expect(content).not.toContain('Student Groups'); // Student groups excluded
    
    await fs.unlink(downloadPath);
  });
});