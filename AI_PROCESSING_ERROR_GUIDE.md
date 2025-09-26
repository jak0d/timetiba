# AI Processing Error Handling Guide

## Common AI Processing Errors

### "LLM processing failed" Error

This error occurs when the AI service encounters issues processing your data. Here are the common causes and solutions:

## Troubleshooting Steps

### 1. **Check File Format**
- Ensure your file is in a supported format (CSV, XLSX, XLS)
- Verify the file isn't corrupted
- Check that the file has proper column headers

### 2. **File Size and Content**
- Files should be under 10MB
- Ensure the file has actual data (not just headers)
- Check that columns contain recognizable data patterns

### 3. **Network and Service Issues**
- Check your internet connection
- The AI service might be temporarily unavailable
- Try again in a few minutes

### 4. **Data Quality Issues**
- Ensure column headers are clear and descriptive
- Remove any special characters or formatting that might confuse the AI
- Make sure data is in a consistent format

## Recovery Options

### Option 1: Retry AI Processing
1. Click "Start AI Processing" again
2. The system will attempt to process your file again
3. Sometimes temporary issues resolve on retry

### Option 2: Switch to Manual Import
1. Click "Switch to Manual Import"
2. You'll be taken to the manual column mapping step
3. Map your columns manually to system fields

### Option 3: Go Back and Re-upload
1. Click "Back to Analysis"
2. Upload a different file or the same file again
3. Try AI processing with the fresh upload

## Progressive Workflow Benefits

Even when AI processing fails, the progressive workflow ensures:

- ✅ **No Data Loss**: Your uploaded file is preserved
- ✅ **Multiple Options**: Switch between AI and manual processing
- ✅ **User Control**: You decide how to proceed
- ✅ **Clear Guidance**: Step-by-step instructions for recovery

## Best Practices for AI Processing

### File Preparation
- Use clear, descriptive column headers
- Ensure data is clean and consistent
- Remove empty rows and columns
- Use standard date/time formats

### Column Headers Examples
**Good Headers:**
- "Course Name", "Lecturer Name", "Venue", "Start Time", "End Time"
- "Student Group", "Room Number", "Day of Week"

**Avoid:**
- "Col1", "Col2", "Data", "Info"
- Headers with special characters or numbers only
- Very long or unclear descriptions

## Error Recovery Workflow

```
AI Processing Failed
        ↓
1. Review Error Message
        ↓
2. Choose Recovery Option:
   • Retry AI Processing
   • Switch to Manual Import  
   • Go Back to Analysis
        ↓
3. Continue with Progressive Workflow
        ↓
4. Manual Advancement Required at Each Step
```

## Technical Details

The AI processing error typically occurs due to:
- API service unavailability
- File format issues
- Data structure problems
- Network connectivity issues
- Service rate limiting

The progressive workflow ensures that even when AI processing fails, users can continue with their import using manual methods, maintaining full control over the process.