# LLM-Powered Import Feature

## Overview

The LLM-Powered Import feature leverages Google's Gemini AI to intelligently process and comprehend uploaded timetable data files. This advanced feature automatically generates entities within the web application that mirror the exact names and structures from the uploaded data, ensuring seamless integration and user familiarity.

## Key Features

### 🧠 Intelligent Data Comprehension
- **Contextual Understanding**: AI analyzes the structure and content of your data to understand relationships between entities
- **Format Detection**: Automatically identifies whether your data is a timetable, entity list, or mixed format
- **Pattern Recognition**: Detects naming conventions and data patterns used in your organization

### 🏷️ Original Name Preservation
- **Exact Name Matching**: Preserves the exact names as they appear in your uploaded files
- **Familiar Interface**: Users see the same names, labels, and terminology they're accustomed to
- **Smooth Transition**: Eliminates the need to learn new naming conventions

### 🔄 Automatic Entity Generation
- **Smart Entity Detection**: Identifies venues, lecturers, courses, student groups, and schedules
- **Relationship Mapping**: Understands connections between different entities
- **Confidence Scoring**: Provides confidence levels for each detected entity and relationship

### ⚡ Streamlined Workflow
- **One-Click Processing**: Single button to analyze and process your entire dataset
- **Skip Manual Mapping**: Eliminates the need for tedious column mapping
- **Instant Results**: Get processed entities ready for database integration

## How It Works

### 1. File Upload
Upload your CSV or Excel file containing timetable or schedule data.

### 2. AI Analysis
The system sends your data to Google's Gemini AI for comprehensive analysis:
- **Structure Analysis**: Identifies data format and primary entity types
- **Entity Detection**: Finds all unique entities (venues, lecturers, courses, etc.)
- **Relationship Discovery**: Maps connections between entities
- **Confidence Assessment**: Evaluates the reliability of each detection

### 3. Entity Creation
Based on the AI analysis, the system creates database entities:
- **Preserve Original Names**: Maintains exact naming from your data
- **Smart Field Mapping**: Automatically maps data to appropriate database fields
- **Default Value Assignment**: Provides sensible defaults for missing information
- **Validation**: Ensures data integrity and consistency

### 4. Database Integration
Entities are seamlessly integrated into the web application's database as native objects.

## Supported Data Formats

### File Types
- **CSV Files**: `.csv` with various delimiters and encodings
- **Excel Files**: `.xlsx` and `.xls` formats with multiple sheet support

### Data Structures
- **Timetable Format**: Complete schedule data with time slots
- **Entity Lists**: Separate lists of venues, lecturers, courses, or student groups
- **Mixed Format**: Combination of entity data and schedule information

### Example Data Structure
```csv
Course Name,Lecturer Name,Venue,Day of Week,Start Time,End Time,Student Group,Duration,Department
Mathematics 101,Dr. Sarah Smith,Room A-101,Monday,09:00,10:30,Computer Science Year 1,90,Mathematics
Physics 201,Prof. John Johnson,Lab B-202,Monday,11:00,12:30,Physics Year 2,90,Physics
```

## Configuration Options

### Processing Options
- **Preserve Original Names**: Keep exact names from your data (recommended)
- **Create Missing Entities**: Automatically create new entities found in data
- **Confidence Threshold**: Set minimum confidence level for entity detection (default: 70%)
- **Contextual Mapping**: Enable advanced relationship detection

### Advanced Settings
- **Max Retries**: Number of retry attempts for API calls (default: 3)
- **Batch Size**: Number of rows processed in each batch
- **Timeout Settings**: API call timeout configuration

## API Endpoints

### Process File with LLM
```http
POST /api/import/files/{fileId}/llm-process
Content-Type: application/json

{
  "options": {
    "preserveOriginalNames": true,
    "createMissingEntities": true,
    "confidenceThreshold": 0.7,
    "maxRetries": 3,
    "enableContextualMapping": true
  }
}
```

### Create Entities from Analysis
```http
POST /api/import/llm-analysis/create-entities
Content-Type: application/json

{
  "analysisResult": { /* LLM analysis result */ },
  "options": {
    "preserveOriginalNames": true,
    "createMissingEntities": true
  }
}
```

### Get LLM Status
```http
GET /api/import/llm/status
```

## Response Format

### Analysis Result
```json
{
  "success": true,
  "data": {
    "analysis": {
      "detectedEntities": {
        "venues": [
          {
            "originalName": "Room A-101",
            "normalizedName": "Room A-101",
            "confidence": 0.95,
            "sourceRows": [0, 3],
            "suggestedFields": {
              "capacity": 30,
              "building": "A",
              "floor": 1,
              "roomNumber": "101"
            }
          }
        ],
        "lecturers": [...],
        "courses": [...],
        "studentGroups": [...],
        "schedules": [...]
      },
      "confidence": 0.92,
      "recommendations": [
        "All entities detected with high confidence",
        "Original naming conventions preserved"
      ],
      "dataStructure": {
        "format": "timetable",
        "primaryEntityType": "schedule",
        "timeFormat": "HH:MM"
      }
    }
  }
}
```

## Setup and Configuration

### Environment Variables
```bash
# Required: Google Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Configuration
LLM_MAX_RETRIES=3
LLM_TIMEOUT=60000
LLM_BATCH_SIZE=50
```

### Installation
```bash
# Install required dependencies
npm install @google/generative-ai

# Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### API Key Setup
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key for Gemini
3. Add the key to your environment variables
4. Restart your application

## Usage Examples

### Frontend Integration
```typescript
import { LLMImportInterface } from './components/import/LLMImportInterface';

// In your component
<LLMImportInterface
  fileId={uploadedFileId}
  onComplete={(result) => {
    console.log('Import completed:', result);
    // Handle successful import
  }}
  onCancel={() => {
    // Handle cancellation
  }}
/>
```

### Backend Service Usage
```typescript
import { LLMDataProcessingService } from './services/import/llmDataProcessingService';

const llmService = new LLMDataProcessingService();

// Process data with LLM
const analysisResult = await llmService.processDataWithLLM(parsedData, {
  preserveOriginalNames: true,
  createMissingEntities: true,
  confidenceThreshold: 0.7
});

// Create entities from analysis
const mappedData = await llmService.createEntitiesFromLLMAnalysis(
  analysisResult,
  { preserveOriginalNames: true }
);
```

## Error Handling

### Common Errors
- **API Key Missing**: Ensure `GEMINI_API_KEY` is set in environment variables
- **API Quota Exceeded**: Check your Google AI Studio usage limits
- **Invalid File Format**: Verify file is CSV or Excel format
- **Network Timeout**: Increase timeout settings for large files

### Error Response Format
```json
{
  "success": false,
  "message": "LLM processing failed",
  "error": {
    "code": "LLM_PROCESSING_ERROR",
    "message": "API quota exceeded"
  }
}
```

## Performance Considerations

### File Size Limits
- **Maximum File Size**: 10MB per file
- **Recommended Size**: Under 5MB for optimal performance
- **Row Limit**: Up to 10,000 rows per file

### Processing Time
- **Small Files** (< 100 rows): 10-30 seconds
- **Medium Files** (100-1000 rows): 30-60 seconds
- **Large Files** (1000+ rows): 1-3 minutes

### Optimization Tips
- Use CSV format for faster processing
- Remove empty rows and columns before upload
- Ensure consistent data formatting
- Use descriptive column headers

## Security and Privacy

### Data Handling
- **Temporary Processing**: Data is only sent to AI for analysis, not stored
- **Secure Transmission**: All API calls use HTTPS encryption
- **No Persistent Storage**: AI provider doesn't retain your data
- **Local Processing**: Entity creation happens on your server

### Privacy Compliance
- Data processing complies with GDPR and other privacy regulations
- No personal data is permanently stored by the AI service
- Users can opt out of AI processing and use manual import instead

## Testing

### Unit Tests
```bash
# Run LLM service tests
npm test src/test/import/llmDataProcessingService.test.ts
```

### End-to-End Tests
```bash
# Run E2E tests (requires API key)
npm run test:e2e e2e/llm-import.spec.ts
```

### Mock Testing
For testing without API calls, mock responses are provided in test files.

## Troubleshooting

### Common Issues

1. **"GEMINI_API_KEY environment variable is required"**
   - Solution: Set the API key in your environment variables

2. **"LLM processing failed: API quota exceeded"**
   - Solution: Check your Google AI Studio quota and billing

3. **Low confidence scores**
   - Solution: Ensure data has clear column headers and consistent formatting

4. **Missing entities**
   - Solution: Verify data contains the expected entity types and relationships

### Debug Mode
Enable debug logging to troubleshoot issues:
```bash
DEBUG=llm-import npm start
```

## Future Enhancements

### Planned Features
- **Multi-language Support**: Process data in different languages
- **Custom Entity Types**: Define custom entity types for specialized use cases
- **Batch Processing**: Process multiple files simultaneously
- **Learning Mode**: Improve accuracy based on user feedback
- **Integration Templates**: Pre-built templates for common data formats

### Feedback and Improvements
The LLM import feature continuously improves based on:
- User feedback and usage patterns
- AI model updates and enhancements
- New data format support
- Performance optimizations

## Support

For issues, questions, or feature requests related to the LLM import feature:
1. Check the troubleshooting section above
2. Review the test files for usage examples
3. Submit an issue with detailed error logs and sample data (anonymized)

## License and Attribution

This feature uses Google's Gemini AI API. Please ensure compliance with Google's terms of service and usage policies when using this feature in production environments.