# Enhanced File Management & Navigation System

## Overview

The enhanced file management system provides comprehensive file handling capabilities with intelligent navigation, multi-file support, and advanced user experience features for the timetable import workflow.

## 🗂️ Core Components

### 1. FileManager Component
**Location**: `frontend/src/components/import/FileManager.tsx`

**Key Features**:
- **Multi-file Upload**: Support for up to 5 simultaneous files
- **File Operations**: Delete, replace, download, and preview
- **Real-time Status**: Upload progress, analysis status, error handling
- **File Selection**: Click-to-select interface for processing
- **Drag & Drop**: Enhanced dropzone with visual feedback
- **File Details**: Expandable metadata and analysis results

**Usage**:
```typescript
<FileManager
  files={managedFiles}
  onFileUpload={handleFileUpload}
  onFileDelete={handleFileDelete}
  onFileReplace={handleFileReplace}
  onFileSelect={handleFileSelect}
  selectedFileId={selectedFileId}
  maxFiles={3}
  acceptedFormats={['.csv', '.xlsx', '.xls']}
  maxSize={10 * 1024 * 1024}
/>
```

### 2. ImportNavigation Component
**Location**: `frontend/src/components/import/ImportNavigation.tsx`

**Key Features**:
- **Dynamic Stepper**: Adapts to workflow requirements
- **Progress Tracking**: Visual progress indicators
- **Breadcrumb Navigation**: Clear path indication
- **Smart Controls**: Context-aware button states
- **Time Estimates**: Expected duration for each step
- **Status Legend**: Visual guide for step states

**Usage**:
```typescript
<ImportNavigation
  steps={workflowSteps}
  currentStepIndex={currentStepIndex}
  canGoNext={canProceedToNext()}
  canGoPrevious={canGoPrevious()}
  isProcessing={isProcessing}
  progress={progress}
  onNext={handleNextStep}
  onPrevious={previousStep}
  onStepClick={handleStepClick}
  onCancel={handleCancel}
  onRestart={handleRestart}
/>
```

### 3. Enhanced ImportWorkflow
**Location**: `frontend/src/components/import/ImportWorkflow.tsx`

**Key Features**:
- **File-First Approach**: Upload and analyze before processing
- **Dynamic Steps**: Workflow adapts based on chosen method
- **State Management**: Comprehensive state tracking
- **Error Recovery**: Graceful error handling and recovery
- **Cancel Protection**: Confirmation dialogs for destructive actions

## 📊 File Management Features

### File Status System
```typescript
type FileStatus = 'uploading' | 'analyzing' | 'ready' | 'error' | 'processing';
```

**Status Indicators**:
- **Uploading**: File transfer in progress
- **Analyzing**: File structure analysis
- **Ready**: Available for processing
- **Error**: Upload or analysis failed
- **Processing**: Currently being imported

### File Operations

#### 1. Upload Files
- **Drag & Drop**: Visual dropzone with feedback
- **Click to Upload**: Traditional file picker
- **Progress Tracking**: Real-time upload progress
- **Validation**: Format and size checking

#### 2. Manage Files
- **Delete**: Remove unwanted files with confirmation
- **Replace**: Swap files with new versions
- **Download**: Export files and reports
- **Preview**: View file contents and metadata

#### 3. File Selection
- **Visual Selection**: Click to select active file
- **Status Display**: Clear indication of selected file
- **Metadata View**: Expandable file details

### File Metadata Structure
```typescript
interface FileMetadata {
  rows: number;
  columns: string[];
  preview: Record<string, any>[];
  fileType: string;
  encoding?: string;
}
```

## 🧭 Navigation System

### Workflow Steps
The navigation system supports dynamic step generation:

```typescript
const workflowSteps = [
  {
    id: 'upload',
    label: 'Upload Files',
    description: 'Upload and manage your data files',
    status: 'completed',
    estimatedTime: '1-2 min'
  },
  {
    id: 'analysis',
    label: 'File Analysis',
    description: 'Analyze file structure and content',
    status: 'active',
    estimatedTime: '30 sec'
  },
  // ... more steps
];
```

### Step Status Types
- **Pending**: Not yet started
- **Active**: Currently in progress
- **Completed**: Successfully finished
- **Error**: Failed with errors
- **Skipped**: Bypassed (optional steps)

### Navigation Controls

#### Smart Button States
- **Previous**: Enabled when can go back
- **Next**: Enabled when current step is valid
- **Cancel**: Always available with confirmation
- **Restart**: Available after first step

#### Progress Indicators
- **Overall Progress**: Steps completed / total steps
- **Step Progress**: Current step completion percentage
- **Time Estimates**: Expected duration for each step

## 🎨 User Experience Enhancements

### Visual Design
- **Color-Coded Status**: Intuitive status indicators
- **Animated Transitions**: Smooth state changes
- **Responsive Layout**: Works on all device sizes
- **Accessibility**: Full keyboard and screen reader support

### Interaction Patterns
- **Click to Select**: Files and navigation steps
- **Drag & Drop**: File uploads and replacements
- **Hover Effects**: Interactive feedback
- **Context Menus**: File operation menus

### Error Handling
- **Graceful Degradation**: Fallback options for failures
- **Clear Messaging**: Descriptive error messages
- **Recovery Actions**: Options to retry or fix issues
- **Validation Feedback**: Real-time input validation

## 📱 Responsive Design

### Desktop (1200px+)
- **Full Layout**: Side-by-side panels
- **Rich Interactions**: Hover effects and tooltips
- **Detailed Views**: Expanded file information

### Tablet (768px - 1199px)
- **Stacked Layout**: Vertical arrangement
- **Touch-Friendly**: Larger touch targets
- **Optimized Spacing**: Comfortable interaction

### Mobile (< 768px)
- **Single Column**: Linear workflow
- **Swipe Navigation**: Touch gestures
- **Simplified UI**: Essential features only

## 🔧 Technical Implementation

### State Management
```typescript
interface FileManagerState {
  managedFiles: FileData[];
  selectedFileId: string | null;
  workflowSteps: WorkflowStep[];
  currentStepIndex: number;
  isProcessing: boolean;
}
```

### File Operations API
```typescript
// File upload with progress tracking
const handleFileUpload = async (file: File) => {
  // Update UI with uploading status
  // Call upload API
  // Handle progress updates
  // Update final status
};

// File deletion with confirmation
const handleFileDelete = (fileId: string) => {
  // Show confirmation dialog
  // Remove from state
  // Clean up resources
};

// File replacement
const handleFileReplace = async (fileId: string, newFile: File) => {
  // Validate new file
  // Upload replacement
  // Update metadata
};
```

### Navigation Logic
```typescript
const canProceedToNext = () => {
  switch (currentStep) {
    case 'upload':
      return selectedFileId && fileIsReady(selectedFileId);
    case 'analysis':
      return analysisComplete;
    // ... other cases
  }
};
```

## 📊 Import History Management

### ImportHistory Page
**Location**: `frontend/src/pages/ImportHistory.tsx`

**Features**:
- **Complete History**: All import records
- **Advanced Filtering**: Status, method, date filters
- **Search Functionality**: Find specific imports
- **Detailed Views**: Comprehensive import information
- **Export Reports**: Download import summaries

### Import Record Structure
```typescript
interface ImportRecord {
  id: string;
  filename: string;
  status: 'completed' | 'processing' | 'failed' | 'cancelled';
  method: 'manual' | 'ai';
  progress: number;
  entitiesCreated: EntityCounts;
  errors: string[];
  warnings: string[];
  uploadedAt: Date;
  importedAt?: Date;
}
```

## 🧪 Testing Strategy

### Unit Tests
- **Component Rendering**: Verify UI elements
- **User Interactions**: Test click and input handlers
- **State Management**: Validate state transitions
- **Error Scenarios**: Test error handling

### Integration Tests
- **File Upload Flow**: End-to-end upload process
- **Navigation Flow**: Step-by-step workflow
- **Error Recovery**: Failure and recovery scenarios

### E2E Tests
- **Complete Workflows**: Full import processes
- **Multi-file Scenarios**: Complex file management
- **Cross-browser Testing**: Compatibility verification

## 🚀 Performance Optimizations

### File Handling
- **Chunked Uploads**: Large file support
- **Progress Streaming**: Real-time feedback
- **Memory Management**: Efficient file processing
- **Caching Strategy**: Metadata caching

### UI Performance
- **Lazy Loading**: Component code splitting
- **Virtual Scrolling**: Large file lists
- **Debounced Search**: Efficient filtering
- **Optimized Renders**: Minimal re-renders

## 🔮 Future Enhancements

### Advanced Features
- **Batch Operations**: Multi-file processing
- **File Versioning**: Track file changes
- **Collaborative Import**: Team-based workflows
- **Template System**: Reusable import configurations

### AI Enhancements
- **Smart Suggestions**: File format recommendations
- **Auto-correction**: Data quality improvements
- **Predictive Analysis**: Import success prediction
- **Learning System**: Improve accuracy over time

## 📚 Usage Examples

### Basic File Upload
```typescript
// Upload a single file
const file = new File(['content'], 'data.csv', { type: 'text/csv' });
await handleFileUpload(file);

// Select the uploaded file
handleFileSelect(fileId);

// Proceed to next step
handleNextStep();
```

### Multi-file Management
```typescript
// Upload multiple files
const files = [file1, file2, file3];
for (const file of files) {
  await handleFileUpload(file);
}

// Select primary file for processing
handleFileSelect(primaryFileId);

// Delete unwanted files
handleFileDelete(unwantedFileId);
```

### Navigation Control
```typescript
// Navigate to specific step
handleStepClick(stepIndex);

// Go to next step with validation
if (canProceedToNext()) {
  handleNextStep();
}

// Cancel with confirmation
handleCancel(); // Shows confirmation dialog
```

## 🎯 Best Practices

### File Management
1. **Validate Early**: Check files on upload
2. **Provide Feedback**: Show progress and status
3. **Handle Errors**: Graceful error recovery
4. **Clean Resources**: Remove temporary files

### Navigation
1. **Clear Progress**: Show where users are
2. **Smart Controls**: Enable/disable appropriately
3. **Consistent Patterns**: Predictable interactions
4. **Escape Routes**: Always provide cancel options

### User Experience
1. **Progressive Disclosure**: Show details on demand
2. **Contextual Help**: Provide guidance when needed
3. **Responsive Design**: Work on all devices
4. **Accessibility**: Support all users

---

This enhanced file management system transforms the import experience from a simple upload process into a comprehensive file management workflow that scales from single-file imports to complex multi-file batch operations while maintaining excellent user experience throughout.