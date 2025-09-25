import { Page } from '@playwright/test';

export interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

export class PerformanceMonitor {
  constructor(private page: Page) {}

  async measurePageLoad(url: string): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Get Web Vitals metrics
    const metrics = await this.page.evaluate(() => {
      return new Promise<PerformanceMetrics>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const metrics: Partial<PerformanceMetrics> = {};
          
          entries.forEach((entry) => {
            if (entry.entryType === 'paint') {
              if (entry.name === 'first-contentful-paint') {
                metrics.firstContentfulPaint = entry.startTime;
              }
            } else if (entry.entryType === 'largest-contentful-paint') {
              metrics.largestContentfulPaint = entry.startTime;
            } else if (entry.entryType === 'layout-shift') {
              if (!metrics.cumulativeLayoutShift) {
                metrics.cumulativeLayoutShift = 0;
              }
              metrics.cumulativeLayoutShift += (entry as any).value;
            } else if (entry.entryType === 'first-input') {
              metrics.firstInputDelay = (entry as any).processingStart - entry.startTime;
            }
          });
          
          // Get memory usage if available
          if ((performance as any).memory) {
            metrics.memoryUsage = {
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
              jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
            };
          }
          
          resolve(metrics as PerformanceMetrics);
        });
        
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] });
        
        // Fallback timeout
        setTimeout(() => {
          resolve({
            loadTime: 0,
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            cumulativeLayoutShift: 0,
            firstInputDelay: 0
          });
        }, 5000);
      });
    });
    
    return {
      ...metrics,
      loadTime
    };
  }

  async measureInteractionTime(action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    return Date.now() - startTime;
  }

  async measureRenderTime(selector: string): Promise<number> {
    const startTime = Date.now();
    await this.page.waitForSelector(selector);
    return Date.now() - startTime;
  }

  async getNetworkMetrics() {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalResources: resources.length,
        totalTransferSize: resources.reduce((total, resource) => total + (resource as any).transferSize || 0, 0)
      };
    });
  }

  async capturePerformanceProfile(duration: number = 5000) {
    await this.page.evaluate((duration) => {
      console.profile('E2E Performance Profile');
      setTimeout(() => {
        console.profileEnd('E2E Performance Profile');
      }, duration);
    }, duration);
  }
}

export class PerformanceBenchmark {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  
  addMetric(testName: string, metric: PerformanceMetrics) {
    if (!this.metrics.has(testName)) {
      this.metrics.set(testName, []);
    }
    this.metrics.get(testName)!.push(metric);
  }
  
  getAverageMetrics(testName: string): PerformanceMetrics | null {
    const testMetrics = this.metrics.get(testName);
    if (!testMetrics || testMetrics.length === 0) return null;
    
    const avg = testMetrics.reduce((acc, metric) => ({
      loadTime: acc.loadTime + metric.loadTime,
      firstContentfulPaint: acc.firstContentfulPaint + metric.firstContentfulPaint,
      largestContentfulPaint: acc.largestContentfulPaint + metric.largestContentfulPaint,
      cumulativeLayoutShift: acc.cumulativeLayoutShift + metric.cumulativeLayoutShift,
      firstInputDelay: acc.firstInputDelay + metric.firstInputDelay
    }), {
      loadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      firstInputDelay: 0
    });
    
    const count = testMetrics.length;
    return {
      loadTime: avg.loadTime / count,
      firstContentfulPaint: avg.firstContentfulPaint / count,
      largestContentfulPaint: avg.largestContentfulPaint / count,
      cumulativeLayoutShift: avg.cumulativeLayoutShift / count,
      firstInputDelay: avg.firstInputDelay / count
    };
  }
  
  generateReport(): string {
    let report = '# Performance Benchmark Report\n\n';
    
    for (const [testName, metrics] of this.metrics) {
      const avg = this.getAverageMetrics(testName);
      if (avg) {
        report += `## ${testName}\n`;
        report += `- Average Load Time: ${avg.loadTime.toFixed(2)}ms\n`;
        report += `- First Contentful Paint: ${avg.firstContentfulPaint.toFixed(2)}ms\n`;
        report += `- Largest Contentful Paint: ${avg.largestContentfulPaint.toFixed(2)}ms\n`;
        report += `- Cumulative Layout Shift: ${avg.cumulativeLayoutShift.toFixed(4)}\n`;
        report += `- First Input Delay: ${avg.firstInputDelay.toFixed(2)}ms\n`;
        report += `- Runs: ${metrics.length}\n\n`;
      }
    }
    
    return report;
  }
}