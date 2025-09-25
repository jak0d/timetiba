import { test, expect } from '@playwright/test';
import { TestDataHelper } from './fixtures/test-data';

test.describe('Load Testing', () => {
  test('should handle multiple concurrent users creating timetables', async ({ browser }) => {
    const concurrentUsers = 5;
    const contexts = [];
    const pages = [];
    const helpers = [];

    // Create multiple browser contexts
    for (let i = 0; i < concurrentUsers; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const helper = new TestDataHelper(page);
      
      contexts.push(context);
      pages.push(page);
      helpers.push(helper);
    }

    try {
      // Login all users concurrently
      await Promise.all(helpers.map(helper => helper.loginAs('admin')));

      // Set up test data for each user
      const setupPromises = helpers.map(async (helper, index) => {
        await helper.createVenue({
          name: `Load Test Venue ${index}`,
          capacity: 50,
          equipment: ['Projector'],
          location: `Building ${index}`
        });
        
        await helper.createLecturer({
          name: `Load Test Lecturer ${index}`,
          email: `loadtest${index}@test.com`,
          department: 'Computer Science',
          subjects: [`Subject ${index}`]
        });
        
        await helper.createCourse({
          name: `Load Test Course ${index}`,
          code: `LT${100 + index}`,
          duration: 90,
          frequency: 'weekly',
          lecturerEmail: `loadtest${index}@test.com`
        });
      });

      await Promise.all(setupPromises);

      // Concurrent timetable creation
      const startTime = Date.now();
      
      const timetablePromises = pages.map(async (page, index) => {
        await page.goto('/timetables');
        await page.click('[data-testid="create-timetable-button"]');
        await page.fill('[data-testid="timetable-name-input"]', `Load Test Timetable ${index}`);
        await page.click('[data-testid="create-button"]');
        
        // Add session
        await page.click('[data-testid="add-session-button"]');
        await page.selectOption('[data-testid="session-course-select"]', `LT${100 + index}`);
        await page.selectOption('[data-testid="session-venue-select"]', `Load Test Venue ${index}`);
        await page.selectOption('[data-testid="session-day-select"]', 'monday');
        await page.fill('[data-testid="session-start-time"]', `${9 + index}:00`);
        await page.click('[data-testid="save-session-button"]');
        
        return page.waitForSelector('[data-testid="success-message"]');
      });

      await Promise.all(timetablePromises);
      
      const totalTime = Date.now() - startTime;
      console.log(`${concurrentUsers} concurrent timetable creations completed in ${totalTime}ms`);
      
      // Verify all timetables were created successfully
      for (let i = 0; i < concurrentUsers; i++) {
        await pages[i].goto('/timetables');
        await expect(pages[i].locator(`[data-testid="timetable-Load Test Timetable ${i}"]`)).toBeVisible();
      }

      // Performance assertion
      expect(totalTime).toBeLessThan(60000); // Should complete within 1 minute

    } finally {
      // Clean up contexts
      await Promise.all(contexts.map(context => context.close()));
    }
  });

  test('should handle rapid API requests without errors', async ({ page }) => {
    const helper = new TestDataHelper(page);
    await helper.loginAs('admin');

    // Create base data
    await helper.createVenue({
      name: 'API Load Test Venue',
      capacity: 100,
      equipment: ['Projector'],
      location: 'Test Building'
    });

    await page.goto('/venues');

    // Perform rapid API requests
    const requestCount = 20;
    const startTime = Date.now();
    
    const requests = [];
    for (let i = 0; i < requestCount; i++) {
      requests.push(
        page.evaluate(async (index) => {
          const response = await fetch('/api/venues', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              name: `Rapid Test Venue ${index}`,
              capacity: 30,
              equipment: ['Whiteboard'],
              location: 'Test Location'
            })
          });
          return response.ok;
        }, i)
      );
    }

    const results = await Promise.all(requests);
    const totalTime = Date.now() - startTime;
    
    console.log(`${requestCount} rapid API requests completed in ${totalTime}ms`);
    
    // Verify all requests succeeded
    const successCount = results.filter(result => result).length;
    expect(successCount).toBe(requestCount);
    
    // Performance assertion
    expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
  });

  test('should handle large dataset pagination efficiently', async ({ page }) => {
    const helper = new TestDataHelper(page);
    await helper.loginAs('admin');

    // Create large dataset
    const itemCount = 100;
    console.log(`Creating ${itemCount} venues for pagination test...`);
    
    const creationPromises = [];
    for (let i = 0; i < itemCount; i++) {
      creationPromises.push(
        helper.createVenue({
          name: `Pagination Test Venue ${i.toString().padStart(3, '0')}`,
          capacity: 20 + (i % 80),
          equipment: ['Projector'],
          location: `Building ${Math.floor(i / 20)}`
        })
      );
    }

    await Promise.all(creationPromises);

    // Test pagination performance
    await page.goto('/venues');
    
    const loadStartTime = Date.now();
    
    // Wait for initial page load
    await page.waitForSelector('[data-testid="venue-list"]');
    
    const initialLoadTime = Date.now() - loadStartTime;
    console.log(`Initial page load: ${initialLoadTime}ms`);
    
    // Test pagination navigation
    const paginationStartTime = Date.now();
    
    // Navigate through pages
    for (let pageNum = 2; pageNum <= 5; pageNum++) {
      await page.click(`[data-testid="page-${pageNum}"]`);
      await page.waitForSelector('[data-testid="venue-list"]');
    }
    
    const paginationTime = Date.now() - paginationStartTime;
    console.log(`Pagination navigation: ${paginationTime}ms`);
    
    // Test search performance
    const searchStartTime = Date.now();
    
    await page.fill('[data-testid="search-input"]', 'Venue 050');
    await page.waitForSelector('[data-testid="venue-list"]');
    
    const searchTime = Date.now() - searchStartTime;
    console.log(`Search performance: ${searchTime}ms`);
    
    // Performance assertions
    expect(initialLoadTime).toBeLessThan(5000);
    expect(paginationTime).toBeLessThan(10000);
    expect(searchTime).toBeLessThan(3000);
  });

  test('should handle WebSocket connection load', async ({ browser }) => {
    const connectionCount = 10;
    const contexts = [];
    const pages = [];

    try {
      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        const helper = new TestDataHelper(page);
        
        await helper.loginAs('admin');
        await page.goto('/dashboard');
        
        contexts.push(context);
        pages.push(page);
      }

      // Verify all connections are established
      for (const page of pages) {
        await expect(page.locator('[data-testid="connection-status"]')).toHaveClass(/connected/);
      }

      // Simulate real-time updates
      const updatePromises = pages.map(async (page, index) => {
        // Trigger an update that should broadcast to all connections
        if (index === 0) {
          await page.goto('/venues');
          await page.click('[data-testid="add-venue-button"]');
          await page.fill('[data-testid="venue-name-input"]', 'WebSocket Test Venue');
          await page.fill('[data-testid="venue-capacity-input"]', '50');
          await page.click('[data-testid="save-venue-button"]');
        }
        
        // Other pages should receive the update
        return page.waitForSelector('[data-testid="notification-toast"]', { timeout: 10000 });
      });

      await Promise.all(updatePromises);
      
      console.log(`${connectionCount} WebSocket connections handled successfully`);

    } finally {
      await Promise.all(contexts.map(context => context.close()));
    }
  });

  test('should handle memory-intensive operations', async ({ page }) => {
    const helper = new TestDataHelper(page);
    await helper.loginAs('admin');

    // Create substantial test data
    const dataSize = 50;
    
    for (let i = 0; i < dataSize; i++) {
      await helper.createVenue({
        name: `Memory Test Venue ${i}`,
        capacity: 100,
        equipment: ['Projector', 'Whiteboard', 'Computer'],
        location: `Building ${Math.floor(i / 10)}, Room ${i % 10}`
      });
    }

    // Perform memory-intensive operations
    await page.goto('/venues');
    
    // Rapid filtering and sorting
    for (let i = 0; i < 50; i++) {
      await page.fill('[data-testid="search-input"]', `Venue ${i % dataSize}`);
      await page.waitForTimeout(50);
      
      if (i % 10 === 0) {
        await page.click('[data-testid="sort-by-capacity"]');
        await page.waitForTimeout(50);
      }
    }

    // Clear search
    await page.fill('[data-testid="search-input"]', '');
    
    // Check memory usage
    const memoryMetrics = await page.evaluate(() => {
      if ((performance as any).memory) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    if (memoryMetrics) {
      console.log('Memory usage after intensive operations:', memoryMetrics);
      
      const memoryUsageRatio = memoryMetrics.usedJSHeapSize / memoryMetrics.jsHeapSizeLimit;
      expect(memoryUsageRatio).toBeLessThan(0.9); // Should not exceed 90% of memory limit
    }
  });
});