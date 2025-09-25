import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface PerformanceData {
  testName: string;
  duration: number;
  status: string;
  metrics?: any;
}

export class PerformanceReporter implements Reporter {
  private performanceData: PerformanceData[] = [];
  private startTime: number = 0;

  onBegin() {
    this.startTime = Date.now();
    console.log('🚀 Starting E2E Performance Tests...');
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const performanceData: PerformanceData = {
      testName: test.title,
      duration: result.duration,
      status: result.status,
      metrics: (result as any).performanceMetrics
    };

    this.performanceData.push(performanceData);

    // Log slow tests
    if (result.duration > 30000) { // 30 seconds
      console.log(`⚠️  Slow test detected: ${test.title} (${result.duration}ms)`);
    }

    // Log failed tests
    if (result.status === 'failed') {
      console.log(`❌ Test failed: ${test.title}`);
    }
  }

  onEnd(result: FullResult) {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n📊 Performance Summary:');
    console.log(`Total test duration: ${totalDuration}ms`);
    console.log(`Tests run: ${this.performanceData.length}`);
    
    const passed = this.performanceData.filter(d => d.status === 'passed').length;
    const failed = this.performanceData.filter(d => d.status === 'failed').length;
    const skipped = this.performanceData.filter(d => d.status === 'skipped').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    
    // Find slowest tests
    const slowestTests = this.performanceData
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
    
    console.log('\n🐌 Slowest Tests:');
    slowestTests.forEach((test, index) => {
      console.log(`${index + 1}. ${test.testName}: ${test.duration}ms`);
    });
    
    // Generate performance report
    this.generatePerformanceReport();
  }

  private generatePerformanceReport() {
    const report = {
      summary: {
        totalTests: this.performanceData.length,
        totalDuration: Date.now() - this.startTime,
        passed: this.performanceData.filter(d => d.status === 'passed').length,
        failed: this.performanceData.filter(d => d.status === 'failed').length,
        skipped: this.performanceData.filter(d => d.status === 'skipped').length
      },
      tests: this.performanceData.map(test => ({
        name: test.testName,
        duration: test.duration,
        status: test.status,
        metrics: test.metrics
      })),
      slowestTests: this.performanceData
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10),
      averageDuration: this.performanceData.reduce((sum, test) => sum + test.duration, 0) / this.performanceData.length,
      timestamp: new Date().toISOString()
    };

    const reportPath = join(process.cwd(), 'test-results', 'performance-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Performance report saved to: ${reportPath}`);
  }
}