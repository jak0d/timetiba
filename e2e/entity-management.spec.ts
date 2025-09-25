import { test, expect } from '@playwright/test';
import { TestDataHelper, testVenues, testLecturers, testCourses, testStudentGroups } from './fixtures/test-data';

test.describe('Entity Management', () => {
  let helper: TestDataHelper;

  test.beforeEach(async ({ page }) => {
    helper = new TestDataHelper(page);
    await helper.loginAs('admin');
  });

  test.describe('Venue Management', () => {
    test('should create, edit, and delete venues', async ({ page }) => {
      const venue = testVenues[0];
      
      // Create venue
      await helper.createVenue(venue);
      
      // Verify venue appears in list
      await page.goto('/venues');
      await expect(page.locator(`[data-testid="venue-${venue.name}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="venue-${venue.name}"] .capacity`)).toContainText(venue.capacity.toString());
      
      // Edit venue
      await page.click(`[data-testid="edit-venue-${venue.name}"]`);
      await page.fill('[data-testid="venue-capacity-input"]', '150');
      await page.click('[data-testid="save-venue-button"]');
      
      // Verify edit
      await expect(page.locator(`[data-testid="venue-${venue.name}"] .capacity`)).toContainText('150');
      
      // Delete venue
      await page.click(`[data-testid="delete-venue-${venue.name}"]`);
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Verify deletion
      await expect(page.locator(`[data-testid="venue-${venue.name}"]`)).not.toBeVisible();
    });

    test('should validate venue form inputs', async ({ page }) => {
      await page.goto('/venues');
      await page.click('[data-testid="add-venue-button"]');
      
      // Try to save without required fields
      await page.click('[data-testid="save-venue-button"]');
      
      // Verify validation errors
      await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
      await expect(page.locator('[data-testid="capacity-error"]')).toContainText('Capacity is required');
      
      // Test invalid capacity
      await page.fill('[data-testid="venue-capacity-input"]', '-10');
      await page.click('[data-testid="save-venue-button"]');
      await expect(page.locator('[data-testid="capacity-error"]')).toContainText('Capacity must be positive');
    });
  });

  test.describe('Lecturer Management', () => {
    test('should create lecturer with availability settings', async ({ page }) => {
      const lecturer = testLecturers[0];
      
      await helper.createLecturer(lecturer);
      
      // Set availability
      await page.goto('/lecturers');
      await page.click(`[data-testid="edit-lecturer-${lecturer.email}"]`);
      await page.click('[data-testid="availability-tab"]');
      
      // Block Monday 9-10 AM
      await page.click('[data-testid="time-slot-monday-9"]');
      await page.click('[data-testid="save-availability-button"]');
      
      // Verify availability is saved
      await expect(page.locator('[data-testid="time-slot-monday-9"]')).toHaveClass(/blocked/);
    });

    test('should handle lecturer preferences', async ({ page }) => {
      const lecturer = testLecturers[0];
      await helper.createLecturer(lecturer);
      
      await page.goto('/lecturers');
      await page.click(`[data-testid="edit-lecturer-${lecturer.email}"]`);
      await page.click('[data-testid="preferences-tab"]');
      
      // Set preferences
      await page.fill('[data-testid="max-hours-per-day"]', '6');
      await page.fill('[data-testid="preferred-start-time"]', '09:00');
      await page.fill('[data-testid="preferred-end-time"]', '17:00');
      await page.click('[data-testid="save-preferences-button"]');
      
      // Verify preferences are saved
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });
  });

  test.describe('Course Management', () => {
    test('should create course with requirements', async ({ page }) => {
      // First create a lecturer
      await helper.createLecturer(testLecturers[0]);
      
      const course = testCourses[0];
      await helper.createCourse(course);
      
      // Verify course details
      await page.goto('/courses');
      await expect(page.locator(`[data-testid="course-${course.code}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="course-${course.code}"] .duration`)).toContainText(`${course.duration} min`);
    });

    test('should assign student groups to courses', async ({ page }) => {
      // Create prerequisites
      await helper.createLecturer(testLecturers[0]);
      await helper.createStudentGroup(testStudentGroups[0]);
      await helper.createCourse(testCourses[0]);
      
      // Assign student group to course
      await page.goto('/courses');
      await page.click(`[data-testid="edit-course-${testCourses[0].code}"]`);
      await page.click('[data-testid="student-groups-tab"]');
      await page.click(`[data-testid="assign-group-${testStudentGroups[0].name}"]`);
      await page.click('[data-testid="save-assignments-button"]');
      
      // Verify assignment
      await expect(page.locator(`[data-testid="assigned-group-${testStudentGroups[0].name}"]`)).toBeVisible();
    });
  });

  test.describe('Student Group Management', () => {
    test('should create and manage student groups', async ({ page }) => {
      const group = testStudentGroups[0];
      await helper.createStudentGroup(group);
      
      // Verify group in list
      await page.goto('/student-groups');
      await expect(page.locator(`[data-testid="group-${group.name}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="group-${group.name}"] .size`)).toContainText(group.size.toString());
    });
  });
});