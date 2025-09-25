import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { app } from '../index';

// Simple test to verify upload functionality
async function testFileUpload() {
  console.log('Testing file upload functionality...');

  // Create a simple CSV test file
  const testCsvContent = `Course Code,Course Name,Lecturer,Venue,Day,Start Time,End Time
CS101,Introduction to Programming,Dr. Smith,Room A101,Monday,09:00,10:30
CS102,Data Structures,Prof. Johnson,Room B202,Tuesday,11:00,12:30
CS103,Database Systems,Dr. Brown,Lab C301,Wednesday,14:00,15:30`;

  const testFilePath = path.join(__dirname, 'test-upload.csv');
  fs.writeFileSync(testFilePath, testCsvContent);

  try {
    const response = await request(app)
      .post('/api/import/upload')
      .attach('file', testFilePath)
      .expect(200);

    console.log('Upload test successful!');
    console.log('Response:', JSON.stringify(response.body, null, 2));

    // Clean up test file
    fs.unlinkSync(testFilePath);

    return response.body;
  } catch (error) {
    console.error('Upload test failed:', error);
    
    // Clean up test file even on error
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    
    throw error;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testFileUpload()
    .then(() => {
      console.log('All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Tests failed:', error);
      process.exit(1);
    });
}

export { testFileUpload };