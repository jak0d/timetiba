import { test, expect } from '@playwright/test';
import { TestDataHelper, testVenues, testLecturers, testCourses, testStudentGroups } from './fixtures/test-data';

test.describe('Notifications and Real-time Updates', () => {
  let helper: TestDataHelper;

  test.beforeEach(async ({ page }) => {
    helper = new TestDataHelper(page);
    await helper.loginAs('admin');
  });

  test('should show real-time notifications for timetable changes', async ({ page, context }) => {
    // Set up test data
    await helper.createVenue(testVenues[0]);
    await helper.createLecturer(testLecturers[0]);
    await helper.createCourse(testCourses[0]);
    
    // Create timetable
    await page.goto('/timetables');
    await page.click('[data-testid="create-timetable-button"]');
    await page.fill('[data-testid="timetable-name-input"]', 'Notification Test');
    await page.click('[data-testid="create-button"]');
    
    // Open second browser context as lecturer
    const lecturerContext = await context.browser()?.newContext();
    const lecturerPage = await lecturerContext?.newPage();
    
    if (lecturerPage) {
      const lecturerHelper = new TestDataHelper(lecturerPage);
      await lecturerHelper.loginAs('lecturer');
      await lecturerPage.goto('/dashboard');
      
      // Admin adds session affecting lecturer
      await page.click('[data-testid="add-session-button"]');
      await page.selectOption('[data-testid="session-course-select"]', testCourses[0].code);
      await page.selectOption('[data-testid="session-venue-select"]', testVenues[0].name);
      await page.selectOption('[data-testid="session-day-select"]', 'monday');
      await page.fill('[data-testid="session-start-time"]', '09:00');
      await page.click('[data-testid="save-session-button"]');
      
      // Lecturer should receive notification
      await expect(lecturerPage.locator('[data-testid="notification-toast"]')).toBeVisible();
      await expect(lecturerPage.locator('[data-testid="notification-message"]')).toContainText('New session scheduled');
      
      await lecturerContext?.close();
    }
  });

  test('should manage notification preferences', async ({ page }) => {
    await page.goto('/settings');
    await page.click('[data-testid="notifications-tab"]');
    
    // Configure notification preferences
    await page.check('[data-testid="email-notifications"]');
    await page.uncheck('[data-testid="sms-notifications"]');
    await page.check('[data-testid="browser-notifications"]');
    
    // Set notification types
    await page.check('[data-testid="notify-schedule-changes"]');
    await page.check('[data-testid="notify-conflicts"]');
    await page.uncheck('[data-testid="notify-system-updates"]');
    
    // Set notification timing
    await page.selectOption('[data-testid="notification-frequency"]', 'immediate');
    await page.fill('[data-testid="quiet-hours-start"]', '22:00');
    await page.fill('[data-testid="quiet-hours-end"]', '08:00');
    
    await page.click('[data-testid="save-notification-preferences"]');
    
    // Verify preferences saved
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should show notification history', async ({ page }) => {
    await page.goto('/notifications');
    
    // Verify notification panel is visible
    await expect(page.locator('[data-testid="notification-panel"]')).toBeVisible();
    
    // Check for notification categories
    await expect(page.locator('[data-testid="filter-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-unread"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-schedule-changes"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-conflicts"]')).toBeVisible();
    
    // Filter by unread notifications
    await page.click('[data-testid="filter-unread"]');
    
    // Mark notification as read
    if (await page.locator('[data-testid="notification-item"]').first().isVisible()) {
      await page.click('[data-testid="notification-item"]');
      await expect(page.locator('[data-testid="notification-item"]').first()).toHaveClass(/read/);
    }
    
    // Mark all as read
    await page.click('[data-testid="mark-all-read"]');
    await expect(page.locator('[data-testid="unread-count"]')).toContainText('0');
  });

  test('should handle browser notifications', async ({ page, context }) => {
    // Grant notification permission
    await context.grantPermissions(['notifications']);
    
    await page.goto('/settings');
    await page.click('[data-testid="notifications-tab"]');
    await page.check('[data-testid="browser-notifications"]');
    await page.click('[data-testid="save-notification-preferences"]');
    
    // Trigger a notification-worthy event
    await helper.createVenue(testVenues[0]);
    await helper.createLecturer(testLecturers[0]);
    await helper.createCourse(testCourses[0]);
    
    await page.goto('/timetables');
    await page.click('[data-testid="create-timetable-button"]');
    await page.fill('[data-testid="timetable-name-input"]', 'Browser Notification Test');
    await page.click('[data-testid="create-button"]');
    
    // Add session that creates a conflict
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
    
    // Browser notification should appear (we can't directly test this, but we can verify the notification was sent)
    await expect(page.locator('[data-testid="notification-sent-indicator"]')).toBeVisible();
  });

  test('should show connection status for real-time features', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify connection status indicator
    await expect(page.locator('[data-testid="connection-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="connection-status"]')).toHaveClass(/connected/);
    
    // Simulate connection loss (this would require mocking WebSocket)
    await page.evaluate(() => {
      // Simulate WebSocket disconnection
      window.dispatchEvent(new CustomEvent('websocket-disconnect'));
    });
    
    // Verify disconnected state
    await expect(page.locator('[data-testid="connection-status"]')).toHaveClass(/disconnected/);
    await expect(page.locator('[data-testid="connection-message"]')).toContainText('Connection lost');
    
    // Simulate reconnection
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('websocket-connect'));
    });
    
    // Verify reconnected state
    await expect(page.locator('[data-testid="connection-status"]')).toHaveClass(/connected/);
  });

  test('should escalate critical notifications', async ({ page }) => {
    await page.goto('/settings');
    await page.click('[data-testid="notifications-tab"]');
    
    // Enable critical notification escalation
    await page.check('[data-testid="escalate-critical"]');
    await page.check('[data-testid="email-notifications"]');
    await page.check('[data-testid="sms-notifications"]');
    await page.click('[data-testid="save-notification-preferences"]');
    
    // Create a critical scenario (system failure simulation)
    await page.goto('/admin/system');
    await page.click('[data-testid="simulate-critical-error"]');
    
    // Verify critical notification appears
    await expect(page.locator('[data-testid="critical-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="critical-notification"]')).toHaveClass(/critical/);
    await expect(page.locator('[data-testid="notification-message"]')).toContainText('Critical system error');
    
    // Verify escalation indicators
    await expect(page.locator('[data-testid="email-sent-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="sms-sent-indicator"]')).toBeVisible();
  });

  test('should batch notifications to prevent spam', async ({ page }) => {
    await page.goto('/settings');
    await page.click('[data-testid="notifications-tab"]');
    
    // Enable notification batching
    await page.check('[data-testid="batch-notifications"]');
    await page.fill('[data-testid="batch-interval"]', '5'); // 5 minutes
    await page.click('[data-testid="save-notification-preferences"]');
    
    // Create multiple rapid changes
    await helper.createVenue(testVenues[0]);
    await helper.createLecturer(testLecturers[0]);
    await helper.createCourse(testCourses[0]);
    
    await page.goto('/timetables');
    await page.click('[data-testid="create-timetable-button"]');
    await page.fill('[data-testid="timetable-name-input"]', 'Batch Test');
    await page.click('[data-testid="create-button"]');
    
    // Make multiple rapid changes
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="add-session-button"]');
      await page.selectOption('[data-testid="session-course-select"]', testCourses[0].code);
      await page.selectOption('[data-testid="session-venue-select"]', testVenues[0].name);
      await page.selectOption('[data-testid="session-day-select"]', 'monday');
      await page.fill('[data-testid="session-start-time"]', `${9 + i}:00`);
      await page.click('[data-testid="save-session-button"]');
    }
    
    // Verify only one batched notification appears
    await expect(page.locator('[data-testid="notification-toast"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="notification-message"]')).toContainText('5 schedule changes');
  });
});