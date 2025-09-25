#!/usr/bin/env ts-node

/**
 * Demo script to test LLM import functionality
 * Usage: npm run demo:llm-import
 */

import { SimpleLLMDataProcessingService as LLMDataProcessingService } from '../services/import/llmDataProcessingService.simple';
import { ParsedData } from '../types/import';
import { logger } from '../utils/logger';

// Sample timetable data for testing
const sampleData: ParsedData = {
  headers: ['Course Name', 'Lecturer Name', 'Venue', 'Day of Week', 'Start Time', 'End Time', 'Student Group', 'Duration', 'Department'],
  rows: [
    {
      'Course Name': 'Mathematics 101',
      'Lecturer Name': 'Dr. Sarah Smith',
      'Venue': 'Room A-101',
      'Day of Week': 'Monday',
      'Start Time': '09:00',
      'End Time': '10:30',
      'Student Group': 'Computer Science Year 1',
      'Duration': '90',
      'Department': 'Mathematics'
    },
    {
      'Course Name': 'Physics 201',
      'Lecturer Name': 'Prof. John Johnson',
      'Venue': 'Lab B-202',
      'Day of Week': 'Monday',
      'Start Time': '11:00',
      'End Time': '12:30',
      'Student Group': 'Physics Year 2',
      'Duration': '90',
      'Department': 'Physics'
    },
    {
      'Course Name': 'Chemistry 101',
      'Lecturer Name': 'Dr. Emily Davis',
      'Venue': 'Lab C-301',
      'Day of Week': 'Tuesday',
      'Start Time': '14:00',
      'End Time': '15:30',
      'Student Group': 'Chemistry Year 1',
      'Duration': '90',
      'Department': 'Chemistry'
    },
    {
      'Course Name': 'Mathematics 102',
      'Lecturer Name': 'Dr. Sarah Smith',
      'Venue': 'Room A-102',
      'Day of Week': 'Tuesday',
      'Start Time': '09:00',
      'End Time': '10:30',
      'Student Group': 'Computer Science Year 1',
      'Duration': '90',
      'Department': 'Mathematics'
    },
    {
      'Course Name': 'Computer Programming',
      'Lecturer Name': 'Dr. Michael Brown',
      'Venue': 'Computer Lab 1',
      'Day of Week': 'Wednesday',
      'Start Time': '14:00',
      'End Time': '16:00',
      'Student Group': 'Computer Science Year 1',
      'Duration': '120',
      'Department': 'Computer Science'
    }
  ],
  metadata: {
    totalRows: 5,
    emptyRows: 0,
    duplicateRows: 0,
    encoding: 'utf-8'
  }
};

async function testLLMImport() {
  console.log('🚀 Starting LLM Import Demo');
  console.log('================================');

  // Check if API key is available
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY environment variable is required');
    console.log('Please set your Gemini API key in the environment variables:');
    console.log('export GEMINI_API_KEY=your_api_key_here');
    process.exit(1);
  }

  try {
    // Initialize LLM service
    console.log('🔧 Initializing LLM Data Processing Service...');
    const llmService = new LLMDataProcessingService();

    // Process data with LLM
    console.log('🧠 Processing data with AI...');
    console.log(`📊 Sample data: ${sampleData.rows.length} rows, ${sampleData.headers.length} columns`);
    
    const analysisResult = await llmService.processDataWithLLM(sampleData, {
      preserveOriginalNames: true,
      createMissingEntities: true,
      confidenceThreshold: 0.7,
      maxRetries: 3,
      enableContextualMapping: true
    });

    // Display analysis results
    console.log('\n📋 Analysis Results:');
    console.log('===================');
    console.log(`Overall Confidence: ${Math.round(analysisResult.confidence * 100)}%`);
    console.log(`Data Format: ${analysisResult.dataStructure.format}`);
    console.log(`Primary Entity Type: ${analysisResult.dataStructure.primaryEntityType}`);
    console.log(`Time Format: ${analysisResult.dataStructure.timeFormat}`);

    // Display detected entities
    console.log('\n🏢 Detected Entities:');
    console.log('====================');
    
    const entities = analysisResult.detectedEntities;
    console.log(`📍 Venues: ${entities.venues?.length || 0}`);
    entities.venues?.forEach((venue, index) => {
      console.log(`  ${index + 1}. ${venue.originalName} (${Math.round(venue.confidence * 100)}% confidence)`);
    });

    console.log(`👨‍🏫 Lecturers: ${entities.lecturers?.length || 0}`);
    entities.lecturers?.forEach((lecturer, index) => {
      console.log(`  ${index + 1}. ${lecturer.originalName} (${Math.round(lecturer.confidence * 100)}% confidence)`);
    });

    console.log(`📚 Courses: ${entities.courses?.length || 0}`);
    entities.courses?.forEach((course, index) => {
      console.log(`  ${index + 1}. ${course.originalName} (${Math.round(course.confidence * 100)}% confidence)`);
    });

    console.log(`👥 Student Groups: ${entities.studentGroups?.length || 0}`);
    entities.studentGroups?.forEach((group, index) => {
      console.log(`  ${index + 1}. ${group.originalName} (${Math.round(group.confidence * 100)}% confidence)`);
    });

    console.log(`📅 Schedules: ${entities.schedules?.length || 0}`);
    entities.schedules?.forEach((schedule, index) => {
      console.log(`  ${index + 1}. ${schedule.course} - ${schedule.timeSlot.day} ${schedule.timeSlot.startTime} (${Math.round(schedule.confidence * 100)}% confidence)`);
    });

    // Display recommendations
    if (analysisResult.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      console.log('==================');
      analysisResult.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    // Create entities from analysis
    console.log('\n🔨 Creating entities from analysis...');
    const mappedData = await llmService.createEntitiesFromLLMAnalysis(analysisResult, {
      preserveOriginalNames: true,
      createMissingEntities: true,
      confidenceThreshold: 0.7,
      maxRetries: 3,
      enableContextualMapping: true
    });

    // Display created entities summary
    console.log('\n✅ Entity Creation Summary:');
    console.log('==========================');
    console.log(`📍 Venues created: ${mappedData.venues.length}`);
    console.log(`👨‍🏫 Lecturers created: ${mappedData.lecturers.length}`);
    console.log(`📚 Courses created: ${mappedData.courses.length}`);
    console.log(`👥 Student Groups created: ${mappedData.studentGroups.length}`);
    console.log(`📅 Schedules created: ${mappedData.schedules.length}`);

    // Show sample created entities
    if (mappedData.venues.length > 0) {
      console.log('\n📍 Sample Venue:');
      console.log(JSON.stringify(mappedData.venues[0], null, 2));
    }

    if (mappedData.lecturers.length > 0) {
      console.log('\n👨‍🏫 Sample Lecturer:');
      console.log(JSON.stringify(mappedData.lecturers[0], null, 2));
    }

    if (mappedData.courses.length > 0) {
      console.log('\n📚 Sample Course:');
      console.log(JSON.stringify(mappedData.courses[0], null, 2));
    }

    console.log('\n🎉 LLM Import Demo completed successfully!');
    console.log('=========================================');

  } catch (error) {
    console.error('\n❌ LLM Import Demo failed:');
    console.error('==========================');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    
    if (error instanceof Error && error.message.includes('API')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('- Check your GEMINI_API_KEY is valid');
      console.log('- Verify you have sufficient API quota');
      console.log('- Ensure you have internet connectivity');
    }
    
    process.exit(1);
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  testLLMImport().catch(console.error);
}

export { testLLMImport };