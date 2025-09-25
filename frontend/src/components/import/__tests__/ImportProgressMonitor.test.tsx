import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImportProgressMonitor } from '../ImportProgressMonitor';

const mockStages = [
  {
    id: 'upload',
    name: 'File Upload',
    description: 'Processing uploaded file',
    status: 'completed' as const,
    progress: 100,
    startTime: new Date('2023-01-01T10:00:00Z'),
    endTime: new Date('2023-01-01T10:01:00Z')
  },
  {
    id: 'validation',
    name: 'Data Validation',
    description: 'Validating data integrity',
    status: 'running' as const,
    progress: 60,
    startTime: new Date('2023-01-01T10:01:00Z')
  },
  {
    id: 'import',
    name: 'Data Import',
    description: 'Importing data to database',
    status: 'pending' as const,
    progress: 0
  }
];

const mockResult = {
  summary: {
    totalProcessed: 100,
    successful: 95,
    failed: 3,
    warnings: 2
  },
  entities: {
    venues: { created: 10, updated: 5, errors: 1 },
    lecturers: { created: 20, updated: 8, errors: 1 },
    courses: { created: 15, updated: 12, errors: 1 },
    schedules: { created: 50, updated: 25, errors: 0 }
  },
  errors: [
    { row: 5, field: 'venue', message: 'Invalid venue name', suggestion: 'Check venue spelling' }
  ],
  warnings: [
    { row: 10, field: 'time', message: 'Time format unusual' }
  ]
};

describe('ImportProgressMonitor', () => {
  const mockOnCancel = jest.fn();
  const mockOnRetry = jest.fn();
  const mockOnDownloadReport = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders import progress with stages', () => {
    render(
      <ImportProgressMonitor
        jobId="test-job-1"
        stages={mockStages}
        currentStage={1}
        overallProgress={60}
        status="running"
        onCancel={mockOnCancel}
        onRetry={mockOnRetry}
        onDownloadReport={mockOnDownloadReport}
      />
    );

    expect(screen.getByText('Import Progress')).toBeInTheDocument();
    expect(screen.getByText('Overall Progress')).toBeInTheDocument();
    expect(screen.getByText('60% Complete')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('displays all stages with correct status', () => {
    render(
      <ImportProgressMonitor
        jobId="test-job-1"
        stages={mockStages}
        currentStage={1}
        overallProgress={60}
        status="running"
        onCancel={mockOnCancel}
        onRetry={mockOnRetry}
        onDownloadReport={mockOnDownloadReport}
      />
    );

    expect(screen.getByText('File Upload')).toBeInTheDocument();
    expect(screen.getByText('Data Validation')).toBeInTheDocument();
    expect(screen.getByText('Data Import')).toBeInTheDocument();
  });

  it('shows cancel button when running', () => {
    render(
      <ImportProgressMonitor
        jobId="test-job-1"
        stages={mockStages}
        currentStage={1}
        overallProgress={60}
        status="running"
        onCancel={mockOnCancel}
        onRetry={mockOnRetry}
        onDownloadReport={mockOnDownloadReport}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeInTheDocument();
    
    fireEvent.click(cancelButton);
    expect(screen.getByText('Cancel Import')).toBeInTheDocument();
  });

  it('shows retry button when error status', () => {
    render(
      <ImportProgressMonitor
        jobId="test-job-1"
        stages={mockStages}
        currentStage={1}
        overallProgress={60}
        status="error"
        onCancel={mockOnCancel}
        onRetry={mockOnRetry}
        onDownloadReport={mockOnDownloadReport}
      />
    );

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalled();
  });

  it('shows download report button when completed', () => {
    render(
      <ImportProgressMonitor
        jobId="test-job-1"
        stages={mockStages}
        currentStage={2}
        overallProgress={100}
        status="completed"
        result={mockResult}
        onCancel={mockOnCancel}
        onRetry={mockOnRetry}
        onDownloadReport={mockOnDownloadReport}
      />
    );

    const downloadButton = screen.getByText('Download Report');
    expect(downloadButton).toBeInTheDocument();
    
    fireEvent.click(downloadButton);
    expect(mockOnDownloadReport).toHaveBeenCalled();
  });

  it('displays import results when completed', () => {
    render(
      <ImportProgressMonitor
        jobId="test-job-1"
        stages={mockStages}
        currentStage={2}
        overallProgress={100}
        status="completed"
        result={mockResult}
        onCancel={mockOnCancel}
        onRetry={mockOnRetry}
        onDownloadReport={mockOnDownloadReport}
      />
    );

    expect(screen.getByText('Import Results')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument(); // Total processed
    expect(screen.getByText('95')).toBeInTheDocument(); // Successful
    expect(screen.getByText('3')).toBeInTheDocument(); // Failed
    expect(screen.getByText('2')).toBeInTheDocument(); // Warnings
  });

  it('shows estimated time remaining when running', () => {
    render(
      <ImportProgressMonitor
        jobId="test-job-1"
        stages={mockStages}
        currentStage={1}
        overallProgress={60}
        status="running"
        estimatedTimeRemaining={120000} // 2 minutes
        onCancel={mockOnCancel}
        onRetry={mockOnRetry}
        onDownloadReport={mockOnDownloadReport}
      />
    );

    expect(screen.getByText(/Est\. 2m 0s remaining/)).toBeInTheDocument();
  });

  it('handles cancel confirmation dialog', () => {
    render(
      <ImportProgressMonitor
        jobId="test-job-1"
        stages={mockStages}
        currentStage={1}
        overallProgress={60}
        status="running"
        onCancel={mockOnCancel}
        onRetry={mockOnRetry}
        onDownloadReport={mockOnDownloadReport}
      />
    );

    // Click cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Confirm cancellation
    const confirmButton = screen.getByText('Cancel Import');
    fireEvent.click(confirmButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('expands and shows detailed results', () => {
    render(
      <ImportProgressMonitor
        jobId="test-job-1"
        stages={mockStages}
        currentStage={2}
        overallProgress={100}
        status="completed"
        result={mockResult}
        onCancel={mockOnCancel}
        onRetry={mockOnRetry}
        onDownloadReport={mockOnDownloadReport}
      />
    );

    // Click show details
    const showDetailsButton = screen.getByText('Show Details');
    fireEvent.click(showDetailsButton);

    expect(screen.getByText('Entity Results')).toBeInTheDocument();
    expect(screen.getByText('Venues')).toBeInTheDocument();
    expect(screen.getByText('Created: 10')).toBeInTheDocument();
  });
});