import { test, expect } from '@playwright/test';
import { TestDataHelper } from './fixtures/test-data';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Compliance', () => {
  let helper: TestDataHelper;

  test.beforeEach(async ({ page }) => {
    helper = new TestDataHelper(page);
    await helper.loginAs('admin');
  });

  test('should pass accessibility audit on login page', async ({ page }) => {
    await page.goto('/login');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass accessibility audit on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass accessibility audit on venue management', async ({ page }) => {
    await page.goto('/venues');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Test venue form accessibility
    await page.click('[data-testid="add-venue-button"]');
    
    const formScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(formScanResults.violations).toEqual([]);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/venues');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Navigate to add button
    let focusedElement = await page.locator(':focus').getAttribute('data-testid');
    while (focusedElement !== 'add-venue-button') {
      await page.keyboard.press('Tab');
      focusedElement = await page.locator(':focus').getAttribute('data-testid');
      
      // Prevent infinite loop
      if (!focusedElement) break;
    }
    
    // Activate add button with keyboard
    await page.keyboard.press('Enter');
    
    // Verify form opened
    await expect(page.locator('[data-testid="venue-form"]')).toBeVisible();
    
    // Test form navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="venue-name-input"]:focus')).toBeVisible();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="venue-capacity-input"]:focus')).toBeVisible();
  });

  test('should support screen reader labels', async ({ page }) => {
    await page.goto('/venues');
    await page.click('[data-testid="add-venue-button"]');
    
    // Check form labels
    const nameInput = page.locator('[data-testid="venue-name-input"]');
    const nameLabel = await nameInput.getAttribute('aria-label') || await page.locator('label[for="venue-name"]').textContent();
    expect(nameLabel).toBeTruthy();
    
    const capacityInput = page.locator('[data-testid="venue-capacity-input"]');
    const capacityLabel = await capacityInput.getAttribute('aria-label') || await page.locator('label[for="venue-capacity"]').textContent();
    expect(capacityLabel).toBeTruthy();
    
    // Check button labels
    const saveButton = page.locator('[data-testid="save-venue-button"]');
    const saveButtonLabel = await saveButton.getAttribute('aria-label') || await saveButton.textContent();
    expect(saveButtonLabel).toBeTruthy();
  });

  test('should provide proper focus management in modals', async ({ page }) => {
    await page.goto('/venues');
    await page.click('[data-testid="add-venue-button"]');
    
    // Focus should be trapped in modal
    const modal = page.locator('[data-testid="venue-form-modal"]');
    await expect(modal).toBeVisible();
    
    // First focusable element should be focused
    await expect(page.locator('[data-testid="venue-name-input"]')).toBeFocused();
    
    // Tab to last element and verify focus wraps
    await page.keyboard.press('Shift+Tab');
    const lastFocusable = page.locator('[data-testid="cancel-button"]');
    await expect(lastFocusable).toBeFocused();
    
    // Escape should close modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    
    // Focus should return to trigger button
    await expect(page.locator('[data-testid="add-venue-button"]')).toBeFocused();
  });

  test('should support high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    
    await page.goto('/dashboard');
    
    // Check that elements are still visible and have sufficient contrast
    const mainContent = page.locator('[data-testid="main-content"]');
    await expect(mainContent).toBeVisible();
    
    // Check button visibility
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        // Button should have visible text or aria-label
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        expect(text || ariaLabel).toBeTruthy();
      }
    }
  });

  test('should support reduced motion preferences', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.goto('/timetables');
    
    // Animations should be disabled or reduced
    const animatedElements = page.locator('[data-testid*="animation"], .animate, .transition');
    const count = await animatedElements.count();
    
    for (let i = 0; i < count; i++) {
      const element = animatedElements.nth(i);
      const animationDuration = await element.evaluate(el => 
        getComputedStyle(el).animationDuration
      );
      
      // Animation duration should be 0 or very short
      expect(animationDuration === '0s' || animationDuration === '0.01s').toBeTruthy();
    }
  });

  test('should provide proper error announcements', async ({ page }) => {
    await page.goto('/venues');
    await page.click('[data-testid="add-venue-button"]');
    
    // Submit form without required fields
    await page.click('[data-testid="save-venue-button"]');
    
    // Error messages should have proper ARIA attributes
    const errorMessage = page.locator('[data-testid="name-error"]');
    await expect(errorMessage).toBeVisible();
    
    const ariaLive = await errorMessage.getAttribute('aria-live');
    expect(ariaLive).toBe('polite');
    
    const role = await errorMessage.getAttribute('role');
    expect(role).toBe('alert');
  });

  test('should support zoom up to 200%', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Simulate 200% zoom
    await page.setViewportSize({ width: 640, height: 480 }); // Simulate zoomed viewport
    
    // Content should still be accessible
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    
    // Navigation should still work
    await expect(page.locator('[data-testid="navigation-menu"]')).toBeVisible();
    
    // Text should not be cut off
    const textElements = page.locator('p, span, div').filter({ hasText: /.+/ });
    const count = await textElements.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) { // Check first 10 text elements
      const element = textElements.nth(i);
      const isVisible = await element.isVisible();
      if (isVisible) {
        const boundingBox = await element.boundingBox();
        expect(boundingBox?.width).toBeGreaterThan(0);
      }
    }
  });

  test('should provide proper heading structure', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    
    expect(headingCount).toBeGreaterThan(0);
    
    // Should have at least one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    
    // Check heading order (simplified check)
    const firstHeading = headings.first();
    const tagName = await firstHeading.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('h1');
  });

  test('should support alternative text for images', async ({ page }) => {
    await page.goto('/dashboard');
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i);
      const alt = await image.getAttribute('alt');
      const ariaLabel = await image.getAttribute('aria-label');
      const role = await image.getAttribute('role');
      
      // Image should have alt text, aria-label, or be marked as decorative
      expect(alt !== null || ariaLabel !== null || role === 'presentation').toBeTruthy();
    }
  });

  test('should provide proper form validation feedback', async ({ page }) => {
    await page.goto('/lecturers');
    await page.click('[data-testid="add-lecturer-button"]');
    
    // Fill invalid email
    await page.fill('[data-testid="lecturer-email-input"]', 'invalid-email');
    await page.click('[data-testid="save-lecturer-button"]');
    
    // Check validation message accessibility
    const emailError = page.locator('[data-testid="email-error"]');
    await expect(emailError).toBeVisible();
    
    // Error should be associated with input
    const emailInput = page.locator('[data-testid="lecturer-email-input"]');
    const ariaDescribedBy = await emailInput.getAttribute('aria-describedby');
    const errorId = await emailError.getAttribute('id');
    
    expect(ariaDescribedBy).toContain(errorId || '');
    
    // Input should be marked as invalid
    const ariaInvalid = await emailInput.getAttribute('aria-invalid');
    expect(ariaInvalid).toBe('true');
  });

  test('should support timetable accessibility', async ({ page }) => {
    await helper.createVenue({ name: 'Test Venue', capacity: 50, equipment: [], location: 'Test' });
    await helper.createLecturer({ name: 'Test Lecturer', email: 'test@test.com', department: 'CS', subjects: ['Test'] });
    await helper.createCourse({ name: 'Test Course', code: 'CS101', duration: 90, frequency: 'weekly', lecturerEmail: 'test@test.com' });
    
    await page.goto('/timetables');
    await page.click('[data-testid="create-timetable-button"]');
    await page.fill('[data-testid="timetable-name-input"]', 'Accessibility Test');
    await page.click('[data-testid="create-button"]');
    
    // Add session
    await page.click('[data-testid="add-session-button"]');
    await page.selectOption('[data-testid="session-course-select"]', 'CS101');
    await page.selectOption('[data-testid="session-venue-select"]', 'Test Venue');
    await page.selectOption('[data-testid="session-day-select"]', 'monday');
    await page.fill('[data-testid="session-start-time"]', '09:00');
    await page.click('[data-testid="save-session-button"]');
    
    // Check timetable grid accessibility
    const timetableGrid = page.locator('[data-testid="timetable-grid"]');
    
    // Grid should have proper table structure
    const table = timetableGrid.locator('table');
    await expect(table).toBeVisible();
    
    // Should have table headers
    const headers = table.locator('th');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(0);
    
    // Sessions should have proper labels
    const session = page.locator('[data-testid="session-monday-9"]');
    const sessionLabel = await session.getAttribute('aria-label');
    expect(sessionLabel).toContain('Test Course');
    expect(sessionLabel).toContain('Monday');
    expect(sessionLabel).toContain('09:00');
  });
});