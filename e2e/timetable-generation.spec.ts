import { test, expect } from '@playwright/test';
import { TestDataHelper, testVenues, testLecturers, testCourses, testStudentGroups } from './fixtures/test-data';

test.describe('Timetable Generation and Management', () => {
  let helper: TestDataHelper;

  test.beforeEach(async ({ page }) => {
    helper = new TestDataHelper(page);
    await helper.loginAs('admin');
    
    // Set up test data
    await helper.createVenue(testVenues[0]);
    await helper.createVenue(testVenues[1]);
    await helper.createLecturer(testLecturers[0]);
    await helper.createStudentGroup(testStudentGroups[0]);
    await helper.createCourse(testCourses[0]);
  });

  test('should generate basic timetable', async ({ page }) => {
    await page.goto('/timetables');
    
    // Create new timetable
    await page.click('[data-testid="create-timetable-button"]');
    await page.fill('[data-testid="timetable-name-input"]', 'Test Semester 2024');
    await page.fill('[data-testid="academic-period-input"]', 'Spring 2024');
    await page.click('[data-testid="create-button"]');
    
    // Wait for timetable creation
    await expect(page.locator('[data-testid="timetable-grid"]')).toBeVisible();
    
    // Manually add a session
    await page.click('[data-testid="add-session-button"]');
    await page.selectOption('[data-testid="session-course-select"]', testCourses[0].code);
    await page.selectOption('[data-testid="session-venue-select"]', testVenues[0].name);
    await page.selectOption('[data-testid="session-day-select"]', 'monday');
    await page.fill('[data-testid="session-start-time"]', '09:00');
    await page.click('[data-testid="save-session-button"]');
    
    // Verify session appears in timetable
    await expect(page.locator('[data-testid="session-monday-9"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-monday-9"]')).toContainText(testCourses[0].name);
  });

  test('should detect and highlight clashes', async ({ page }) => {
    await page.goto('/timetables');
    await page.click('[data-testid="create-timetable-button"]');
    await page.fill('[data-testid="timetable-name-input"]', 'Clash Test Timetable');
    await page.click('[data-testid="create-button"]');
    
    // Add first session
    await page.click('[data-testid="add-session-button"]');
    await page.selectOption('[data-testid="session-course-select"]', testCourses[0].code);
    await page.selectOption('[data-testid="session-venue-select"]', testVenues[0].name);
    await page.selectOption('[data-testid="session-day-select"]', 'monday');
    await page.fill('[data-testid="session-start-time"]', '09:00');
    await page.click('[data-testid="save-session-button"]');
    
    // Add conflicting session (same venue, same time)
    await page.click('[data-testid="add-session-button"]');
    await page.selectOption('[data-testid="session-course-select"]', testCourses[0].code);
    await page.selectOption('[data-testid="session-venue-select"]', testVenues[0].name);
    await page.selectOption('[data-testid="session-day-select"]', 'monday');
    await page.fill('[data-testid="session-start-time"]', '09:00');
    await page.click('[data-testid="save-session-button"]');
    
    // Verify clash detection
    await expect(page.locator('[data-testid="clash-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="clash-details"]')).toContainText('Venue double-booking detected');
    
    // Verify sessions are highlighted as clashing
    await expect(page.locator('[data-testid="session-monday-9"]')).toHaveClass(/clash/);
  });

  test('should use AI optimization for timetable generation', async ({ page }) => {
    // Create additional test data for optimization
    await helper.createVenue(testVenues[2]);
    await helper.createLecturer(testLecturers[1]);
    await helper.createCourse(testCourses[1]);
    await helper.createCourse(testCourses[2]);
    
    await page.goto('/timetables');
    await page.click('[data-testid="create-timetable-button"]');
    await page.fill('[data-testid="timetable-name-input"]', 'AI Optimized Timetable');
    await page.click('[data-testid="create-button"]');
    
    // Use AI generation
    await page.click('[data-testid="ai-generate-button"]');
    
    // Configure optimization parameters
    await expect(page.locator('[data-testid="optimization-dialog"]')).toBeVisible();
    await page.fill('[data-testid="optimization-weight-efficiency"]', '0.8');
    await page.fill('[data-testid="optimization-weight-preferences"]', '0.6');
    await page.click('[data-testid="start-optimization-button"]');
    
    // Wait for AI processing
    await expect(page.locator('[data-testid="ai-processing-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="optimization-progress"]')).toBeVisible();
    
    // Wait for completion (with timeout)
    await page.waitForSelector('[data-testid="optimization-complete"]', { timeout: 60000 });
    
    // Verify timetable was generated
    await expect(page.locator('[data-testid="timetable-grid"] .session')).toHaveCount(3); // Should have sessions for all courses
    
    // Verify no clashes
    await expect(page.locator('[data-testid="clash-warning"]')).not.toBeVisible();
  });

  test('should handle conflict resolution suggestions', async ({ page }) => {
    await page.goto('/timetables');
    await page.click('[data-testid="create-timetable-button"]');
    await page.fill('[data-testid="timetable-name-input"]', 'Conflict Resolution Test');
    await page.click('[data-testid="create-button"]');
    
    // Create a clash scenario
    await page.click('[data-testid="add-session-button"]');
    await page.selectOption('[data-testid="session-course-select"]', testCourses[0].code);
    await page.selectOption('[data-testid="session-venue-select"]', testVenues[0].name);
    await page.selectOption('[data-testid="session-day-select"]', 'monday');
    await page.fill('[data-testid="session-start-time"]', '09:00');
    await page.click('[data-testid="save-session-button"]');
    
    // Add conflicting session
    await page.click('[data-testid="add-session-button"]');
    await page.selectOption('[data-testid="session-course-select"]', testCourses[0].code);
    await page.selectOption('[data-testid="session-venue-select"]', testVenues[0].name);
    await page.selectOption('[data-testid="session-day-select"]', 'monday');
    await page.fill('[data-testid="session-start-time"]', '09:30');
    await page.click('[data-testid="save-session-button"]');
    
    // Request AI suggestions
    await page.click('[data-testid="resolve-conflicts-button"]');
    
    // Wait for suggestions
    await expect(page.locator('[data-testid="conflict-suggestions"]')).toBeVisible();
    await expect(page.locator('[data-testid="suggestion-item"]')).toHaveCount(3); // Should have multiple suggestions
    
    // Apply first suggestion
    await page.click('[data-testid="apply-suggestion-0"]');
    
    // Verify conflict is resolved
    await expect(page.locator('[data-testid="clash-warning"]')).not.toBeVisible();
  });

  test('should support drag and drop timetable editing', async ({ page }) => {
    await page.goto('/timetables');
    await page.click('[data-testid="create-timetable-button"]');
    await page.fill('[data-testid="timetable-name-input"]', 'Drag Drop Test');
    await page.click('[data-testid="create-button"]');
    
    // Add a session
    await page.click('[data-testid="add-session-button"]');
    await page.selectOption('[data-testid="session-course-select"]', testCourses[0].code);
    await page.selectOption('[data-testid="session-venue-select"]', testVenues[0].name);
    await page.selectOption('[data-testid="session-day-select"]', 'monday');
    await page.fill('[data-testid="session-start-time"]', '09:00');
    await page.click('[data-testid="save-session-button"]');
    
    // Drag session to different time slot
    const session = page.locator('[data-testid="session-monday-9"]');
    const targetSlot = page.locator('[data-testid="time-slot-tuesday-10"]');
    
    await session.dragTo(targetSlot);
    
    // Verify session moved
    await expect(page.locator('[data-testid="session-tuesday-10"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-monday-9"]')).not.toBeVisible();
  });

  test('should filter timetable views by role and entity', async ({ page }) => {
    // Create timetable with sessions
    await page.goto('/timetables');
    await page.click('[data-testid="create-timetable-button"]');
    await page.fill('[data-testid="timetable-name-input"]', 'Filter Test Timetable');
    await page.click('[data-testid="create-button"]');
    
    // Add session
    await page.click('[data-testid="add-session-button"]');
    await page.selectOption('[data-testid="session-course-select"]', testCourses[0].code);
    await page.selectOption('[data-testid="session-venue-select"]', testVenues[0].name);
    await page.selectOption('[data-testid="session-day-select"]', 'monday');
    await page.fill('[data-testid="session-start-time"]', '09:00');
    await page.click('[data-testid="save-session-button"]');
    
    // Test lecturer view filter
    await page.selectOption('[data-testid="view-filter"]', 'lecturer');
    await page.selectOption('[data-testid="lecturer-filter"]', testLecturers[0].email);
    
    // Verify only lecturer's sessions are shown
    await expect(page.locator('[data-testid="session-monday-9"]')).toBeVisible();
    
    // Test venue view filter
    await page.selectOption('[data-testid="view-filter"]', 'venue');
    await page.selectOption('[data-testid="venue-filter"]', testVenues[0].name);
    
    // Verify only venue's sessions are shown
    await expect(page.locator('[data-testid="session-monday-9"]')).toBeVisible();
    
    // Test student group view filter
    await page.selectOption('[data-testid="view-filter"]', 'student-group');
    await page.selectOption('[data-testid="group-filter"]', testStudentGroups[0].name);
    
    // Verify only group's sessions are shown
    await expect(page.locator('[data-testid="session-monday-9"]')).toBeVisible();
  });
});