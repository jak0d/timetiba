import React from 'react';
import { render, screen } from '@testing-library/react';
import { ImportWorkflow } from '../ImportWorkflow';

// Mock the import store
jest.mock('../../store/importStore', () => ({
  useImportStore: () => ({
    currentStep: 'upload',
    uploadedFile: null,
    isUploading: false,
    uploadError: null,
    sourceColumns: [],
    targetFields: [],
    columnMappings: [],
    mappingValidation: { isValid: false, errors: [], warnings: [] },
    isGeneratingMappings: false,
    validationResult: null,
    previewData: [],
    isValidating: false,
    currentJob: null,
    isImporting: false,
    loading: false,
    error: null,
    // Actions
    uploadFile: jest.fn(),
    removeFile: jest.fn(),
    setColumnMappings: jest.fn(),
    generateAutoMappings: jest.fn(),
    validateData: jest.fn(),
    loadPreviewData: jest.fn(),
    approveEntityMatch: jest.fn(),
    rejectEntityMatch: jest.fn(),
    bulkApproveMatches: jest.fn(),
    startImport: jest.fn(),
    cancelImport: jest.fn(),
    retryImport: jest.fn(),
    goToStep: jest.fn(),
    nextStep: jest.fn(),
    previousStep: jest.fn(),
    resetWorkflow: jest.fn(),
    clearError: jest.fn(),
    clearUploadError: jest.fn(),
    setProgress: jest.fn(),
    setCurrentStage: jest.fn()
  })
}));

// Mock the child components
jest.mock('../FileManager', () => ({
  FileManager: () => <div data-testid="file-manager">File Manager</div>
}));

jest.mock('../ImportNavigation', () => ({
  ImportNavigation: () => <div data-testid="import-navigation">Import Navigation</div>
}));

jest.mock('../FileAnalysisDisplay', () => ({
  FileAnalysisDisplay: () => <div data-testid="file-analysis-display">File Analysis Display</div>
}));

jest.mock('../LLMImportInterface', () => ({
  LLMImportInterface: () => <div data-testid="llm-import-interface">LLM Import Interface</div>
}));

describe('ImportWorkflow', () => {
  it('renders without crashing', () => {
    render(<ImportWorkflow />);
    
    expect(screen.getByText('Import Timetable Data')).toBeInTheDocument();
    expect(screen.getByTestId('import-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('file-manager')).toBeInTheDocument();
  });

  it('shows the correct title and description', () => {
    render(<ImportWorkflow />);
    
    expect(screen.getByText('Import Timetable Data')).toBeInTheDocument();
    expect(screen.getByText('Upload and import your timetable data with intelligent file management')).toBeInTheDocument();
  });

  it('renders the navigation component', () => {
    render(<ImportWorkflow />);
    
    expect(screen.getByTestId('import-navigation')).toBeInTheDocument();
  });

  it('renders the file manager on upload step', () => {
    render(<ImportWorkflow />);
    
    expect(screen.getByTestId('file-manager')).toBeInTheDocument();
  });
});