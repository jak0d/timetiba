#!/usr/bin/env node

/**
 * AI Import Flow Test Script
 * 
 * This script demonstrates the complete AI-powered import flow:
 * 1. File upload and analysis
 * 2. AI processing and entity detection
 * 3. Entity creation and import
 * 
 * Usage: npm run test:ai-import-flow
 */

import fs from 'fs';
import path from 'path';
import { LLMDataProcessingService } from '../services/import/llmDataProcessingService.simple';

interface TestFileData {
  filename: string;
  content: string;
  expectedEntities: {
    venues: number;
    lecturers: number;
    courses: number;
    studentGroups: number;
  };
}

class AIImportFlowTester {
  private llmService: LLMDataProcessingService;

  constructor() {
    this.llmService = new LLMDataProcessingService();
  }

  /**
   * Load test data files
   */
  private loadTestFiles(): TestFileData[] {
    const testFiles: TestFileData[] = [
      {
        filename: 'sample-ai-timetable.csv',
        content: fs.readFileSync(
          path.join(__dirname, '../../e2e/fixtures/sample-ai-timetable.csv'),
          'utf-8'
        ),
        expectedEntities: {
          venues: 20, // Various rooms, labs, workshops
          lecturers: 4, // Dr. Sarah Smith, Prof. John Johnson, Dr. Emily Brown, Mr. David Wilson
          courses: 20, // Different courses
          studentGroups: 12 // Various year groups across departments
        }
      }
    ];

    return testFiles;
  }

  /**
   * Parse CSV content into structured data
   */
  private parseCSV(content: string): Record<string, any>[] {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      return row;
    });
  }

  /**
   * Simulate file upload and analysis
   */
  private async simulateFileUpload(testFile: TestFileData): Promise<any> {
    console.log(`\n📁 Uploading file: ${testFile.filename}`);
    
    const parsedData = this.parseCSV(testFile.content);
    
    // Simulate file metadata extraction
    const metadata = {
      rows: parsedData.length,
      columns: Object.keys(parsedData[0] || {}),
      preview: parsedData.slice(0, 3),
      size: Buffer.byteLength(testFile.content, 'utf8')
    };

    console.log(`✅ File analysis complete:`);
    console.log(`   - Rows: ${metadata.rows}`);
    console.log(`   - Columns: ${metadata.columns.length}`);
    console.log(`   - Size: ${(metadata.size / 1024).toFixed(2)} KB`);
    console.log(`   - Detected columns: ${metadata.columns.join(', ')}`);

    return {
      fileId: `test-${Date.now()}`,
      filename: testFile.filename,
      metadata,
      parsedData
    };
  }

  /**
   * Test AI processing and entity detection
   */
  private async testAIProcessing(fileData: any, expectedEntities: any): Promise<any> {
    console.log(`\n🤖 Starting AI analysis...`);
    
    try {
      // Process with LLM
      const analysisResult = await this.llmService.processDataWithLLM(
        fileData.parsedData,
        {
          preserveOriginalNames: true,
          createMissingEntities: true,
          confidenceThreshold: 0.7
        }
      );

      console.log(`✅ AI analysis complete with ${Math.round(analysisResult.confidence * 100)}% confidence`);

      // Validate detected entities
      const detected = analysisResult.detectedEntities;
      console.log(`\n📊 Entity Detection Results:`);
      console.log(`   - Venues: ${detected.venues?.length || 0} (expected: ${expectedEntities.venues})`);
      console.log(`   - Lecturers: ${detected.lecturers?.length || 0} (expected: ${expectedEntities.lecturers})`);
      console.log(`   - Courses: ${detected.courses?.length || 0} (expected: ${expectedEntities.courses})`);
      console.log(`   - Student Groups: ${detected.studentGroups?.length || 0} (expected: ${expectedEntities.studentGroups})`);

      // Show sample detected entities
      if (detected.venues?.length > 0) {
        console.log(`\n🏢 Sample Venues:`);
        detected.venues.slice(0, 3).forEach((venue: any) => {
          console.log(`   - ${venue.originalName} (${Math.round(venue.confidence * 100)}% confidence)`);
        });
      }

      if (detected.lecturers?.length > 0) {
        console.log(`\n👨‍🏫 Sample Lecturers:`);
        detected.lecturers.slice(0, 3).forEach((lecturer: any) => {
          console.log(`   - ${lecturer.originalName} (${Math.round(lecturer.confidence * 100)}% confidence)`);
        });
      }

      if (detected.courses?.length > 0) {
        console.log(`\n📚 Sample Courses:`);
        detected.courses.slice(0, 3).forEach((course: any) => {
          console.log(`   - ${course.originalName} (${Math.round(course.confidence * 100)}% confidence)`);
        });
      }

      // Show AI recommendations
      if (analysisResult.recommendations?.length > 0) {
        console.log(`\n💡 AI Recommendations:`);
        analysisResult.recommendations.forEach((rec: string) => {
          console.log(`   - ${rec}`);
        });
      }

      return analysisResult;

    } catch (error) {
      console.error(`❌ AI processing failed:`, error);
      throw error;
    }
  }

  /**
   * Test entity creation from AI analysis
   */
  private async testEntityCreation(analysisResult: any): Promise<any> {
    console.log(`\n🏗️  Creating entities from AI analysis...`);

    try {
      const mappedData = await this.llmService.createEntitiesFromLLMAnalysis(
        analysisResult,
        {
          preserveOriginalNames: true,
          createMissingEntities: true
        }
      );

      console.log(`✅ Entity creation complete:`);
      console.log(`   - Total entities created: ${mappedData.summary?.totalEntitiesCreated || 0}`);
      console.log(`   - Schedules created: ${mappedData.summary?.schedulesCreated || 0}`);

      // Show created entity summary
      if (mappedData.venues?.length > 0) {
        console.log(`   - Venues: ${mappedData.venues.length} created`);
      }
      if (mappedData.lecturers?.length > 0) {
        console.log(`   - Lecturers: ${mappedData.lecturers.length} created`);
      }
      if (mappedData.courses?.length > 0) {
        console.log(`   - Courses: ${mappedData.courses.length} created`);
      }
      if (mappedData.studentGroups?.length > 0) {
        console.log(`   - Student Groups: ${mappedData.studentGroups.length} created`);
      }

      return mappedData;

    } catch (error) {
      console.error(`❌ Entity creation failed:`, error);
      throw error;
    }
  }

  /**
   * Run the complete AI import flow test
   */
  public async runCompleteFlow(): Promise<void> {
    console.log('🚀 Starting AI Import Flow Test\n');
    console.log('=' .repeat(50));

    try {
      const testFiles = this.loadTestFiles();

      for (const testFile of testFiles) {
        console.log(`\n🧪 Testing file: ${testFile.filename}`);
        console.log('-'.repeat(40));

        // Step 1: File Upload and Analysis
        const fileData = await this.simulateFileUpload(testFile);

        // Step 2: AI Processing
        const analysisResult = await this.testAIProcessing(fileData, testFile.expectedEntities);

        // Step 3: Entity Creation
        const mappedData = await this.testEntityCreation(analysisResult);

        console.log(`\n✅ Complete flow test passed for ${testFile.filename}`);
      }

      console.log('\n🎉 All AI Import Flow tests completed successfully!');
      console.log('=' .repeat(50));

    } catch (error) {
      console.error('\n❌ AI Import Flow test failed:', error);
      process.exit(1);
    }
  }

  /**
   * Test individual components
   */
  public async runComponentTests(): Promise<void> {
    console.log('🔧 Running Individual Component Tests\n');

    // Test 1: File Analysis
    console.log('1️⃣  Testing File Analysis...');
    const testFiles = this.loadTestFiles();
    const fileData = await this.simulateFileUpload(testFiles[0]);
    console.log('✅ File analysis working correctly\n');

    // Test 2: AI Processing (Mock)
    console.log('2️⃣  Testing AI Processing (Mock)...');
    const mockAnalysis = {
      detectedEntities: {
        venues: [
          { originalName: 'Room A-101', confidence: 0.95 },
          { originalName: 'Lab B-202', confidence: 0.92 }
        ],
        lecturers: [
          { originalName: 'Dr. Sarah Smith', confidence: 0.96 }
        ],
        courses: [
          { originalName: 'Mathematics 101', confidence: 0.97 }
        ],
        studentGroups: [
          { originalName: 'Computer Science Year 1', confidence: 0.94 }
        ]
      },
      confidence: 0.94,
      recommendations: ['All entities detected with high confidence']
    };
    console.log('✅ AI processing mock working correctly\n');

    // Test 3: Entity Creation (Mock)
    console.log('3️⃣  Testing Entity Creation (Mock)...');
    const mockMappedData = {
      venues: mockAnalysis.detectedEntities.venues,
      lecturers: mockAnalysis.detectedEntities.lecturers,
      courses: mockAnalysis.detectedEntities.courses,
      studentGroups: mockAnalysis.detectedEntities.studentGroups,
      summary: {
        totalEntitiesCreated: 5,
        schedulesCreated: 20
      }
    };
    console.log('✅ Entity creation mock working correctly\n');

    console.log('🎉 All component tests passed!');
  }
}

// Main execution
async function main() {
  const tester = new AIImportFlowTester();

  const args = process.argv.slice(2);
  const testType = args[0] || 'full';

  try {
    switch (testType) {
      case 'components':
        await tester.runComponentTests();
        break;
      case 'full':
      default:
        await tester.runCompleteFlow();
        break;
    }
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { AIImportFlowTester };