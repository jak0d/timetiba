# Progressive Import Workflow Implementation Guide

## Overview

This guide explains how to implement a progressive import workflow where users must manually advance through each step by clicking "Next", without any automatic progression.

## Key Principles

### 1. Manual Advancement Only
- Users must explicitly click "Next" to advance to each step
- No automatic progression occurs, even after step completion
- Each step requires user acknowledgment before proceeding

### 2. Step-by-Step Guidance
- Clear instructions at each step
- Visual indicators showing what needs to be completed
- Dynamic button text that reflects the current action needed

### 3. User Control
- Users can go back to previous steps
- Clear progress indicators
- Ability to cancel or restart the workflow

## Implementation Details

### Workflow Steps

1. **Upload Files** - User uploads data files
2. **File Analysis** - User reviews file structure and chooses import method
3. **AI Processing** (Optional) - AI-powered entity detection and mapping
4. **Column Mapping** (Manual) - User maps columns to system fields
5. **Data Validation** - User triggers validation and reviews results
6. **Preview & Review** - User loads and reviews data preview
7. **Import Execution** - User starts the import process
8. **Complete** - Final results and completion

### Key Components Modified

#### ImportWorkflow.tsx
- Updated `handleNextStep()` to require manual progression
- Added `getNextButtonText()` for dynamic button labels
- Added `isProcessingStep()` to track processing states
- Removed automatic step advancement from useEffect hooks

#### ImportStore.ts
- Removed automatic step progression from API responses
- Added 'analysis' step to workflow
- Updated step navigation arrays

#### ImportNavigation.tsx
- Added `nextButtonText` prop for dynamic button text
- Added progressive workflow indicators
- Enhanced step status display

### Progressive Workflow Features

#### Dynamic Button Text
```typescript
const getNextButtonText = () => {
  switch (currentStep) {
    case 'upload': return 'Analyze File';
    case 'analysis': return 'Continue';
    case 'validation': return validationResult ? 'Preview Data' : 'Run Validation';
    case 'preview': return previewData.length > 0 ? 'Start Import' : 'Load Preview';
    // ... more cases
  }
};
```

#### Step Completion Checks
```typescript
const canProceedToNext = () => {
  switch (currentStep) {
    case 'upload': return selectedFileId !== null && fileReady;
    case 'mapping': return mappingValidation.isValid;
    case 'validation': return validationResult !== null;
    // ... more cases
  }
};
```

#### Manual Action Requirements
Each step now includes clear instructions and manual triggers:
- Upload: User selects files and clicks "Analyze File"
- Analysis: User chooses AI or Manual import method
- Mapping: User configures mappings and clicks "Validate Data"
- Validation: User clicks "Run Validation" then "Preview Data"
- Preview: User clicks "Load Preview" then "Start Import"
- Import: User clicks "Start Import" then "View Results"

## User Experience Flow

### Step 1: Upload Files
```
[File Upload Interface]
↓
User uploads file(s)
↓
Button: "Analyze File" (enabled when file ready)
↓
User clicks "Analyze File"
```

### Step 2: File Analysis
```
[File Analysis Display]
[Import Method Selection: AI vs Manual]
↓
User reviews analysis and selects method
↓
Button: "Continue" (enabled after selection)
↓
User clicks "Continue"
```

### Step 3: Column Mapping (if Manual)
```
[Column Mapping Interface]
↓
User configures column mappings
↓
Button: "Validate Data" (enabled when mappings valid)
↓
User clicks "Validate Data"
```

### Step 4: Data Validation
```
[Validation Interface]
↓
Button: "Run Validation" (if not yet run)
↓
User clicks "Run Validation"
↓
[Validation Results Display]
↓
Button: "Preview Data" (enabled after validation)
↓
User clicks "Preview Data"
```

### Step 5: Preview & Review
```
[Preview Interface]
↓
Button: "Load Preview" (if not yet loaded)
↓
User clicks "Load Preview"
↓
[Data Preview Display]
↓
Button: "Start Import" (enabled after preview loaded)
↓
User clicks "Start Import"
```

### Step 6: Import Execution
```
[Import Progress Monitor]
↓
Import runs automatically
↓
Button: "View Results" (enabled when complete)
↓
User clicks "View Results"
```

### Step 7: Complete
```
[Import Results Display]
↓
Workflow complete
```

## Visual Indicators

### Progress Indicators
- Step-by-step progress bar
- Current step highlighting
- Completion status for each step

### Action Indicators
- Clear "what to do next" messages
- Dynamic button text
- Processing states with loading indicators

### Status Messages
- Info alerts explaining manual progression
- Success messages after step completion
- Warning messages for incomplete steps

## Code Examples

### Progressive Step Content
```tsx
case 'validation':
  if (!validationResult && !isValidating) {
    return (
      <Box>
        <Alert severity="info">
          <Typography variant="subtitle2">Data Validation Required</Typography>
          <Typography variant="body2">
            Click "Run Validation" to validate your data. 
            You must complete validation before proceeding.
          </Typography>
        </Alert>
        
        <Button onClick={() => validateData()}>
          Run Validation
        </Button>
      </Box>
    );
  }
```

### Manual Advancement Handler
```tsx
const handleNextStep = async () => {
  switch (currentStep) {
    case 'validation':
      if (!validationResult) {
        await validateData(); // Trigger validation
      } else {
        goToStep('preview'); // Manual advancement only
      }
      break;
    // ... other cases
  }
};
```

## Benefits

### User Control
- Users maintain full control over workflow progression
- No unexpected automatic transitions
- Clear understanding of current state

### Reduced Errors
- Users must acknowledge each step completion
- Prevents skipping important review steps
- Ensures data quality checks are performed

### Better UX
- Clear expectations at each step
- Predictable workflow behavior
- Reduced cognitive load

## Testing the Implementation

### Demo Component
A `ProgressiveImportDemo` component is provided to demonstrate the workflow:
- Simulates each step with processing delays
- Shows manual advancement requirements
- Demonstrates the complete user flow

### Key Test Scenarios
1. Verify no automatic progression occurs
2. Test manual advancement at each step
3. Validate button text changes appropriately
4. Ensure users can navigate backwards
5. Test workflow reset functionality

## Conclusion

The progressive import workflow ensures users have complete control over the import process, with clear guidance at each step and no unexpected automatic progressions. This approach improves data quality, reduces errors, and provides a more predictable user experience.