import { test, expect } from '@playwright/test';
import { TestDataHelper, testUsers } from './fixtures/test-data';

test.describe('Authentication', () => {
  test('should allow admin login and logout', async ({ page }) => {
    const helper = new TestDataHelper(page);
    
    // Navigate to login page
    await page.goto('/login');
    
    // Verify login form is visible
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    
    // Login as admin
    await helper.loginAs('admin');
    
    // Verify successful login
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-name"]')).toContainText('Test Administrator');
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Verify logout
    await expect(page).toHaveURL('/login');
  });

  test('should allow lecturer login with restricted access', async ({ page }) => {
    const helper = new TestDataHelper(page);
    
    await helper.loginAs('lecturer');
    
    // Verify lecturer can access their profile
    await page.goto('/profile');
    await expect(page.locator('[data-testid="lecturer-profile"]')).toBeVisible();
    
    // Verify lecturer cannot access admin features
    await page.goto('/users');
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
  });

  test('should handle invalid login credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'invalid@test.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
    
    // Verify still on login page
    await expect(page).toHaveURL('/login');
  });

  test('should redirect to login when accessing protected routes', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});