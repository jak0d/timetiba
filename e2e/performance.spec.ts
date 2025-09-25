import { test, expect } from '@playwright/test';
import { TestDataHelper, testVenues, testLecturers, testCourses, testStudentGroups } from './fixtures/test-data';

test.describe('Performance Testing', () => {
  let helper: TestDataHelper;

  test.beforeEach(async ({ page }) => {
    helper = new TestDataHelper(page);
    await helper.loginAs('admin');
  });

  test('should handle large dataset loading performance', async ({ page }) => {
    // Create large dataset
    const startTime = Date.now();
    
    // Create 50 venues
    for (let i = 0; i < 50; i++) {
      await helper.createVenue({
        name: `Venue ${i}`,
        capacity: 20 + (i % 100),
        equipment: ['Projector', 'Whiteboard'],
        location: `Building ${Math.floor(i / 10)}, Floor ${i % 5}`
      });
    }
    
    const creationTime = Date.now() - startTime;
    console.log(`Created 50 venues in ${creationTime}ms`);
    
    // Test loading performance
    const loadStartTime = Date.now();
    await page.goto('/venues');
    
    // Wait for all venues to load
    await expect(page.locator('[data-testid="venue-list-item"]')).toHaveCount(50);
    
    const loadTime = Date.now() - loadStartTime;
    console.log(`Loaded 50 venues in ${loadTime}ms`);
    
    // Performance assertion - should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle complex timetable generation performance', async ({ page }) => {
    // Create comprehensive test data
    const venues = Array.from({ length: 20 }, (_, i) => ({
      name: `Venue ${i}`,
      capacity: 30 + (i % 50),
      equipment: ['Projector', 'Whiteboard'],
      location: `Building ${Math.floor(i / 5)}`
    }));
    
    const lecturers = Array.from({ length: 15 }, (_, i) => ({
      name: `Lecturer ${i}`,
      email: `lecturer${i}@test.com`,
      department: i % 2 === 0 ? 'Computer Science' : 'Mathematics',
      subjects: [`Subject ${i}A`, `Subject ${i}B`]
    }));
    
    const courses = Array.from({ length: 30 }, (_, i) => ({
      name: `Course ${i}`,
      code: `CS${100 + i}`,
      duration: 90 + (i % 60),
      frequency: 'weekly',
      lecturerEmail: `lecturer${i % 15}@test.com`
    }));
    
    // Create test data
    for (const venue of venues) {
      await helper.createVenue(venue);
    }
    
    for (const lecturer of lecturers) {
      await helper.createLecturer(lecturer);
    }
    
    for (const course of courses) {
      await helper.createCourse(course);
    }
    
    // Test AI optimization performance
    await page.goto('/timetables');
    await page.click('[data-testid="create-timetable-button"]');
    await page.fill('[data-testid="timetable-name-input"]', 'Performance Test Timetable');
    await page.click('[data-testid="create-button"]');
    
    const optimizationStartTime = Date.now();
    
    // Start AI optimization
    await page.click('[data-testid="ai-generate-button"]');
    await page.click('[data-testid="start-optimization-button"]');
    
    // Wait for completion with extended timeout
    await page.waitForSelector('[data-testid="optimization-complete"]', { timeout: 120000 });
    
    const optimizationTime = Date.now() - optimizationStartTime;
    console.log(`AI optimization completed in ${optimizationTime}ms`);
    
    // Performance assertion - should complete within 2 minutes
    expect(optimizationTime).toBeLessThan(120000);
    
    // Verify all courses were scheduled
    const sessionCount = await page.locator('[data-testid="timetable-grid"] .session').count();
    expect(sessionCount).toBeGreaterThan(25); // Should schedule most courses
  });

  test('should handle concurrent user actions', async ({ page, context }) => {
    // Set up test data
    await helper.createVenue(testVenues[0]);
    await helper.createLecturer(testLecturers[0]);
    await helper.createCourse(testCourses[0]);
    
    // Create timetable
    await page.goto('/timetables');
    await page.click('[data-testid="create-timetable-button"]');
    await page.fill('[data-testid="timetable-name-input"]', 'Concurrent Test');
    await page.click('[data-testid="create-button"]');
    
    // Create multiple browser contexts for concurrent users
    const contexts = await Promise.all([
      context.browser()?.newContext(),
      context.browser()?.newContext(),
      context.browser()?.newContext()
    ]);
    
    const pages = await Promise.all(
      contexts.map(async (ctx) => {
        if (ctx) {
          const newPage = await ctx.newPage();
          const newHelper = new TestDataHelper(newPage);
          await newHelper.loginAs('admin');
          return newPage;
        }
        return null;
      })
    );
    
    // Perform concurrent actions
    const concurrentActions = pages.map(async (concurrentPage, index) => {
      if (concurrentPage) {
        await concurrentPage.goto('/timetables');
        await concurrentPage.click('[data-testid="timetable-Concurrent Test"]');
        
        // Each user adds a session at different times
        await concurrentPage.click('[data-testid="add-session-button"]');
        await concurrentPage.selectOption('[data-testid="session-course-select"]', testCourses[0].code);
        await concurrentPage.selectOption('[data-testid="session-venue-select"]', testVenues[0].name);
        await concurrentPage.selectOption('[data-testid="session-day-select"]', 'monday');
        await concurrentPage.fill('[data-testid="session-start-time"]', `${9 + index}:00`);
        await concurrentPage.click('[data-testid="save-session-button"]');
        
        return concurrentPage.waitForSelector('[data-testid="success-message"]');
      }
    });
    
    const startTime = Date.now();
    await Promise.all(concurrentActions);
    const concurrentTime = Date.now() - startTime;
    
    console.log(`Concurrent actions completed in ${concurrentTime}ms`);
    
    // Verify all sessions were created
    await page.reload();
    const sessionCount = await page.locator('[data-testid="timetable-grid"] .session').count();
    expect(sessionCount).toBe(3);
    
    // Clean up contexts
    await Promise.all(contexts.map(ctx => ctx?.close()));
  });

  test('should handle memory usage during extended session', async ({ page }) => {
    // Create moderate dataset
    for (let i = 0; i < 10; i++) {
      await helper.createVenue({
        name: `Memory Test Venue ${i}`,
        capacity: 50,
        equipment: ['Projector'],
        location: `Building ${i}`
      });
    }
    
    // Perform memory-intensive operations
    await page.goto('/venues');
    
    // Repeatedly filter and sort data
    for (let i = 0; i < 20; i++) {
      await page.fill('[data-testid="search-input"]', `Venue ${i % 10}`);
      await page.waitForTimeout(100);
      await page.fill('[data-testid="search-input"]', '');
      await page.waitForTimeout(100);
      
      // Sort by different columns
      await page.click('[data-testid="sort-by-name"]');
      await page.waitForTimeout(100);
      await page.click('[data-testid="sort-by-capacity"]');
      await page.waitForTimeout(100);
    }
    
    // Check for memory leaks by monitoring page performance
    const performanceMetrics = await page.evaluate(() => {
      return {
        usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
        totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
        jsHeapSizeLimit: (performance as any).memory?.jsHeapSizeLimit || 0
      };
    });
    
    console.log('Memory metrics:', performanceMetrics);
    
    // Basic memory usage check (if available)
    if (performanceMetrics.usedJSHeapSize > 0) {
      const memoryUsageRatio = performanceMetrics.usedJSHeapSize / performanceMetrics.jsHeapSizeLimit;
      expect(memoryUsageRatio).toBeLessThan(0.8); // Should use less than 80% of available memory
    }
  });

  test('should handle rapid UI interactions', async ({ page }) => {
    await helper.createVenue(testVenues[0]);
    await helper.createLecturer(testLecturers[0]);
    await helper.createCourse(testCourses[0]);
    
    await page.goto('/timetables');
    await page.click('[data-testid="create-timetable-button"]');
    await page.fill('[data-testid="timetable-name-input"]', 'Rapid Interaction Test');
    await page.click('[data-testid="create-button"]');
    
    const startTime = Date.now();
    
    // Perform rapid interactions
    for (let i = 0; i < 10; i++) {
      // Rapidly add and remove sessions
      await page.click('[data-testid="add-session-button"]');
      await page.selectOption('[data-testid="session-course-select"]', testCourses[0].code);
      await page.selectOption('[data-testid="session-venue-select"]', testVenues[0].name);
      await page.selectOption('[data-testid="session-day-select"]', 'monday');
      await page.fill('[data-testid="session-start-time"]', `${9 + (i % 8)}:00`);
      await page.click('[data-testid="save-session-button"]');
      
      // Immediately try to edit
      if (i % 2 === 0) {
        await page.click('[data-testid="edit-session-button"]');
        await page.fill('[data-testid="session-start-time"]', `${10 + (i % 8)}:00`);
        await page.click('[data-testid="save-session-button"]');
      }
    }
    
    const interactionTime = Date.now() - startTime;
    console.log(`Rapid interactions completed in ${interactionTime}ms`);
    
    // Should handle rapid interactions without errors
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    
    // Verify final state is consistent
    const finalSessionCount = await page.locator('[data-testid="timetable-grid"] .session').count();
    expect(finalSessionCount).toBeGreaterThan(0);
  });

  test('should measure page load times', async ({ page }) => {
    const pages = [
      '/dashboard',
      '/venues',
      '/lecturers',
      '/courses',
      '/student-groups',
      '/timetables'
    ];
    
    for (const pagePath of pages) {
      const startTime = Date.now();
      await page.goto(pagePath);
      
      // Wait for main content to load
      await page.waitForSelector('[data-testid="main-content"]');
      
      const loadTime = Date.now() - startTime;
      console.log(`${pagePath} loaded in ${loadTime}ms`);
      
      // Performance assertion - pages should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    }
  });

  test('should handle large timetable rendering', async ({ page }) => {
    // Create large timetable data
    await helper.createVenue(testVenues[0]);
    await helper.createVenue(testVenues[1]);
    await helper.createLecturer(testLecturers[0]);
    
    // Create multiple courses
    for (let i = 0; i < 20; i++) {
      await helper.createCourse({
        name: `Course ${i}`,
        code: `CS${200 + i}`,
        duration: 90,
        frequency: 'weekly',
        lecturerEmail: testLecturers[0].email
      });
    }
    
    await page.goto('/timetables');
    await page.click('[data-testid="create-timetable-button"]');
    await page.fill('[data-testid="timetable-name-input"]', 'Large Timetable Test');
    await page.click('[data-testid="create-button"]');
    
    // Add many sessions
    const renderStartTime = Date.now();
    
    for (let day = 0; day < 5; day++) {
      for (let hour = 9; hour < 17; hour++) {
        if (Math.random() > 0.3) { // 70% chance to add session
          await page.click('[data-testid="add-session-button"]');
          await page.selectOption('[data-testid="session-course-select"]', `CS${200 + (hour % 20)}`);
          await page.selectOption('[data-testid="session-venue-select"]', testVenues[hour % 2].name);
          await page.selectOption('[data-testid="session-day-select"]', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][day]);
          await page.fill('[data-testid="session-start-time"]', `${hour}:00`);
          await page.click('[data-testid="save-session-button"]');
        }
      }
    }
    
    const renderTime = Date.now() - renderStartTime;
    console.log(`Large timetable rendered in ${renderTime}ms`);
    
    // Verify timetable is functional
    const sessionCount = await page.locator('[data-testid="timetable-grid"] .session').count();
    expect(sessionCount).toBeGreaterThan(20);
    
    // Test scrolling performance
    const scrollStartTime = Date.now();
    await page.evaluate(() => {
      const grid = document.querySelector('[data-testid="timetable-grid"]');
      if (grid) {
        grid.scrollTop = grid.scrollHeight;
      }
    });
    await page.waitForTimeout(100);
    
    const scrollTime = Date.now() - scrollStartTime;
    console.log(`Scroll performance: ${scrollTime}ms`);
    
    // Scrolling should be smooth
    expect(scrollTime).toBeLessThan(1000);
  });
});