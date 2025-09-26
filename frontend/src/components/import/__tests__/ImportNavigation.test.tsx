import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImportNavigation } from '../ImportNavigation';

const mockSteps = [
  {
    id: 'upload',
    label: 'Upload Files',
    description: 'Upload your data files',
    icon: <div>Upload Icon</div>,
    status: 'completed' as const,
    estimatedTime: '1-2 min'
  },
  {
    id: 'analysis',
    label: 'File Analysis',
    description: 'Analyze file structure',
    icon: <div>Analysis Icon</div>,
    status: 'active' as const,
    estimatedTime: '30 sec'
  },
  {
    id: 'import',
    label: 'Import Data',
    description: 'Import processed data',
    icon: <div>Import Icon</div>,
    status: 'pending' as const,
    estimatedTime: '3-5 min'
  }
];

const mockProps = {
  steps: mockSteps,
  currentStepIndex: 1,
  canGoNext: true,
  canGoPrevious: true,
  isProcessing: false,
  progress: 65,
  onNext: jest.fn(),
  onPrevious: jest.fn(),
  onStepClick: jest.fn(),
  onCancel: jest.fn(),
  onRestart: jest.fn(),
  showBreadcrumbs: true,
  showProgress: true,
  variant: 'horizontal' as const
};

describe('ImportNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders navigation with steps', () => {
    render(<ImportNavigation {...mockProps} />);
    
    expect(screen.getByText('Upload Files')).toBeInTheDocument();
    expect(screen.getByText('File Analysis')).toBeInTheDocument();
    expect(screen.getByText('Import Data')).toBeInTheDocument();
  });

  it('shows current step information', () => {
    render(<ImportNavigation {...mockProps} />);
    
    expect(screen.getByText('File Analysis')).toBeInTheDocument();
    expect(screen.getByText('Analyze file structure')).toBeInTheDocument();
    expect(screen.getByText('~30 sec')).toBeInTheDocument();
  });

  it('displays progress information', () => {
    render(<ImportNavigation {...mockProps} />);
    
    expect(screen.getByText('Import Progress')).toBeInTheDocument();
    expect(screen.getByText('1/3 Steps')).toBeInTheDocument();
    expect(screen.getByText('Current: File Analysis')).toBeInTheDocument();
  });

  it('shows processing progress when processing', () => {
    const processingProps = { ...mockProps, isProcessing: true, progress: 75 };
    render(<ImportNavigation {...processingProps} />);
    
    expect(screen.getByText('Processing... 75%')).toBeInTheDocument();
  });

  it('calls onNext when Next button is clicked', () => {
    render(<ImportNavigation {...mockProps} />);
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    expect(mockProps.onNext).toHaveBeenCalled();
  });

  it('calls onPrevious when Previous button is clicked', () => {
    render(<ImportNavigation {...mockProps} />);
    
    const previousButton = screen.getByText('Previous');
    fireEvent.click(previousButton);
    
    expect(mockProps.onPrevious).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    render(<ImportNavigation {...mockProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it('disables buttons when processing', () => {
    const processingProps = { ...mockProps, isProcessing: true };
    render(<ImportNavigation {...processingProps} />);
    
    const nextButton = screen.getByText('Next');
    const previousButton = screen.getByText('Previous');
    const cancelButton = screen.getByText('Cancel');
    
    expect(nextButton).toBeDisabled();
    expect(previousButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('disables Previous button when cannot go previous', () => {
    const props = { ...mockProps, canGoPrevious: false };
    render(<ImportNavigation {...props} />);
    
    const previousButton = screen.getByText('Previous');
    expect(previousButton).toBeDisabled();
  });

  it('disables Next button when cannot go next', () => {
    const props = { ...mockProps, canGoNext: false };
    render(<ImportNavigation {...props} />);
    
    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
  });

  it('shows Finish button on last step', () => {
    const props = { ...mockProps, currentStepIndex: 2 };
    render(<ImportNavigation {...props} />);
    
    expect(screen.getByText('Finish')).toBeInTheDocument();
  });

  it('shows breadcrumbs when enabled', () => {
    render(<ImportNavigation {...mockProps} />);
    
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  it('hides breadcrumbs when disabled', () => {
    const props = { ...mockProps, showBreadcrumbs: false };
    render(<ImportNavigation {...props} />);
    
    expect(screen.queryByText('Import')).not.toBeInTheDocument();
  });

  it('shows step status legend', () => {
    render(<ImportNavigation {...mockProps} />);
    
    expect(screen.getByText('Step Status Legend')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('calls onStepClick when clickable step is clicked', () => {
    render(<ImportNavigation {...mockProps} />);
    
    // Click on the first step (completed, should be clickable)
    const uploadStep = screen.getByText('Upload Files');
    fireEvent.click(uploadStep);
    
    expect(mockProps.onStepClick).toHaveBeenCalledWith(0);
  });

  it('shows restart button when not on first step', () => {
    render(<ImportNavigation {...mockProps} />);
    
    const restartButton = screen.getByLabelText('Restart import');
    expect(restartButton).toBeInTheDocument();
  });

  it('hides restart button on first step', () => {
    const props = { ...mockProps, currentStepIndex: 0 };
    render(<ImportNavigation {...props} />);
    
    const restartButton = screen.queryByLabelText('Restart import');
    expect(restartButton).not.toBeInTheDocument();
  });
});